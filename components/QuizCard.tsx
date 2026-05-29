import Link from "next/link";
import type { QuizMeta } from "@/lib/types";

const examColors: Record<string, string> = {
  GMAT: "bg-indigo-50 text-indigo-700",
  GRE: "bg-purple-50 text-purple-700",
  SAT: "bg-emerald-50 text-emerald-700",
};

export default function QuizCard({ meta }: { meta: QuizMeta }) {
  const examClass = examColors[meta.exam] ?? "bg-slate-100 text-slate-700";
  return (
    <Link
      href={`/quiz/${meta.id}`}
      className="card group flex flex-col p-5 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={`badge ${examClass}`}>{meta.exam}</span>
        {meta.uploaded && (
          <span className="badge bg-amber-50 text-amber-700">Uploaded</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold text-slate-900">{meta.title}</h3>
      <p className="text-sm font-medium text-slate-500">{meta.section}</p>
      {meta.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{meta.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between pt-2">
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {meta.count != null ? `${meta.count} questions` : "Quiz"}
          {meta.timeLimitSec ? (
            <span className="badge bg-slate-100 text-slate-600">
              ⏱ {Math.round(meta.timeLimitSec / 60)} min
            </span>
          ) : null}
        </span>
        <span className="text-sm font-semibold text-brand-600 group-hover:underline">
          Start →
        </span>
      </div>
    </Link>
  );
}
