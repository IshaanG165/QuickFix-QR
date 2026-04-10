import { NextRequest } from "next/server";
import { createServerClient, ISSUE_TABLE, ISSUE_BUCKET } from "@/lib/supabase";

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    
    const supabase = createServerClient();
    const { data: issue, error } = await supabase
      .from(ISSUE_TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ issue });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const { status } = body as { status?: string };

    if (!id || typeof status !== "string") {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from(ISSUE_TABLE)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("PATCH /api/issues/:id update error", { id, error });
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("PATCH /api/issues/:id exception", e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const supabase = createServerClient();
    // 1) Load current row to find attached photo path
    const { data: row, error: fetchErr } = await supabase
      .from(ISSUE_TABLE)
      .select("photo_url")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.error("DELETE /api/issues/:id fetch error", { id, error: fetchErr });
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }

    // 2) If photo exists, try to delete it from storage
    if (row?.photo_url) {
      // photo_url is expected to be a storage path like "issues/uuid/file.jpg"
      const del = await supabase.storage.from(ISSUE_BUCKET).remove([row.photo_url as string]);
      if (del.error) {
        // Continue but report warning
        console.warn("Storage remove failed", { id, path: row.photo_url, error: del.error });
        // Proceed to delete DB row regardless
      }
    }

    // 3) Delete DB row
    const { error } = await supabase
      .from(ISSUE_TABLE)
      .delete()
      .eq("id", id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
