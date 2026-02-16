import { NextResponse } from "next/server";
import { acknowledgeIncident, resolveIncident } from "@/lib/incidents";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incidentId = parseInt(id, 10);
  const body = (await request.json()) as { action: string };

  if (body.action === "acknowledge") {
    acknowledgeIncident(incidentId);
    return NextResponse.json({ ok: true, action: "acknowledged" });
  }

  if (body.action === "resolve") {
    resolveIncident(incidentId);
    return NextResponse.json({ ok: true, action: "resolved" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
