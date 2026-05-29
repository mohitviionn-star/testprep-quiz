"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Quiz } from "@/lib/types";
import { addAttempt } from "@/lib/storage";
import { hasAnswer, isCorrect, type AnswerValue } from "@/lib/scoring";
import {
  abilityLevel,
  abilityToSectionScore,
  adaptiveLength,
  difficultyValue,
  pickNext,
  updateAbility,
} from "@/lib/adaptive";
import QuestionView from "@/components/QuestionView";
import ReviewList from "@/components/ReviewList";

type Served = { id: string; given: AnswerValue | undefined; correct: boolean; thetaBefore: number };

const DIFF_LABEL: Record<number, string> = { [-1]: "Easy", [0]: "Medium", [1]: "Hard" };

export default function AdaptiveRunner({ quiz }: { quiz: Quiz }) {
  const pool = quiz.questions;
  const length = adaptiveLength(pool.length);

  const [theta, setTheta] = useState(0);
  const [asked, setAsked] = useState<string[]>(() => {
    const first = pickNext(pool, new Set(), 0);
    return first ? [first.id] : [];
  });
  const [served, setServed] = useState<Served[]>([]);
  const [draft, setDraft] = useState<AnswerValue | undefined>(undefined);
  const [finished, setFinished] = useState(false);

  const currentId = asked[asked.length - 1];
  const current = useMemo(() => pool.find((q) => q.id === currentId), [pool, currentId]);
  const step = served.length + 1;

  function submitAnswer() {
    if (!current || !hasAnswer(current, draft)) return;
    const correct = isCorrect(current, draft);
    const nextServed = [...served, { id: current.id, given: draft, correct, thetaBefore: theta }];
    const nextTheta = updateAbility(theta, correct);

    if (nextServed.length >= length) {
      finalize(nextServed, nextTheta);
      return;
    }
    const next = pickNext(pool, new Set(nextServed.map((s) => s.id)), nextTheta);
    if (!next) {
      finalize(nextServed, nextTheta);
      return;
    }
    setServed(nextServed);
    setTheta(nextTheta);
    setAsked((a) => [...a, next.id]);
    setDraft(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finalize(allServed: Served[], finalTheta: number) {
    const correct = allServed.filter((s) => s.correct).length;
    const total = allServed.length;
    const isGmat = quiz.exam.toUpperCase() === "GMAT";
    addAttempt({
      quizId: `${quiz.id}-adaptive`,
      title: `${quiz.title} (Adaptive)`,
      exam: quiz.exam,
      section: `${quiz.section} · Adaptive`,
      score: correct,
      total,
      takenAt: new Date().toISOString(),
      durationSec: 0,
      scaledScore: isGmat ? abilityToSectionScore(finalTheta) : undefined,
      scaleLabel: isGmat ? "GMAT adaptive (60–90)" : undefined,
    });
    setServed(allServed);
    setTheta(finalTheta);
    setFinished(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    const first = pickNext(pool, new Set(), 0);
    setTheta(0);
    setServed([]);
    setDraft(undefined);
    setFinished(false);
    setAsked(first ? [first.id] : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (pool.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">This pool has no questions.</p>
        <Link href="/sections" className="btn-primary mt-4">
          Back to sections
        </Link>
      </div>
    );
  }

  // ---------- Report ----------
  if (finished) {
    const correct = served.filter((s) => s.correct).length;
    const total = served.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const isGmat = quiz.exam.toUpperCase() === "GMAT";
    const level = abilityLevel(theta);
    const sectionScore = abilityToSectionScore(theta);
    const reviewQs = served.map((s) => pool.find((q) => q.id === s.id)!).filter(Boolean);
    const answers = Object.fromEntries(served.map((s) => [s.id, s.given])) as Record<string, AnswerValue>;

    return (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
              ⚡ Adaptive · {quiz.section}
            </p>
            <div className="mt-2 text-3xl font-black">{level}</div>
            {isGmat && <p className="mt-1 text-white/90">Estimated GMAT level ≈ {sectionScore}/90</p>}
            <p className="mt-1 text-sm text-white/80">
              {correct}/{total} correct · {pct}%
            </p>
            <p className="mt-1 text-xs text-white/70">
              Difficulty adjusted to your answers — estimate, not the official CAT algorithm.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 p-5">
            <button onClick={restart} className="btn-primary">
              Practice again
            </button>
            <Link href="/sections" className="btn-ghost">
              Sections
            </Link>
            <Link href="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900">Review ({total} questions)</h2>
        <ReviewList questions={reviewQs} answers={answers} />
      </div>
    );
  }

  // ---------- Running (one adaptive question at a time) ----------
  if (!current) return null;
  const diffVal = difficultyValue(current.difficulty);
  const canSubmit = hasAnswer(current, draft);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link href="/sections" className="hover:text-slate-700">
            ← {quiz.title} · Adaptive
          </Link>
          <span>
            Question {step} / {length}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${(served.length / length) * 100}%` }}
          />
        </div>
      </div>

      {/* Adaptive difficulty meter */}
      <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-2 text-sm">
        <span className="font-semibold text-indigo-700">⚡ Adaptive practice</span>
        <span className="flex items-center gap-1.5">
          {[-1, 0, 1].map((d) => (
            <span
              key={d}
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                d === diffVal ? "bg-indigo-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"
              }`}
            >
              {DIFF_LABEL[d]}
            </span>
          ))}
        </span>
      </div>

      <div className="card p-6">
        <QuestionView question={current} mode="answer" value={draft} onChange={setDraft} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">No going back — each answer sets the next question.</span>
        <button onClick={submitAnswer} disabled={!canSubmit} className="btn-primary">
          {step >= length ? "Finish" : "Submit & continue →"}
        </button>
      </div>
    </div>
  );
}
