"use client";

import type { Attempt, Question, Quiz, QuizMeta } from "./types";

// All persistence is client-side localStorage only — no database, no server,
// no tracking, no accounts. Everything lives in the visitor's own browser.

const ATTEMPTS_KEY = "testprep:attempts";
const UPLOADS_KEY = "testprep:uploads";
const BOOKMARKS_KEY = "testprep:bookmarks";
const EXAM_KEY = "testprep:exam";

// ---- Selected exam (onboarding) ----

/** The exam the user chose to prepare for, e.g. "GMAT". null if not chosen yet. */
export function getSelectedExam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(EXAM_KEY);
  } catch {
    return null;
  }
}

export function setSelectedExam(exam: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EXAM_KEY, exam);
  } catch {
    /* storage unavailable */
  }
}

export function clearSelectedExam(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(EXAM_KEY);
  } catch {
    /* storage unavailable */
  }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode / disabled) — fail silently */
  }
}

// ---- Quiz attempts (dashboard history) ----

export function getAttempts(): Attempt[] {
  return read<Attempt[]>(ATTEMPTS_KEY, []);
}

export function addAttempt(attempt: Attempt): void {
  const all = getAttempts();
  all.unshift(attempt);
  write(ATTEMPTS_KEY, all.slice(0, 200)); // cap history
}

export function clearAttempts(): void {
  write(ATTEMPTS_KEY, []);
}

// ---- Uploaded quizzes (persisted so they appear in Sections) ----

export function getUploadedQuizzes(): Quiz[] {
  return read<Quiz[]>(UPLOADS_KEY, []);
}

export function getUploadedMeta(): QuizMeta[] {
  return getUploadedQuizzes().map((q) => ({
    id: q.id,
    title: q.title,
    exam: q.exam,
    section: q.section,
    description: q.description,
    count: q.questions.length,
    uploaded: true,
  }));
}

export function saveUploadedQuiz(quiz: Quiz): void {
  const all = getUploadedQuizzes().filter((q) => q.id !== quiz.id);
  all.unshift(quiz);
  write(UPLOADS_KEY, all);
}

export function getUploadedQuiz(id: string): Quiz | undefined {
  return getUploadedQuizzes().find((q) => q.id === id);
}

export function removeUploadedQuiz(id: string): void {
  write(UPLOADS_KEY, getUploadedQuizzes().filter((q) => q.id !== id));
}

// ---- Bookmarked questions (review queue on the dashboard) ----

export type Bookmark = {
  /** unique key: `${quizId}:${questionId}` */
  key: string;
  quizId: string;
  quizTitle: string;
  exam: string;
  section: string;
  savedAt: string;
  question: Question;
};

export function getBookmarks(): Bookmark[] {
  return read<Bookmark[]>(BOOKMARKS_KEY, []);
}

/** Add bookmarks, de-duplicating by key (newest wins). */
export function addBookmarks(items: Bookmark[]): void {
  if (!items.length) return;
  const keys = new Set(items.map((i) => i.key));
  const existing = getBookmarks().filter((b) => !keys.has(b.key));
  write(BOOKMARKS_KEY, [...items, ...existing].slice(0, 300));
}

export function removeBookmark(key: string): void {
  write(BOOKMARKS_KEY, getBookmarks().filter((b) => b.key !== key));
}

export function clearBookmarks(): void {
  write(BOOKMARKS_KEY, []);
}
