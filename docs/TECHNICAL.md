# TestPrep — Technical Documentation

Developer-facing reference for the TestPrep quiz app. For a quick start and the
question-authoring cheat sheet, see [README.md](../README.md). This document covers
architecture, the data model, parsing internals, rendering, state, and how to extend
the app.

---

## 1. Overview

TestPrep is a **client-side, serverless** quiz application for GMAT / GRE / SAT style
practice. It deliberately has **no database, no backend API, no authentication, no
tracking, and no payment** — every piece of state lives in the visitor's browser.

| Concern | Approach |
|---|---|
| Rendering | Next.js 14 App Router (mostly client components) |
| Styling | Tailwind CSS |
| Built-in quizzes | Static JSON in `public/data/`, fetched at runtime |
| User-uploaded quizzes | Parsed in-browser, stored in `localStorage` |
| Score history | `localStorage` |
| Math | KaTeX (`$…$` / `$$…$$`) |
| Diagrams | `<img>` to a URL or `/public` asset |
| Hosting | Static-friendly; deploys to Vercel with zero config |
| Embedding | `frame-ancestors *` CSP, no `X-Frame-Options` |

### Tech stack

- **Next.js 14.2** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS 3.4**
- **js-yaml** — YAML parsing
- **SheetJS / xlsx** — Excel & CSV parsing (lazy-loaded)
- **katex** — math typesetting

---

## 2. Project structure

```
app/                      Next.js App Router pages (routes)
  layout.tsx              Root layout: <Nav>, global CSS, KaTeX CSS
  page.tsx                Home screen (hero, exam cards, features)
  globals.css             Tailwind layers + component classes (.card, .btn-*)
  sections/page.tsx       Section cards + exam filter (reads ?exam=)
  tutorial/page.tsx       Static "how it works" page
  quiz/[id]/page.tsx      Resolves a quiz by id, renders <QuizRunner>
  dashboard/page.tsx      Score history + stats from localStorage
  upload/page.tsx         Drag/drop upload, parse, preview, save

components/
  Nav.tsx                 Top navigation (active-link aware)
  QuizCard.tsx            A single section/quiz card
  QuizRunner.tsx          The quiz engine: running + review phases
  RichText.tsx            Renders text with inline/block LaTeX (KaTeX)
  Figure.tsx              Renders a question/choice diagram

lib/
  types.ts                Core TypeScript types (Quiz, Question, Attempt, …)
  parse.ts                Normalizers + JSON/YAML/Excel entry points
  storage.ts              localStorage helpers (attempts + uploads)
  data.ts                 Fetches built-in manifest & quiz files

public/
  data/manifest.json      List of built-in quizzes (metadata + file path)
  data/*.json             Built-in quiz files
  data/images/*.svg       Built-in diagrams
  templates/*             Downloadable upload templates (json/yaml/csv)

next.config.mjs           iframe headers (frame-ancestors *)
tailwind.config.ts        Theme (brand color scale)
```

---

## 3. Data model

Defined in [`lib/types.ts`](../lib/types.ts).

```ts
type Choice = {
  id: string;        // "A", "B", "C", …
  text: string;
  image?: string;    // optional diagram for image-based answer choices
};

type Question = {
  id: string;
  prompt: string;        // may contain $…$ / $$…$$ math
  choices: Choice[];
  answer: string;        // id of the correct choice, e.g. "B"
  explanation?: string;  // may contain math
  image?: string;        // diagram URL or /public path
  imageAlt?: string;
  passage?: string;      // shared reading stimulus shown above the question
};

type Quiz = {
  id: string;
  title: string;
  exam: string;          // "GMAT" | "GRE" | "SAT" | custom
  section: string;
  description?: string;
  questions: Question[];
};

type QuizMeta = {        // lightweight listing entry (no questions)
  id, title, exam, section, description?, file?, count?, uploaded?
};

type Attempt = {         // one completed quiz, for the dashboard
  quizId, title, exam, section, score, total, takenAt /* ISO */, durationSec;
};
```

Design intent: the model is intentionally small so non-technical authors can write
questions by hand in JSON/YAML/Excel. The parser (next section) absorbs schema
variation so the in-memory model stays strict.

---

## 4. Quiz sources & loading

There are **two sources** of quizzes; both produce the same `Quiz` shape.

### 4.1 Built-in quizzes (ship with the app)

- Live as static JSON under `public/data/`.
- Registered in `public/data/manifest.json` (`{ quizzes: QuizMeta[] }`).
- Loaded at runtime via [`lib/data.ts`](../lib/data.ts):
  - `fetchManifest()` → `QuizMeta[]`
  - `fetchBuiltInQuiz(id)` → looks up the manifest entry, fetches its `file`.
- All fetches use `cache: "no-store"` so updated question files are picked up
  without a rebuild.

### 4.2 Uploaded quizzes (user-provided)

- Parsed entirely in the browser on the **Upload** page.
- Persisted to `localStorage` under `testprep:uploads` via
  [`lib/storage.ts`](../lib/storage.ts).
