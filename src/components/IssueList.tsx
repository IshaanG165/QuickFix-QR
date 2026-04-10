"use client";

import { Issue, IssueCategory, IssueStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/utils/timeAgo";
import { downloadCSV, issuesToCSV } from "@/utils/csv";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Lightbulb, Droplets, MoreHorizontal, CheckCircle2, MapPin, Search, ChevronDown, UserPlus, Filter } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = {
  bin: { icon: Trash2, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  light: { icon: Lightbulb, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  water: { icon: Droplets, color: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  other: { icon: MoreHorizontal, color: "bg-gray-500", text: "text-gray-600 dark:text-gray-400" },
};

export function IssueList({ issues, selectedId, onSelect, onChangeStatus, onDelete }: {
  issues: Issue[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChangeStatus?: (id: string, status: IssueStatus) => void;
  onDelete?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all"|IssueStatus>("all");
  const [category, setCategory] = useState<"all"|IssueCategory>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [open, setOpen] = useState(false);

  // Quick Action Tray Local State
  const [qaStatus, setQaStatus] = useState<IssueStatus | null>(null);
  const [qaNote, setQaNote] = useState("");

  const selected = useMemo(() => issues.find(i => i.id === selectedId) || null, [issues, selectedId]);

  useEffect(() => {
    if (selected) {
      setQaStatus(selected.status);
      setQaNote("");
    }
  }, [selected]);

  const filtered = useMemo(() => {
    return issues
      .filter(i =>
        (q ? i.qr_id.toLowerCase().includes(q.toLowerCase()) || i.title?.toLowerCase().includes(q.toLowerCase()) : true) &&
        (status === "all" ? true : i.status === status) &&
        (category === "all" ? true : i.category === category) &&
        (!urgentOnly || i.urgency === "urgent" || i.urgency === "high")
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [issues, q, status, category, urgentOnly]);

  const count = filtered.length;

  const handleSaveAction = async () => {
    if (!selected) return;
    try {
      if (qaStatus && qaStatus !== selected.status) {
        onChangeStatus?.(selected.id, qaStatus);
      }
      // Stub for note saving
      if (qaNote.trim()) {
        toast.info("Internal Note Saved (Stub)");
      }
      setOpen(false);
    } catch {
      toast.error("Failed to apply actions");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border p-4 shadow-sm flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search issues or locations..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            className="pl-9 bg-background border-border rounded-xl h-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex bg-muted p-1 rounded-lg shrink-0">
            {(["all", "reported", "in_progress", "fixed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>

          <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger className="h-8 text-xs rounded-lg bg-background w-[120px] shrink-0">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bin">Bin</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="water">Water</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <button 
            onClick={() => setUrgentOnly(v => !v)}
            className={`shrink-0 flex items-center h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${urgentOnly ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-900" : "bg-background border-border text-foreground hover:bg-muted"}`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${urgentOnly ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
            Urgent First
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 p-4 bg-muted/20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-70">
            <CheckCircle2 size={48} className="text-emerald-500 mb-4" strokeWidth={1} />
            <p className="text-lg font-medium text-foreground">All clear!</p>
            <p className="text-sm text-muted-foreground mt-1">No issues match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence initial={false}>
              {filtered.map((i) => {
                const isSelected = selectedId === i.id;
                const catInfo = CATEGORIES[i.category as keyof typeof CATEGORIES] || CATEGORIES.other;
                const Icon = catInfo.icon;
                const urgencyLevel = i.urgency === "urgent" || i.urgency === "high" ? "high" : (i.urgency === "medium" ? "medium" : "low");
                
                return (
                  <motion.div
                    key={i.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { onSelect?.(i.id); setOpen(true); }}
                      className={`group relative overflow-hidden bg-card border rounded-2xl p-4 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]
                        ${isSelected ? 'ring-2 ring-primary border-transparent' : 'border-border hover:border-gray-300 dark:hover:border-gray-600'}
                      `}
                    >
                      {/* Left color strip */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${catInfo.color}`} />
                      
                      <div className="flex items-start justify-between gap-3 pl-2">
                        <div className="flex gap-3 items-start">
                          <div className={`p-2 rounded-xl bg-muted ${catInfo.text}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {i.title || i.qr_id}
                              {urgencyLevel === "high" && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-widest">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <MapPin size={12} />
                              <span className="truncate max-w-[150px] sm:max-w-[200px]">{i.qr_id}</span>
                              <span>•</span>
                              <span>{timeAgo(i.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={i.status} />
                        </div>
                      </div>
                      
                      {i.note && (
                        <div className="mt-3 pl-[3.25rem] text-sm text-foreground/80 line-clamp-1 border-t border-border pt-2 border-dashed">
                          <span className="font-medium opacity-50">Note: </span> {i.note}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Sheet open={open && !!selected} onOpenChange={(v) => { setOpen(v); if(!v) onSelect?.(""); }}>
        <SheetContent side="right" className="w-full sm:max-w-[450px] p-0 flex flex-col h-full bg-background border-l border-border">
          {selected ? (
            <>
              <div className="p-6 border-b border-border shrink-0 bg-card">
                <SheetHeader>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{selected.category}</p>
                  <SheetTitle className="text-xl leading-tight text-foreground">{selected.title || selected.qr_id}</SheetTitle>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {selected.qr_id}</span>
                    <span>•</span>
                    <span>{timeAgo(selected.created_at)}</span>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selected.photo_url ? (
                  <div className="relative w-full aspect-video rounded-xl bg-muted overflow-hidden border border-border shadow-sm">
                    <Image alt="Issue photo" src={selected.photo_url} fill className="object-cover hover:scale-105 transition-transform" />
                  </div>
                ) : null}

                {selected.note && (
                  <div className="bg-muted/50 p-4 rounded-xl border border-border">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Reporter Note</h3>
                    <p className="text-sm text-foreground">{selected.note}</p>
                  </div>
                )}

                {/* Quick Action Tray Controls */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h3>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Status Workflow</label>
                    <div className="flex bg-muted p-1 rounded-xl">
                      {(["reported", "in_progress", "fixed"] as IssueStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setQaStatus(s)}
                          className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all ${qaStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"}`}
                        >
                          {s === "in_progress" ? "In Review" : s === "fixed" ? "Resolved" : "Reported"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign To</label>
                    <Select defaultValue="unassigned">
                      <SelectTrigger className="w-full bg-background rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="maintenance_team_a">Maintenance Team A</SelectItem>
                        <SelectItem value="facilities">Facilities Squad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Internal Note</label>
                    <Textarea 
                      placeholder="Add an internal note..." 
                      className="resize-none h-24 rounded-xl bg-background"
                      value={qaNote}
                      onChange={(e) => setQaNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-card shrink-0 flex gap-3">
                 <Button className="flex-1 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 text-base font-semibold" onClick={handleSaveAction}>
                    {qaStatus === 'fixed' ? 'Mark Resolved ✓' : 'Save Changes'}
                 </Button>
                 <Button variant="ghost" className="h-12 w-12 shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => {
                  if (confirm("Delete this issue?")) onDelete?.(selected.id);
                 }}>
                   <Trash2 size={20} />
                 </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
