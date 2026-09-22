import { requireActiveSubscription } from "@/lib/subscription";
import { centsToDisplay, currentPeriod } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const { supabase, user } = await requireActiveSubscription();
  const { data: profile } = await supabase.from("profiles").select("*, charities(name)").eq("id", user!.id).single();

  const { month, year } = currentPeriod();
  const { data: currentDraw } = await supabase
    .from("draws")
    .select("*")
    .eq("period_month", month)
    .eq("period_year", year)
    .maybeSingle();

  const { count: drawsEntered } = await supabase
    .from("draw_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: winnings } = await supabase
    .from("winners")
    .select("amount_cents, payment_state")
    .eq("user_id", user!.id);

  const totalWon = (winnings ?? []).reduce((sum, w) => sum + w.amount_cents, 0);
  const pendingCount = (winnings ?? []).filter((w) => w.payment_state === "pending").length;

  return (
    <div className="space-y-10">
      <div>
        <p className="label-tag mb-2">Overview</p>
        <h1 className="font-display text-3xl font-semibold">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
      </div>

      {/* Subscription status */}
      <div className="card flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="label-tag mb-1">Subscription</p>
          <p className="text-lg">
            {profile?.subscription_status === "active" ? (
              <span className="text-mint">Active — {profile.subscription_plan}</span>
            ) : (
              <span className="text-amber capitalize">{profile?.subscription_status ?? "inactive"}</span>
            )}
          </p>
          {profile?.subscription_renews_at && (
            <p className="text-mute text-sm mt-1">Renews {new Date(profile.subscription_renews_at).toLocaleDateString()}</p>
          )}
        </div>
        <Link href="/dashboard/subscription" className="btn-ghost">Manage</Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="card">
          <p className="label-tag mb-2">This month&rsquo;s draw</p>
          <p className="stat-number">{currentDraw?.status === "published" ? "Published" : "Pending"}</p>
        </div>
        <div className="card">
          <p className="label-tag mb-2">Draws entered</p>
          <p className="stat-number">{drawsEntered ?? 0}</p>
        </div>
        <div className="card">
          <p className="label-tag mb-2">Total won</p>
          <p className="stat-number text-mint">{centsToDisplay(totalWon)}</p>
          {pendingCount > 0 && <p className="text-amber text-xs mt-1">{pendingCount} pending payout</p>}
        </div>
      </div>

      <div className="card">
        <p className="label-tag mb-2">Charity</p>
        <p className="text-lg">
          {profile?.charities?.name ?? "Not selected yet"} — {profile?.charity_contribution_pct}% of subscription
        </p>
        <Link href="/dashboard/charity" className="text-mint text-sm mt-2 inline-block">
          Change selection →
        </Link>
      </div>
    </div>
  );
}
