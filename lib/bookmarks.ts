import type { Question } from "./types";
import { addBookmarks, type Bookmark } from "./storage";

// Builds Bookmark records from a set of bookmarked question ids and persists them.
// Shared by the single-quiz runner and the full-length mock.

export function persistBookmarks(opts: {
  quizId: string;
  quizTitle: string;
  exam: string;
  section: string;
  questions: Question[];
  bookmarkedIds: string[];
}): void {
  const { quizId, quizTitle, exam, section, questions, bookmarkedIds } = opts;
  if (!bookmarkedIds.length) return;
  const ids = new Set(bookmarkedIds);
  const savedAt = new Date().toISOString();
  const items: Bookmark[] = questions
    .filter((q) => ids.has(q.id))
    .map((q) => ({
      key: `${quizId}:${q.id}`,
      quizId,
      quizTitle,
      exam,
      section,
      savedAt,
      question: q,
    }));
  addBookmarks(items);
}
