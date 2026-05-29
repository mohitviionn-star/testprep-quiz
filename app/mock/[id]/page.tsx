"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MockRunner from "@/components/MockRunner";
import { fetchMock } from "@/lib/data";
import type { Mock } from "@/lib/types";

export default function MockPage({ params }: { params: { id: string } }) {
  const [mock, setMock] = useState<Mock | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      const m = await fetchMock(params.id);
      if (!active) return;
      if (m) {
        setMock(m);
        setStatus("ready");
      } else {
        setStatus("notfound");
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id]);

  if (status === "loading") {
    return <div className="py-20 text-center text-slate-400">Loading…</div>;
  }
  if (status === "notfound" || !mock) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">Mock exam not found.</p>
        <Link href="/sections" className="btn-primary mt-4">
          Back to sections
        </Link>
      </div>
    );
  }
  return <MockRunner mock={mock} />;
}
