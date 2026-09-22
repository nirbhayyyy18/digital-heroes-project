"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Score } from "@/types/database";

export default function ScoreForm({
  scores,
}: {
  scores: Score[];
}) {
  const router = useRouter();

  // Add score form
  const [score, setScore] = useState("");
  const [playedOn, setPlayedOn] = useState("");

  // Edit score
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editingScore, setEditingScore] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [editingLoading, setEditingLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        score: Number(score),
        played_on: playedOn,
      }),
    });

    const body = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(
        body.error ||
          "Could not save the score."
      );
      return;
    }

    setScore("");
    setPlayedOn("");

    setSuccess(
      "Score added successfully."
    );

    router.refresh();
  }

  function startEditing(
    id: string,
    currentScore: number
  ) {
    setEditingId(id);
    setEditingScore(
      String(currentScore)
    );
    setError(null);
    setSuccess(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingScore("");
    setError(null);
  }

  async function handleEdit(
    id: string
  ) {
    const numericScore =
      Number(editingScore);

    if (
      !Number.isInteger(numericScore) ||
      numericScore < 1 ||
      numericScore > 45
    ) {
      setError(
        "Score must be an integer between 1 and 45."
      );
      return;
    }

    setEditingLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        "/api/scores",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            score: numericScore,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body.error ||
            "Could not update the score."
        );
      }

      setEditingId(null);
      setEditingScore("");

      setSuccess(
        "Score updated successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the score."
      );
    } finally {
      setEditingLoading(false);
    }
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this score?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/scores?id=${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(
          body.error ||
            "Could not delete the score."
        );
      }

      if (editingId === id) {
        setEditingId(null);
        setEditingScore("");
      }

      setSuccess(
        "Score deleted successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete the score."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <div className="space-y-8">

      {/* ADD SCORE */}
      <form
        onSubmit={handleSubmit}
        className="card flex flex-wrap items-end gap-4"
      >
        <div>
          <label className="label-tag block mb-2">
            Score (Stableford, 1–45)
          </label>

          <input
            required
            type="number"
            min={1}
            max={45}
            value={score}
            onChange={(e) =>
              setScore(e.target.value)
            }
            className="bg-ink border border-line rounded-lg px-4 py-3 w-32 focus:outline-none focus:border-mint"
          />
        </div>

        <div>
          <label className="label-tag block mb-2">
            Date played
          </label>

          <input
            required
            type="date"
            value={playedOn}
            onChange={(e) =>
              setPlayedOn(e.target.value)
            }
            max={today}
            className="bg-ink border border-line rounded-lg px-4 py-3 focus:outline-none focus:border-mint"
          />
        </div>

        <button
          disabled={loading}
          className="btn-primary"
          type="submit"
        >
          {loading
            ? "Saving…"
            : "Add score"}
        </button>

        {error && (
          <p className="text-amber text-sm w-full">
            {error}
          </p>
        )}

        {success && (
          <p className="text-mint text-sm w-full">
            ✓ {success}
          </p>
        )}
      </form>

      {/* SCORES */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="label-tag">
            Your latest {scores.length} of 5 scores
            (most recent first)
          </p>

          <span className="text-xs text-mute">
            {scores.length}/5
          </span>
        </div>

        {scores.length === 0 ? (
          <div className="card">
            <p className="text-mute text-sm">
              No scores logged yet — add your
              first round above.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">

            {scores.map((s) => {
              const isEditing =
                editingId === s.id;

              const isDeleting =
                deletingId === s.id;

              return (
                <li
                  key={s.id}
                  className="card"
                >

                  {!isEditing ? (
                    /* NORMAL SCORE VIEW */
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                      <div className="flex items-center">
                        <span className="font-display text-2xl mr-4">
                          {s.score}
                        </span>

                        <div>
                          <p className="text-sm text-cloud">
                            Stableford score
                          </p>

                          <p className="text-mute text-xs mt-0.5">
                            {new Date(
                              s.played_on
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">

                        <button
                          type="button"
                          onClick={() =>
                            startEditing(
                              s.id,
                              s.score
                            )
                          }
                          disabled={
                            isDeleting ||
                            editingLoading
                          }
                          className="btn-ghost !px-4 !py-2 text-sm"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              s.id
                            )
                          }
                          disabled={
                            isDeleting ||
                            editingLoading
                          }
                          className="text-mute hover:text-amber text-sm transition-colors"
                        >
                          {isDeleting
                            ? "Deleting…"
                            : "Delete"}
                        </button>

                      </div>

                    </div>
                  ) : (
                    /* EDIT VIEW */
                    <div className="space-y-4">

                      <div>
                        <p className="label-tag">
                          Edit score
                        </p>

                        <p className="text-mute text-xs mt-1">
                          The played date stays
                          unchanged.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-end gap-4">

                        <div>
                          <label className="label-tag block mb-2">
                            Score (1–45)
                          </label>

                          <input
                            autoFocus
                            type="number"
                            min={1}
                            max={45}
                            value={editingScore}
                            onChange={(e) =>
                              setEditingScore(
                                e.target.value
                              )
                            }
                            className="bg-ink border border-line rounded-lg px-4 py-3 w-32 focus:outline-none focus:border-mint"
                          />
                        </div>

                        <div>
                          <p className="label-tag mb-2">
                            Date played
                          </p>

                          <p className="bg-ink border border-line rounded-lg px-4 py-3 text-sm text-mute">
                            {new Date(
                              s.played_on
                            ).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex gap-3">

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                s.id
                              )
                            }
                            disabled={
                              editingLoading
                            }
                            className="btn-primary !px-5 !py-3 text-sm"
                          >
                            {editingLoading
                              ? "Saving…"
                              : "Save changes"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEditing
                            }
                            disabled={
                              editingLoading
                            }
                            className="btn-ghost !px-5 !py-3 text-sm"
                          >
                            Cancel
                          </button>

                        </div>

                      </div>

                    </div>
                  )}

                </li>
              );
            })}

          </ul>
        )}
      </div>

      {/* ERROR / SUCCESS BELOW LIST */}
      {error && scores.length > 0 && (
        <div className="rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber">
          {error}
        </div>
      )}

    </div>
  );
}