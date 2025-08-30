import { Issue, IssueCategory, IssueStatus, IssueUrgency } from "./types";

let issues: Issue[] = [];

const USYD_J12 = { lat: -33.8869, lng: 151.1929 };

function seedOnce() {
  if (issues.length) return;
  const now = new Date();
  const base: Issue[] = [
    {
      id: "TICKET-101",
      qr_id: "BIN-001",
      lat: USYD_J12.lat + 0.001,
      lng: USYD_J12.lng + 0.001,
      category: "bin",
      urgency: "urgent",
      status: "reported",
      note: "Overflowing bin",
      created_at: new Date(now.getTime() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "TICKET-102",
      qr_id: "LGT-045",
      lat: USYD_J12.lat - 0.0007,
      lng: USYD_J12.lng + 0.0006,
      category: "light",
      urgency: "normal",
      status: "in_progress",
      note: "Flickering light",
      created_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "TICKET-103",
      qr_id: "WTR-012",
      lat: USYD_J12.lat + 0.0003,
      lng: USYD_J12.lng - 0.0008,
      category: "water",
      urgency: "urgent",
      status: "reported",
      note: "Leaking tap",
      created_at: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
    },
  ];
  issues = base;
}

// Demo helpers
export function triggerUrgentIssue(): Issue {
  const jitter = () => (Math.random() - 0.5) * 0.0015;
  const cats: IssueCategory[] = ["bin", "light", "water"];
  const cat: IssueCategory = cats[Math.floor(Math.random() * cats.length)];
  const issue: Issue = {
    id: nextId(),
    qr_id: `${cat.toUpperCase().slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
    lat: USYD_J12.lat + jitter(),
    lng: USYD_J12.lng + jitter(),
    category: cat,
    urgency: "urgent",
    status: "reported",
    created_at: new Date().toISOString(),
    note: "Demo urgent issue",
  };
  issues.push(issue);
  for (const l of listeners) l.onInsert?.(issue);
  return issue;
}

export function triggerRandomStatusUpdate(): Issue | null {
  if (!issues.length) return null;
  const idx = Math.floor(Math.random() * issues.length);
  const curr = issues[idx];
  const next: Issue = { ...curr };
  next.status = curr.status === "reported" ? "in_progress" : curr.status === "in_progress" ? "fixed" : "fixed";
  issues[idx] = next;
  for (const l of listeners) l.onUpdate?.(next);
  return next;
}

export async function getIssues(): Promise<Issue[]> {
  seedOnce();
  // Simulate small delay
  await new Promise((r) => setTimeout(r, 300));
  return JSON.parse(JSON.stringify(issues));
}

export type InsertHandler = (issue: Issue) => void;
export type UpdateHandler = (issue: Issue) => void;

const listeners = new Set<{ onInsert?: InsertHandler; onUpdate?: UpdateHandler }>();

export function subscribeToIssuesMock(onInsert?: InsertHandler, onUpdate?: UpdateHandler) {
  const entry = { onInsert, onUpdate };
  listeners.add(entry);

  const interval = setInterval(() => {
    if (Math.random() < 0.5) {
      // insert
      const newIssue = makeRandomIssue();
      issues.push(newIssue);
      for (const l of listeners) l.onInsert?.(newIssue);
    } else if (issues.length) {
      // update random status
      const idx = Math.floor(Math.random() * issues.length);
      const next = { ...issues[idx] };
      next.status = next.status === "reported" ? "in_progress" : next.status === "in_progress" ? "fixed" : "fixed";
      issues[idx] = next;
      for (const l of listeners) l.onUpdate?.(next);
    }
  }, 10000);

  return () => {
    clearInterval(interval);
    listeners.delete(entry);
  };
}

let counter = 200;
function nextId() {
  counter += 1;
  return `TICKET-${counter}`;
}

export async function submitReport(input: {
  qr_id: string;
  category: IssueCategory;
  urgency: IssueUrgency;
  note?: string;
  lat: number;
  lng: number;
  photo_url?: string;
}): Promise<{ id: string }>{
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 300));
  const id = nextId();
  const issue: Issue = {
    id,
    qr_id: input.qr_id,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    urgency: input.urgency,
    status: "reported",
    note: input.note,
    photo_url: input.photo_url,
    created_at: new Date().toISOString(),
  };
  issues.push(issue);
  for (const l of listeners) l.onInsert?.(issue);
  return { id };
}

function makeRandomIssue(): Issue {
  const cats: IssueCategory[] = ["bin", "light", "water", "other"];
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const urg: IssueUrgency = Math.random() < 0.3 ? "urgent" : "normal";
  const status: IssueStatus = "reported";
  const jitter = () => (Math.random() - 0.5) * 0.002;
  return {
    id: nextId(),
    qr_id: `${cat.toUpperCase().slice(0,3)}-${Math.floor(100 + Math.random() * 900)}`,
    lat: USYD_J12.lat + jitter(),
    lng: USYD_J12.lng + jitter(),
    category: cat,
    urgency: urg,
    status,
    created_at: new Date().toISOString(),
  };
}
