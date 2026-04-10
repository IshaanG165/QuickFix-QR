"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Issue } from "@/lib/types";
import { MapPin, Check, Clock, AlertTriangle } from "lucide-react";

export default function TrackPage() {
  const params = useParams<{ token: string }>();
  const id = decodeURIComponent(params.token);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchIssue = async () => {
    try {
      const res = await fetch(`/api/issues/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find report");
      setIssue(data.issue);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
    // Poll every 30s
    const interval = setInterval(fetchIssue, 30 * 1000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading && !issue) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground animate-pulse p-6">Loading report status...</div>;
  
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <AlertTriangle size={48} className="text-destructive mb-4" />
      <h1 className="text-xl font-bold mb-2">Issue not found</h1>
      <p className="text-muted-foreground">{error}</p>
    </div>
  );

  if (!issue) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-8">
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <MapPin className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-bold">Report Status</h1>
          <p className="text-sm font-mono text-muted-foreground mt-2 tracking-widest">{issue.id.split('-')[0]}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-accent/20 text-accent px-2.5 py-1 rounded-full uppercase tracking-widest">
            {issue.category}
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">Live Status</h2>
          
          <div className="relative border-l-2 border-border ml-[11px] space-y-8">
            {/* Received Step */}
            <div className="relative">
              <div className="absolute -left-[23px] top-0 h-[22px] w-[22px] rounded-full bg-emerald-500 border-4 border-card flex items-center justify-center shadow-sm">
                <Check size={12} className="text-white" />
              </div>
              <div className="pl-6 pt-0.5">
                <h3 className="text-sm font-bold text-foreground flex items-center justify-between">
                  Received
                  <span className="text-xs font-normal text-muted-foreground">{/* Add time date formatting if needed */}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">We&apos;ve logged your request</p>
              </div>
            </div>
            
            {/* In Progress Step */}
            <div className="relative">
              <div className={`absolute -left-[23px] top-0 h-[22px] w-[22px] rounded-full border-4 border-card flex items-center justify-center shadow-sm transition-colors ${
                issue.status === 'in_progress' || issue.status === 'fixed' ? 'bg-primary' : 'bg-muted'
              }`}>
                {(issue.status === 'in_progress' || issue.status === 'fixed') && <Check size={12} className="text-white" />}
              </div>
              <div className={`pl-6 pt-0.5 ${issue.status === 'in_progress' || issue.status === 'fixed' ? '' : 'opacity-60'}`}>
                <h3 className="text-sm font-bold text-foreground">In Review</h3>
                <p className="text-xs text-muted-foreground mt-1">Maintenance is investigating</p>
              </div>
            </div>
            
            {/* Resolved Step */}
            <div className="relative">
              <div className={`absolute -left-[23px] top-0 h-[22px] w-[22px] rounded-full border-4 border-card flex items-center justify-center shadow-sm transition-colors ${
                issue.status === 'fixed' ? 'bg-emerald-500' : 'bg-muted'
              }`}>
                {issue.status === 'fixed' && <Check size={12} className="text-white" />}
              </div>
              <div className={`pl-6 pt-0.5 ${issue.status === 'fixed' ? '' : 'opacity-60'}`}>
                <h3 className="text-sm font-bold text-foreground">Resolved</h3>
                <p className="text-xs text-muted-foreground mt-1">The issue has been fixed</p>
              </div>
            </div>
          </div>
        </div>

        {issue.note && (
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Description</h2>
            <p className="text-sm text-foreground leading-relaxed">{issue.note}</p>
          </div>
        )}

      </div>
    </div>
  );
}
