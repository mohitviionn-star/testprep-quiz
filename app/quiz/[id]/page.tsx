"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuizRunner from "@/components/QuizRunner";
import { fetchBuiltInQuiz } from "@/lib/data";
import { getUploadedQuiz } from "@/lib/storage";
import type { Quiz } from "@/lib/types";

export default function QuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      // Uploaded quizzes (localStorage) take precedence, then built-ins.
      const uploaded = getUploadedQuiz(params.id);
      const found = uploaded ?? (await fetchBuiltInQuiz(params.id));
      if (!active) return;
      if (found) {
        setQuiz(found);
        setStatus("ready");
      } else {
        setStatus("notfound");
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (status === "loading") {
    return <div className="py-20 text-center text-slate-400">Loading quiz…</div>;
  }

  if (status === "notfound" || !quiz) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">Quiz not found.</p>
        <Link href="/sections" className="btn-primary mt-4">
          Back to sections
        </Link>
      </div>
    );
  }

  return <QuizRunner quiz={quiz} />;
}
