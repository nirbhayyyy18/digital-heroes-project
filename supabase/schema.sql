-- ============================================================================
-- DIGITAL HEROES — DATABASE SCHEMA
-- Run this once in Supabase SQL editor on a NEW Supabase project.
-- Maps directly to PRD §03 (roles), §04 (subscriptions), §05 (scores),
-- §06-07 (draws & prize pool), §08 (charity), §09 (winners).
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES  (extends Supabase auth.users — PRD §03 User Roles)
-- ----------------------------------------------------------------------------
create type user_role as enum ('subscriber', 'admin');
create type subscription_status as enum ('inactive', 'active', 'cancelled', 'lapsed');
create type subscription_plan as enum ('monthly', 'yearly');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role user_role not null default 'subscriber',

  -- §04 Subscription & Payment
  subscription_status subscription_status not null default 'inactive',
  subscription_plan subscription_plan,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_renews_at timestamptz,
  subscription_cancelled_at timestamptz,

  -- §08 Charity selection — the foreign key to charities(id) is added
  -- further down (see "ALTER TABLE profiles ADD CONSTRAINT ...") once the
  -- charities table exists, since Postgres requires a referenced table to
  -- already exist at the point a CREATE TABLE statement runs.
  charity_id uuid,
  charity_contribution_pct numeric(5,2) not null default 10.00
    check (charity_contribution_pct >= 10.00 and charity_contribution_pct <= 100.00),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- (charities table is created below; the foreign key on profiles.charity_id
-- is attached afterward via ALTER TABLE — see section 2.)

-- ----------------------------------------------------------------------------
-- 2. CHARITIES  (PRD §08 Charity System)
-- ----------------------------------------------------------------------------
create table charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text not null,
  logo_url text,
  cover_image_url text,
  category text,
  is_spotlight boolean not null default false, -- §08.2 Homepage spotlight
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table charity_events (
  id uuid primary key default uuid_generate_v4(),
  charity_id uuid not null references charities(id) on delete cascade,
  title text not null,
  description text,
  event_date date,
  image_url text,
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_charity_id_fkey foreign key (charity_id) references charities(id);

-- Independent one-off donations, not tied to a subscription (§08.1)
create table donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete set null,
  charity_id uuid not null references charities(id),
  amount_cents integer not null check (amount_cents > 0),
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. SCORES  (PRD §05 Score Management — rolling last-5, Stableford 1-45)
-- ----------------------------------------------------------------------------
create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on) -- one entry per date, per §05 note
);
create index idx_scores_user_recent on scores (user_id, played_on desc);

-- ----------------------------------------------------------------------------
-- 4. SUBSCRIPTION PAYMENTS LEDGER (drives the prize pool in §07)
-- ----------------------------------------------------------------------------
create table subscription_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_invoice_id text,
  amount_cents integer not null,
  charity_cut_cents integer not null,   -- per user's charity_contribution_pct
  prize_pool_cut_cents integer not null, -- remainder feeds the draw pool
  billing_period_start date not null,
  billing_period_end date not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. DRAWS  (PRD §06 Draw & Reward System, §07 Prize Pool Logic)
-- ----------------------------------------------------------------------------
create type draw_type as enum ('random', 'algorithmic');
create type draw_status as enum ('draft', 'simulated', 'published');

create table draws (
  id uuid primary key default uuid_generate_v4(),
  period_month integer not null, -- 1-12
  period_year integer not null,
  draw_type draw_type not null default 'random',
  status draw_status not null default 'draft',

  -- Pool sizing — auto-calculated from active subscriber count (§07)
  active_subscriber_count integer not null default 0,
  total_pool_cents bigint not null default 0,

  -- §07 fixed split
  pool_5match_cents bigint not null default 0,
  pool_4match_cents bigint not null default 0,
  pool_3match_cents bigint not null default 0,

  -- Jackpot rollover (5-match only)
  rollover_in_cents bigint not null default 0,
  rollover_out_cents bigint not null default 0, -- carried to next draw if unclaimed

  winning_numbers int[] not null default '{}', -- e.g. 5 numbers drawn

  simulated_at timestamptz,
  published_at timestamptz,
  published_by uuid references profiles(id),
  created_at timestamptz not null default now(),

  unique (period_month, period_year)
);

