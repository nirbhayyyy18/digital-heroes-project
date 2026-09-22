import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireActiveSubscription() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.subscription_status !== "active") {
    redirect("/dashboard/subscription");
  }

  return {
    supabase,
    user,
    profile,
  };
}