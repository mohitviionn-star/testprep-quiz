# TestPrep — Quiz App (GMAT / GRE / SAT)

A simple, self-contained quiz app for GMAT, GRE, and SAT style practice.

- **Home screen** — overview and exam cards
- **Sections** — browse and filter available quizzes
- **Tutorial** — how the app works + answering tips
- **Quiz** — one question at a time, **question navigator**, **flag for review**, **timed mode** with auto-submit, score + per-question review with explanations
- **Question types** — multiple choice, **numeric entry / grid-in**, and the full GMAT **Data Insights** set: **Two-Part Analysis, Graphics Interpretation, Table Analysis, Multi-Source Reasoning**
- **GMAT Focus Edition** — accurate 3-section structure (Quant · Verbal · Data Insights), **estimated GMAT scoring** (section 60–90, total 205–805), and **strengths/weaknesses** by skill
- **Full-length mock** — `/mock/gmat-focus` chains all 3 timed sections into one scored exam
- **Adaptive practice** — `/adaptive/[id]` serves questions by difficulty (easy/medium/hard): harder after a correct answer, easier after a wrong one, with an estimated level + GMAT-style score
- **Dashboard** — score history and stats
- **Upload** — add your own questions from **JSON, YAML, or Excel/CSV** (no admin panel)

### Constraints met
✅ No database ✅ No tracking/analytics ✅ No login ✅ No payment
✅ Deployable to Vercel ✅ iframe-compatible by default

---

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS for styling
- `js-yaml` and SheetJS (`xlsx`) for parsing uploads
- All state is client-side (`localStorage`) — no backend, no DB

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it at [vercel.com/new](https://vercel.com/new) — framework is auto-detected as Next.js.
3. Click **Deploy**. No environment variables required.

## Embed in an iframe

The app sends a permissive `Content-Security-Policy: frame-ancestors *` header
(see `next.config.mjs`) and does **not** set `X-Frame-Options`, so it embeds anywhere:

```html
<iframe
  src="https://your-app.vercel.app"
  width="100%"
  height="800"
  style="border:0"
  title="TestPrep Quiz"
></iframe>
```

> To restrict embedding to specific domains later, change `frame-ancestors *`
> to e.g. `frame-ancestors https://yourschool.com`.

---

## Adding questions

### Built-in quizzes (ship with the app)

1. Add a JSON file under `public/data/`, e.g. `public/data/my-quiz.json`.
2. Register it in `public/data/manifest.json`.

### User uploads (no code, no admin panel)

Visit **/upload** and drop a `.json`, `.yaml`, `.xlsx`, or `.csv` file.
The quiz is parsed in the browser, stored in `localStorage`, and listed under **Sections**.
Templates are downloadable on that page.

### Question format

Field names are flexible (`question`/`prompt`, `options`/`choices`, `correct`/`answer`).

**JSON / YAML**

```json
{
  "title": "My Quiz",
  "exam": "GMAT",
  "section": "Problem Solving",
  "questions": [
    {
      "prompt": "If $3x + 7 = 22$, what is $x$?",
      "choices": ["3", "5", "7", "15"],
      "answer": "B",
      "explanation": "$3x = 15$, so $x = 5$.",
      "image": "/data/images/right-triangle.svg",
      "imageAlt": "Right triangle diagram",
      "passage": "Optional shared reading passage shown above the question."
    }
  ]
}
```

**Excel / CSV columns**

| question | a | b | c | d | answer | explanation | image |
|----------|---|---|---|---|--------|-------------|-------|

`answer` accepts a letter (`A`–`D`), the option text, or its number.

### Math, diagrams & passages (exact exam questions)

- **Math** — wrap LaTeX in `$ … $` (inline) or `$$ … $$` (block). Rendered with
  [KaTeX](https://katex.org), so fractions, exponents, roots, etc. display correctly:
  `If $\frac{x}{3} = 5$ then $x = 15$.`
- **Numeric / grid-in** — set `"type": "numeric"` with empty `choices`; `answer` is the
  value (`"15"` or `"3/4"`). Optional `tolerance` (± accepted), `answerMax` (accept a
  range `[answer, answerMax]`), and `unit` (e.g. `"$"`, `"cm"`).
- **Timed mode** — add `timeLimit` (minutes) or `timeLimitSec` at the quiz top level to
  show a countdown and auto-submit when time runs out.
- **Diagrams** — set `image` to a URL or a path under `/public`
  (e.g. `/data/images/circle-sector.svg`). Built-in diagrams live in
  `public/data/images/` as lightweight SVGs you can edit or replace. Answer choices
  may also carry their own `image`.
- **Passages** — set `passage` to shared reading/stimulus text; it renders above the
  question (multiple questions can reuse the same passage). See the GRE Verbal quiz.

---

## Project structure

```
app/
  page.tsx            Home
  sections/           Section cards
  tutorial/           Tutorial
  quiz/[id]/          Quiz runner
  dashboard/          Score history
  upload/             Upload questions
components/           Nav, QuizCard, QuizRunner
lib/                  types, parse (json/yaml/excel), storage, data
public/data/          Built-in quizzes + manifest.json
public/templates/     Downloadable upload templates
```
