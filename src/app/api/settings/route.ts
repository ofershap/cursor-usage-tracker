import { NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/db";
import type { DetectionConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  const config = getConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as DetectionConfig;
  saveConfig(body);
  return NextResponse.json({ ok: true });
}
