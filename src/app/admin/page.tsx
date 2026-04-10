"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Issue } from "@/lib/types";
import { IssueList } from "@/components/IssueList";
import { toast } from "sonner";
import { DemoBar } from "@/components/DemoBar";
import { createBrowserClient } from "@/lib/supabase";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QrCode, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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

  // Supabase Realtime
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
          if (issue.urgency === "urgent" || issue.urgency === "high") {
            toast.error("🚨 Urgent maintenance request received", { description: issue.title || issue.qr_id });
          } else {
            toast.info("New issue reported", { description: issue.title || issue.qr_id });
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

  function onDelete(id: string) {
    setIssues((prev) => prev ? prev.filter(i => i.id !== id) : prev);
    if (selectedId === id) setSelectedId(null);
    (async () => {
      try {
        const res = await fetch(`/api/issues/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to delete");
        toast.success("Issue deleted");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to delete issue";
        toast.error(msg);
      }
    })();
  }

  const listIssues = issues ?? [];
  const loading = issues === null;

  // Calculable Stats
  const stats = useMemo(() => {
    if (!listIssues) return { open: 0, urgent: 0, resolvedToday: 0, avgFixTime: "2.4" };
    
    const open = listIssues.filter(i => i.status !== "fixed").length;
    const urgent = listIssues.filter(i => (i.urgency === "urgent" || i.urgency === "high") && i.status !== "fixed").length;
    
    const today = new Date().toISOString().split('T')[0];
    const resolvedToday = listIssues.filter(i => i.status === "fixed" && new Date(i.created_at).toISOString().split('T')[0] === today).length;

    return { 
      open, 
      urgent, 
      resolvedToday, 
      avgFixTime: "3.2" // mock
    };
  }, [listIssues]);

  return (
    <div className="bg-background min-h-screen pb-10">
      <DemoBar />
      
      <div className="max-w-[1600px] mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <QrCode size={16} /> QR Generator
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] p-0 border-l border-border bg-card">
              <QRCodeGenerator />
            </SheetContent>
          </Sheet>
        </div>

        {/* Top Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl"><TrendingUp size={20} /></div>
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Open Issues</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : stats.open}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 rounded-xl"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Urgent Now</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : stats.urgent}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Resolved Today</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : stats.resolvedToday}</p>
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-start gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl"><Clock size={20} /></div>
            <div>
              <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Avg Fix Time</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${stats.avgFixTime}h`}</p>
            </div>
          </div>
        </div>

        {/* Analytics Chart Full Width */}
        <AnalyticsChart issues={listIssues} />

        {/* Dynamic Split Layout */}
        <div className="grid lg:grid-cols-2 gap-4 h-[700px]">
          <div className="h-full rounded-2xl overflow-hidden shadow-sm border border-border bg-muted/20 relative z-0">
            {loading ? (
              <div className="h-full w-full bg-muted animate-pulse" />
            ) : (
              <AdminMap issues={listIssues} selectedId={selectedId ?? undefined} onSelect={onSelect} fitToIssues />
            )}
          </div>
          <div className="h-full overflow-hidden bg-card border border-border rounded-2xl shadow-sm relative z-0">
            {loading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <IssueList issues={listIssues} selectedId={selectedId ?? undefined} onSelect={onSelect} onChangeStatus={onChangeStatus} onDelete={onDelete} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
