import { NextRequest } from "next/server";
import { createServerClient, ISSUE_TABLE } from "@/lib/supabase";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
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

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
