import { NextRequest } from "next/server";
import { createServerClient, ISSUE_TABLE } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      qr_id,
      category,
      urgency,
      title,
      note,
      lat,
      lng,
      photoPath, // optional storage path like issues/{uuid}/{filename}
    } = body as Record<string, unknown>;

    if (
      typeof qr_id !== "string" ||
      typeof category !== "string" ||
      typeof urgency !== "string" ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from(ISSUE_TABLE)
      .insert({
        qr_id,
        category,
        urgency,
        status: "reported",
        title: typeof title === "string" ? title : null,
        note: typeof note === "string" ? note : null,
        lat,
        lng,
        photo_url: typeof photoPath === "string" ? photoPath : null,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
