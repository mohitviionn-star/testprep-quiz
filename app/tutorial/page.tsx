import Link from "next/link";

const steps = [
  {
    n: 1,
    title: "Pick a section",
    body: "Go to Sections and choose a GMAT, GRE, or SAT quiz. Each card shows the exam, topic, and number of questions.",
  },
  {
    n: 2,
    title: "Answer at your pace",
    body: "Read each question and select an answer. Use Next and Previous to move around — nothing is timed unless you want it to be.",
  },
  {
    n: 3,
    title: "Submit & review",
    body: "When you finish, submit to see your score, the correct answers, and an explanation for every question.",
  },
  {
    n: 4,
    title: "Track your progress",
    body: "Your results are saved privately in your browser and shown on the Dashboard. Nothing leaves your device.",
  },
  {
    n: 5,
    title: "Bring your own questions",
    body: "Use the Upload page to add quizzes from a JSON, YAML, or Excel/CSV file — no admin panel needed.",
  },
];

export default function TutorialPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">How it works</h1>
        <p className="mt-2 text-slate-600">
          A quick tour of the app. It takes about a minute to read.
        </p>
      </div>

      <ol className="space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="card flex gap-4 p-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">
              {s.n}
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="card bg-brand-50 p-6 ring-brand-100">
        <h3 className="font-semibold text-brand-900">Answering tips</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-brand-900/80">
          <li>Eliminate clearly wrong choices first to improve your odds.</li>
          <li>Don&apos;t dwell — flag a hard question by skipping and return later.</li>
          <li>Always read the explanation, even when you got it right.</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Link href="/sections" className="btn-primary">
          Start a quiz
        </Link>
        <Link href="/upload" className="btn-ghost">
          Upload questions
        </Link>
      </div>
    </div>
  );
}
