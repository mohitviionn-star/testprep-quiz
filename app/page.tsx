"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EXAMS } from "@/lib/exams";
import { getSelectedExam, setSelectedExam } from "@/lib/storage";

const features = [
  { title: "No login", desc: "Start instantly — no account, no passwords." },
  { title: "No tracking", desc: "Your progress stays in your browser only." },
  { title: "Bring your own questions", desc: "Upload JSON, YAML, or Excel files." },
  { title: "Embeddable", desc: "Drop it into any site with an iframe." },
];

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Returning users land directly on their chosen exam's prep page.
  // `?choose=1` forces the chooser so they can switch exams.
  useEffect(() => {
    const forceChoose = new URLSearchParams(window.location.search).get("choose");
    const saved = getSelectedExam();
    if (!forceChoose && saved) {
      const match = EXAMS.find((e) => e.code === saved);
      if (match) {
        router.replace(`/prep/${match.slug}`);
        return;
      }
    }
    setReady(true);
  }, [router]);

  function choose(code: string, slug: string) {
    setSelectedExam(code);
    router.push(`/prep/${slug}`);
  }

  if (!ready) {
    return <div className="py-24 text-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="text-center">
        <span className="badge bg-brand-50 text-brand-700">GMAT · GRE · SAT</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Which exam are you <span className="text-brand-600">preparing for?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Pick a test to get a focused practice experience. You can switch anytime.
        </p>
      </section>

      {/* Exam chooser */}
      <section>
        <div className="grid gap-5 sm:grid-cols-3">
          {EXAMS.map((e) => (
            <button
              key={e.code}
              onClick={() => choose(e.code, e.slug)}
              className="card group overflow-hidden text-left hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`bg-gradient-to-br ${e.gradient} p-6 text-white`}>
                <div className="text-3xl font-black">{e.title}</div>
                <div className="text-sm font-semibold text-white/80">{e.tagline}</div>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600">{e.blurb}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-brand-600 group-hover:underline">
                  Prepare for {e.title} →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card p-5">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
