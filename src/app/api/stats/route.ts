import { NextResponse } from "next/server";
import { getFullDashboard } from "@/lib/data";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const param = url.searchParams.get("days") ?? "30";
  const range = param === "cycle" ? "cycle" : parseInt(param, 10) || 30;

  const dashboard = getFullDashboard(range);
  return NextResponse.json(dashboard);
}
