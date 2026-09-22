-- Enable live browser updates for data that changes while a page is open.
-- Run this once in Supabase SQL Editor.
do $$
begin
  alter publication supabase_realtime add table public.winners;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.draws;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.scores;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.charities;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.subscription_payments;
exception
  when duplicate_object then null;
end $$;
