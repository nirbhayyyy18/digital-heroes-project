export function centsToDisplay(cents: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(cents / 100);
}

export function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// Derive 5 pseudo-lottery numbers (1-45, matching Stableford score range)
// deterministically from a user's own scores, so a user's "ticket" always
// reflects the golf performance they logged for that period.
export function numbersFromScores(scores: number[]): number[] {
  const padded = [...scores];
  while (padded.length < 5) padded.push(((padded.length + 1) * 7) % 45 + 1);
  // de-duplicate while preserving 1-45 range
  const seen = new Set<number>();
  const out: number[] = [];
  for (const s of padded.slice(0, 5)) {
    let n = Math.max(1, Math.min(45, s));
    while (seen.has(n)) n = (n % 45) + 1;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}
