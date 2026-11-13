import Link from "next/link";
import { getUserStats } from "@/lib/data";
import { overviewHref, parseRange } from "@/lib/time-range";
import { UserDetailClient } from "./user-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ email: string }>;
  searchParams: Promise<{ range?: string }>;
}

export default async function UserPage({ params, searchParams }: PageProps) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);
  const range = parseRange((await searchParams).range);

  let stats;
  try {
    stats = getUserStats(decodedEmail, range);
  } catch {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-zinc-400">No data found for {decodedEmail}</p>
        <Link
          href={overviewHref(range)}
          className="text-blue-400 hover:text-blue-300 mt-4 inline-block"
        >
          ← Back to overview
        </Link>
      </div>
    );
  }

  return <UserDetailClient email={decodedEmail} stats={stats} initialRange={range} />;
}
