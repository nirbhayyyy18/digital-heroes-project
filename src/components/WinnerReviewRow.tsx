"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { centsToDisplay } from "@/lib/utils";

type Winner = {
  id: string;
  match_tier: number;
  amount_cents: number;
  review_state: string;
  payment_state: string;
  proof_url?: string | null;
  rejection_reason?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  draws?: {
    period_month?: number;
    period_year?: number;
  } | null;
};

export default function WinnerReviewRow({
  winner,
}: {
  winner: Winner;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string) {
    const labels: Record<string, string> = {
      approve: "approve this winner",
      reject: "reject this winner",
      mark_paid: "mark this winner as paid",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${labels[action]}?`
    );

    if (!confirmed) return;

    setBusy(action);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/winners/verify", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          winner_id: winner.id,
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setMessage(
        action === "approve"
          ? "Winner approved successfully."
          : action === "reject"
          ? "Winner rejected."
          : "Winner marked as paid."
      );

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const name =
    winner.profiles?.full_name ||
    winner.profiles?.email ||
    "Unknown user";

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const reviewLabel = winner.review_state
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const paymentLabel =
    winner.payment_state === "paid" ? "Paid" : "Payment pending";

  return (
    <div className="card hover:border-mint/30 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

        {/* User */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-11 w-11 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center text-mint font-semibold shrink-0">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-cloud truncate">
              {name}
            </p>

            {winner.profiles?.full_name && (
              <p className="text-mute text-xs truncate mt-0.5">
                {winner.profiles.email}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="badge">
                {winner.match_tier}-number match
              </span>

              <span className="badge">
                Draw {winner.draws?.period_month}/
                {winner.draws?.period_year}
              </span>
            </div>
          </div>
        </div>

        {/* Prize */}
        <div className="lg:text-right">
          <p className="label-tag mb-1">Prize</p>

          <p className="font-display text-2xl font-semibold text-cloud">
            {centsToDisplay(winner.amount_cents)}
          </p>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`status-badge ${
              winner.review_state === "submitted"
                ? "status-warning"
                : winner.review_state === "approved"
                ? "status-success"
                : winner.review_state === "rejected"
                ? "status-danger"
                : "status-neutral"
            }`}
          >
            {reviewLabel}
          </span>

          {winner.payment_state === "paid" && (
            <span className="status-badge status-success">
              {paymentLabel}
            </span>
          )}
        </div>
      </div>

      {/* Proof */}
      {winner.proof_url && (
        <div className="mt-5 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-tag mb-1">Proof submitted</p>

            <p className="text-sm text-mute">
              User has uploaded verification proof.
            </p>
          </div>

          <a
            href={winner.proof_url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost !px-4 !py-2 text-sm"
          >
            View proof →
          </a>
        </div>
      )}

      {!winner.proof_url &&
        winner.review_state === "awaiting_proof" && (
          <div className="mt-5 pt-5 border-t border-line">
            <p className="text-sm text-mute">
              Waiting for the winner to upload proof.
            </p>
          </div>
        )}

      {/* Actions */}
      {(winner.review_state === "submitted" ||
        (winner.review_state === "approved" &&
          winner.payment_state === "pending")) && (
        <div className="mt-5 pt-5 border-t border-line flex flex-wrap gap-3">
          {winner.review_state === "submitted" && (
            <>
              <button
                onClick={() => act("approve")}
                disabled={busy !== null}
                className="btn-primary !px-5 !py-2.5 text-sm"
              >
                {busy === "approve"
                  ? "Approving…"
                  : "✓ Approve winner"}
              </button>

              <button
                onClick={() => act("reject")}
                disabled={busy !== null}
                className="btn-ghost !px-5 !py-2.5 text-sm"
              >
                {busy === "reject"
                  ? "Rejecting…"
                  : "Reject"}
              </button>
            </>
          )}

          {winner.review_state === "approved" &&
            winner.payment_state === "pending" && (
              <button
                onClick={() => act("mark_paid")}
                disabled={busy !== null}
                className="btn-primary !px-5 !py-2.5 text-sm"
              >
                {busy === "mark_paid"
                  ? "Updating…"
                  : "₹ Mark as paid"}
              </button>
            )}
        </div>
      )}

      {/* Feedback */}
      {message && (
        <div className="mt-4 rounded-lg border border-mint/20 bg-mint/5 px-4 py-3 text-sm text-mint">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber">
          {error}
        </div>
      )}
    </div>
  );
}