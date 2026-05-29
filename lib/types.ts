// Core data model for the quiz app. Kept deliberately small so authors can
// write questions in JSON, YAML, or Excel without learning a complex schema.

export type Choice = {
  id: string; // "A", "B", "C", ...
  text: string;
  /** optional image for answer choices that are themselves diagrams */
  image?: string;
};

/**
 * Supported question formats:
 * - "mcq"            single-answer multiple choice (default)
 * - "numeric"        free-response numeric entry / grid-in
 * - "two-part"       GMAT Data Insights Two-Part Analysis (two columns, shared options)
 * - "graphics"       GMAT Graphics Interpretation (figure + dropdown blanks)
 * - "table-analysis" GMAT Table Analysis (data table + Yes/No-style statements)
 * - "multi-source"   GMAT Multi-Source Reasoning (tabbed sources + MCQ or statements)
 *
 * Multi-part types (two-part, graphics, table-analysis, and statement-style
 * multi-source) are scored all-or-nothing: every part must be correct, matching
 * official GMAT Data Insights scoring.
 */
export type QuestionType =
  | "mcq"
  | "numeric"
  | "two-part"
  | "graphics"
  | "table-analysis"
  | "multi-source";

/** One independently-answered sub-question (a dropdown, a statement, or a column). */
export type QuestionPart = {
  id: string;
  /** Statement / dropdown label (may contain math). */
  prompt?: string;
  choices: Choice[];
  /** id of the correct choice within this part. */
  answer: string;
};

/** Tabular data shown for Table Analysis and Multi-Source Reasoning. */
export type DataTable = {
  columns: string[];
  rows: string[][];
};

/** One tab of a Multi-Source Reasoning stimulus. */
export type Source = {
  title: string;
  /** Text content (may contain math); falls back to a table if provided. */
  content?: string;
  table?: DataTable;
};

/** Question difficulty, used by the adaptive engine and analytics. Defaults to "medium". */
export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  /** Defaults to "mcq" when omitted. */
  type?: QuestionType;
  /** Skill tag for strengths/weaknesses analytics, e.g. "Algebra", "Critical Reasoning". */
  category?: string;
  /** Difficulty for the adaptive engine; defaults to "medium" when omitted. */
  difficulty?: Difficulty;
  /** Question text. May contain inline math ($...$) and block math ($$...$$). */
  prompt: string;
  /** Answer options for "mcq". Empty for "numeric" and multi-part types. */
  choices: Choice[];
  /**
   * For "mcq": the id of the correct choice, e.g. "B".
   * For "numeric": the correct value as a string, e.g. "15" or "3/4".
   * For "two-part": "<col1Id>,<col2Id>" (also derivable from parts).
   * For other multi-part types: leave blank; correctness comes from parts.
   */
  answer: string;
  /**
   * Numeric only: if set, any value in the inclusive range [answer, answerMax]
   * is accepted (e.g. "between 0.33 and 0.34").
   */
  answerMax?: number;
  /** Numeric only: absolute tolerance, e.g. 0.01 accepts answer ± 0.01. */
  tolerance?: number;
  /** Numeric only: optional unit shown next to the input, e.g. "cm", "%". */
  unit?: string;
  /** Multi-part types: the independently-scored sub-questions. */
  parts?: QuestionPart[];
  /** Two-part Analysis: the two column headers. */
  columnLabels?: [string, string];
  /** Two-part Analysis: shared row options (one selection per column). */
  rows?: Choice[];
  /** Table Analysis / Multi-Source: the data table shown to the test-taker. */
  table?: DataTable;
  /** Multi-Source Reasoning: the tabbed source materials. */
  sources?: Source[];
  /** May contain math, like the prompt. */
  explanation?: string;
  /** Diagram/figure URL (absolute, or under /public e.g. "/data/images/fig.svg"). */
  image?: string;
  /** Alt text for the image (accessibility). */
  imageAlt?: string;
  /**
   * Shared reading passage / stimulus shown above the question (GRE/SAT verbal,
   * reading comprehension). May contain math.
   */
  passage?: string;
};

export type Quiz = {
  id: string;
  title: string;
  /** GMAT | GRE | SAT | custom */
  exam: string;
  section: string;
  description?: string;
  /** Optional overall time limit in seconds; enables timed mode + auto-submit. */
  timeLimitSec?: number;
  questions: Question[];
};

/** Lightweight entry used by the sections/home listing (no questions loaded). */
export type QuizMeta = {
  id: string;
  title: string;
  exam: string;
  section: string;
  description?: string;
  /** path under /public, e.g. "/data/gmat-quant.json" — omitted for uploaded quizzes */
  file?: string;
  /** number of questions, when known */
  count?: number;
  /** optional time limit in seconds; shown as a badge on the section card */
  timeLimitSec?: number;
  /** true if the quiz was uploaded by the user and lives in localStorage */
  uploaded?: boolean;
};

export type Manifest = {
  quizzes: QuizMeta[];
};

/** One section of a full-length mock exam (references a quiz file). */
export type MockSection = {
  id: string;
  title: string;
  /** path under /public, e.g. "/data/gmat-quant.json" */
  file: string;
  /** per-section time limit in seconds */
  timeLimitSec: number;
};

/** A full-length, multi-section mock exam (e.g. GMAT Focus). */
export type Mock = {
  id: string;
  title: string;
  exam: string;
  description?: string;
  sections: MockSection[];
};

/** A single completed-quiz record stored locally for the dashboard. */
export type Attempt = {
  quizId: string;
  title: string;
  exam: string;
  section: string;
  score: number; // number correct
  total: number;
  /** ISO timestamp */
  takenAt: string;
  /** seconds spent */
  durationSec: number;
  /** optional scaled score (e.g. GMAT total 205-805 or section 60-90) */
  scaledScore?: number;
  /** label for the scaled score, e.g. "GMAT total" */
  scaleLabel?: string;
};
