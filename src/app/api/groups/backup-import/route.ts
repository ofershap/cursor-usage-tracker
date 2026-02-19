import { NextResponse } from "next/server";
import { getDb, getGroupsWithMembers } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ParsedRow {
  email: string;
  name: string;
  group: string;
}

function parseCsv(text: string): ParsedRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf("email");
  const nameIdx = header.indexOf("name");
  const groupIdx = header.indexOf("group");

  if (emailIdx === -1 || groupIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());

    return {
      email: (cols[emailIdx] ?? "").toLowerCase(),
      name: nameIdx >= 0 ? (cols[nameIdx] ?? "") : "",
      group: cols[groupIdx] ?? "",
    };
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { csv: string; apply?: boolean };

  const rows = parseCsv(body.csv);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Could not parse CSV. Expected columns: email, name, group" },
      { status: 400 },
    );
  }

  const currentGroups = getGroupsWithMembers();
  const currentGroupByEmail = new Map<string, string>();
  for (const g of currentGroups) {
    for (const email of g.emails) {
      currentGroupByEmail.set(email, g.name);
    }
  }

  const changes: Array<{
    email: string;
    name: string;
    currentGroup: string;
    newGroup: string;
  }> = [];

  for (const row of rows) {
    if (!row.email || !row.group) continue;
    const currentGroup = currentGroupByEmail.get(row.email) ?? "Unassigned";
    if (currentGroup !== row.group) {
      changes.push({
        email: row.email,
        name: row.name,
        currentGroup,
        newGroup: row.group,
      });
    }
  }

  const preview = {
    totalRows: rows.length,
    changes,
    unchanged: rows.length - changes.length,
  };

  if (!body.apply) {
    return NextResponse.json(preview);
  }

  const db = getDb();
  const existingGroupIds = new Map<string, string>();
  for (const g of currentGroups) {
    existingGroupIds.set(g.name, g.id);
  }

  let nextId = Date.now();
  const newGroupNames = new Set(changes.map((c) => c.newGroup));
  for (const groupName of newGroupNames) {
    if (!existingGroupIds.has(groupName)) {
      const id = `restore_${nextId++}`;
      db.prepare(
        "INSERT INTO billing_groups (id, name, member_count, spend_cents) VALUES (?, ?, 0, 0)",
      ).run(id, groupName);
      existingGroupIds.set(groupName, id);
    }
  }

  let applied = 0;
  for (const change of changes) {
    const targetId = existingGroupIds.get(change.newGroup);
    if (!targetId) continue;
    db.prepare("DELETE FROM group_members WHERE email = ?").run(change.email);
    db.prepare(
      "INSERT INTO group_members (group_id, email, joined_at) VALUES (?, ?, datetime('now'))",
    ).run(targetId, change.email);
    applied++;
  }

  if (applied > 0) {
    db.prepare(
      "UPDATE billing_groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = billing_groups.id)",
    ).run();
  }

  return NextResponse.json({ ...preview, applied });
}
