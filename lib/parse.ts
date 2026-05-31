import yaml from "js-yaml";
import type { Choice, DataTable, Question, QuestionPart, QuestionType, Source, Quiz } from "./types";

// Normalizes loosely-structured quiz data (from JSON, YAML, or Excel) into a
// strict Quiz object. We accept several common field spellings so non-technical
// authors don't have to match an exact schema.

const CHOICE_KEYS = ["a", "b", "c", "d", "e", "f"];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function pick(obj: Record<string, any>, keys: string[]): any {
  for (const k of Object.keys(obj)) {
    if (keys.includes(k.toLowerCase().trim())) return obj[k];
  }
  return undefined;
}

function normalizeChoices(raw: any): Choice[] {
  // Array form: ["foo", "bar"] or [{id, text, image}]
  if (Array.isArray(raw)) {
    return raw.map((c, i) => {
      const id = String.fromCharCode(65 + i); // A, B, C...
      if (c && typeof c === "object") {
        return {
          id: String(c.id ?? id).toUpperCase(),
          text: String(c.text ?? c.label ?? ""),
          image: c.image ? String(c.image) : undefined,
        };
      }
      return { id, text: String(c) };
    });
  }
  // Object form: { A: "...", B: "..." }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([k, v]) => ({ id: k.toUpperCase(), text: String(v) }));
  }
  return [];
}

/** Resolve an answer value (could be "B", index, or the answer text) to a choice id. */
function resolveAnswer(answerRaw: any, choices: Choice[]): string {
  if (answerRaw == null) return "";
  const a = String(answerRaw).trim();
  // Direct letter id
  const byId = choices.find((c) => c.id.toUpperCase() === a.toUpperCase());
  if (byId) return byId.id;
  // Numeric index (1-based or 0-based)
  if (/^\d+$/.test(a)) {
    const n = parseInt(a, 10);
    if (choices[n - 1]) return choices[n - 1].id; // 1-based
    if (choices[n]) return choices[n].id; // 0-based
  }
  // Match by text
  const byText = choices.find((c) => c.text.trim().toLowerCase() === a.toLowerCase());
  if (byText) return byText.id;
  return a.toUpperCase();
}

function normalizeType(raw: Record<string, any>, hasChoices: boolean): QuestionType {
  const t = pick(raw, ["type", "qtype", "format", "kind"]);
  if (t != null) {
    const s = String(t).toLowerCase().replace(/[^a-z]/g, "");
    if (["numeric", "numericentry", "gridin", "fillin", "input", "freeresponse", "number"].includes(s)) return "numeric";
    if (["multiselect", "multipleselect", "selectmany", "sentenceequivalence", "selectinpassage", "checkbox"].includes(s)) return "multi-select";
    if (["twopart", "twopartanalysis"].includes(s)) return "two-part";
    if (["graphics", "graphicsinterpretation", "graph", "dropdown"].includes(s)) return "graphics";
    if (["tableanalysis", "table"].includes(s)) return "table-analysis";
    if (["multisource", "multisourcereasoning", "msr"].includes(s)) return "multi-source";
    if (["mcq", "multiplechoice", "single"].includes(s)) return "mcq";
  }
  // Inferred: no choices but an answer present → numeric entry.
  return hasChoices ? "mcq" : "numeric";
}

function normalizePart(raw: Record<string, any>, index: number): QuestionPart {
  const choices = normalizeChoices(pick(raw, ["choices", "options", "answers"]) ?? []);
  return {
    id: String(pick(raw, ["id"]) ?? `p${index + 1}`),
    prompt: ((): string | undefined => {
      const p = pick(raw, ["prompt", "label", "statement", "text"]);
      return p != null ? String(p) : undefined;
    })(),
    choices,
    answer: resolveAnswer(pick(raw, ["answer", "correct", "key"]), choices),
  };
}