- Surfaced as `QuizMeta` via `getUploadedMeta()` and merged ahead of built-ins
  on the Sections page.

### 4.3 Resolution order

[`app/quiz/[id]/page.tsx`](../app/quiz/[id]/page.tsx) resolves a quiz by id:

```
getUploadedQuiz(id)            // localStorage first
  ?? await fetchBuiltInQuiz(id) // then built-in manifest
  ?? "not found"
```

This means an uploaded quiz can shadow a built-in one with the same id.

---

## 5. Parsing & normalization

All in [`lib/parse.ts`](../lib/parse.ts). The public entry points:

```ts
parseJSON(text): Quiz
parseYAML(text): Quiz
parseExcel(arrayBuffer, meta?): Promise<Quiz>   // lazy-imports xlsx
detectFormat(filename): "json" | "yaml" | "excel" | null
```

Everything funnels through **`normalizeQuiz(raw, fallbackTitle)`**, which:

1. Accepts either `{ ...meta, questions: [...] }` or a bare array of questions.
2. Maps each row through `normalizeQuestion`.
3. Derives `id`/`title`/`exam`/`section` from meta, with sensible fallbacks and a
   slugified id.

### Field flexibility

Authors don't have to match exact field names — `pick(obj, [...aliases])` does
case-insensitive lookup across common spellings:

| Concept | Accepted keys |
|---|---|
| Prompt | `prompt`, `question`, `q`, `stem`, `text` |
| Choices | `choices`, `options`, `answers`, or flat `a`/`b`/`c`/`d` columns |
| Answer | `answer`, `correct`, `correctAnswer`, `key`, `solution` |
| Explanation | `explanation`, `rationale`, `why`, `feedback` |
| Image | `image`, `img`, `diagram`, `figure`, `imageUrl`, `image_url` |
| Passage | `passage`, `stimulus`, `context`, `reading` |

### Choice normalization

`normalizeChoices` accepts three shapes:

```jsonc
"choices": ["foo", "bar"]                         // → A:foo, B:bar
"choices": [{ "id": "A", "text": "foo" }]         // explicit ids (+ optional image)
"choices": { "A": "foo", "B": "bar" }             // map form
```

For Excel/CSV with flat columns, choices are read from `a,b,c,d,e,f`
(also `choiceA`, `optionA`, etc.).

### Answer resolution

`resolveAnswer(value, choices)` is tolerant — the answer may be:

- a **letter** id (`"B"`),
- a **number** (1-based or 0-based index),
- or the **exact option text**.

It returns the canonical choice `id`.

### Excel/CSV specifics

`parseExcel` lazy-imports SheetJS (`await import("xlsx")`) so the heavy library is
only bundled into the Upload page's chunk. It reads the **first sheet**, converts
rows to objects with `sheet_to_json`, then runs them through `normalizeQuiz`.
Expected columns: `question, a, b, c, d, answer, explanation, image`.

---

## 6. Rendering

### 6.1 Math — `components/RichText.tsx`

`<RichText text="…" />` tokenizes a string into text and math segments:

- `$$ … $$` → **display** (block) math
- `$ … $` → **inline** math (single line; `[^$\n]` prevents runaway matches)

Each math segment is rendered with `katex.renderToString(tex, { displayMode,
throwOnError: false })`. On a KaTeX error it falls back to the raw source rather
than crashing. KaTeX output is injected via `dangerouslySetInnerHTML` — acceptable
because the HTML is produced by the trusted KaTeX library, and uploaded content is
the user's own, rendered only in their own browser. The KaTeX stylesheet is
imported once in `app/layout.tsx`.

`RichText` is used for every author-supplied string: prompts, choices, explanations,
and passages.

### 6.2 Diagrams — `components/Figure.tsx`

`<Figure src alt />` renders a plain `<img>` (not `next/image`) on purpose: uploaded
quizzes can reference arbitrary remote URLs, and `next/image` would require
pre-configured `remotePatterns`. Images are lazy-loaded and capped at `max-h-80`.
Both `Question.image` and `Choice.image` are supported.

### 6.3 The quiz engine — `components/QuizRunner.tsx`

A single client component with two phases via local state:

- **`running`** — one question at a time, progress bar, Previous/Next, Submit on the
  last question. Answers are kept in `Record<questionId, choiceId>`.
- **`review`** — score header (percentage), then a per-question breakdown showing the
  chosen vs. correct answer (color-coded) and the explanation.

Scoring is `useMemo`-derived (`answers[q.id] === q.answer`). On submit it computes
`durationSec` from a `startRef` timestamp and writes one `Attempt` via
`addAttempt(...)`. A `savedRef` guard prevents double-recording if the user
re-submits. `Retake` resets state and the timer.

> Timing note: `Date.now()` is used for attempt duration. This is fine at runtime;
> it's only the **workflow scripting sandbox** that forbids `Date.now()`, not the app.

