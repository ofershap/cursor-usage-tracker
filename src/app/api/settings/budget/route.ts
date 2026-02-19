import { NextResponse } from "next/server";
import { getMetadata, setMetadata } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const raw = getMetadata("team_budget_threshold");
  return NextResponse.json({ value: raw ? parseFloat(raw) : 0 });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { value: number };
  const value = Math.max(0, body.value ?? 0);
  setMetadata("team_budget_threshold", String(value));
  return NextResponse.json({ ok: true, value });
}
