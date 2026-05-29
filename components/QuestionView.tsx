"use client";

import { useState } from "react";
import RichText from "@/components/RichText";
import Figure from "@/components/Figure";
import type { DataTable, Question } from "@/lib/types";
import { getParts, partAnswers, type AnswerValue } from "@/lib/scoring";

type Mode = "answer" | "review";

type Props = {
  question: Question;
  mode: Mode;
  value: AnswerValue | undefined;
  onChange?: (v: AnswerValue) => void;
};

// Renders a single question for any supported type. In "answer" mode inputs are
// interactive; in "review" mode they are read-only with correct/incorrect color.

export default function QuestionView({ question: q, mode, value, onChange }: Props) {
  const review = mode === "review";
  const parts = partAnswers(value);

  function setPart(partId: string, choiceId: string) {
    onChange?.({ ...parts, [partId]: choiceId });
  }

  return (
    <div>
      {q.passage && (
        <div className="mb-4 max-h-72 overflow-y-auto rounded-lg border-l-4 border-brand-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          <RichText text={q.passage} />
        </div>
      )}

      {q.sources && q.sources.length > 0 && <SourceTabs sources={q.sources} />}

      <p className="text-lg font-semibold text-slate-900">
        <RichText text={q.prompt} />
      </p>

      {q.image && <Figure src={q.image} alt={q.imageAlt} />}

      {q.table && <DataTableView table={q.table} />}

      <div className="mt-5">
        {q.type === "numeric" ? (
          <NumericBody q={q} review={review} value={typeof value === "string" ? value : ""} onChange={(v) => onChange?.(v)} />
        ) : q.type === "two-part" ? (
          <TwoPartBody q={q} review={review} answers={parts} setPart={setPart} />
        ) : q.type === "graphics" ? (
          <DropdownParts q={q} review={review} answers={parts} setPart={setPart} />
        ) : q.type === "table-analysis" || (q.type === "multi-source" && getParts(q).length) ? (
          <StatementParts q={q} review={review} answers={parts} setPart={setPart} />
        ) : (
          <McqBody q={q} review={review} value={typeof value === "string" ? value : ""} onChange={(v) => onChange?.(v)} />
        )}
      </div>
    </div>
  );
}

// ---------- MCQ ----------

