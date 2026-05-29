"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearAttempts, getAttempts, getBookmarks, type Bookmark } from "@/lib/storage";
import Bookmarks from "@/components/Bookmarks";
import type { Attempt } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttempts(getAttempts());
    setBookmarks(getBookmarks());
    setLoaded(true);
  }, []);

  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return { count: 0, avg: 0, best: 0, totalQ: 0 };
    }
    const pcts = attempts.map((a) => (a.total ? a.score / a.total : 0));
    const avg = Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 100);
    const best = Math.round(Math.max(...pcts) * 100);
    const totalQ = attempts.reduce((s, a) => s + a.total, 0);
    return { count: attempts.length, avg, best, totalQ };
  }, [attempts]);

  function reset() {
    if (confirm("Clear all saved quiz history? This cannot be undone.")) {
      clearAttempts();
      setAttempts([]);
    }
  }

  if (!loaded) {
    return <div className="py-20 text-center text-slate-400">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Your practice history, saved privately in this browser.
          </p>
        </div>
        {attempts.length > 0 && (
          <button onClick={reset} className="btn-ghost text-rose-600">
            Clear history
          </button>
        )}
      </div>

      {attempts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-600">No attempts yet — take a quiz to see your stats here.</p>
          <Link href="/sections" className="btn-primary mt-4">
            Browse sections
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Quizzes taken" value={String(stats.count)} />
            <Stat label="Average score" value={`${stats.avg}%`} />
            <Stat label="Best score" value={`${stats.best}%`} />
            <Stat label="Questions answered" value={String(stats.totalQ)} />
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((a, i) => {
                  const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.title}</td>
                      <td className="px-4 py-3 text-slate-600">{a.exam}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            pct >= 70
                              ? "bg-emerald-50 text-emerald-700"
                              : pct >= 40
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {a.score}/{a.total} · {pct}%
                        </span>
                        {a.scaledScore != null && (
                          <span className="ml-2 text-xs font-semibold text-brand-700" title={a.scaleLabel}>
                            {a.scaledScore}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {Math.floor(a.durationSec / 60)}m {a.durationSec % 60}s
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(a.takenAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div>
        <h2 className="mb-3 mt-4 text-xl font-bold text-slate-900">
          Bookmarked questions
          {bookmarks.length > 0 && (
            <span className="ml-2 text-sm font-medium text-slate-400">({bookmarks.length})</span>
          )}
        </h2>
        <Bookmarks initial={bookmarks} />
      </div>
    </div>
  );
}
