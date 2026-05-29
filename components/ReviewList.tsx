import RichText from "@/components/RichText";
import QuestionView from "@/components/QuestionView";
import type { Question } from "@/lib/types";
import { hasAnswer, isCorrect, type AnswerValue } from "@/lib/scoring";

// Per-question review: status badge, optional time-spent with a "slow" flag, the
// question rendered read-only with the correct answer highlighted, and explanation.

function fmtSec(s: number): string {
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export default function ReviewList({
  questions,
  answers,
  timeByQuestion,
  bookmarkedIds,
}: {
  questions: Question[];
  answers: Record<string, AnswerValue>;
  timeByQuestion?: Record<string, number>;
  bookmarkedIds?: string[];
}) {
  // Slow = more than 1.5x the average time spent (and at least 30s).
  const times = timeByQuestion ? Object.values(timeByQuestion).filter((t) => t > 0) : [];
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const slowThreshold = Math.max(30, avg * 1.5);
  const bookmarks = new Set(bookmarkedIds ?? []);

  return (
    <ol className="space-y-4">
      {questions.map((q, i) => {
        const given = answers[q.id];
        const correct = isCorrect(q, given);
        const answered = hasAnswer(q, given);
        const t = timeByQuestion?.[q.id];
        const slow = t != null && t >= slowThreshold;
        return (
          <li key={q.id} className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                Question {i + 1}
                {q.difficulty && (
                  <span
                    className={`badge ${
                      q.difficulty === "easy"
                        ? "bg-emerald-50 text-emerald-700"
                        : q.difficulty === "hard"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                )}
                {bookmarks.has(q.id) && <span title="Bookmarked">🔖</span>}
              </span>
              <div className="flex items-center gap-2">
                {t != null && (
                  <span
                    className={`badge ${slow ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                    title={slow ? "Slower than your average pace" : "Time spent"}
                  >
                    ⏱ {fmtSec(t)}
                    {slow ? " · slow" : ""}
                  </span>
                )}
                <span
                  className={`badge ${correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                >
                  {answered ? (correct ? "Correct" : "Incorrect") : "Skipped"}
                </span>
              </div>
            </div>
            <QuestionView question={q} mode="review" value={given} />
            {q.explanation && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Explanation: </span>
                <RichText text={q.explanation} />
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
