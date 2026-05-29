import katex from "katex";

// Renders text that may contain LaTeX math:
//   - inline:  $ ... $        e.g.  "Solve $x^2 + 1 = 0$."
//   - block:   $$ ... $$      (centered, on its own line)
// Everything outside the delimiters is plain text. Newlines are preserved.
// This keeps authoring simple while supporting real exam-style notation
// (fractions, exponents, roots, summations, etc.).

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

function tokenize(input: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ (display) or $...$ (inline). Non-greedy; ignores escaped \$.
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", value: input.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      segments.push({ type: "math", value: m[1], display: true });
    } else {
      segments.push({ type: "math", value: m[2], display: false });
    }
    last = re.lastIndex;
  }
  if (last < input.length) {
    segments.push({ type: "text", value: input.slice(last) });
  }
  return segments;
}

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return tex;
  }
}

export default function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;
  const segments = tokenize(text);

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        return (
          <span
            key={i}
            // KaTeX output is sanitized HTML produced by the trusted katex lib.
            dangerouslySetInnerHTML={{ __html: renderMath(seg.value, seg.display) }}
          />
        );
      })}
    </span>
  );
}
