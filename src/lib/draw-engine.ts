// ============================================================================
// DRAW & PRIZE POOL ENGINE — implements PRD §06 (Draw & Reward System)
// and §07 (Prize Pool Logic).
//
// Pure business logic — no database or network I/O.
//
// Both simulation and publishing should use the same winner-calculation
// logic so that the simulated result matches the real published result.
// ============================================================================

export type DrawType = "random" | "algorithmic";

export interface EntryInput {
  userId: string;
  numbers: number[]; // exactly 5 unique numbers, 1-45
}

export interface PoolBreakdown {
  totalPoolCents: number;
  pool5MatchCents: number; // 40% + rollover
  pool4MatchCents: number; // 35%
  pool3MatchCents: number; // 25%
}

export interface WinnersByTier {
  5: { userId: string; shareCents: number }[];
  4: { userId: string; shareCents: number }[];
  3: { userId: string; shareCents: number }[];
}

export interface DrawResult {
  winningNumbers: number[];
  pool: PoolBreakdown;
  winnersByTier: WinnersByTier;
  rolloverOutCents: number;
}

type WinnerTier = 3 | 4 | 5;

const POOL_SHARE = {
  5: 0.4,
  4: 0.35,
  3: 0.25,
} as const;

/**
 * §07 — Calculates the prize pool.
 *
 * New contributed money is divided:
 *
 * 5-match = 40%
 * 4-match = 35%
 * 3-match = 25%
 *
 * Any previous 5-match rollover is added entirely to the
 * new 5-match jackpot.
 */
export function calculatePoolBreakdown(
  contributedPoolCents: number,
  rolloverInCents: number
): PoolBreakdown {
  if (
    !Number.isFinite(contributedPoolCents) ||
    contributedPoolCents < 0
  ) {
    throw new Error(
      "contributedPoolCents must be a non-negative number."
    );
  }

  if (
    !Number.isFinite(rolloverInCents) ||
    rolloverInCents < 0
  ) {
    throw new Error(
      "rolloverInCents must be a non-negative number."
    );
  }

  const contributed = Math.floor(
    contributedPoolCents
  );

  const rollover = Math.floor(
    rolloverInCents
  );

  const pool5MatchCents =
    Math.round(
      contributed * POOL_SHARE[5]
    ) + rollover;

  const pool4MatchCents =
    Math.round(
      contributed * POOL_SHARE[4]
    );

  const pool3MatchCents =
    Math.round(
      contributed * POOL_SHARE[3]
    );

  return {
    totalPoolCents:
      contributed + rollover,

    pool5MatchCents,

    pool4MatchCents,

    pool3MatchCents,
  };
}

/**
 * Validates all draw entries before they participate
 * in a draw.
 */
function validateEntries(
  entries: EntryInput[]
): void {
  const seenUsers = new Set<string>();

  for (const entry of entries) {
    if (!entry.userId) {
      throw new Error(
        "Every draw entry must have a userId."
      );
    }

    if (seenUsers.has(entry.userId)) {
      throw new Error(
        `Duplicate draw entry found for user ${entry.userId}.`
      );
    }

    seenUsers.add(entry.userId);

    if (!Array.isArray(entry.numbers)) {
      throw new Error(
        `Draw entry for user ${entry.userId} has invalid numbers.`
      );
    }

    if (entry.numbers.length !== 5) {
      throw new Error(
        `Draw entry for user ${entry.userId} must contain exactly 5 numbers.`
      );
    }

    const numbers =
      entry.numbers.map(Number);

    for (const number of numbers) {
      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 45
      ) {
        throw new Error(
          `Invalid draw number ${number} for user ${entry.userId}.`
        );
      }
    }

    if (
      new Set(numbers).size !== 5
    ) {
      throw new Error(
        `Draw entry for user ${entry.userId} contains duplicate numbers.`
      );
    }
  }
}

/**
 * §06 — Random draw.
 *
 * Picks exactly 5 unique numbers from 1-45.
 */
export function drawRandomNumbers(
  seed?: number
): number[] {
  const rand =
    seed !== undefined
      ? mulberry32(seed)
      : Math.random;

  const pool = Array.from(
    { length: 45 },
    (_, index) => index + 1
  );

  const picked: number[] = [];

  for (
    let i = 0;
    i < 5 && pool.length > 0;
    i++
  ) {
    const index = Math.floor(
      rand() * pool.length
    );

    picked.push(
      pool.splice(index, 1)[0]
    );
  }

  return picked.sort(
    (a, b) => a - b
  );
}

/**
 * §06 — Algorithmic draw.
 *
 * Numbers appearing more frequently across submitted
 * entries receive higher probability.
 */
