"use client";

import { useState } from "react";
import QuestionView from "@/components/QuestionView";
import RichText from "@/components/RichText";
import { type Bookmark, removeBookmark } from "@/lib/storage";

// Dashboard "review queue": questions the user bookmarked while practicing.
// Each can be expanded to see the correct answer + explanation, or removed.

export default function Bookmarks({ initial }: { initial: Bookmark[] }) {
  const [items, setItems] = useState<Bookmark[]>(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500">
        No bookmarked questions yet. Tap <span className="font-semibold">🔖 Bookmark</span> on any
        question while practicing to save it here for review.
      </div>
    );
  }

  function remove(key: string) {
    removeBookmark(key);
    setItems((xs) => xs.filter((x) => x.key !== key));
  }

  return (
    <div className="space-y-3">
      {items.map((b) => {
        const isOpen = !!open[b.key];
        return (
          <div key={b.key} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="badge bg-slate-100 text-slate-600">{b.exam}</span>
                  <span className="truncate">{b.quizTitle}</span>
                </div>
                <p className="mt-1 font-medium text-slate-800">
                  <RichText text={b.question.prompt.slice(0, 160)} />
                </p>
              </div>
              <button
                onClick={() => remove(b.key)}
                title="Remove bookmark"
                className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
            <button
              onClick={() => setOpen((o) => ({ ...o, [b.key]: !o[b.key] }))}
              className="mt-2 text-sm font-semibold text-brand-600 hover:underline"
            >
              {isOpen ? "Hide answer" : "Show answer & explanation"}
            </button>
            {isOpen && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <QuestionView question={b.question} mode="review" value={undefined} />
                {b.question.explanation && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Explanation: </span>
                    <RichText text={b.question.explanation} />
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
