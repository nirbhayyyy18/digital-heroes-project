import { createAdminClient } from "@/lib/supabase/admin";
import { centsToDisplay } from "@/lib/utils";
import ReportsChart from "@/components/ReportsChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReportsPage() {
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { data: payments },
    { data: draws },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("subscription_payments")
      .select(
        "amount_cents, charity_cut_cents, billing_period_start"
      ),

    supabase
      .from("draws")
      .select(
        "id, period_month, period_year, total_pool_cents, status"
      )
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(24),
  ]);

  const totalPool = (payments ?? []).reduce(
    (sum, payment) => sum + payment.amount_cents,
    0
  );

  const totalCharity = (payments ?? []).reduce(
    (sum, payment) => sum + payment.charity_cut_cents,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">Reports</p>

        <h1 className="font-display text-3xl font-semibold">
          Analytics
        </h1>

        <p className="text-mute text-sm mt-2">
          Platform performance, prize pool and charity contribution data.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="card">
          <p className="label-tag mb-2">Total users</p>
          <p className="stat-number">{totalUsers ?? 0}</p>
        </div>

        <div className="card">
          <p className="label-tag mb-2">Total prize pool</p>
          <p className="stat-number">
            {centsToDisplay(totalPool)}
          </p>
        </div>

        <div className="card">
          <p className="label-tag mb-2">Charity contributions</p>
          <p className="stat-number text-amber">
            {centsToDisplay(totalCharity)}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-tag">Draw analytics</p>
            <h2 className="font-display text-xl font-semibold mt-1">
              Prize pool by month
            </h2>
          </div>

          <span className="text-mute text-xs">
            Last 24 draws
          </span>
        </div>

        <ReportsChart draws={draws ?? []} />
      </div>
    </div>
  );
}