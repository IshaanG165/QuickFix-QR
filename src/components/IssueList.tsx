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
import { useMemo, useState } from "react";
import Image from "next/image";

export function IssueList({ issues, selectedId, onSelect, onChangeStatus }: {
  issues: Issue[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChangeStatus?: (id: string, status: IssueStatus) => void;
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

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
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
      </div>

      <div className="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800 divide-y">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Campus is sparkling ✨</div>
        ) : filtered.map((i) => (
          <div key={i.id} role="button" tabIndex={0} onClick={() => { onSelect?.(i.id); setOpen(true); }} onKeyDown={(e) => e.key === 'Enter' && (onSelect?.(i.id), setOpen(true))} className={`flex items-center justify-between gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedId===i.id? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: i.urgency === 'urgent' ? '#ef4444' : '#9ca3af' }} />
              <div>
                <div className="font-medium text-sm">{i.qr_id}</div>
                <div className="text-xs text-gray-500">{i.category} • {timeAgo(i.created_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {i.urgency === 'urgent' ? <Badge className="bg-rose-500">Urgent</Badge> : null}
              <StatusBadge status={i.status} />
            </div>
          </div>
        ))}
      </div>

      <Sheet open={open && !!selected} onOpenChange={(v) => setOpen(v)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.qr_id}</SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              {selected.photo_url ? (
                <div className="relative w-full h-48 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Image alt="Issue photo" src={selected.photo_url} fill className="object-cover" />
                </div>
              ) : null}
              {selected.note ? <p className="text-gray-700 dark:text-gray-300">{selected.note}</p> : null}
              <div className="text-gray-500">{selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</div>
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
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
