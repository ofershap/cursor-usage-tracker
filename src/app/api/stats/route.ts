import { NextResponse } from "next/server";
import { getFullDashboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") ?? "7", 10);

  const dashboard = getFullDashboard(days);
  return NextResponse.json(dashboard);
}
