"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Issue } from "@/lib/types";
import { IssueList } from "@/components/IssueList";
import { toast } from "sonner";
import { DemoBar } from "@/components/DemoBar";
import { createBrowserClient } from "@/lib/supabase";

const AdminMap = dynamic(() => import("@/components/AdminMap").then(m => m.AdminMap), { ssr: false });

export default function AdminPage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/issues", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load issues");
        setIssues(json.items as Issue[]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load issues";
        toast.error(msg);
        setIssues([]);
      }
    })();
  }, []);

  // Supabase Realtime: listen for inserts and updates on issues
  useEffect(() => {
    const supabase = createBrowserClient();
    const ch = supabase
      .channel("issues-stream")
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'issues' },
        (payload) => {
          const issue = payload.new as unknown as Issue;
          setIssues((prev) => (prev ? [...prev, issue] : [issue]));
          if (issue.urgency === "urgent") {
            toast("🚨 Urgent maintenance request received", { description: issue.qr_id });
            try {
              type WinWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
              const w = window as WinWithWebkit;
              const Ctor = window.AudioContext ?? w.webkitAudioContext;
              if (!Ctor) return;
              const ctx = new Ctor();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = "sine";
              o.frequency.value = 880;
              o.connect(g);
              g.connect(ctx.destination);
              g.gain.setValueAtTime(0.0001, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
              o.start();
              o.stop(ctx.currentTime + 0.26);
            } catch {}
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'issues' },
        (payload) => {
          const updated = payload.new as unknown as Issue;
          setIssues((prev) => prev ? prev.map(i => i.id === updated.id ? updated : i) : [updated]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  function onSelect(id: string) {
    setSelectedId(id);
  }

  function onChangeStatus(id: string, status: Issue["status"]) {
    // optimistic update
    setIssues((prev) => prev ? prev.map(i => i.id === id ? { ...i, status } : i) : prev);
    (async () => {
      try {
        const res = await fetch(`/api/issues/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to update");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update status";
        toast.error(msg);
      }
    })();
  }

  const listIssues = issues ?? [];

  const loading = issues === null;

  return (
    <div>
      <DemoBar />
      <div className="grid md:grid-cols-2 gap-4 p-4 min-h-[calc(100vh-56px)]">
        <div className="h-[60vh] md:h-[calc(100vh-80px)]">
          {loading ? (
            <div className="h-full w-full rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : (
            <AdminMap issues={listIssues} selectedId={selectedId ?? undefined} onSelect={onSelect} fitToIssues />
          )}
        </div>
        <div className="h-[60vh] md:h-[calc(100vh-80px)] overflow-hidden">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <IssueList issues={listIssues} selectedId={selectedId ?? undefined} onSelect={onSelect} onChangeStatus={onChangeStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