function McqBody({
  q,
  review,
  value,
  onChange,
}: {
  q: Question;
  review: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {q.choices.map((c) => {
        const selected = value === c.id;
        const isAns = c.id === q.answer;
        let cls = "border-slate-200 hover:border-brand-300 hover:bg-slate-50";
        if (review) {
          cls = isAns
            ? "border-emerald-300 bg-emerald-50"
            : selected
            ? "border-rose-300 bg-rose-50"
            : "border-slate-200";
        } else if (selected) {
          cls = "border-brand-500 bg-brand-50";
        }
        return (
          <button
            key={c.id}
            type="button"
            disabled={review}
            onClick={() => onChange(c.id)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${cls} ${
              review ? "cursor-default" : ""
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                selected || (review && isAns) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {c.id}
            </span>
            <span className="text-slate-800">
              <RichText text={c.text} />
              {c.image && <Figure src={c.image} className="!my-2 !justify-start" />}
            </span>
            {review && isAns && <span className="ml-auto text-xs font-semibold text-emerald-700">✓ Answer</span>}
            {review && selected && !isAns && (
              <span className="ml-auto text-xs font-semibold text-rose-700">Your choice</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Numeric ----------

function NumericBody({
  q,
  review,
  value,
  onChange,
}: {
  q: Question;
  review: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  if (review) {
    const ok = value.trim() !== "";
    return (
      <div className="space-y-2 text-sm">
        <div className="rounded-lg border border-slate-200 px-3 py-2">
          Your answer: <span className={ok ? "font-semibold" : "text-slate-400"}>{ok ? value : "—"}</span>
        </div>
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
          Correct answer: <span className="font-semibold">{q.answer}</span>
          {q.unit ? ` ${q.unit}` : ""}
          {q.answerMax != null && ` (range ${q.answer}–${q.answerMax})`}
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">Your answer</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 15 or 3/4"
          className="w-48 rounded-xl border-2 border-slate-200 px-4 py-3 text-lg focus:border-brand-500 focus:outline-none"
        />
        {q.unit && <span className="text-slate-500">{q.unit}</span>}
      </div>
    </div>
  );
}

// ---------- Two-Part Analysis ----------

function TwoPartBody({
  q,
  review,
  answers,
  setPart,
}: {
  q: Question;
  review: boolean;
  answers: Record<string, string>;
  setPart: (partId: string, choiceId: string) => void;
}) {
  const rows = q.rows ?? [];
  const [c1Label, c2Label] = q.columnLabels ?? ["Column 1", "Column 2"];
  const derived = getParts(q);
  const ans1 = derived[0]?.answer;
  const ans2 = derived[1]?.answer;

  function cell(col: "c1" | "c2", rowId: string, correctId?: string) {
    const checked = answers[col] === rowId;
    const showCorrect = review && correctId === rowId;
    const showWrong = review && checked && correctId !== rowId;
    return (
      <td className="border-b border-slate-100 px-3 py-2 text-center">
        <input
          type="radio"
          name={`${q.id}-${col}`}
          checked={checked}
          disabled={review}
          onChange={() => setPart(col, rowId)}
          className="h-4 w-4 accent-brand-600"
        />
        {showCorrect && <span className="ml-1 text-xs font-bold text-emerald-700">✓</span>}
        {showWrong && <span className="ml-1 text-xs font-bold text-rose-700">✗</span>}
      </td>
    );
  }

  return (
    <table className="w-full overflow-hidden rounded-lg text-sm ring-1 ring-slate-200">
      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <tr>
          <th className="px-3 py-2 text-center">{c1Label}</th>
          <th className="px-3 py-2 text-center">{c2Label}</th>
          <th className="px-3 py-2 text-left">Option</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {cell("c1", r.id, ans1)}
            {cell("c2", r.id, ans2)}
            <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
              <RichText text={r.text} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------- Graphics Interpretation (dropdown blanks) ----------

function DropdownParts({
  q,
  review,
  answers,
  setPart,
}: {
  q: Question;
  review: boolean;
  answers: Record<string, string>;
  setPart: (partId: string, choiceId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {(q.parts ?? []).map((p) => {
        const sel = answers[p.id] ?? "";
        const correct = review && sel === p.answer;
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
            {p.prompt && (
              <span>
                <RichText text={p.prompt} />
              </span>
            )}
            <select
              value={sel}
              disabled={review}
              onChange={(e) => setPart(p.id, e.target.value)}
              className={`rounded-lg border-2 px-3 py-1.5 ${
                review
                  ? correct
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-rose-300 bg-rose-50"
                  : "border-slate-200 focus:border-brand-500 focus:outline-none"
              }`}
            >
              <option value="">Select…</option>
              {p.choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.text}
                </option>
              ))}
            </select>
            {review && !correct && (
              <span className="text-xs font-semibold text-emerald-700">
                Correct: {p.choices.find((c) => c.id === p.answer)?.text ?? p.answer}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Statement parts (Table Analysis & Multi-Source statements) ----------

function StatementParts({
  q,
  review,
  answers,
  setPart,
}: {
  q: Question;
  review: boolean;
  answers: Record<string, string>;
  setPart: (partId: string, choiceId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
      {(q.parts ?? []).map((p, i) => {
        const sel = answers[p.id] ?? "";
        const correct = sel === p.answer;
        return (
          <div
            key={p.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${
              i % 2 ? "bg-slate-50/60" : "bg-white"
            }`}
          >
            <span className="flex-1 text-slate-800">
              <RichText text={p.prompt ?? ""} />
              {review && !correct && (
                <span className="ml-2 text-xs font-semibold text-emerald-700">
                  (Correct: {p.choices.find((c) => c.id === p.answer)?.text ?? p.answer})
                </span>
              )}
            </span>
            <div className="flex gap-2">
              {p.choices.map((c) => {
                const checked = sel === c.id;
                let cls = "border-slate-200 text-slate-600 hover:bg-slate-100";
                if (review) {
                  if (c.id === p.answer) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
                  else if (checked) cls = "border-rose-300 bg-rose-50 text-rose-800";
                } else if (checked) {
                  cls = "border-brand-500 bg-brand-50 text-brand-700";
                }
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={review}
                    onClick={() => setPart(p.id, c.id)}
                    className={`rounded-lg border-2 px-3 py-1 text-xs font-semibold transition ${cls}`}
                  >
                    {c.text}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Shared: data table + source tabs ----------

function DataTableView({ table }: { table: DataTable }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} className="px-3 py-2 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-slate-800">
                  <RichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceTabs({ sources }: { sources: NonNullable<Question["sources"]> }) {
  const [active, setActive] = useState(0);
  const src = sources[active];
  return (
    <div className="mb-4 rounded-lg ring-1 ring-slate-200">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
        {sources.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              i === active ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm leading-relaxed text-slate-700">
        {src.content && <RichText text={src.content} />}
        {src.table && <DataTableView table={src.table} />}
      </div>
    </div>
  );
}
