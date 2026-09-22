import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// POST /api/scores  { score: number, played_on: "YYYY-MM-DD" }
// Adds a score. If the user already has 5 scores on file, the OLDEST
// (by played_on) is deleted first, per PRD §05: "A new score replaces the
// oldest stored score automatically."
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const score = Number(body.score);
  const playedOn = String(body.played_on);

  if (!Number.isInteger(score) || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be an integer between 1 and 45." }, { status: 400 });
  }
  if (!playedOn || Number.isNaN(Date.parse(playedOn))) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  // Reject duplicate date (DB unique constraint also enforces this)
  const { data: existing } = await supabase
    .from("scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("played_on", playedOn)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "A score for this date already exists. Edit or delete it instead." },
      { status: 409 }
    );
  }

  const { data: currentScores } = await supabase
    .from("scores")
    .select("id, played_on")
    .eq("user_id", user.id)
    .order("played_on", { ascending: true }); // oldest first

  if (currentScores && currentScores.length >= 5) {
    const oldest = currentScores[0];
    await supabase.from("scores").delete().eq("id", oldest.id);
  }

  const { data: inserted, error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, score, played_on: playedOn })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/dashboard/scores");
  revalidatePath("/dashboard");
  return NextResponse.json({ score: inserted });
}

// PATCH /api/scores  { id, score }  — edit an existing score's value
export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, score } = await request.json();
  if (!Number.isInteger(score) || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be an integer between 1 and 45." }, { status: 400 });
  }

  const { error } = await supabase.from("scores").update({ score }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/dashboard/scores");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}

// DELETE /api/scores?id=...
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("scores").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/dashboard/scores");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
