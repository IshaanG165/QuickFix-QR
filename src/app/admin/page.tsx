"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Issue } from "@/lib/types";
import { getIssues, subscribeToIssuesMock } from "@/lib/mockIssues";
import { IssueList } from "@/components/IssueList";
import { toast } from "sonner";
import { DemoBar } from "@/components/DemoBar";

const AdminMap = dynamic(() => import("@/components/AdminMap").then(m => m.AdminMap), { ssr: false });

export default function AdminPage() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getIssues().then(setIssues);
  }, []);

  useEffect(() => {
    const unsub = subscribeToIssuesMock(
      (issue) => {
        setIssues((prev) => (prev ? [...prev, issue] : [issue]));
        if (issue.urgency === "urgent") {
          toast("🚨 Urgent maintenance request received", { description: issue.qr_id });
          // WebAudio chime for accessibility without external file
          try {
            type WinWithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
            const w = window as WinWithWebkit;
            const Ctor = window.AudioContext ?? w.webkitAudioContext;
            if (!Ctor) return;
            const ctx = new Ctor();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "sine";
            o.frequency.value = 880; // A5
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
            o.start();
            o.stop(ctx.currentTime + 0.26);
          } catch {}
        }
      },
      (updated) => {
        setIssues((prev) => prev ? prev.map(i => i.id === updated.id ? updated : i) : [updated]);
      }
    );
    return () => { unsub?.(); };
  }, []);

  function onSelect(id: string) {
    setSelectedId(id);
  }

  function onChangeStatus(id: string, status: Issue["status"]) {
    setIssues((prev) => prev ? prev.map(i => i.id === id ? { ...i, status } : i) : prev);
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
