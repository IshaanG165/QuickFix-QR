"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] p-6">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const sp = useSearchParams();
  const ticket = sp.get("ticket");
  const qr = sp.get("qr");
  const router = useRouter();
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6" aria-live="polite">
      <Confetti width={dims.w} height={dims.h} numberOfPieces={150} recycle={false} />
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-semibold mb-1">Ticket {ticket} created</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Thanks! Maintenance has been notified.</p>
      <div className="flex gap-3">
        <Button onClick={() => (qr ? router.push(`/r/${encodeURIComponent(qr)}`) : router.push("/"))}>Report another issue</Button>
        <button className="underline text-sm" onClick={() => router.push("/")}>Back to Home</button>
      </div>
    </div>
  );
}
