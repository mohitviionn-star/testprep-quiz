import type { Question } from "@/lib/types";
import { strengthsWeaknesses, type AnswerValue } from "@/lib/scoring";

// GMAT-style "strengths and weaknesses" breakdown by skill category.

export default function StrengthsWeaknesses({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Record<string, AnswerValue>;
}) {
  const stats = strengthsWeaknesses(questions, answers);
  if (stats.length <= 1) return null; // nothing useful to break down

  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-900">Strengths &amp; weaknesses</h3>
      <p className="mt-0.5 text-sm text-slate-500">Accuracy by skill area</p>
      <div className="mt-4 space-y-3">
        {stats.map((s) => {
          const tone =
            s.pct >= 75 ? "bg-emerald-500" : s.pct >= 50 ? "bg-amber-400" : "bg-rose-400";
          const label =
            s.pct >= 75 ? "Strong" : s.pct >= 50 ? "Fair" : "Needs work";
          return (
            <div key={s.category}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{s.category}</span>
                <span className="text-slate-500">
                  {s.correct}/{s.total} · {s.pct}% · <span className="font-semibold">{label}</span>
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
