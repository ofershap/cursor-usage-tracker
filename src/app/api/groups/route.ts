import { NextResponse } from "next/server";
import { getGroupsWithMembers, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const groups = getGroupsWithMembers();
  return NextResponse.json(groups);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    action: string;
    groupId?: string;
    name?: string;
    email?: string;
    targetGroupId?: string;
  };

  if (body.action === "rename" && body.groupId && body.name) {
    const db = getDb();
    db.prepare("UPDATE billing_groups SET name = ? WHERE id = ?").run(body.name, body.groupId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create" && body.name) {
    const db = getDb();
    const id = `local_${Date.now()}`;
    db.prepare(
      "INSERT INTO billing_groups (id, name, member_count, spend_cents) VALUES (?, ?, 0, 0)",
    ).run(id, body.name);
    return NextResponse.json({ ok: true, id });
  }

  if (body.action === "assign" && body.email && body.targetGroupId) {
    const db = getDb();
    db.prepare("DELETE FROM group_members WHERE email = ?").run(body.email);
    db.prepare(
      "INSERT INTO group_members (group_id, email, joined_at) VALUES (?, ?, datetime('now'))",
    ).run(body.targetGroupId, body.email);
    db.prepare(
      "UPDATE billing_groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = billing_groups.id)",
    ).run();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
