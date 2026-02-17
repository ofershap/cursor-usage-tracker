import { NextResponse } from "next/server";
import { getBillingGroups } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const groups = getBillingGroups();
  return NextResponse.json(groups);
}
