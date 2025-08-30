import { NextRequest } from "next/server";
import { createServerClient, ISSUE_BUCKET } from "@/lib/supabase";

// Accepts multipart/form-data with field "file" and optional "issueId" or "qr_id" for naming
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const hint = form.get("hint") as string | null; // e.g., qr id or category for naming

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing file" }, { status: 400 });
    }

    const supabase = createServerClient();

    const ext = file.name.split('.').pop() || 'bin';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const folder = hint ? `issues/${encodeURIComponent(hint)}` : `issues/misc`;
    const path = `${folder}/${name}`;

    const { error } = await supabase.storage.from(ISSUE_BUCKET).upload(path, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ path });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
