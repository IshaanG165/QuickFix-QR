import { Issue } from "@/lib/types";

export function issuesToCSV(issues: Issue[]): string {
  const header = [
    "id","qr_id","lat","lng","category","urgency","status","note","photo_url","created_at"
  ];
  const rows = issues.map(i => [
    i.id,
    i.qr_id,
    i.lat,
    i.lng,
    i.category,
    i.urgency,
    i.status,
    i.note ?? "",
    i.photo_url ?? "",
    i.created_at,
  ]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  return [header, ...rows].map(r => r.map(escape).join(",")).join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
