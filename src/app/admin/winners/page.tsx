import { createAdminClient } from "@/lib/supabase/admin";
import WinnersList from "@/components/WinnersList";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminWinnersPage() {
  const supabase = createAdminClient();

  const { data: winners, error } = await supabase
    .from("winners")
    .select(`
      id,
      user_id,
      match_tier,
      amount_cents,
      review_state,
      payment_state,
      proof_url,
      rejection_reason,
      draws (
        period_month,
        period_year
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <p className="label-tag mb-2">Winners</p>

          <h1 className="font-display text-3xl font-semibold">
            Verification & payouts
          </h1>
        </div>

        <div className="card border-amber/40">
          <p className="font-medium text-amber">
            Could not load winners
          </p>

          <p className="text-sm text-mute mt-2">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  /*
   * Fetch winner users separately.
   *
   * winners has two relationships with profiles:
   * winners.user_id  -> profiles.id
   * winners.reviewed_by -> profiles.id
   *
   * Fetching users separately avoids Supabase's
   * ambiguous relationship issue.
   */

  const userIds = [
    ...new Set(
      (winners ?? [])
        .map((winner) => winner.user_id)
        .filter(Boolean)
    ),
  ];

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const winnersWithProfiles = (winners ?? []).map(
    (winner) => ({
      ...winner,
      profiles:
        profileMap.get(winner.user_id) ?? null,
    })
  );

  /*
   * Summary statistics
   */

  const pending = winnersWithProfiles.filter(
    (winner) =>
      winner.review_state === "submitted"
  ).length;

  const approved = winnersWithProfiles.filter(
    (winner) =>
      winner.review_state === "approved"
  ).length;

  const paid = winnersWithProfiles.filter(
    (winner) =>
      winner.payment_state === "paid"
  ).length;

  return (
    <div className="space-y-8 fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-tag mb-2">
            Winner management
          </p>

          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Verification & payouts
          </h1>

          <p className="text-mute mt-2">
            Review proof, approve valid claims and complete payouts.
          </p>
        </div>

        <Link
          href="/admin/winners"
          className="btn-ghost !px-4 !py-2.5 text-sm"
        >
          Refresh
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">

        <div className="card !p-5">
          <p className="label-tag">
            Awaiting review
          </p>

          <p className="text-3xl font-semibold mt-2">
            {pending}
          </p>

          <p className="text-mute text-xs mt-1">
            Claims waiting for admin review
          </p>
        </div>

        <div className="card !p-5">
          <p className="label-tag">
            Approved
          </p>

          <p className="text-3xl font-semibold mt-2 text-mint">
            {approved}
          </p>

          <p className="text-mute text-xs mt-1">
            Verified winner claims
          </p>
        </div>

        <div className="card !p-5">
          <p className="label-tag">
            Paid
          </p>

          <p className="text-3xl font-semibold mt-2">
            {paid}
          </p>

          <p className="text-mute text-xs mt-1">
            Completed payouts
          </p>
        </div>

      </div>

      {/* Winners + search/filter UI */}
      {winnersWithProfiles.length > 0 ? (
        <WinnersList
          winners={winnersWithProfiles}
        />
      ) : (
        <div className="card text-center py-14">

          <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-line bg-panel flex items-center justify-center text-mint text-xl">
            ★
          </div>

          <p className="font-medium">
            No winners yet
          </p>

          <p className="text-mute text-sm mt-1 max-w-md mx-auto">
            Publish a draw with a 3-, 4- or 5-number
            match to create winner claims.
          </p>

          <Link
            href="/admin/draws"
            className="btn-ghost mt-5 !px-5 !py-2.5 text-sm inline-flex"
          >
            Go to Draws
          </Link>

        </div>
      )}

    </div>
  );
}