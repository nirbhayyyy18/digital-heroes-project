import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// PATCH /api/winners/verify  { winner_id, action: "approve"|"reject"|"mark_paid", reason? }
export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { winner_id, action, reason } = await request.json();
  const admin = createAdminClient();

  if (action === "approve") {
    const { error } = await admin
      .from("winners")
      .update({ review_state: "approved", reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", winner_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "reject") {
    const { error } = await admin
      .from("winners")
      .update({
        review_state: "rejected",
        rejection_reason: reason ?? "Proof did not match submitted scores.",
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", winner_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "mark_paid") {
    const { error } = await admin
      .from("winners")
      .update({ payment_state: "paid", paid_at: new Date().toISOString() })
      .eq("id", winner_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  revalidatePath("/admin/winners");
  revalidatePath("/dashboard/winnings");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
