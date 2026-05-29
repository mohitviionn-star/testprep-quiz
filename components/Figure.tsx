/* eslint-disable @next/next/no-img-element */

// Renders a question/choice diagram. We use a plain <img> (not next/image)
// on purpose: images may be remote URLs from uploaded quizzes whose domains we
// can't know ahead of time, and next/image requires configured remote patterns.

export default function Figure({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    <div className={`my-4 flex justify-center ${className ?? ""}`}>
      <img
        src={src}
        alt={alt ?? "Question diagram"}
        loading="lazy"
        className="max-h-80 max-w-full rounded-lg border border-slate-200 bg-white p-2"
      />
    </div>
  );
}
