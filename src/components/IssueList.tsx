"use client";

import { Issue, IssueCategory, IssueStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/utils/timeAgo";
import { downloadCSV, issuesToCSV } from "@/utils/csv";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Wrench, Trash2, MapPin } from "lucide-react";

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

  const selected = useMemo(() => issues.find(i => i.id === selectedId) || null, [issues, selectedId]);

  const filtered = useMemo(() => {
    return issues.filter(i =>
      (q ? i.qr_id.toLowerCase().includes(q.toLowerCase()) : true) &&
      (status === "all" ? true : i.status === status) &&
      (category === "all" ? true : i.category === category) &&
      (!urgentOnly || i.urgency === "urgent")
    );
  }, [issues, q, status, category, urgentOnly]);

  const count = filtered.length;

  // Keyboard shortcuts while a ticket is open
  useEffect(() => {
    if (!open || !selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key.toLowerCase() === 'i') onChangeStatus?.(selected.id, "in_progress");
      if (e.key.toLowerCase() === 'f') onChangeStatus?.(selected.id, "fixed");
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (confirm("Delete this issue? This cannot be undone.")) onDelete?.(selected.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, selected, onChangeStatus, onDelete]);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search by QR ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={(v) => {
          const next = v === "all" || v === "reported" || v === "in_progress" || v === "fixed" ? v : "all";
          setStatus(next as typeof status);
        }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => {
          const next = v === "all" || v === "bin" || v === "light" || v === "water" || v === "other" ? v : "all";
          setCategory(next as typeof category);
        }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="bin">Bin</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="water">Water</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={urgentOnly ? "default" : "secondary"} onClick={() => setUrgentOnly(v => !v)} aria-pressed={urgentOnly}>Urgent only</Button>
        <Button variant="outline" onClick={() => downloadCSV("issues.csv", issuesToCSV(filtered))}>Export CSV</Button>
        <div className="ml-auto text-xs text-gray-500">{count} result{count === 1 ? '' : 's'}</div>
      </div>

      <div className="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800 divide-y">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Campus is sparkling ✨</div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((i) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { onSelect?.(i.id); setOpen(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && (onSelect?.(i.id), setOpen(true))}
                  className={`group flex items-center justify-between gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedId===i.id? 'bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300/60 dark:ring-blue-700/40' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${i.urgency === 'urgent' ? 'bg-rose-500' : 'bg-gray-400'}`} />
                    <div>
                      <div className="font-medium text-sm">
                        {i.qr_id}
                        <span className="ml-2 text-xs text-gray-500">{timeAgo(i.created_at)}</span>
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {i.category}
                        {i.note ? <span className="ml-2 text-gray-400 line-clamp-1">• {i.note}</span> : null}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {i.lat.toFixed(4)}, {i.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.urgency === 'urgent' ? <Badge className="bg-rose-500">Urgent</Badge> : null}
                    <StatusBadge status={i.status} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Sheet open={open && !!selected} onOpenChange={(v) => setOpen(v)}>
        <SheetContent side="right" className="sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="font-semibold tracking-tight">{selected?.qr_id}</span>
              {selected?.urgency === 'urgent' ? <Badge className="bg-rose-500">Urgent</Badge> : null}
              {selected ? <StatusBadge status={selected.status} /> : null}
            </SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              {selected.photo_url ? (
                <div className="relative w-full h-48 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Image alt="Issue photo" src={selected.photo_url} fill className="object-cover" />
                </div>
              ) : null}
              {selected.note ? <p className="text-gray-700 dark:text-gray-300">{selected.note}</p> : null}
              <div className="text-gray-500 flex items-center gap-1"><MapPin className="h-4 w-4" /> {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status</span>
                <Select value={selected.status} onValueChange={(v) => {
                  const isValid = v === "reported" || v === "in_progress" || v === "fixed";
                  if (isValid) onChangeStatus?.(selected.id, v as IssueStatus);
                }}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => onChangeStatus?.(selected.id, "in_progress")}>
                  <Wrench className="h-4 w-4 mr-1" /> Mark In Progress
                </Button>
                <Button onClick={() => onChangeStatus?.(selected.id, "fixed")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Fixed
                </Button>
                <Button variant="destructive" onClick={() => {
                  if (confirm("Delete this issue? This cannot be undone.")) onDelete?.(selected.id);
                }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
              <div className="text-[11px] text-gray-400">Shortcuts: I = In progress, F = Fixed, Del = Delete, Esc = Close</div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
