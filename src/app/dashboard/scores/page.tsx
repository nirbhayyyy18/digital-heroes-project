import { requireActiveSubscription } from "@/lib/subscription";
import ScoreForm from "@/components/ScoreForm";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const { supabase, user } = await requireActiveSubscription();

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="label-tag mb-2">Scores</p>

        <h1 className="font-display text-3xl font-semibold">
          Log your rounds
        </h1>

        <p className="text-mute mt-2 text-sm">
          Only your latest five scores are kept — a new entry replaces
          the oldest automatically.
        </p>
      </div>

      <ScoreForm scores={scores ?? []} />
    </div>
  );
}