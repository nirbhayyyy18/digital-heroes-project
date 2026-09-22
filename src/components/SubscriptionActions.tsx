"use client";

import { useState } from "react";

type SubscriptionActionsProps = {
  plan: "monthly" | "yearly";
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export default function SubscriptionActions({
  plan,
  subscriptionStatus,
  cancelAtPeriodEnd = false,
}: SubscriptionActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isActive = subscriptionStatus === "active";

  async function handleSubscribe() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Unable to start checkout.");
        setLoading(false);
        return;
      }

      if (body.url) {
        window.location.href = body.url;
        return;
      }

      setError("Stripe checkout URL was not returned.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period."
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Unable to cancel subscription.");
        setLoading(false);
        return;
      }

      setMessage(
        body.message ||
          "Your subscription has been scheduled for cancellation."
      );

      // Refresh the server-rendered subscription page
      // so the latest subscription state is displayed.
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  /*
   * If the user has an active subscription,
   * don't show another Subscribe button.
   */
  if (isActive) {
    return (
      <div className="space-y-3">
        {cancelAtPeriodEnd ? (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-medium">
              Cancellation scheduled
            </p>

            <p className="text-mute mt-1 text-xs">
              Your subscription will remain active until the end of
              your current billing period.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full rounded-xl border border-red-500/30 px-4 py-3 text-sm font-medium transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Cancel Subscription"}
          </button>
        )}

        {message && (
          <p className="text-sm text-mint">
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  /*
   * Non-active subscription:
   * allow the user to subscribe again.
   */
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? "Redirecting…" : `Subscribe ${plan}`}
      </button>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {message && (
        <p className="text-sm text-mint">
          {message}
        </p>
      )}
    </div>
  );
}