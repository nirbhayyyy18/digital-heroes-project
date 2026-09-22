"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { centsToDisplay } from "@/lib/utils";

export default function DrawControls({ defaultMonth, defaultYear }: { defaultMonth: number; defaultYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [drawType, setDrawType] = useState<"random" | "algorithmic">("random");
  const [drawId, setDrawId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: any) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function handleSetup() {
    setBusy("setup");
    setError(null);
    try {
      const { draw } = await post("/api/draws/run", { month, year, draw_type: drawType });
      setDrawId(draw.id);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(null);
  }

  async function handleSimulate() {
    if (!drawId) return;
    setBusy("simulate");
    setError(null);
    try {
      const { result } = await post("/api/draws/simulate", { draw_id: drawId });
      setPreview(result);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(null);
  }

  async function handlePublish() {
    if (!drawId) return;
    setBusy("publish");
    setError(null);
    try {
      await post("/api/draws/publish", { draw_id: drawId });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(null);
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="label-tag block mb-2">Month</label>
          <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-ink border border-line rounded-lg px-4 py-3 w-24" />
        </div>
        <div>
          <label className="label-tag block mb-2">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-ink border border-line rounded-lg px-4 py-3 w-28" />
        </div>
        <div>
          <label className="label-tag block mb-2">Draw type</label>
          <select value={drawType} onChange={(e) => setDrawType(e.target.value as any)} className="bg-ink border border-line rounded-lg px-4 py-3">
            <option value="random">Random (lottery-style)</option>
            <option value="algorithmic">Algorithmic (weighted by score frequency)</option>
          </select>
        </div>
        <button onClick={handleSetup} disabled={busy === "setup"} className="btn-ghost">
          {busy === "setup" ? "Setting up…" : "1. Create / refresh draw"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleSimulate} disabled={!drawId || busy === "simulate"} className="btn-ghost">
          {busy === "simulate" ? "Simulating…" : "2. Run simulation"}
        </button>
        <button onClick={handlePublish} disabled={!drawId || !preview || busy === "publish"} className="btn-primary">
          {busy === "publish" ? "Publishing…" : "3. Publish results"}
        </button>
      </div>

      {error && <p className="text-amber text-sm">{error}</p>}

      {preview && (
        <div className="border-t border-line pt-6">
          <p className="label-tag mb-2">Winning numbers</p>
          <p className="font-display text-3xl text-mint mb-4">{preview.winningNumbers.join(" · ")}</p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[5, 4, 3].map((tier) => (
              <div key={tier}>
                <p className="label-tag mb-1">{tier}-match winners</p>
                <p>{preview.winnersByTier[tier].length} winner(s)</p>
                {preview.winnersByTier[tier][0] && (
                  <p className="text-mute">{centsToDisplay(preview.winnersByTier[tier][0].shareCents)} each</p>
                )}
              </div>
            ))}
          </div>
          {preview.rolloverOutCents > 0 && (
            <p className="text-amber text-sm mt-4">
              No 5-match winner — {centsToDisplay(preview.rolloverOutCents)} rolls over to next month.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
