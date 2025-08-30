export type IssueStatus = "reported" | "in_progress" | "fixed";
export type IssueCategory = "bin" | "light" | "water" | "other";
export type IssueUrgency = "normal" | "urgent";

export interface Issue {
  id: string;
  qr_id: string;
  lat: number;
  lng: number;
  category: IssueCategory;
  urgency: IssueUrgency;
  status: IssueStatus;
  note?: string;
  photo_url?: string;
  created_at: string; // ISO timestamp
}
