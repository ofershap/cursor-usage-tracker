import { NextResponse } from "next/server";
import { getGroupsWithMembers } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const groups = getGroupsWithMembers();

  const rows: string[] = ["email,name,group"];
  for (const group of groups) {
    for (const member of group.members) {
      const name = member.name.includes(",") ? `"${member.name}"` : member.name;
      const groupName = group.name.includes(",") ? `"${group.name}"` : group.name;
      rows.push(`${member.email},${name},${groupName}`);
    }
  }

  const csv = rows.join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="group-mapping-${date}.csv"`,
    },
  });
}
