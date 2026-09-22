"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create the profile row (also created redundantly by a DB trigger in
    // production setups — done here client-side to keep the SQL simple for
    // this sample assignment; see README for the trigger-based alternative).
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: "subscriber",
      });
    }

    router.push("/dashboard/subscription");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-3xl font-semibold mb-2">Create your account</h1>
      <p className="text-mute mb-8 text-sm">
        Subscribe next to unlock score entry, draws, and charity selection.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-tag block mb-2">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="label-tag block mb-2">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="label-tag block mb-2">Password</label>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>
        {error && <p className="text-amber text-sm">{error}</p>}
        <button disabled={loading} className="btn-primary w-full" type="submit">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-mute text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-mint">
          Log in
        </Link>
      </p>
    </main>
  );
}
