import { requireActiveSubscription } from "@/lib/subscription";
import { centsToDisplay } from "@/lib/utils";
import ProofUpload from "@/components/ProofUpload";

export const dynamic = "force-dynamic";

export default async function WinningsPage() {
  const { supabase, user } = await requireActiveSubscription();

  const { data: winnings } = await supabase
    .from("winners")
    .select("*, draws(period_month, period_year)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">Winnings</p>

        <h1 className="font-display text-3xl font-semibold">
          Your prize history
        </h1>
      </div>

      {(!winnings || winnings.length === 0) && (
        <p className="text-mute text-sm">
          No wins yet — keep logging scores and stay entered in the monthly
          draw.
        </p>
      )}

      <div className="space-y-4">
        {(winnings ?? []).map((w) => (
          <div key={w.id} className="card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-display text-2xl">
                  {centsToDisplay(w.amount_cents)}
                </p>

                <p className="text-mute text-sm">
                  {w.match_tier}-number match ·{" "}
                  {w.draws?.period_month}/{w.draws?.period_year}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-mute">
                  Review
                </p>

                <p className="capitalize">
                  {w.review_state.replace("_", " ")}
                </p>

                <p className="text-xs uppercase tracking-wide text-mute mt-2">
                  Payment
                </p>

                <p
                  className={
                    w.payment_state === "paid"
                      ? "text-mint"
                      : "text-amber"
                  }
                >
                  {w.payment_state}
                </p>
              </div>
            </div>

            {w.review_state === "awaiting_proof" ||
            w.review_state === "rejected" ? (
              <div className="mt-4 pt-4 border-t border-line">
                {w.review_state === "rejected" &&
                  w.rejection_reason && (
                    <p className="text-amber text-sm mb-3">
                      Rejected: {w.rejection_reason}. Please re-upload.
                    </p>
                  )}

                <ProofUpload winnerId={w.id} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}