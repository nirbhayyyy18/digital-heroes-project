"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminUserScore = {
  id: string;
  score: number;
  played_on: string;
};

export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: "subscriber" | "admin";
  subscription_status:
    | "inactive"
    | "active"
    | "cancelled"
    | "lapsed";
  subscription_plan:
    | "monthly"
    | "yearly"
    | null;
  subscription_renews_at: string | null;
  charity_name: string | null;
  scores: AdminUserScore[];
};

const subscriptionStatuses = [
  "inactive",
  "active",
  "cancelled",
  "lapsed",
] as const;

const subscriptionPlans = [
  "monthly",
  "yearly",
] as const;

export default function AdminUserManager({
  users,
}: {
  users: AdminUser[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return users;

    return users.filter((user) =>
      [
        user.full_name ?? "",
        user.email,
        user.role,
        user.subscription_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, search]);

  async function saveUser(
    userId: string,
    form: HTMLFormElement
  ) {
    setBusy(userId);
    setMessage(null);
    setError(null);

    const formData = new FormData(form);

    try {
      const res = await fetch(
        `/api/admin/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "profile",

            full_name: String(
              formData.get("full_name") ?? ""
            ).trim(),

            role: String(
              formData.get("role") ??
                "subscriber"
            ),

            subscription_status: String(
              formData.get(
                "subscription_status"
              ) ?? "inactive"
            ),

            subscription_plan:
              String(
                formData.get(
                  "subscription_plan"
                ) ?? ""
              ) || null,

            subscription_renews_at:
              String(
                formData.get(
                  "subscription_renews_at"
                ) ?? ""
              ) || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not update user."
        );
      }

      setMessage(
        "User details updated successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update user."
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveScore(
    userId: string,
    scoreId: string,
    form: HTMLFormElement
  ) {
    setBusy(scoreId);
    setMessage(null);
    setError(null);

    const formData = new FormData(form);

    const score = Number(
      formData.get("score")
    );

    const playedOn = String(
      formData.get("played_on") ?? ""
    );

    try {
      const res = await fetch(
        `/api/admin/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "score",
            score_id: scoreId,
            score,
            played_on: playedOn,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not update score."
        );
      }

      setMessage(
        "Score updated successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update score."
      );
    } finally {
      setBusy(null);
    }
  }

  async function deleteScore(
    userId: string,
    scoreId: string
  ) {
    if (
      !window.confirm(
        "Delete this score? This cannot be undone."
      )
    ) {
      return;
    }

    setBusy(scoreId);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/users/${userId}?score_id=${encodeURIComponent(
          scoreId
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not delete score."
        );
      }

      setMessage(
        "Score deleted successfully."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete score."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">

      {/* SEARCH */}
      <div className="card !p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search name, email, role or subscription..."
            className="input-field flex-1"
          />

          <span className="text-xs text-mute whitespace-nowrap">
            Showing {filteredUsers.length} of{" "}
            {users.length} users
          </span>

        </div>
      </div>

      {/* SUCCESS */}
      {message && (
        <div className="rounded-xl border border-mint/20 bg-mint/5 px-4 py-3 text-sm text-mint">
          ✓ {message}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-sm text-amber">
          {error}
        </div>
      )}

      {/* USERS */}
      <div className="space-y-3">

        {filteredUsers.map((user) => {
          const isOpen =
            expanded === user.id;

          return (
            <div
              key={user.id}
              className="card !p-0 overflow-hidden"
            >

              {/* USER ROW */}
              <button
                type="button"
                onClick={() =>
                  setExpanded(
                    isOpen
                      ? null
                      : user.id
                  )
                }
                className="w-full text-left p-5 hover:bg-panel/60 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                  <div className="min-w-0">

                    <p className="font-semibold truncate">
                      {user.full_name ||
                        "Unnamed user"}
                    </p>

                    <p className="text-mute text-sm truncate mt-1">
                      {user.email}
                    </p>

                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="badge capitalize">
                      {user.role}
                    </span>

                    <span className="status-badge status-neutral capitalize">
                      {user.subscription_status}
                    </span>

                    <span className="badge">
                      {user.scores.length} / 5 scores
                    </span>

                    <span className="text-mint text-sm">
                      {isOpen
                        ? "Close ↑"
                        : "Manage →"}
                    </span>

                  </div>

                </div>
              </button>

              {/* EXPANDED */}
              {isOpen && (
                <div className="border-t border-line p-5 space-y-7 bg-panel/30">

                  {/* PROFILE */}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      saveUser(
                        user.id,
                        event.currentTarget
                      );
                    }}
                    className="space-y-4"
                  >

                    <div>
                      <p className="label-tag">
                        Profile & subscription
                      </p>

                      <h3 className="font-display text-xl font-semibold mt-1">
                        Manage account
                      </h3>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                      {/* NAME */}
                      <label className="space-y-2">
                        <span className="text-xs text-mute">
                          Full name
                        </span>

                        <input
                          name="full_name"
                          defaultValue={
                            user.full_name ??
                            ""
                          }
                          className="input-field"
                        />
                      </label>

                      {/* ROLE */}
                      <label className="space-y-2">
                        <span className="text-xs text-mute">
                          Role
                        </span>

                        <select
                          name="role"
                          defaultValue={
                            user.role
                          }
                          className="select-field w-full"
                        >
                          <option value="subscriber">
                            Subscriber
                          </option>

                          <option value="admin">
                            Admin
                          </option>
                        </select>
                      </label>

                      {/* STATUS */}
                      <label className="space-y-2">
                        <span className="text-xs text-mute">
                          Subscription status
                        </span>

                        <select
                          name="subscription_status"
                          defaultValue={
                            user.subscription_status
                          }
                          className="select-field w-full"
                        >
                          {subscriptionStatuses.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      {/* PLAN */}
                      <label className="space-y-2">
                        <span className="text-xs text-mute">
                          Plan
                        </span>

                        <select
                          name="subscription_plan"
                          defaultValue={
                            user.subscription_plan ??
                            ""
                          }
                          className="select-field w-full"
                        >
                          <option value="">
                            No plan
                          </option>

                          {subscriptionPlans.map(
                            (plan) => (
                              <option
                                key={plan}
                                value={plan}
                              >
                                {plan}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      {/* RENEWAL */}
                      <label className="space-y-2">
                        <span className="text-xs text-mute">
                          Renewal date
                        </span>

                        <input
                          type="date"
                          name="subscription_renews_at"
                          defaultValue={
                            user.subscription_renews_at
                              ? user.subscription_renews_at.slice(
                                  0,
                                  10
                                )
                              : ""
                          }
                          className="input-field"
                        />
                      </label>

                    </div>

                    <button
                      type="submit"
                      disabled={
                        busy === user.id
                      }
                      className="btn-primary !px-5 !py-2.5 text-sm"
                    >
                      {busy === user.id
                        ? "Saving…"
                        : "Save account changes"}
                    </button>

                  </form>

                  {/* SCORES */}
                  <div className="border-t border-line pt-6">

                    <div className="mb-4">

                      <p className="label-tag">
                        Golf scores
                      </p>

                      <p className="text-sm text-mute mt-1">
                        Edit or remove scores on
                        behalf of this user.
                        Stableford scores must
                        remain between 1 and 45,
                        with one score per date.
                      </p>

                    </div>

                    {user.scores.length > 0 ? (
                      <div className="space-y-3">

                        {user.scores.map(
                          (score) => (
                            <form
                              key={score.id}
                              onSubmit={(event) => {
                                event.preventDefault();

                                saveScore(
                                  user.id,
                                  score.id,
                                  event.currentTarget
                                );
                              }}
                              className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end rounded-xl border border-line bg-ink p-4"
                            >

                              <label className="space-y-2">

                                <span className="text-xs text-mute">
                                  Score
                                </span>

                                <input
                                  name="score"
                                  type="number"
                                  min="1"
                                  max="45"
                                  required
                                  defaultValue={
                                    score.score
                                  }
                                  className="input-field"
                                />

                              </label>

                              <label className="space-y-2">

                                <span className="text-xs text-mute">
                                  Played on
                                </span>

                                <input
                                  name="played_on"
                                  type="date"
                                  required
                                  defaultValue={
                                    score.played_on
                                  }
                                  className="input-field"
                                />

                              </label>

                              <button
                                type="submit"
                                disabled={
                                  busy ===
                                  score.id
                                }
                                className="btn-primary !px-4 !py-2.5 text-sm"
                              >
                                {busy ===
                                score.id
                                  ? "Saving…"
                                  : "Save"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busy ===
                                  score.id
                                }
                                onClick={() =>
                                  deleteScore(
                                    user.id,
                                    score.id
                                  )
                                }
                                className="btn-ghost !px-4 !py-2.5 text-sm"
                              >
                                Delete
                              </button>

                            </form>
                          )
                        )}

                      </div>
                    ) : (
                      <div className="rounded-xl border border-line bg-ink p-5 text-sm text-mute">
                        This user has no scores
                        recorded.
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="card text-center py-12">

            <p className="font-medium">
              No users found
            </p>

            <p className="text-mute text-sm mt-1">
              Try a different search term.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}