import { NextResponse } from "next/server";
import { getModelCostBreakdown } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getModelCostBreakdown());
}
