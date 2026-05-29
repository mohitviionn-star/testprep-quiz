"use client";

import { useState } from "react";
import Link from "next/link";
import { detectFormat, parseExcel, parseJSON, parseYAML } from "@/lib/parse";
import { saveUploadedQuiz } from "@/lib/storage";
import type { Quiz } from "@/lib/types";
import RichText from "@/components/RichText";
import Figure from "@/components/Figure";

export default function UploadPage() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setSaved(false);
    setQuiz(null);
    const fmt = detectFormat(file.name);
    if (!fmt) {
      setError("Unsupported file type. Please upload a .json, .yaml, .yml, .xlsx, .xls, or .csv file.");
      return;
    }
    try {
      let parsed: Quiz;
      if (fmt === "excel") {
        const buf = await file.arrayBuffer();
        parsed = await parseExcel(buf, { title: file.name.replace(/\.[^.]+$/, "") });
      } else {
        const text = await file.text();
        parsed = fmt === "json" ? parseJSON(text) : parseYAML(text);
      }
      if (parsed.questions.length === 0) {
        setError("No questions were found in that file. Check the format against the templates below.");
        return;
      }
      setQuiz(parsed);
    } catch (e) {
      setError(`Could not parse the file: ${(e as Error).message}`);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function save() {
    if (!quiz) return;
    saveUploadedQuiz(quiz);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Upload questions</h1>
        <p className="mt-1 text-slate-600">
          Add a quiz from a JSON, YAML, or Excel/CSV file. No admin panel, no server —
          the quiz is stored privately in your browser and appears under Sections.
        </p>
      </div>

      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-10 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-400"
        }`}
      >
        <input
          type="file"
          accept=".json,.yaml,.yml,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="text-4xl">📄</div>
        <p className="mt-3 font-semibold text-slate-800">Drop a file here or click to browse</p>
        <p className="mt-1 text-sm text-slate-500">.json · .yaml · .xlsx · .csv</p>
      </label>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Preview */}
      {quiz && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="badge bg-brand-50 text-brand-700">{quiz.exam}</span>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{quiz.title}</h2>
              <p className="text-sm text-slate-500">
                {quiz.section} · {quiz.questions.length} questions
              </p>
            </div>
            {saved ? (
              <Link href={`/quiz/${quiz.id}`} className="btn-primary">
                Start quiz →
              </Link>
            ) : (
              <button onClick={save} className="btn-primary">
                Save to Sections
              </button>
            )}
          </div>

          {saved && (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              Saved! This quiz now appears on the Sections page.
            </p>
          )}

          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Preview</p>
            {quiz.questions.slice(0, 3).map((q, i) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-800">
                  {i + 1}. <RichText text={q.prompt} />
                </p>
                {q.image && <Figure src={q.image} alt={q.imageAlt} className="!my-2" />}
                <ul className="mt-2 space-y-1 text-slate-600">
                  {q.choices.map((c) => (
                    <li key={c.id} className={c.id === q.answer ? "font-semibold text-emerald-700" : ""}>
                      {c.id}. <RichText text={c.text} /> {c.id === q.answer && "✓"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {quiz.questions.length > 3 && (
              <p className="text-xs text-slate-400">+ {quiz.questions.length - 3} more questions</p>
            )}
          </div>
        </div>
      )}

      {/* Format help */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900">File format</h3>
        <p className="mt-1 text-sm text-slate-600">
          Each question needs a prompt, a list of choices, and the correct answer. Field names are
          flexible (e.g. <code className="rounded bg-slate-100 px-1">question</code> or{" "}
          <code className="rounded bg-slate-100 px-1">prompt</code>). Download a template to get started:
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/templates/sample-quiz.json" download className="btn-ghost">
            JSON template
          </a>
          <a href="/templates/sample-quiz.yaml" download className="btn-ghost">
            YAML template
          </a>
          <a href="/templates/sample-quiz.csv" download className="btn-ghost">
            CSV template
          </a>
        </div>
        <div className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">Excel / CSV columns</p>
            <p className="mt-1">
              <code>question, a, b, c, d, answer, explanation, image</code> — the{" "}
              <code>answer</code> column can be a letter (A–D), the option text, or its number.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Math</p>
            <p className="mt-1">
              Wrap LaTeX in <code>$ … $</code> (inline) or <code>$$ … $$</code> (block):
              e.g. <code>{"$\\frac{x}{3} = 5$"}</code> renders as a fraction.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Diagrams &amp; passages (JSON / YAML)</p>
            <p className="mt-1">
              Add <code>image</code> (a URL or a <code>/public</code> path) for a figure, and{" "}
              <code>passage</code> for shared reading text shown above the question.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Numeric / grid-in questions</p>
            <p className="mt-1">
              Set <code>{'"type": "numeric"'}</code> with an empty <code>choices</code> list; the{" "}
              <code>answer</code> is the value (e.g. <code>15</code> or <code>3/4</code>). Optional{" "}
              <code>tolerance</code>, <code>answerMax</code> (range), and <code>unit</code>.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Timed mode</p>
            <p className="mt-1">
              Add <code>timeLimit</code> (minutes) or <code>timeLimitSec</code> at the top level to
              enable a countdown timer with auto-submit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
