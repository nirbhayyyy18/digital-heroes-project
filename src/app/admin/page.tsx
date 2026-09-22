import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { centsToDisplay, currentPeriod } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOverview() {
  const supabase = createAdminClient();
  const { month, year } = currentPeriod();

  const [
    { count: totalUsers },
    { count: activeSubs },
    { data: paymentTotals, error: paymentTotalsError },
    { data: draw },
    { count: totalWinners },
    { count: pendingWinners },
  ] = await Promise.all([
    // Total registered users
    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      }),

    // Active subscribers
    supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("subscription_status", "active"),

    // Aggregated payment totals.
    // The database calculates the sums instead of
    // transferring every subscription payment row.
    supabase.rpc("get_admin_payment_totals"),

    // Current month's draw
    supabase
      .from("draws")
      .select(
        "id, period_month, period_year, status, active_subscriber_count, total_pool_cents"
      )
      .eq("period_month", month)
      .eq("period_year", year)
      .maybeSingle(),

    // Total winners
    supabase
      .from("winners")
      .select("id", {
        count: "exact",
        head: true,
      }),

    // Winners waiting for admin review
    supabase
      .from("winners")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("review_state", "submitted"),
  ]);

  if (paymentTotalsError) {
    console.error(
      "Failed to load admin payment totals:",
      paymentTotalsError
    );
  }

  const totalPool =
    Number(paymentTotals?.[0]?.total_pool_cents ?? 0);

  const totalCharity =
    Number(paymentTotals?.[0]?.total_charity_cents ?? 0);

  return (
    <div className="space-y-8 fade-in">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <p className="label-tag mb-2">Admin dashboard</p>

          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Platform overview
          </h1>

          <p className="text-mute text-sm mt-2">
            Monitor users, subscriptions, draws, winners and platform
            contributions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/draws"
            className="btn-ghost !px-4 !py-2.5 text-sm"
          >
            Manage draws
          </Link>

          <Link
            href="/admin/winners"
            className="btn-primary !px-4 !py-2.5 text-sm"
          >
            View winners
          </Link>
        </div>
      </div>

      {/* MAIN STATS */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* TOTAL USERS */}
        <div className="card !p-5 hover:border-mint/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-tag">Total users</p>

              <p className="text-3xl font-semibold mt-3">
                {totalUsers ?? 0}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl border border-line bg-panel flex items-center justify-center text-mint">
              👥
            </div>
          </div>

          <p className="text-mute text-xs mt-3">
            Registered platform users
          </p>
        </div>

        {/* ACTIVE SUBSCRIBERS */}
        <div className="card !p-5 hover:border-mint/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-tag">Active subscribers</p>

              <p className="text-3xl font-semibold mt-3 text-mint">
                {activeSubs ?? 0}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl border border-mint/20 bg-mint/10 flex items-center justify-center text-mint">
              ✓
            </div>
          </div>

          <p className="text-mute text-xs mt-3">
            Currently active memberships
          </p>
        </div>

        {/* TOTAL PRIZE POOL */}
        <div className="card !p-5 hover:border-mint/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-tag">Total prize pool</p>

              <p className="text-3xl font-semibold mt-3">
                {centsToDisplay(totalPool)}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl border border-line bg-panel flex items-center justify-center text-amber">
              ₹
            </div>
          </div>

          <p className="text-mute text-xs mt-3">
            Subscription funds collected
          </p>
        </div>

        {/* CHARITY CONTRIBUTIONS */}
        <div className="card !p-5 hover:border-amber/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-tag">Charity contributions</p>

              <p className="text-3xl font-semibold mt-3 text-amber">
                {centsToDisplay(totalCharity)}
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl border border-amber/20 bg-amber/10 flex items-center justify-center text-amber">
              ♥
            </div>
          </div>

          <p className="text-mute text-xs mt-3">
            Total allocated towards charity
          </p>
        </div>
      </div>

      {/* SECONDARY STATS */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* WINNERS */}
        <div className="card !p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-tag">Winner claims</p>

              <p className="text-3xl font-semibold mt-2">
                {totalWinners ?? 0}
              </p>
            </div>

            <Link
              href="/admin/winners"
              className="text-mint text-sm hover:underline"
            >
              View →
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-sm text-mute">
              {pendingWinners ?? 0} claim
              {pendingWinners === 1 ? "" : "s"} currently awaiting review
            </p>
          </div>
        </div>

        {/* CURRENT PERIOD */}
        <div className="card !p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-tag">Current period</p>

              <p className="text-3xl font-semibold mt-2">
                {month}/{year}
              </p>
            </div>

            <Link
              href="/admin/draws"
              className="text-mint text-sm hover:underline"
            >
              Open draws →
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-sm text-mute">
              Current monthly draw period
            </p>
          </div>
        </div>
      </div>

      {/* CURRENT DRAW */}
      <div className="card !p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="label-tag mb-2">
              Current draw · {month}/{year}
            </p>

            <h2 className="font-display text-2xl font-semibold">
              {draw ? "Draw is available" : "Draw not created"}
            </h2>
          </div>

          {draw && (
            <span
              className={`status-badge ${
                draw.status === "published"
                  ? "status-success"
                  : draw.status === "completed"
                  ? "status-success"
                  : "status-neutral"
              }`}
            >
              {draw.status}
            </span>
          )}
        </div>

        {draw ? (
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="label-tag">Subscribers</p>

              <p className="text-2xl font-semibold mt-2">
                {draw.active_subscriber_count ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="label-tag">Prize pool</p>

              <p className="text-2xl font-semibold mt-2">
                {centsToDisplay(draw.total_pool_cents ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="label-tag">Status</p>

              <p className="text-2xl font-semibold mt-2 capitalize">
                {draw.status}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-line bg-panel p-5">
            <p className="text-sm text-mute">
              There is no draw created for the current period yet.
            </p>

            <Link
              href="/admin/draws"
              className="btn-ghost inline-flex mt-4 !px-4 !py-2.5 text-sm"
            >
              Create / manage draw
            </Link>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <div className="mb-4">
          <p className="label-tag">Quick actions</p>

          <h2 className="font-display text-2xl font-semibold mt-1">
            Manage platform
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="card !p-5 hover:border-mint/40 transition-all group"
          >
            <p className="text-lg font-semibold group-hover:text-mint transition-colors">
              Users
            </p>

            <p className="text-sm text-mute mt-1">
              View registered users
            </p>

            <p className="text-mint text-sm mt-4">
              Open →
            </p>
          </Link>

          <Link
            href="/admin/draws"
            className="card !p-5 hover:border-mint/40 transition-all group"
          >
            <p className="text-lg font-semibold group-hover:text-mint transition-colors">
              Draws
            </p>

            <p className="text-sm text-mute mt-1">
              Manage monthly draws
            </p>

            <p className="text-mint text-sm mt-4">
              Open →
            </p>
          </Link>

          <Link
            href="/admin/winners"
            className="card !p-5 hover:border-mint/40 transition-all group"
          >
            <p className="text-lg font-semibold group-hover:text-mint transition-colors">
              Winners
            </p>

            <p className="text-sm text-mute mt-1">
              Review claims and payouts
            </p>

            <p className="text-mint text-sm mt-4">
              Open →
            </p>
          </Link>

          <Link
            href="/admin/charities"
            className="card !p-5 hover:border-mint/40 transition-all group"
          >
            <p className="text-lg font-semibold group-hover:text-mint transition-colors">
              Charities
            </p>

            <p className="text-sm text-mute mt-1">
              Manage charity partners
            </p>

            <p className="text-mint text-sm mt-4">
              Open →
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}