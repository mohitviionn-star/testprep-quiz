import type { Question, QuestionPart } from "./types";

// Centralized scoring + answer-state logic, shared by the section runner, the
// quiz review, and the full-length mock report. Keeping it here (not in the UI)
// makes it unit-testable and keeps a single source of truth for correctness.

/** A user's answer: a string for mcq/numeric, or a per-part map for multi-part. */
export type AnswerValue = string | Record<string, string>;

/** Parse a numeric-entry value; supports plain numbers, commas, and "a/b" fractions. */
export function parseNumeric(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (s === "") return null;
  if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(s)) {
    const [n, d] = s.split("/").map((p) => parseFloat(p));
    return d === 0 ? null : n / d;
  }
  const v = parseFloat(s);
  return Number.isNaN(v) ? null : v;
}

/** Normalize a stored answer into a per-part map (empty for non-multi-part). */
export function partAnswers(given: AnswerValue | undefined): Record<string, string> {
  return given && typeof given === "object" ? given : {};
}

/**
 * Resolve the scored parts of a question. Two-Part Analysis can be authored with
 * `rows` + `answer` ("B,D") instead of explicit `parts`; we derive parts here so
 * scoring is uniform across every multi-part type.
 */
export function getParts(q: Question): QuestionPart[] {
  if (q.parts && q.parts.length) return q.parts;
  if (q.type === "two-part" && q.rows && q.answer) {
    const [a1 = "", a2 = ""] = q.answer.split(",").map((s) => s.trim());
    return [
      { id: "c1", choices: q.rows, answer: a1 },
      { id: "c2", choices: q.rows, answer: a2 },
    ];
  }
  return [];
}

export function isMultiPart(q: Question): boolean {
  return getParts(q).length > 0;
}

/** Is this answer fully correct? Multi-part requires every part correct (all-or-nothing). */
export function isCorrect(q: Question, given: AnswerValue | undefined): boolean {
  const parts = getParts(q);
  if (parts.length) {
    const a = partAnswers(given);
    return parts.every((p) => a[p.id] === p.answer);
  }
  if (q.type === "numeric") {
    if (typeof given !== "string") return false;
    const x = parseNumeric(given);
    if (x == null) return false;
    const target = parseNumeric(q.answer);
    if (target == null) return false;
    if (q.answerMax != null) {
      return x >= Math.min(target, q.answerMax) && x <= Math.max(target, q.answerMax);
    }
    const tol = q.tolerance ?? 1e-9;
    return Math.abs(x - target) <= tol + 1e-9;
  }
  return typeof given === "string" && given === q.answer;
}

/** Has the user supplied a complete answer (all parts, for multi-part)? */
export function hasAnswer(q: Question, given: AnswerValue | undefined): boolean {
  const parts = getParts(q);
  if (parts.length) {
    const a = partAnswers(given);
    return parts.every((p) => a[p.id] != null && a[p.id] !== "");
  }
  if (typeof given !== "string") return false;
  return q.type === "numeric" ? given.trim() !== "" : given !== "";
}

export function countCorrect(
  questions: Question[],
  answers: Record<string, AnswerValue>
): number {
  return questions.filter((q) => isCorrect(q, answers[q.id])).length;
}

// ---- GMAT Focus Edition score mapping ----
// NOTE: the real GMAT uses a proprietary CAT algorithm; these are transparent,
// clearly-labeled *estimates* on the official scales (section 60-90, total
// 205-805). Even official practice exams carry a ±30-40 point margin.

export function gmatSectionScore(correct: number, total: number): number {
  if (!total) return 60;
  return Math.round(60 + (correct / total) * 30); // 60-90
}

/** Derive a GMAT Focus total (205-805) from the three section scores (each 60-90). */
export function gmatTotalScore(sectionScores: number[]): number {
  if (!sectionScores.length) return 205;
  const avgNorm =
    sectionScores.reduce((s, v) => s + (v - 60) / 30, 0) / sectionScores.length;
  const raw = 205 + avgNorm * 600;
  return Math.min(805, Math.max(205, Math.round(raw / 10) * 10));
}

// ---- Strengths & weaknesses (by category) ----

export type SkillStat = {
  category: string;
  correct: number;
  total: number;
  pct: number;
};

const TYPE_LABELS: Record<string, string> = {
  numeric: "Numeric Entry",
  "two-part": "Two-Part Analysis",
  graphics: "Graphics Interpretation",
  "table-analysis": "Table Analysis",
  "multi-source": "Multi-Source Reasoning",
};

function categoryOf(q: Question): string {
  if (q.category) return q.category;
  if (q.type && q.type !== "mcq" && TYPE_LABELS[q.type]) return TYPE_LABELS[q.type];
  return "General";
}

export function strengthsWeaknesses(
  questions: Question[],
  answers: Record<string, AnswerValue>
): SkillStat[] {
  const map = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const cat = categoryOf(q);
    const e = map.get(cat) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (isCorrect(q, answers[q.id])) e.correct += 1;
    map.set(cat, e);
  }
  return Array.from(map.entries())
    .map(([category, { correct, total }]) => ({
      category,
      correct,
      total,
      pct: total ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}
