import type { Difficulty, Question } from "./types";

// A lightweight difficulty-adaptive engine. It is NOT a calibrated IRT/CAT model
// (the real GMAT's is proprietary) — it's a transparent ability tracker:
// start at medium, step up after a correct answer and down after a wrong one,
// always serving the unused question whose difficulty is closest to the current
// ability estimate. Honest and good practice; clearly labeled as an estimate.

/** Map difficulty to a point on the ability axis. */
export function difficultyValue(d: Difficulty | undefined): number {
  if (d === "easy") return -1;
  if (d === "hard") return 1;
  return 0; // medium / unspecified
}

const STEP = 0.45; // how much each answer moves the ability estimate
const MIN = -2;
const MAX = 2;

/** Update the ability estimate after an answer. */
export function updateAbility(theta: number, correct: boolean): number {
  const next = theta + (correct ? STEP : -STEP);
  return Math.max(MIN, Math.min(MAX, next));
}

/**
 * Pick the next question: the unused item whose difficulty is closest to the
 * current ability. Ties are broken deterministically by the provided index so
 * the same run is reproducible.
 */
export function pickNext(
  pool: Question[],
  askedIds: Set<string>,
  theta: number
): Question | null {
  const remaining = pool.filter((q) => !askedIds.has(q.id));
  if (remaining.length === 0) return null;
  let best: Question | null = null;
  let bestDist = Infinity;
  remaining.forEach((q) => {
    const dist = Math.abs(difficultyValue(q.difficulty) - theta);
    if (dist < bestDist) {
      bestDist = dist;
      best = q;
    }
  });
  return best;
}

/** How many questions an adaptive run should serve from a pool. */
export function adaptiveLength(poolSize: number): number {
  return Math.min(12, poolSize);
}

export type AbilityLevel = "Beginner" | "Intermediate" | "Advanced";

export function abilityLevel(theta: number): AbilityLevel {
  if (theta >= 0.7) return "Advanced";
  if (theta >= -0.4) return "Intermediate";
  return "Beginner";
}

/** Map the final ability estimate to a GMAT-style section score (60–90). */
export function abilityToSectionScore(theta: number): number {
  return Math.max(60, Math.min(90, Math.round(75 + theta * 7.5)));
}
