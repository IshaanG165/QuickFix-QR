export type IssueStatus = "reported" | "in_progress" | "fixed";
export type IssueCategory = "bin" | "light" | "water" | "other";
export type IssueUrgency = "low" | "medium" | "high" | "normal" | "urgent";
export interface Issue {
  id: string;
  qr_id: string;
  lat: number;
  lng: number;
  category: IssueCategory;
  urgency: IssueUrgency;
  status: IssueStatus;
  title?: string;
  note?: string;
  photo_url?: string;
  created_at: string; // ISO timestamp
}
