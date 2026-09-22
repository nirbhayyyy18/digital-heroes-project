"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 rounded-lg text-sm text-mute hover:text-amber hover:bg-panel transition-colors text-left w-full"
    >
      Sign out
    </button>
  );
}