function normalizeTable(raw: any): DataTable | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const columns = Array.isArray(raw.columns) ? raw.columns.map(String) : [];
  const rows = Array.isArray(raw.rows) ? raw.rows.map((r: any) => (Array.isArray(r) ? r.map(String) : [String(r)])) : [];
  if (!columns.length && !rows.length) return undefined;
  return { columns, rows };
}

function normalizeSources(raw: any): Source[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((s, i) => ({
    title: String(s?.title ?? `Source ${i + 1}`),
    content: s?.content != null ? String(s.content) : undefined,
    table: normalizeTable(s?.table),
  }));
}

function normalizeQuestion(raw: Record<string, any>, index: number): Question | null {
  const prompt = pick(raw, ["prompt", "question", "q", "stem", "text"]);
  if (!prompt) return null;

  let choices: Choice[];
  const choicesRaw = pick(raw, ["choices", "options", "answers"]);
  if (choicesRaw) {
    choices = normalizeChoices(choicesRaw);
  } else {
    // Flat columns: a, b, c, d (typical for Excel/CSV)
    choices = CHOICE_KEYS.map((k, i) => {
      const v = pick(raw, [k, `choice${k}`, `option${k}`, `opt${k}`]);
      return v != null && String(v).trim() !== ""
        ? { id: String.fromCharCode(65 + i), text: String(v) }
        : null;
    }).filter(Boolean) as Choice[];
  }

  const type = normalizeType(raw, choices.length > 0);
  const answerRaw = pick(raw, ["answer", "correct", "correctanswer", "key", "solution"]);

  // Numeric keeps the raw value; multi-select joins ids; MCQ resolves to a choice id.
  let answer: string;
  if (type === "numeric") {
    answer = String(answerRaw ?? "").trim();
  } else if (type === "multi-select") {
    const ids = Array.isArray(answerRaw) ? answerRaw : String(answerRaw ?? "").split(",");
    answer = ids.map((x) => resolveAnswer(x, choices)).filter(Boolean).join(",");
  } else {
    answer = resolveAnswer(answerRaw, choices);
  }
  const selectCountRaw = pick(raw, ["selectcount", "choose", "pick"]);

  const answerMaxRaw = pick(raw, ["answermax", "answer_max", "max", "upper"]);
  const toleranceRaw = pick(raw, ["tolerance", "tol", "epsilon"]);
  const unit = pick(raw, ["unit", "units", "suffix"]);

  const explanation = pick(raw, ["explanation", "rationale", "why", "feedback"]);
  const image = pick(raw, ["image", "img", "diagram", "figure", "imageurl", "image_url"]);
  const imageAlt = pick(raw, ["imagealt", "image_alt", "alt"]);
  const passage = pick(raw, ["passage", "stimulus", "context", "reading"]);
  const id = String(pick(raw, ["id"]) ?? `q${index + 1}`);

  const answerMax = answerMaxRaw != null && String(answerMaxRaw).trim() !== "" ? Number(answerMaxRaw) : undefined;
  const tolerance = toleranceRaw != null && String(toleranceRaw).trim() !== "" ? Number(toleranceRaw) : undefined;

  // Multi-part / DI structures.
  const partsRaw = pick(raw, ["parts"]);
  const parts = Array.isArray(partsRaw) ? partsRaw.map((p, i) => normalizePart(p, i)) : undefined;
  const colRaw = pick(raw, ["columnlabels", "columnheaders"]);
  const columnLabels =
    Array.isArray(colRaw) && colRaw.length >= 2 ? ([String(colRaw[0]), String(colRaw[1])] as [string, string]) : undefined;
  const rowsRaw = pick(raw, ["rows"]);
  const rows = type === "two-part" && rowsRaw ? normalizeChoices(rowsRaw) : undefined;
  const table = type === "table-analysis" || type === "multi-source" ? normalizeTable(pick(raw, ["table"])) : undefined;
  const sources = type === "multi-source" ? normalizeSources(pick(raw, ["sources"])) : undefined;
  const category = pick(raw, ["category", "topic", "skill", "tag"]);
  const diffRaw = pick(raw, ["difficulty", "level", "diff"]);
  const diffStr = diffRaw != null ? String(diffRaw).toLowerCase().trim() : "";
  const difficulty =
    diffStr.startsWith("e") || diffStr === "1"
      ? "easy"
      : diffStr.startsWith("h") || diffStr === "3"
      ? "hard"
      : diffStr.startsWith("m") || diffStr === "2"
      ? "medium"
      : undefined;

  return {
    id,
    type,
    category: category != null && String(category).trim() !== "" ? String(category) : undefined,
    difficulty,
    prompt: String(prompt),
    choices,
    answer,
    selectCount: selectCountRaw != null && Number.isFinite(Number(selectCountRaw)) ? Number(selectCountRaw) : undefined,
    answerMax: Number.isFinite(answerMax) ? answerMax : undefined,
    tolerance: Number.isFinite(tolerance) ? tolerance : undefined,
    unit: unit != null && String(unit).trim() !== "" ? String(unit) : undefined,
    parts,
    columnLabels,
    rows,
    table,
    sources,
    explanation: explanation != null ? String(explanation) : undefined,
    image: image != null && String(image).trim() !== "" ? String(image) : undefined,
    imageAlt: imageAlt != null ? String(imageAlt) : undefined,
    passage: passage != null && String(passage).trim() !== "" ? String(passage) : undefined,
  };
}