---

## 7. State & persistence

All persistence is `localStorage`, wrapped in [`lib/storage.ts`](../lib/storage.ts)
with try/catch so private-mode / disabled-storage fails silently.

| Key | Contents | Writers | Readers |
|---|---|---|---|
| `testprep:attempts` | `Attempt[]` (capped at 200, newest first) | `addAttempt`, `clearAttempts` | Dashboard |
| `testprep:uploads` | `Quiz[]` (uploaded quizzes) | `saveUploadedQuiz`, `removeUploadedQuiz` | Sections, quiz resolver |

There is **no** server, cookie, or third-party request involved, which is what
satisfies the "no database / no tracking" requirement.

---

## 8. Routing & navigation

| Route | File | Type |
|---|---|---|
| `/` | `app/page.tsx` | Static |
| `/sections` | `app/sections/page.tsx` | Static (client) |
| `/tutorial` | `app/tutorial/page.tsx` | Static |
| `/quiz/[id]` | `app/quiz/[id]/page.tsx` | Dynamic (client, on-demand) |
| `/dashboard` | `app/dashboard/page.tsx` | Static (client) |
| `/upload` | `app/upload/page.tsx` | Static (client) |

Home exam cards deep-link to `/sections?exam=GMAT`; the Sections page reads the
`exam` query param on mount (`URLSearchParams(window.location.search)`) to preset the
filter chip. `/quiz/[id]` has no `generateStaticParams`, so Next renders it on demand
— required because uploaded quiz ids only exist client-side.

---

## 9. iframe embedding

Configured in [`next.config.mjs`](../next.config.mjs):

```js
async headers() {
  return [{ source: "/:path*", headers: [
    { key: "Content-Security-Policy", value: "frame-ancestors *;" },
  ]}];
}
```

The app does **not** set `X-Frame-Options`, so it embeds anywhere by default.
To restrict embedding, change `frame-ancestors *` to specific origins, e.g.
`frame-ancestors https://partner.com`.

**Caveat — third-party storage:** browsers with strict tracking prevention (notably
Safari) may block `localStorage` for cross-site iframes. The app degrades
gracefully: quizzes still run; only dashboard persistence is affected. If durable
history inside an iframe is required, host the app on the same parent domain (e.g. a
subdomain) or use the postMessage approach noted in §12.

---

## 10. Local development

```bash
npm install
npm run dev      # http://localhost:3000 (hot reload)
npm run build    # production build
npm start        # serve the production build
npm run lint     # next lint
```

Requirements: Node ≥ 18.17 (built and tested on Node 18.19).

---

## 11. Deployment (Vercel)

1. Push the repo to GitHub/GitLab/Bitbucket.
2. Import at vercel.com/new — Next.js is auto-detected.
3. Deploy. **No environment variables required.**

The `headers()` config is honored by Vercel, so iframe embedding works in
production with no extra setup. Because there's no server state, preview deployments
and rollbacks are completely safe.

---

## 12. Extending the app

**Add a built-in quiz**
1. Create `public/data/<id>.json` (see §3 / templates).
2. Add a matching entry to `public/data/manifest.json`.

**Add a new exam type** — just use a new `exam` value; the Sections filter and Home
cards are data-driven (Home cards are currently a static list in `app/page.tsx` and
can be made dynamic from the manifest if needed).

**Add a question type** (e.g. multi-select, numeric entry)
- Extend `Question` in `lib/types.ts` (e.g. `type: "single" | "multi"`).
- Handle parsing in `normalizeQuestion`.
- Branch the input + scoring in `QuizRunner.tsx`.

**Timed mode** — add a countdown in `QuizRunner` (a `setInterval` against
`startRef`) and auto-submit at zero.

**Cross-domain iframe sync** — if you must persist results to a parent page, post
attempts via `window.parent.postMessage(...)` from `addAttempt` and let the host
store them.

---

## 13. Known limitations / scope notes

- **Diagrams** included are clean *representative* SVGs. Official GMAT/GRE/SAT
  figures are copyrighted — exact reproductions should be **client-supplied assets**,
  not redrawn.
- **localStorage only** — clearing browser data wipes history; nothing syncs across
  devices (by design — no accounts).
- **Single sheet** is read from Excel uploads (first sheet only).
- **No server-side validation** of uploaded files beyond parse-and-normalize; bad
  rows are skipped, and a quiz with zero valid questions is rejected with a message.
- **Math delimiter** is `$`; literal dollar signs in prompts should be escaped
  (`\$`) to avoid being treated as math.

---

## 14. Dependency notes

- `xlsx` is installed from the official SheetJS CDN tarball (the npm-registry build
  is deprecated). It is the largest dependency and is **lazy-loaded** so it only
  affects the Upload route's bundle.
- `katex` ships a stylesheet imported globally in `app/layout.tsx`.
- `npm audit` may flag advisories originating from `xlsx`; the pinned CDN version is
  the maintained release. Review before production per your security policy.
```
