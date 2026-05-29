"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchManifest } from "@/lib/data";
import { getAttempts, getUploadedMeta, setSelectedExam } from "@/lib/storage";
import { examBySlug } from "@/lib/exams";
import type { Attempt, QuizMeta } from "@/lib/types";

const ACCENTS = [
  "from-indigo-500 to-blue-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-red-500",
];

function iconFor(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("data") || s.includes("insight")) return "📊";
  if (s.includes("quant") || s.includes("math") || s.includes("algebra")) return "🔢";
  if (s.includes("geometry")) return "📐";
  if (s.includes("writing")) return "✍️";
  if (s.includes("verbal") || s.includes("reading") || s.includes("comprehension")) return "📖";
  if (s.includes("comparison")) return "⚖️";
  return "🧠";
}

const DI_FORMATS = [
  "Data Sufficiency",
  "Two-Part Analysis",
  "Graphics Interpretation",
  "Table Analysis",
  "Multi-Source Reasoning",
];

export default function PrepPage({ params }: { params: { exam: string } }) {
  const exam = examBySlug(params.exam);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exam) return;
    setSelectedExam(exam.code);
    setAttempts(getAttempts());
    let active = true;
    (async () => {
      const builtIn = await fetchManifest();
      const uploaded = getUploadedMeta();
      const all = [...uploaded, ...builtIn].filter(
        (q) => q.exam.toUpperCase() === exam.code.toUpperCase()
      );
      if (active) {
        setQuizzes(all);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [exam]);

  // Best score per quiz id + overall stats for this exam.
  const bestByQuiz = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts) {
      const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
      m.set(a.quizId, Math.max(m.get(a.quizId) ?? 0, pct));
    }
    return m;
  }, [attempts]);

  const stats = useMemo(() => {
    if (!exam) return { best: 0, taken: 0, answered: 0 };
    const mine = attempts.filter((a) => a.exam.toUpperCase() === exam.code.toUpperCase());
    const best = mine.reduce((b, a) => Math.max(b, a.total ? Math.round((a.score / a.total) * 100) : 0), 0);
    const answered = mine.reduce((s, a) => s + a.total, 0);
    return { best, taken: mine.length, answered };
  }, [attempts, exam]);

  if (!exam) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">Unknown exam.</p>
        <Link href="/?choose=1" className="btn-primary mt-4">
          Choose an exam
        </Link>
      </div>
    );
  }

  const totalQ = quizzes.reduce((s, q) => s + (q.count ?? 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${exam.gradient} px-6 py-10 text-white shadow-xl sm:px-10`}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-floaty" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-white/[0.07] blur-3xl animate-floaty" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 rounded-full bg-white/[0.07] blur-xl animate-floaty" style={{ animationDelay: "4s" }} />
        <div className="pointer-events-none absolute inset-0 bg-black/10" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="badge bg-white/20 text-white backdrop-blur">{exam.tagline}</span>
            <Link
              href="/?choose=1"
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25"
            >
              ↺ Switch exam
            </Link>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight drop-shadow-sm sm:text-5xl">
            Let&apos;s crush the {exam.title} <span className="inline-block animate-floaty">🚀</span>
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium text-white/95 drop-shadow-sm">{exam.blurb}</p>

          {/* quick stat pills */}
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white/25 px-3 py-1.5 backdrop-blur">📚 {quizzes.length} sections</span>
            <span className="rounded-full bg-white/25 px-3 py-1.5 backdrop-blur">❓ {totalQ} questions</span>
            {exam.mockId && (
              <span className="rounded-full bg-white/25 px-3 py-1.5 backdrop-blur">🧪 full-length mock</span>
            )}
            {stats.best > 0 && (
              <span className="rounded-full bg-white px-3 py-1.5 text-slate-900">🏆 best {stats.best}%</span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            {exam.mockId && (
              <Link
                href={`/mock/${exam.mockId}`}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow hover:shadow-md"
              >
                🔥 Take the full mock
              </Link>
            )}
            <a
              href="#sections"
              className="rounded-xl bg-white/25 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/35"
            >
              Browse sections ↓
            </a>
          </div>
        </div>
      </section>

      {/* Personalized progress */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { emoji: "🏆", label: "Best score", value: stats.taken ? `${stats.best}%` : "—", tint: "from-amber-400 to-orange-500" },
          { emoji: "✅", label: "Quizzes taken", value: String(stats.taken), tint: "from-emerald-400 to-teal-500" },
          { emoji: "💪", label: "Questions answered", value: String(stats.answered), tint: "from-fuchsia-400 to-pink-500" },
        ].map((s) => (
          <div key={s.label} className="card overflow-hidden p-0">
            <div className={`flex items-center gap-3 bg-gradient-to-br ${s.tint} p-4 text-white`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <div className="text-2xl font-black leading-none">{s.value}</div>
                <div className="text-xs font-semibold text-white/90">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Adaptive practice CTA */}
      {quizzes.length > 0 && (
        <Link
          href={`/adaptive/${quizzes[0].id}`}
          className="card group flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white hover:shadow-lg"
        >
          <div>
            <span className="badge bg-white/20 text-white backdrop-blur">⚡ Adaptive</span>
            <h2 className="mt-2 text-xl font-extrabold">Adaptive practice that matches your level</h2>
            <p className="mt-1 text-sm text-white/90">
              Questions get harder when you&apos;re right and easier when you&apos;re not — find your level fast.
            </p>
          </div>
          <span className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-violet-700 group-hover:bg-violet-50">
            Start adaptive →
          </span>
        </Link>
      )}

      {/* Exam-specific format strip */}
      {exam.code === "GMAT" && (
        <section className="card p-5">
          <h3 className="font-bold text-slate-900">📊 Master every Data Insights format</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {DI_FORMATS.map((f, i) => (
              <span
                key={f}
                className={`rounded-full bg-gradient-to-r ${ACCENTS[i % ACCENTS.length]} px-3 py-1.5 text-xs font-semibold text-white`}
              >
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Sections */}
      <section id="sections" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-900">Practice sections</h2>
          <Link href="/upload" className="text-sm font-semibold text-brand-600 hover:underline">
            + Upload questions
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading sections…</div>
        ) : quizzes.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-600">No {exam.title} sections yet.</p>
            <Link href="/upload" className="btn-primary mt-4">
              Upload questions
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q, i) => {
              const best = bestByQuiz.get(q.id);
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <Link
                  key={q.id}
                  href={`/quiz/${q.id}`}
                  className="card group flex flex-col overflow-hidden p-0 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className={`flex items-center gap-3 bg-gradient-to-br ${accent} p-4 text-white`}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 text-2xl backdrop-blur">
                      {iconFor(q.section)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold leading-tight">{q.title}</h3>
                      <p className="truncate text-xs font-medium text-white/85">{q.section}</p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="badge bg-slate-100 text-slate-600">❓ {q.count ?? "?"} Qs</span>
                      {q.timeLimitSec ? (
                        <span className="badge bg-slate-100 text-slate-600">⏱ {Math.round(q.timeLimitSec / 60)} min</span>
                      ) : null}
                      {q.uploaded && <span className="badge bg-amber-50 text-amber-700">Uploaded</span>}
                    </div>

                    {/* best-score progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{best != null ? `Best ${best}%` : "Not started yet"}</span>
                        {best != null && best >= 80 && <span>🔥</span>}
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${accent}`}
                          style={{ width: `${best ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600 group-hover:gap-2">
                      {best != null ? "Beat your best" : "Start practicing"} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer band */}
      <section className="rounded-3xl bg-slate-900 px-6 py-8 text-center text-white sm:px-10">
        <p className="text-lg font-bold">No login. No tracking. Just practice. ✨</p>
        <p className="mt-1 text-sm text-white/70">
          Your progress stays in your browser. Jump in and start improving today.
        </p>
        <Link href="/sections" className="mt-4 inline-block text-sm font-semibold text-brand-300 hover:text-brand-200">
          Browse all exams →
        </Link>
      </section>
    </div>
  );
}
