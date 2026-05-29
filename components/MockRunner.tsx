"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Mock, Question, Quiz } from "@/lib/types";
import { fetchQuizByFile } from "@/lib/data";
import { addAttempt } from "@/lib/storage";
import { persistBookmarks } from "@/lib/bookmarks";
import {
  countCorrect,
  gmatSectionScore,
  gmatTotalScore,
  type AnswerValue,
} from "@/lib/scoring";
import SectionRunner, { type SectionResult } from "@/components/SectionRunner";
import ReviewList from "@/components/ReviewList";
import StrengthsWeaknesses from "@/components/StrengthsWeaknesses";

type LoadedSection = {
  id: string;
  title: string;
  timeLimitSec: number;
  questions: Question[];
};

type Done = {
  section: LoadedSection;
  answers: Record<string, AnswerValue>;
  elapsedSec: number;
  timeByQuestion: Record<string, number>;
  bookmarkedIds: string[];
};

type Phase =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "intro" }
  | { kind: "sectionIntro"; idx: number }
  | { kind: "running"; idx: number }
  | { kind: "report" };

function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function MockRunner({ mock }: { mock: Mock }) {
  const [sections, setSections] = useState<LoadedSection[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [done, setDone] = useState<Done[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await Promise.all(
        mock.sections.map(async (s) => {
          const quiz = await fetchQuizByFile(s.file);
          return quiz
            ? { id: s.id, title: s.title, timeLimitSec: s.timeLimitSec, questions: quiz.questions }
            : null;
        })
      );
      if (!active) return;
      if (loaded.some((s) => s === null)) {
        setPhase({ kind: "error" });
        return;
      }
      setSections(loaded as LoadedSection[]);
      setPhase({ kind: "intro" });
    })();
    return () => {
      active = false;
    };
  }, [mock]);

  function finishSection(idx: number, r: SectionResult) {
    const section = sections[idx];
    persistBookmarks({
      quizId: section.id,
      quizTitle: `${mock.title} — ${section.title}`,
      exam: mock.exam,
      section: section.title,
      questions: section.questions,
      bookmarkedIds: r.bookmarkedIds,
    });
    const next = [
      ...done,
      {
        section,
        answers: r.answers,
        elapsedSec: r.elapsedSec,
        timeByQuestion: r.timeByQuestion,
        bookmarkedIds: r.bookmarkedIds,
      },
    ];
    setDone(next);
    if (idx + 1 < sections.length) {
      setPhase({ kind: "sectionIntro", idx: idx + 1 });
    } else {
      saveAttempt(next);
      setPhase({ kind: "report" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function saveAttempt(all: Done[]) {
    const totalCorrect = all.reduce((s, d) => s + countCorrect(d.section.questions, d.answers), 0);
    const totalQ = all.reduce((s, d) => s + d.section.questions.length, 0);
    const sectionScores = all.map((d) =>
      gmatSectionScore(countCorrect(d.section.questions, d.answers), d.section.questions.length)
    );
    const total = gmatTotalScore(sectionScores);
    const elapsed = all.reduce((s, d) => s + d.elapsedSec, 0);
    addAttempt({
      quizId: mock.id,
      title: mock.title,
      exam: mock.exam,
      section: "Full-length mock",
      score: totalCorrect,
      total: totalQ,
      takenAt: new Date().toISOString(),
      durationSec: elapsed,
      scaledScore: total,
      scaleLabel: "GMAT total (205–805)",
    });
  }

  function restart() {
    setDone([]);
    setPhase({ kind: "intro" });
  }

  // ---------- States ----------

  if (phase.kind === "loading") {
    return <div className="py-20 text-center text-slate-400">Loading mock exam…</div>;
  }

  if (phase.kind === "error") {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">Couldn&apos;t load this mock exam.</p>
        <Link href="/sections" className="btn-primary mt-4">
          Back to sections
        </Link>
      </div>
    );
  }

  if (phase.kind === "intro") {
    const totalQ = sections.reduce((s, x) => s + x.questions.length, 0);
    const totalMin = Math.round(sections.reduce((s, x) => s + x.timeLimitSec, 0) / 60);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{mock.exam}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{mock.title}</h1>
            {mock.description && <p className="mt-2 text-white/90">{mock.description}</p>}
          </div>
          <div className="p-6">
            <div className="mb-4 flex gap-6 text-sm">
              <span><strong className="text-slate-900">{sections.length}</strong> sections</span>
              <span><strong className="text-slate-900">{totalQ}</strong> questions</span>
              <span><strong className="text-slate-900">{totalMin}</strong> min total</span>
            </div>
            <ol className="space-y-2">
              {sections.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
                  <span className="font-medium text-slate-800">
                    {i + 1}. {s.title}
                  </span>
                  <span className="text-slate-500">
                    {s.questions.length} Q · {Math.round(s.timeLimitSec / 60)} min
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              Each section is timed and auto-submits when time runs out. You move through sections in
              order, just like the real exam — you can&apos;t return to a previous section.
            </p>
            <button onClick={() => setPhase({ kind: "sectionIntro", idx: 0 })} className="btn-primary mt-5 w-full">
              Begin exam →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase.kind === "sectionIntro") {
    const s = sections[phase.idx];
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Section {phase.idx + 1} of {sections.length}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{s.title}</h2>
          <p className="mt-2 text-slate-600">
            {s.questions.length} questions · {Math.round(s.timeLimitSec / 60)} minutes
          </p>
          <button onClick={() => setPhase({ kind: "running", idx: phase.idx })} className="btn-primary mt-6">
            Start section →
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === "running") {
    const s = sections[phase.idx];
    return (
      <SectionRunner
        key={s.id}
        title={s.title}
        contextLabel={`Section ${phase.idx + 1} of ${sections.length} · ${mock.title}`}
        questions={s.questions}
        timeLimitSec={s.timeLimitSec}
        submitLabel={phase.idx + 1 < sections.length ? "Finish section →" : "Finish exam"}
        onFinish={(r) => finishSection(phase.idx, r)}
      />
    );
  }

  // ---------- Report ----------
  const allQuestions = done.flatMap((d) => d.section.questions);
  const allAnswers = Object.assign({}, ...done.map((d) => d.answers)) as Record<string, AnswerValue>;
  const sectionScores = done.map((d) =>
    gmatSectionScore(countCorrect(d.section.questions, d.answers), d.section.questions.length)
  );
  const total = gmatTotalScore(sectionScores);
  const elapsed = done.reduce((s, d) => s + d.elapsedSec, 0);

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{mock.title}</p>
          <div className="mt-2 text-6xl font-black">{total}</div>
          <p className="mt-1 text-white/90">Estimated GMAT total (205–805)</p>
          <p className="mt-1 text-xs text-white/70">
            Estimate on the official scale — not the real CAT algorithm.
          </p>
          <p className="mt-2 text-sm text-white/80">{fmtTime(elapsed)} total</p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-3">
          {done.map((d, i) => {
            const c = countCorrect(d.section.questions, d.answers);
            const t = d.section.questions.length;
            return (
              <div key={d.section.id} className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{d.section.title}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{sectionScores[i]}</p>
                <p className="text-xs text-slate-500">
                  {c}/{t} · {t ? Math.round((c / t) * 100) : 0}%
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-3 border-t border-slate-100 p-5">
          <button onClick={restart} className="btn-primary">
            Retake mock
          </button>
          <Link href="/sections" className="btn-ghost">
            Sections
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>

      <StrengthsWeaknesses questions={allQuestions} answers={allAnswers} />

      {done.map((d) => (
        <div key={d.section.id} className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">{d.section.title} — review</h2>
          <ReviewList
            questions={d.section.questions}
            answers={d.answers}
            timeByQuestion={d.timeByQuestion}
            bookmarkedIds={d.bookmarkedIds}
          />
        </div>
      ))}
    </div>
  );
}
