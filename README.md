# Digital Heroes — Level 1 Build

A subscription platform that combines golf score tracking, a monthly
number-match draw, and charitable giving — built to satisfy every section
of `Digital_Heroes_PRD__Level_1_.pdf`.

**Stack:** Next.js 14 (App Router, TypeScript) · Supabase (Postgres, Auth,
Storage, RLS) · Stripe (subscriptions) · Tailwind CSS.

---

## 1. Prerequisites

- Node.js 18+
- A **new** Supabase project (per PRD §15.1 — not a personal/existing one)
- A **new** Vercel account/project (per PRD §15.1)
- A Stripe account in test mode

---

## 2. Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values from steps 3-4 below
npm run dev
```

---

## 3. Supabase setup

1. Create a new project at supabase.com.
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql`
   → Run. This creates every table, RLS policy, the signup trigger, and
   seeds three sample charities.
3. Open **Storage** → New bucket → name it `winner-proofs` → make it
   **Public** (needed so the admin panel can open proof screenshots
   directly; switch to signed URLs later if you want it private).
4. Copy your **Project URL**, **anon key**, and **service_role key** from
   Settings → API into `.env.local`.
5. In Authentication → Providers, email/password is enabled by default —
   nothing else to configure for this build.

To make your own account an admin after signing up once through the app:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

---

## 4. Stripe setup

1. Create two **Products** in test mode: "Digital Heroes Monthly" and
   "Digital Heroes Yearly", each with a recurring Price. Copy both Price
   IDs into `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY`.
2. Copy your test **Secret key** into `STRIPE_SECRET_KEY` and your
   **Publishable key** into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Install the Stripe CLI and forward webhooks to your local server while
   developing:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   This prints a `whsec_...` value — put it in `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint in the Stripe dashboard pointing
   at `https://<your-vercel-domain>/api/stripe/webhook`, subscribed to:
   `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.deleted`, `invoice.payment_failed`.

---

## 5. Deploy (PRD §15.1)

1. Push this repo to a new GitHub repository.
2. In a **new** Vercel account/project, import the repo.
3. Add every variable from `.env.local` to Vercel → Settings →
   Environment Variables (use your **live** Stripe keys if going live, or
   keep test keys for the evaluation).
4. Deploy. Update `NEXT_PUBLIC_SITE_URL` to the deployed URL and redeploy
   once you know it, so Stripe Checkout redirects correctly.
5. Add the production webhook endpoint in Stripe (step 4.4 above) and
   update `STRIPE_WEBHOOK_SECRET` in Vercel to match.

---

## 6. Running a draw (admin walkthrough)

1. Log in as an admin → **Admin → Draws**.
2. Set month/year, choose **Random** or **Algorithmic**, click
   **"1. Create / refresh draw"** — this auto-calculates the pool from
   that period's subscription payments (§07) and builds one entry per
   active subscriber from their current scores.
3. Click **"2. Run simulation"** as many times as you like — nothing is
   final yet. Each run shows winning numbers, winners per tier, and payout
   per winner.
4. Happy with the result? Click **"3. Publish results"** — this writes
   real `winners` rows (visible to those users immediately) and locks the
   draw. If nobody hit 5 numbers, the jackpot automatically rolls into
   next month's pool.
5. Winners upload a proof screenshot from **Dashboard → Winnings**. Review
   it under **Admin → Winners** (approve/reject), then **Mark paid** once
   you've sent the payout.

---

## 7. Where every PRD requirement lives

| PRD section | Implementation |
|---|---|
| §03 Roles | `profiles.role` enum + RLS policies + `middleware.ts` |
| §04 Subscription | `api/stripe/checkout`, `api/stripe/webhook`, `dashboard/subscription` |
| §05 Scores | `api/scores/route.ts` (rolling-5 logic), `dashboard/scores` |
| §06/§07 Draws & pool | `lib/draw-engine.ts`, `api/draws/{run,simulate,publish}` |
| §08 Charity | `charities` table, `dashboard/charity`, `charities/` public pages |
| §09 Winners | `winners` table, `ProofUpload.tsx`, `api/winners/verify` |
| §10 User dashboard | `app/dashboard/*` |
| §11 Admin dashboard | `app/admin/*` |
| §12 UI/UX | Dark, non-golf design system in `globals.css` / `tailwind.config.ts` |

A full section-by-section explanation of *how* and *why* each piece works
was also given directly in the chat this project was built in.

---

## 8. Known simplifications (documented, not hidden)

This is a Level-1 sample-assignment build, so a few things are
intentionally left as the next obvious iteration rather than built out in
full, so you can explain the trade-off in review:

- **Admin user editing** (`admin/users`) is read-only in the UI; the schema
  and RLS already support full edits via the Supabase service-role client
  — wire a PATCH route the same way `api/admin/charities` does.
- **Draw entry numbers** are derived deterministically from each user's
  own last-5 scores (`numbersFromScores` in `lib/utils.ts`), which keeps
  the "algorithm-powered" draw tied to real performance data as the PRD
  asks — an alternative design would assign random ticket numbers at
  subscription time instead; either is defensible, so the README calls
  out the choice made.
- **Email notifications** (renewal, win, payout) aren't wired up — there's
  no ESP specified in the PRD, so hook in Resend/Postmark/etc. at the
  points marked in `api/stripe/webhook` and `api/draws/publish`.
