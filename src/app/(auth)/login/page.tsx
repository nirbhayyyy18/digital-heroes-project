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

  function validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    const trimmedEmail = email.trim();

    // Validate email before sending login request
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

    if (signInError) {
      setError("Invalid email or password")
      setLoading(false)
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
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
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
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
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