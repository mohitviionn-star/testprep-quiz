import type { Manifest, Mock, Quiz, QuizMeta } from "./types";

// Built-in quizzes are static files under /public/data, listed in manifest.json.
// They are fetched at runtime so the same code path works locally, on Vercel,
// and inside an iframe — no filesystem access or server functions required.

function baseUrl(): string {
  // Works in the browser; on the server during prerender we fall back to "".
  if (typeof window !== "undefined") return "";
  return "";
}

export async function fetchManifest(): Promise<QuizMeta[]> {
  try {
    const res = await fetch(`${baseUrl()}/data/manifest.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const manifest = (await res.json()) as Manifest;
    return manifest.quizzes ?? [];
  } catch {
    return [];
  }
}

export async function fetchQuizByFile(file: string): Promise<Quiz | null> {
  try {
    const res = await fetch(`${baseUrl()}${file}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Quiz;
  } catch {
    return null;
  }
}

export async function fetchBuiltInQuiz(id: string): Promise<Quiz | null> {
  const manifest = await fetchManifest();
  const meta = manifest.find((m) => m.id === id);
  if (!meta?.file) return null;
  return fetchQuizByFile(meta.file);
}

/** Load a full-length mock definition from /public/data/<id>.json. */
export async function fetchMock(id: string): Promise<Mock | null> {
  try {
    const res = await fetch(`${baseUrl()}/data/${id}.json`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Mock;
  } catch {
    return null;
  }
}