-- A user's "ticket" numbers for a given draw period, generated from their
-- last-5 scores at time of entry (score-derived numbers keep the golf tie-in).
create table draw_entries (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references draws(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  numbers int[] not null, -- derived from user's 5 scores
  match_count integer,     -- computed at draw time
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);
create index idx_draw_entries_draw on draw_entries (draw_id);

-- ----------------------------------------------------------------------------
-- 6. WINNERS  (PRD §09 Winner Verification System)
-- ----------------------------------------------------------------------------
create type winner_payment_state as enum ('pending', 'paid');
create type winner_review_state as enum ('awaiting_proof', 'submitted', 'approved', 'rejected');

create table winners (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references draws(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  match_tier integer not null check (match_tier in (3,4,5)),
  amount_cents bigint not null,

  review_state winner_review_state not null default 'awaiting_proof',
  proof_url text, -- screenshot of scores, uploaded to Supabase Storage
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,

  payment_state winner_payment_state not null default 'pending',
  paid_at timestamptz,

  created_at timestamptz not null default now()
);
create index idx_winners_user on winners (user_id);
create index idx_winners_draw on winners (draw_id);

-- ----------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGER HELPER
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_charities_updated before update on charities
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY  (subscribers see only their own data; admins see all)
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table scores enable row level security;
alter table donations enable row level security;
alter table subscription_payments enable row level security;
alter table draws enable row level security;
alter table draw_entries enable row level security;
alter table winners enable row level security;
alter table charities enable row level security;
alter table charity_events enable row level security;

-- helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- Charities & events: public read, admin write
create policy "charities_public_read" on charities for select using (true);
create policy "charities_admin_write" on charities for all using (is_admin()) with check (is_admin());
create policy "charity_events_public_read" on charity_events for select using (true);
create policy "charity_events_admin_write" on charity_events for all using (is_admin()) with check (is_admin());

-- Profiles: user sees/edits own row; admin sees/edits all
create policy "profiles_self_read" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_self_update" on profiles for update using (auth.uid() = id or is_admin());
create policy "profiles_admin_insert" on profiles for insert with check (auth.uid() = id or is_admin());

-- Scores: owner + admin
create policy "scores_owner_all" on scores for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Donations: owner read/insert, admin all
create policy "donations_owner_read" on donations for select using (user_id = auth.uid() or is_admin());
create policy "donations_owner_insert" on donations for insert with check (user_id = auth.uid() or is_admin());

-- Subscription payments: owner read, admin all
create policy "payments_owner_read" on subscription_payments for select using (user_id = auth.uid() or is_admin());
create policy "payments_admin_write" on subscription_payments for all using (is_admin()) with check (is_admin());

-- Draws: published draws are public read; drafts admin-only
create policy "draws_public_read_published" on draws for select
  using (status = 'published' or is_admin());
create policy "draws_admin_write" on draws for all using (is_admin()) with check (is_admin());

-- Draw entries: owner + admin
create policy "draw_entries_owner_read" on draw_entries for select using (user_id = auth.uid() or is_admin());
create policy "draw_entries_admin_write" on draw_entries for all using (is_admin()) with check (is_admin());

-- Winners: owner read/update-own-proof, admin all
create policy "winners_owner_read" on winners for select using (user_id = auth.uid() or is_admin());
create policy "winners_owner_upload_proof" on winners for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "winners_admin_write" on winners for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- 9. SEED DATA (sample charities so the directory isn't empty on first run)
-- ----------------------------------------------------------------------------
insert into charities (name, slug, description, category, is_spotlight) values
('Fairway Futures Foundation', 'fairway-futures', 'Funds junior golf coaching and equipment for underprivileged youth.', 'Youth & Sport', true),
('Green Health Trust', 'green-health-trust', 'Supports mental health programmes for retired athletes.', 'Health', false),
('Community Greens Initiative', 'community-greens', 'Maintains free public golf and recreation spaces in underserved areas.', 'Community', false);

-- ----------------------------------------------------------------------------
-- 10. AUTO-CREATE PROFILE ON SIGNUP (recommended alternative to the
--     client-side insert in the signup form — enable this trigger and you
--     can remove the manual `.from("profiles").insert(...)` call in
--     src/app/(auth)/signup/page.tsx if you prefer a fully server-driven flow)
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'subscriber')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- 11. STORAGE — winner proof screenshots (PRD §09 proof upload)
-- Run in Supabase SQL editor AFTER creating the "winner-proofs" bucket
-- in Storage → New bucket (set it to PUBLIC so proof links work in the
-- admin panel, or keep it private and generate signed URLs instead).
-- ----------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('winner-proofs', 'winner-proofs', true)
--   on conflict (id) do nothing;

create policy "winner_proofs_owner_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] in (
      select id::text from winners where user_id = auth.uid()
    )
  );

create policy "winner_proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'winner-proofs');
