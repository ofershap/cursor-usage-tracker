import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request, { params }: { params: Promise<{ email: string }> }) {
  return params.then((p) => {
    const email = decodeURIComponent(p.email);
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    const stats = getUserStats(email, days);
    return NextResponse.json(stats);
  });
}
