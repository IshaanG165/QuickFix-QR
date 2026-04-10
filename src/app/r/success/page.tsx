"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, MapPin, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Script from "next/script";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] p-6 animate-pulse bg-background text-foreground">Loading...</div>}>
      <SuccessInner />
      {/* Load canvas-confetti from CDN */}
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" strategy="lazyOnload" />
    </Suspense>
  );
}

function SuccessInner() {
  const sp = useSearchParams();
  const ticket = sp.get("ticket") || "UNKNOWN";
  const qr = sp.get("qr");
  const router = useRouter();

  useEffect(() => {
    // Wait a heartbeat for script to load if it just mounted
    const timeout = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof window !== "undefined" && (window as any).confetti) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10b981', '#3b82f6', '#0F1F3D', '#ffffff']
        });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handleCopy = () => {
    const url = `${window.location.origin}/track/${ticket}`;
    navigator.clipboard.writeText(url);
    toast.success("Tracking link copied to clipboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground text-center" aria-live="polite">
      <div className="relative mb-6 text-emerald-500">
        <MapPin size={80} strokeWidth={1} />
        <div className="absolute inset-0 flex items-center justify-center -mt-2">
          <Check size={32} strokeWidth={3} className="text-emerald-500 bg-background rounded-full p-0.5" />
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-2 tracking-tight">Report Received</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Maintenance has been notified. Thank you for keeping our campus safe and clean!
      </p>

      <div className="bg-card border border-border px-5 py-3 rounded-xl mb-10 shadow-sm flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1 text-left">Ticket ID</p>
          <p className="font-mono font-medium text-lg text-foreground tracking-widest">{ticket.split('-')[0]}</p>
        </div>
      </div>

      {/* Status Timeline Component */}
      <div className="w-full max-w-xs mb-10 text-left">
        <div className="relative border-l-2 border-border ml-3 space-y-6">
          <div className="relative">
            <div className="absolute -left-[21px] top-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center shadow-sm">
              <Check size={10} className="text-white" />
            </div>
            <div className="pl-6">
              <h3 className="text-sm font-bold text-foreground">Received</h3>
              <p className="text-xs text-muted-foreground mt-0.5">We&apos;ve logged your request</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -left-[21px] top-1 h-5 w-5 rounded-full border-2 border-border bg-card flex items-center justify-center"></div>
            <div className="pl-6 opacity-60">
              <h3 className="text-sm font-medium text-foreground">In Review</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Assigning to maintenance</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -left-[21px] top-1 h-5 w-5 rounded-full border-2 border-border bg-card flex items-center justify-center"></div>
            <div className="pl-6 opacity-60">
              <h3 className="text-sm font-medium text-foreground">Resolved</h3>
              <p className="text-xs text-muted-foreground mt-0.5">The issue has been fixed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button onClick={handleCopy} className="w-full gap-2 rounded-xl h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-base shadow-md">
          <Copy size={18} />
          Track this report
        </Button>
        <Button variant="ghost" onClick={() => (qr ? router.push(`/r/${encodeURIComponent(qr)}`) : router.push("/"))} className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground">
          Report another issue
        </Button>
      </div>
    </div>
  );
}
