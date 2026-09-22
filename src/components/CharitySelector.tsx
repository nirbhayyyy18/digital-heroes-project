"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Charity } from "@/types/database";
import DonationForm from "@/components/DonationForm";

export default function CharitySelector({
  charities,
  currentCharityId,
  currentPct,
}: {
  charities: Charity[];
  currentCharityId: string | null;
  currentPct: number;
}) {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(
    currentCharityId
  );
  const [pct, setPct] = useState(currentPct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCharity = charities.find(
    (charity) => charity.id === selected
  );

  async function save() {
    if (!selected) {
      setError("Pick a charity first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/charity/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          charity_id: selected,
          contribution_pct: pct,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Unable to save selection.");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Charity selection */}
      <div className="grid sm:grid-cols-2 gap-4">
        {charities.map((charity) => (
          <button
            key={charity.id}
            type="button"
            onClick={() => {
              setSelected(charity.id);
              setError(null);
            }}
            className={`card text-left transition-colors ${
              selected === charity.id
                ? "border-mint"
                : "hover:border-line"
            }`}
          >
            <h3 className="font-display text-xl mb-1">
              {charity.name}
            </h3>

            <p className="text-mute text-sm line-clamp-2">
              {charity.description}
            </p>
          </button>
        ))}
      </div>

      {/* Subscription contribution */}
      <div className="card">
        <label className="label-tag block mb-3">
          Contribution: {pct}%
        </label>

        <input
          type="range"
          min={10}
          max={100}
          value={pct}
          onChange={(event) => setPct(Number(event.target.value))}
          className="w-full accent-mint"
        />

        <p className="text-mute text-xs mt-2">
          Minimum 10%. Raise it any time — it never lowers your
          subscription price.
        </p>
      </div>

      {error && (
        <p className="text-amber text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? "Saving…" : "Save selection"}
      </button>

      {/* Independent donation */}
      <DonationForm
        charityId={selected}
        charityName={selectedCharity?.name ?? null}
      />
    </div>
  );
}