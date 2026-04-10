import { NextRequest } from "next/server";
import { createServerClient, ISSUE_BUCKET, ISSUE_TABLE } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const urgentOnly = searchParams.get("urgentOnly") === "true";
    const q = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);

    let query = supabase.from(ISSUE_TABLE).select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(limit);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (urgentOnly) query = query.eq("urgency", "urgent");
    if (q) query = query.ilike("qr_id", `%${q}%`);

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Sign photo paths so the client can render private images
    type Row = {
      id: string;
      qr_id: string;
      category: string;
      urgency: string;
      status: string;
      note: string | null;
      lat: number;
      lng: number;
      photo_url: string | null;
      created_at: string;
    };

    const rows = (data as Row[] | null | undefined) || [];
    const paths = rows.map(r => r.photo_url).filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { data: signedList, error: signErr } = await supabase
        .storage
        .from(ISSUE_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (!signErr && signedList) {
        const map = new Map<string, string>();
        for (let i = 0; i < signedList.length; i++) {
          const original = paths[i];
          const signed = signedList[i];
          if (signed?.signedUrl) map.set(original, signed.signedUrl);
        }
        for (const r of rows) {
          if (r.photo_url && map.has(r.photo_url)) r.photo_url = map.get(r.photo_url) as string;
        }
      }
    }

    return Response.json({ items: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
