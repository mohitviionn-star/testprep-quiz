"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuizCard from "@/components/QuizCard";
import { fetchManifest } from "@/lib/data";
import { getUploadedMeta } from "@/lib/storage";
import type { QuizMeta } from "@/lib/types";

export default function SectionsPage() {
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    let active = true;
    // Apply an ?exam= filter passed from the home page (e.g. /sections?exam=GMAT).
    const examParam = new URLSearchParams(window.location.search).get("exam");
    if (examParam) setFilter(examParam);
    (async () => {
      const builtIn = await fetchManifest();
      const uploaded = getUploadedMeta();
      if (active) {
        setQuizzes([...uploaded, ...builtIn]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const exams = useMemo(() => {
    const set = new Set(quizzes.map((q) => q.exam));
    return ["All", ...Array.from(set)];
  }, [quizzes]);

  const filtered = filter === "All" ? quizzes : quizzes.filter((q) => q.exam === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Sections</h1>
          <p className="mt-1 text-slate-600">Choose a quiz to begin practicing.</p>
        </div>
        <Link href="/upload" className="btn-ghost">
          + Upload questions
        </Link>
      </div>

      {/* Exam filter */}
      <div className="flex flex-wrap gap-2">
        {exams.map((e) => (
          <button
            key={e}
            onClick={() => setFilter(e)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === e
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Full-length GMAT mock CTA */}
      {(filter === "All" || filter === "GMAT") && (
        <Link
          href="/mock/gmat-focus"
          className="card group flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white hover:shadow-md"
        >
          <div>
            <span className="badge bg-white/20 text-white">Full-length · GMAT Focus</span>
            <h2 className="mt-2 text-xl font-extrabold">Take the full GMAT Focus mock exam</h2>
            <p className="mt-1 text-sm text-white/90">
              3 timed sections (Quant · Verbal · Data Insights) scored on the 205–805 scale.
            </p>
          </div>
          <span className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 group-hover:bg-indigo-50">
            Start exam →
          </span>
        </Link>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading sections…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-600">No quizzes here yet.</p>
          <Link href="/upload" className="btn-primary mt-4">
            Upload your first quiz
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <QuizCard key={q.id} meta={q} />
          ))}
        </div>
      )}
    </div>
  );
}
