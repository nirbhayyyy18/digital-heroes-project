import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runDraw } from "@/lib/draw-engine";

// POST /api/draws/simulate  { draw_id }
// Admin-only. Runs the configured draw type against current entries and
// returns a full preview (winning numbers, who'd win, payouts) WITHOUT
// writing to the `winners` table. Can be called repeatedly to re-roll
// before publishing — nothing is final until /api/draws/publish.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { draw_id } = await request.json();
  const admin = createAdminClient();

  const { data: draw } = await admin.from("draws").select("*").eq("id", draw_id).single();
  if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });

  const { data: entries } = await admin.from("draw_entries").select("user_id, numbers").eq("draw_id", draw_id);

  const result = runDraw(
    draw.draw_type,
    (entries ?? []).map((e) => ({ userId: e.user_id, numbers: e.numbers })),
    {
      totalPoolCents: draw.total_pool_cents,
      pool5MatchCents: draw.pool_5match_cents,
      pool4MatchCents: draw.pool_4match_cents,
      pool3MatchCents: draw.pool_3match_cents,
    }
  );

  await admin
    .from("draws")
    .update({
      status: "simulated",
      winning_numbers: result.winningNumbers,
      rollover_out_cents: result.rolloverOutCents,
      simulated_at: new Date().toISOString(),
    })
    .eq("id", draw_id);

  return NextResponse.json({ result });
}