export function normalizeQuiz(raw: any, fallbackTitle = "Uploaded Quiz"): Quiz {
  // Accept either { ...meta, questions: [...] } or a bare array of questions.
  const meta = Array.isArray(raw) ? {} : raw ?? {};
  const questionsRaw: any[] = Array.isArray(raw)
    ? raw
    : raw?.questions ?? raw?.items ?? [];

  const questions = questionsRaw
    .map((q, i) => normalizeQuestion(q, i))
    .filter((q): q is Question => q !== null);

  const title = String(meta.title ?? meta.name ?? fallbackTitle);
  const exam = String(meta.exam ?? meta.test ?? "Custom");
  const section = String(meta.section ?? meta.category ?? "General");
  const id = String(meta.id ?? slug(`${exam}-${section}-${title}`)) || slug(title) || "uploaded";

  // Time limit accepts seconds (timeLimitSec) or minutes (timeLimit/minutes/timeMinutes).
  const secRaw = meta.timeLimitSec ?? meta.timeLimitSeconds;
  const minRaw = meta.timeLimit ?? meta.timeLimitMin ?? meta.timeLimitMinutes ?? meta.minutes ?? meta.timeMinutes;
  let timeLimitSec: number | undefined;
  if (secRaw != null && Number.isFinite(Number(secRaw))) timeLimitSec = Number(secRaw);
  else if (minRaw != null && Number.isFinite(Number(minRaw))) timeLimitSec = Number(minRaw) * 60;

  return {
    id,
    title,
    exam,
    section,
    description: meta.description ? String(meta.description) : undefined,
    timeLimitSec: timeLimitSec && timeLimitSec > 0 ? timeLimitSec : undefined,
    questions,
  };
}

// ---- Format-specific entry points ----

export function parseJSON(text: string): Quiz {
  return normalizeQuiz(JSON.parse(text));
}

export function parseYAML(text: string): Quiz {
  return normalizeQuiz(yaml.load(text));
}

/**
 * Parse an Excel/CSV workbook. Loaded lazily so the (large) xlsx library is
 * only pulled into the bundle on the upload page.
 * Expected columns (case-insensitive): question | a | b | c | d | answer | explanation
 * Optional first-row meta is not supported for Excel; metadata can be passed in.
 */
export async function parseExcel(
  data: ArrayBuffer,
  meta?: { title?: string; exam?: string; section?: string }
): Promise<Quiz> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  return normalizeQuiz({ ...meta, questions: rows }, meta?.title ?? "Excel Quiz");
}

export type SupportedFormat = "json" | "yaml" | "excel";

export function detectFormat(filename: string): SupportedFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "json") return "json";
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "excel";
  return null;
}
