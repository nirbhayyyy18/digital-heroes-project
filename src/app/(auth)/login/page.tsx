"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <h1 className="font-display text-3xl font-semibold mb-2">
        Welcome back
      </h1>

      <p className="text-mute mb-8 text-sm">
        Log in to enter scores and check this month&rsquo;s draw.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-tag block mb-2">
            Email
          </label>

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>

        <div>
          <label className="label-tag block mb-2">
            Password
          </label>

          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-panel border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>

        {error && (
          <p className="text-amber text-sm">
            {error}
          </p>
        )}

        <button
          disabled={loading}
          className="btn-primary w-full"
          type="submit"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-mute text-sm mt-6">
        No account yet?{" "}
        <Link href="/signup" className="text-mint">
          Subscribe
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-6 py-24" />}>
      <LoginForm />
    </Suspense>
  );
}