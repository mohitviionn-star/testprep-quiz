"use client";

import { useState } from "react";
import Link from "next/link";
import type { Quiz } from "@/lib/types";
import { addAttempt } from "@/lib/storage";
import { persistBookmarks } from "@/lib/bookmarks";
import {
  countCorrect,
  gmatSectionScore,
  type AnswerValue,
} from "@/lib/scoring";
import SectionRunner, { type SectionResult } from "@/components/SectionRunner";
import ReviewList from "@/components/ReviewList";
import StrengthsWeaknesses from "@/components/StrengthsWeaknesses";

function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [result, setResult] = useState<SectionResult | null>(null);

  function handleFinish(r: SectionResult) {
    const correct = countCorrect(quiz.questions, r.answers);
    const total = quiz.questions.length;
    const isGmat = quiz.exam.toUpperCase() === "GMAT";
    const scaled = isGmat ? gmatSectionScore(correct, total) : undefined;
    addAttempt({
      quizId: quiz.id,
      title: quiz.title,
      exam: quiz.exam,
      section: quiz.section,
      score: correct,
      total,
      takenAt: new Date().toISOString(),
      durationSec: r.elapsedSec,
      scaledScore: scaled,
      scaleLabel: scaled != null ? "GMAT section (60–90)" : undefined,
    });
    persistBookmarks({
      quizId: quiz.id,
      quizTitle: quiz.title,
      exam: quiz.exam,
      section: quiz.section,
      questions: quiz.questions,
      bookmarkedIds: r.bookmarkedIds,
    });
    setResult(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!result) {
    return (
      <SectionRunner
        title={quiz.title}
        questions={quiz.questions}
        timeLimitSec={quiz.timeLimitSec}
        backHref="/sections"
        onFinish={handleFinish}
      />
    );
  }

  const total = quiz.questions.length;
  const correct = countCorrect(quiz.questions, result.answers);
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const isGmat = quiz.exam.toUpperCase() === "GMAT";
  const sectionScore = gmatSectionScore(correct, total);

  function restart() {
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
            {quiz.exam} · {quiz.section}
          </p>
          {isGmat ? (
            <>
              <div className="mt-2 text-5xl font-black">{sectionScore}</div>
              <p className="mt-1 text-white/90">
                Estimated GMAT section score (60–90) · {correct}/{total} correct · {pct}%
              </p>
              <p className="mt-1 text-xs text-white/70">
                Estimate on the official scale — not the real CAT algorithm.
              </p>
            </>
          ) : (
            <>
              <div className="mt-2 text-5xl font-black">{pct}%</div>
              <p className="mt-1 text-white/90">{correct} of {total} correct</p>
            </>
          )}
          <p className="mt-1 text-sm text-white/80">{fmtTime(result.elapsedSec)} taken</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 p-5">
          <button onClick={restart} className="btn-primary">
            Retake quiz
          </button>
          <Link href="/sections" className="btn-ghost">
            More sections
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            View dashboard
          </Link>
        </div>
      </div>

      <StrengthsWeaknesses questions={quiz.questions} answers={result.answers} />

      <h2 className="text-xl font-bold text-slate-900">Review</h2>
      <ReviewList
        questions={quiz.questions}
        answers={result.answers}
        timeByQuestion={result.timeByQuestion}
        bookmarkedIds={result.bookmarkedIds}
      />
    </div>
  );
}
