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

/** Correct answer ids for a multi-select question, as a set. */
function multiAnswerSet(q: Question): Set<string> {
  return new Set(q.answer.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
}

/** Ids the user selected for a multi-select question (stored as a key→"1" map). */
export function selectedIds(given: AnswerValue | undefined): string[] {
  return Object.keys(partAnswers(given)).filter((k) => partAnswers(given)[k]);
}

/** Is this answer fully correct? Multi-part requires every part correct (all-or-nothing). */
export function isCorrect(q: Question, given: AnswerValue | undefined): boolean {
  if (q.type === "multi-select") {
    const want = multiAnswerSet(q);
    const got = new Set(selectedIds(given).map((s) => s.toUpperCase()));
    return want.size > 0 && got.size === want.size && [...want].every((id) => got.has(id));
  }
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
  if (q.type === "multi-select") {
    const need = q.selectCount ?? multiAnswerSet(q).size;
    return selectedIds(given).length >= Math.max(1, need);
  }
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

// ---- Exam score mapping ----
// NOTE: real exams use proprietary scoring (GMAT is CAT; GRE/SAT are section/
// module-adaptive). These are transparent, clearly-labeled *estimates* on the
// official scales. Even official practice exams carry a meaningful margin.

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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

type Scale = {
  /** min/max of a single section's scaled score */
  min: number;
  max: number;
  sectionLabel: string;
  totalLabel: string;
  /** combine section scaled scores into a total */
  total: (sectionScores: number[]) => number;
};

const SCALES: Record<string, Scale> = {
  GMAT: {
    min: 60,
    max: 90,
    sectionLabel: "GMAT section (60–90)",
    totalLabel: "GMAT total (205–805)",
    total: gmatTotalScore,
  },
  GRE: {
    min: 130,
    max: 170,
    sectionLabel: "GRE section (130–170)",
    totalLabel: "GRE total (260–340)",
    total: (s) => clamp(Math.round(sum(s)), 260, 340),
  },
  SAT: {
    min: 200,
    max: 800,
    sectionLabel: "SAT section (200–800)",
    totalLabel: "SAT total (400–1600)",
    // round to nearest 10, like real SAT section scores
    total: (s) => clamp(Math.round(sum(s) / 10) * 10, 400, 1600),
  },
};

function scaleFor(exam: string): Scale | undefined {
  return SCALES[exam.toUpperCase()];
}

export type ScaledScore = { value: number; label: string };

/** Scaled score for a single section, by accuracy. null for exams without a scale. */
export function sectionScaled(exam: string, correct: number, total: number): ScaledScore | null {
  const s = scaleFor(exam);
  if (!s || !total) return null;
  const pct = correct / total;
  const value = Math.round(s.min + pct * (s.max - s.min));
  return { value, label: s.sectionLabel };
}

/** Combined total from section scaled values (for full-length mocks). */
export function totalScaled(exam: string, sectionValues: number[]): ScaledScore | null {
  const s = scaleFor(exam);
  if (!s || !sectionValues.length) return null;
  return { value: s.total(sectionValues), label: s.totalLabel };
}

/** Map an adaptive ability estimate (theta in [-2,2]) to the exam's section scale. */
export function abilityScaled(exam: string, theta: number): ScaledScore | null {
  const s = scaleFor(exam);
  if (!s) return null;
  const value = clamp(Math.round(s.min + ((theta + 2) / 4) * (s.max - s.min)), s.min, s.max);
  return { value, label: s.sectionLabel };
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
