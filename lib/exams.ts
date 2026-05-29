// The exams the app onboards users into. Used by the home chooser and the
// per-exam prep landing page.

export type ExamInfo = {
  /** canonical code matching quiz `exam` values, e.g. "GMAT" */
  code: string;
  /** url slug, e.g. "gmat" */
  slug: string;
  title: string;
  tagline: string;
  blurb: string;
  /** tailwind gradient classes for the card */
  gradient: string;
  /** id of a full-length mock for this exam, if any */
  mockId?: string;
};

export const EXAMS: ExamInfo[] = [
  {
    code: "GMAT",
    slug: "gmat",
    title: "GMAT",
    tagline: "Focus Edition",
    blurb: "Quant, Verbal, and Data Insights — with a full-length adaptive-style mock.",
    gradient: "from-blue-600 to-indigo-700",
    mockId: "gmat-focus",
  },
  {
    code: "GRE",
    slug: "gre",
    title: "GRE",
    tagline: "General Test",
    blurb: "Verbal reasoning, text completion, and quantitative comparison.",
    gradient: "from-violet-600 to-fuchsia-600",
  },
  {
    code: "SAT",
    slug: "sat",
    title: "SAT",
    tagline: "Digital SAT",
    blurb: "Heart of algebra, geometry, reading, and writing & language.",
    gradient: "from-emerald-600 to-teal-600",
  },
];

export function examBySlug(slug: string): ExamInfo | undefined {
  return EXAMS.find((e) => e.slug === slug.toLowerCase());
}

export function examByCode(code: string): ExamInfo | undefined {
  return EXAMS.find((e) => e.code.toLowerCase() === code.toLowerCase());
}