export function drawWeightedByFrequency(
  entries: EntryInput[],
  seed?: number
): number[] {
  validateEntries(entries);

  const rand =
    seed !== undefined
      ? mulberry32(seed)
      : Math.random;

  const frequency =
    new Map<number, number>();

  for (const entry of entries) {
    for (const number of entry.numbers) {
      frequency.set(
        number,
        (frequency.get(number) ?? 0) + 1
      );
    }
  }

  const weightedPool: number[] = [];

  for (
    let number = 1;
    number <= 45;
    number++
  ) {
    const weight =
      1 +
      (frequency.get(number) ?? 0);

    for (
      let i = 0;
      i < weight;
      i++
    ) {
      weightedPool.push(number);
    }
  }

  const picked = new Set<number>();

  let guard = 0;

  while (
    picked.size < 5 &&
    guard < 10000
  ) {
    const index = Math.floor(
      rand() * weightedPool.length
    );

    picked.add(
      weightedPool[index]
    );

    guard++;
  }

  if (picked.size !== 5) {
    throw new Error(
      "Unable to generate 5 unique algorithmic draw numbers."
    );
  }

  return Array.from(picked).sort(
    (a, b) => a - b
  );
}

/**
 * Counts how many numbers an entry matches against
 * the winning numbers.
 */
function matchCount(
  entryNumbers: number[],
  winningNumbers: number[]
): number {
  const winningSet =
    new Set(winningNumbers);

  return entryNumbers.filter(
    (number) =>
      winningSet.has(number)
  ).length;
}

/**
 * Validates the winning number set.
 */
function validateWinningNumbers(
  winningNumbers: number[]
): void {
  if (
    !Array.isArray(winningNumbers)
  ) {
    throw new Error(
      "Winning numbers must be an array."
    );
  }

  if (winningNumbers.length !== 5) {
    throw new Error(
      "A draw must have exactly 5 winning numbers."
    );
  }

  const normalized =
    winningNumbers.map(Number);

  for (const number of normalized) {
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 45
    ) {
      throw new Error(
        `Invalid winning number: ${number}.`
      );
    }
  }

  if (
    new Set(normalized).size !== 5
  ) {
    throw new Error(
      "Winning numbers must be unique."
    );
  }
}

/**
 * Calculates winners using an already selected set
 * of winning numbers.
 *
 * This is shared by simulation and publishing.
 */
export function calculateWinners(
  entries: EntryInput[],
  winningNumbers: number[],
  pool: PoolBreakdown
): {
  winnersByTier: WinnersByTier;
  rolloverOutCents: number;
} {
  validateEntries(entries);

  validateWinningNumbers(
    winningNumbers
  );

  const byTier: Record<
    WinnerTier,
    string[]
  > = {
    5: [],
    4: [],
    3: [],
  };

  for (const entry of entries) {
    const matches =
      matchCount(
        entry.numbers,
        winningNumbers
      );

    if (matches === 5) {
      byTier[5].push(
        entry.userId
      );
    } else if (matches === 4) {
      byTier[4].push(
        entry.userId
      );
    } else if (matches === 3) {
      byTier[3].push(
        entry.userId
      );
    }
  }

  const splitEqually = (
    userIds: string[],
    poolCents: number
  ) => {
    if (userIds.length === 0) {
      return [];
    }

    const shareCents =
      Math.floor(
        poolCents /
          userIds.length
      );

    return userIds.map(
      (userId) => ({
        userId,
        shareCents,
      })
    );
  };

  const rolloverOutCents =
    byTier[5].length === 0
      ? pool.pool5MatchCents
      : 0;

  return {
    winnersByTier: {
      5: splitEqually(
        byTier[5],
        pool.pool5MatchCents
      ),

      4: splitEqually(
        byTier[4],
        pool.pool4MatchCents
      ),

      3: splitEqually(
        byTier[3],
        pool.pool3MatchCents
      ),
    },

    rolloverOutCents,
  };
}

/**
 * Runs a complete draw.
 */
export function runDraw(
  drawType: DrawType,
  entries: EntryInput[],
  pool: PoolBreakdown,
  seed?: number
): DrawResult {
  validateEntries(entries);

  const winningNumbers =
    drawType === "random"
      ? drawRandomNumbers(seed)
      : drawWeightedByFrequency(
          entries,
          seed
        );

  const winnerCalculation =
    calculateWinners(
      entries,
      winningNumbers,
      pool
    );

  return {
    winningNumbers,

    pool,

    winnersByTier:
      winnerCalculation.winnersByTier,

    rolloverOutCents:
      winnerCalculation.rolloverOutCents,
  };
}

// ============================================================================
// Deterministic PRNG
// ============================================================================

function mulberry32(a: number) {
  return function () {
    a |= 0;

    a =
      (a + 0x6d2b79f5) | 0;

    let t = Math.imul(
      a ^ (a >>> 15),
      1 | a
    );

    t =
      (t +
        Math.imul(
          t ^ (t >>> 7),
          61 | t
        )) ^
      t;

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}