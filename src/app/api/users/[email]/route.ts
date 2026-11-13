import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export function GET(request: Request, { params }: { params: Promise<{ email: string }> }) {
  return params.then((p) => {
    const email = decodeURIComponent(p.email);
    const url = new URL(request.url);
    const param = url.searchParams.get("days") ?? "30";
    const range = param === "cycle" ? "cycle" : parseInt(param, 10) || 30;

    const stats = getUserStats(email, range);
    return NextResponse.json(stats);
  });
}
