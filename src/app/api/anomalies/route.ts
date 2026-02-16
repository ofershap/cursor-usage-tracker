import { NextResponse } from "next/server";
import { getAnomalyTimeline } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") ?? "30", 10);

  const timeline = getAnomalyTimeline(days);
  return NextResponse.json(timeline);
}
