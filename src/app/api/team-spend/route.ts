import { NextResponse } from "next/server";
import { getTeamDailySpend } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getTeamDailySpend());
}
