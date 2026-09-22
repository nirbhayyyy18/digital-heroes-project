import { createClient } from "@/lib/supabase/server";
import SubscriptionActions from "@/components/SubscriptionActions";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      subscription_status,
      subscription_plan,
      subscription_renews_at,
      subscription_cancelled_at,
      subscription_cancel_at_period_end
    `
    )
    .eq("id", user.id)
    .single();

  const status = profile?.subscription_status ?? "inactive";

  const isActive = status === "active";
  const isCancellationScheduled =
    Boolean(profile?.subscription_cancel_at_period_end) && isActive;

  const renewalDate = profile?.subscription_renews_at
    ? new Date(profile.subscription_renews_at)
    : null;

  const formattedRenewalDate = renewalDate
    ? renewalDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="label-tag mb-2">Subscription</p>

        <h1 className="font-display text-3xl font-semibold">
          Plans &amp; billing
        </h1>

        <p className="text-mute mt-2 text-sm">
          Manage your subscription and billing preferences.
        </p>
      </div>

      {/* Current subscription */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="label-tag mb-1">Current status</p>

            <p className="text-lg capitalize">
              {status}
              {profile?.subscription_plan
                ? ` — ${profile.subscription_plan}`
                : ""}
            </p>
          </div>

          {isActive && (
            <span className="status-badge">
              Active
            </span>
          )}
        </div>

        {formattedRenewalDate && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-mute text-xs uppercase tracking-wide">
              {isCancellationScheduled
                ? "Subscription ends"
                : "Next renewal"}
            </p>

            <p className="mt-1 text-sm">
              {formattedRenewalDate}
            </p>
          </div>
        )}

        {isCancellationScheduled && (
          <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-medium">
              Cancellation scheduled
            </p>

            <p className="text-mute mt-1 text-xs">
              Your subscription is still active and you can use
              the service until {formattedRenewalDate ?? "the end of your current billing period"}.
            </p>
          </div>
        )}

        {status === "lapsed" && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-medium">
              Subscription payment failed
            </p>

            <p className="text-mute mt-1 text-xs">
              Your subscription needs to be renewed to continue
              using subscriber features.
            </p>
          </div>
        )}

        {status === "cancelled" && (
          <div className="mt-4 rounded-xl border border-white/10 p-4">
            <p className="text-sm font-medium">
              Subscription cancelled
            </p>

            <p className="text-mute mt-1 text-xs">
              You can subscribe again using one of the plans below.
            </p>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Monthly */}
        <div className="card">
          <p className="label-tag mb-2">
            Monthly
          </p>

          <p className="font-display mb-4 text-3xl">
            Flexible
          </p>

          <SubscriptionActions
            plan="monthly"
            subscriptionStatus={status}
            cancelAtPeriodEnd={
              Boolean(profile?.subscription_cancel_at_period_end)
            }
          />
        </div>

        {/* Yearly */}
        <div className="card border-mint">
          <p className="label-tag mb-2 text-mint">
            Yearly
          </p>

          <p className="font-display mb-4 text-3xl">
            Best value
          </p>

          <SubscriptionActions
            plan="yearly"
            subscriptionStatus={status}
            cancelAtPeriodEnd={
              Boolean(profile?.subscription_cancel_at_period_end)
            }
          />
        </div>
      </div>
    </div>
  );
}