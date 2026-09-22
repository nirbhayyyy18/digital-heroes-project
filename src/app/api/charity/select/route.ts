import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// POST /api/charity/select  { charity_id: string, contribution_pct: number }
// Minimum contribution is 10% (§08.1); users may voluntarily raise it.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { charity_id, contribution_pct } = await request.json();
  const pct = Number(contribution_pct);

  if (pct < 10 || pct > 100) {
    return NextResponse.json({ error: "Contribution must be between 10% and 100%." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ charity_id, charity_contribution_pct: pct })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/dashboard/charity");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
