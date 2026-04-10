import { NextRequest } from "next/server";
import { createServerClient, ISSUE_TABLE } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const category = searchParams.get("category");

    if (!lat || !lng || !category) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = createServerClient();
    
    // We fetch open issues for this category from the last 24 hours.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: issues, error } = await supabase
      .from(ISSUE_TABLE)
      .select("id, lat, lng")
      .eq("category", category)
      .neq("status", "fixed")
      .gte("created_at", oneDayAgo);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Simple Euclidean distance approximation (1 degree ~ 111km)
    // 50 meters is ~ 0.00045 degrees
    const MAX_DIST_DEG = 0.00045;
    
    let found = false;
    for (const issue of issues || []) {
      const dLat = Math.abs(issue.lat - lat);
      const dLng = Math.abs(issue.lng - lng);
      
      if (dLat < MAX_DIST_DEG && dLng < MAX_DIST_DEG) {
        found = true;
        break;
      }
    }

    return Response.json({ found });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
