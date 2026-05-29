import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "TestPrep — GMAT / GRE / SAT Quiz",
  description: "Practice GMAT, GRE, and SAT style questions. No login, no tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
          TestPrep · Practice quizzes · No account or tracking required
        </footer>
      </body>
    </html>
  );
}
