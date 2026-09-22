import { requireActiveSubscription } from "@/lib/subscription";
import CharitySelector from "@/components/CharitySelector";

export const dynamic = "force-dynamic";

export default async function DashboardCharityPage() {
  const { supabase, user } = await requireActiveSubscription();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: charities } = await supabase
    .from("charities")
    .select("*")
    .eq("is_active", true);

  const { data: donations } = await supabase
    .from("donations")
    .select(
      `
      id,
      amount_cents,
      created_at,
      charity_id,
      charities (
        name
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">Charity</p>

        <h1 className="font-display text-3xl font-semibold">
          Choose who you support
        </h1>

        <p className="text-mute mt-2 text-sm">
          At least 10% of your subscription goes to your chosen charity.
          You can raise that any time.
        </p>
      </div>

      <CharitySelector
        charities={charities ?? []}
        currentCharityId={profile?.charity_id ?? null}
        currentPct={profile?.charity_contribution_pct ?? 10}
      />

      {/* Donation History */}
      <div className="space-y-4">
        <div>
          <p className="label-tag mb-2">Your donations</p>

          <h2 className="font-display text-2xl font-semibold">
            Donation history
          </h2>

          <p className="text-mute mt-1 text-sm">
            Your independent charity donations are shown here.
          </p>
        </div>

        {!donations || donations.length === 0 ? (
          <div className="card">
            <p className="text-mute text-sm">
              You have not made any independent donations yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {donations.map((donation: any) => {
              const charity = Array.isArray(donation.charities)
                ? donation.charities[0]
                : donation.charities;

              return (
                <div
                  key={donation.id}
                  className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-medium">
                      {charity?.name ?? "Charity"}
                    </h3>

                    <p className="text-mute text-sm mt-1">
                      {new Date(donation.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="font-display text-xl font-semibold">
                    ₹{(donation.amount_cents / 100).toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}