"use client";

import { useMemo, useState } from "react";
import WinnerReviewRow from "@/components/WinnerReviewRow";

export default function WinnersList({
  winners,
}: {
  winners: any[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [tier, setTier] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return winners.filter((winner) => {
      const name =
        winner.profiles?.full_name?.toLowerCase() ?? "";

      const email =
        winner.profiles?.email?.toLowerCase() ?? "";

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query);

      const matchesStatus =
        status === "all" ||
        winner.review_state === status;

      const matchesTier =
        tier === "all" ||
        String(winner.match_tier) === tier;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTier
      );
    });
  }, [winners, search, status, tier]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card !p-4">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input-field"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select-field"
          >
            <option value="all">All statuses</option>
            <option value="awaiting_proof">
              Awaiting proof
            </option>
            <option value="submitted">
              Submitted
            </option>
            <option value="approved">
              Approved
            </option>
            <option value="rejected">
              Rejected
            </option>
          </select>

          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="select-field"
          >
            <option value="all">All matches</option>
            <option value="5">5-number</option>
            <option value="4">4-number</option>
            <option value="3">3-number</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-mute">
          <span>
            Showing {filtered.length} of {winners.length} winners
          </span>

          {(search || status !== "all" || tier !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatus("all");
                setTier("all");
              }}
              className="text-mint hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((winner) => (
          <WinnerReviewRow
            key={winner.id}
            winner={winner}
          />
        ))}

        {filtered.length === 0 && (
          <div className="card text-center py-12">
            <p className="font-medium">
              No matching winners
            </p>

            <p className="text-mute text-sm mt-1">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}