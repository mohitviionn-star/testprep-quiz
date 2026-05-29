"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { hasAnswer, type AnswerValue } from "@/lib/scoring";
import QuestionView from "@/components/QuestionView";

export type SectionResult = {
  answers: Record<string, AnswerValue>;
  elapsedSec: number;
  /** seconds spent on each question id */
  timeByQuestion: Record<string, number>;
  /** ids of bookmarked questions */
  bookmarkedIds: string[];
};

type Props = {
  title: string;
  questions: Question[];
  timeLimitSec?: number;
  backHref?: string;
  submitLabel?: string;
  contextLabel?: string;
  onFinish: (result: SectionResult) => void;
};

/** GMAT Focus allows changing up to 3 already-answered questions during review. */
const EDIT_LIMIT = 3;

function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function SectionRunner({
  title,
  questions,
  timeLimitSec,
  backHref,
  submitLabel = "Submit section",
  contextLabel,
  onFinish,
}: Props) {
  const [phase, setPhase] = useState<"answer" | "review">("answer");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [editsUsed, setEditsUsed] = useState(0);
  const [reviewEntered, setReviewEntered] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const startRef = useRef<number>(Date.now());
  const qStartRef = useRef<number>(Date.now());
  const timeRef = useRef<Record<string, number>>({});
  const doneRef = useRef(false);

  const total = questions.length;
  const q = questions[current];
  const timed = !!timeLimitSec;
  const remaining = timed ? Math.max(0, timeLimitSec! - elapsed) : 0;
  const answeredCount = questions.filter((qq) => hasAnswer(qq, answers[qq.id])).length;
  const lowTime = timed && remaining <= 30;
  const editsLeft = EDIT_LIMIT - editsUsed;

  /** Accumulate time spent on the currently-shown question. */
  const flushTime = useCallback(() => {
    const id = questions[current]?.id;
    if (!id) return;
    const now = Date.now();
    timeRef.current[id] = (timeRef.current[id] ?? 0) + (now - qStartRef.current) / 1000;
    qStartRef.current = now;
  }, [current, questions]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    flushTime();
    const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
    const rounded: Record<string, number> = {};
    for (const [k, v] of Object.entries(timeRef.current)) rounded[k] = Math.round(v);
    onFinish({
      answers,
      elapsedSec: timed ? Math.min(elapsedSec, timeLimitSec!) : elapsedSec,
      timeByQuestion: rounded,
      bookmarkedIds: Object.keys(bookmarked).filter((k) => bookmarked[k]),
    });
  }, [answers, bookmarked, flushTime, onFinish, timed, timeLimitSec]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (timed && elapsed >= timeLimitSec!) finish();
  }, [elapsed, timed, timeLimitSec, finish]);

  function goTo(i: number) {
    flushTime();
    setCurrent(i);
    setPhase("answer");
  }

  function openReview() {
    flushTime();
    setReviewEntered(true);
    setEditMsg(null);
    setPhase("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAnswerChange(v: AnswerValue) {
    const prev = answers[q.id];
    // During review, changing an already-answered question counts against the edit budget.
    if (reviewEntered && hasAnswer(q, prev) && JSON.stringify(prev) !== JSON.stringify(v)) {
      if (editsUsed >= EDIT_LIMIT) {
        setEditMsg(`No edits remaining — you've used all ${EDIT_LIMIT}.`);
        return;
      }
      setEditsUsed((e) => e + 1);
      setEditMsg(null);
    }
    setAnswers((a) => ({ ...a, [q.id]: v }));
  }

  if (total === 0) {
    return <div className="card p-10 text-center text-slate-600">This section has no questions.</div>;
  }

  // ---------- Review & Edit screen ----------
  if (phase === "review") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-900">Review your answers</h2>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
              lowTime ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            ⏱ {timed ? fmtTime(remaining) : fmtTime(elapsed)}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {answeredCount}/{total} answered · <strong>{editsLeft}</strong> of {EDIT_LIMIT} edits left.
          Tap a question to revisit it.
        </p>

        <div className="card divide-y divide-slate-100">
          {questions.map((qq, i) => {
            const ans = hasAnswer(qq, answers[qq.id]);
            return (
              <button
                key={qq.id}
                onClick={() => goTo(i)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-slate-700">
                  {qq.prompt.replace(/\$/g, "").slice(0, 70)}
                </span>
                {bookmarked[qq.id] && <span title="Bookmarked">🔖</span>}
                <span
                  className={`badge ${ans ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {ans ? "Answered" : "Unanswered"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => goTo(current)} className="btn-ghost">
            ← Back to questions
          </button>
          <button onClick={finish} className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Answering screen ----------
  const isBookmarked = !!bookmarked[q.id];
  const progress = Math.round((answeredCount / total) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          {backHref ? (
            <Link href={backHref} className="hover:text-slate-700">
              ← {title}
            </Link>
          ) : (
            <span className="font-medium text-slate-700">{title}</span>
          )}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tabular-nums ${
                lowTime ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
              }`}
              title={timed ? "Time remaining" : "Time elapsed"}
            >
              ⏱ {timed ? fmtTime(remaining) : fmtTime(elapsed)}
            </span>
            <span>
              {current + 1} / {total}
            </span>
          </div>
        </div>
        {contextLabel && <p className="mt-1 text-xs font-semibold text-brand-600">{contextLabel}</p>}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {reviewEntered && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>Editing — {editsLeft}/{EDIT_LIMIT} edits left</span>
          <button onClick={openReview} className="font-semibold underline">
            Return to review →
          </button>
        </div>
      )}

      {/* Navigator */}
      <div className="card p-3">
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qq, i) => {
            const ans = hasAnswer(qq, answers[qq.id]);
            const isCur = i === current;
            return (
              <button
                key={qq.id}
                onClick={() => goTo(i)}
                title={`Question ${i + 1}${bookmarked[qq.id] ? " (bookmarked)" : ""}${ans ? " — answered" : ""}`}
                className={`relative h-8 w-8 rounded-md text-xs font-bold transition ${
                  isCur
                    ? "bg-brand-600 text-white ring-2 ring-brand-300"
                    : ans
                    ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {i + 1}
                {bookmarked[qq.id] && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-1 ring-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setBookmarked((b) => ({ ...b, [q.id]: !b[q.id] }))}
            title={isBookmarked ? "Remove bookmark" : "Bookmark to revisit later"}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              isBookmarked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {isBookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"}
          </button>
        </div>
        <QuestionView question={q} mode="answer" value={answers[q.id]} onChange={onAnswerChange} />
        {editMsg && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{editMsg}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0} className="btn-ghost">
          ← Previous
        </button>
        <span className="text-sm text-slate-400">
          {answeredCount}/{total} answered
        </span>
        {current < total - 1 ? (
          <button onClick={() => goTo(Math.min(total - 1, current + 1))} className="btn-primary">
            Next →
          </button>
        ) : (
          <button onClick={openReview} className="btn-primary">
            Review answers →
          </button>
        )}
      </div>

      {!reviewEntered && (
        <div className="text-center">
          <button onClick={openReview} className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            Skip to review &amp; submit
          </button>
        </div>
      )}
    </div>
  );
}
