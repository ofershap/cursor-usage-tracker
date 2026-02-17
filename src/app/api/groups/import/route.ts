import { NextResponse } from "next/server";
import { getDb, getGroupsWithMembers } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_TEAM_SIZE = 3;

interface CsvRow {
  email: string;
  department: string;
  group: string;
  team: string;
  name: string;
  title: string;
}

function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];
  const header = headerLine.split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = header.findIndex((h) => h === "email");
  const deptIdx = header.findIndex((h) => h === "department");
  const groupIdx = header.findIndex((h) => h === "group");
  const teamIdx = header.findIndex((h) => h === "team");
  const nameIdx = header.findIndex((h) => h.includes("display") || h === "name");
  const titleIdx = header.findIndex((h) => h.includes("job") || h === "title");

  if (emailIdx === -1 || deptIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      email: (cols[emailIdx] ?? "").toLowerCase(),
      department: cols[deptIdx] ?? "",
      group: groupIdx >= 0 ? (cols[groupIdx] ?? "") : "",
      team: teamIdx >= 0 ? (cols[teamIdx] ?? "") : "",
      name: nameIdx >= 0 ? (cols[nameIdx] ?? "") : "",
      title: titleIdx >= 0 ? (cols[titleIdx] ?? "") : "",
    };
  });
}

function buildGroupKey(row: CsvRow): string {
  const group = row.group.trim();
  const team = row.team.trim();
  const dept = row.department.trim();

  if (group && team && group !== team) return `${group} > ${team}`;
  if (group) return `${group} > ${group}`;
  if (team) return `${dept} > ${team}`;
  return `${dept} > General`;
}

function consolidateGroups(rawGroups: Map<string, string[]>): Map<string, string[]> {
  const final = new Map<string, string[]>();
  const overflow = new Map<string, string[]>();

  for (const [key, members] of rawGroups) {
    const parent = key.split(" > ")[0] ?? key;
    if (members.length < MIN_TEAM_SIZE) {
      const existing = overflow.get(parent) ?? [];
      existing.push(...members);
      overflow.set(parent, existing);
    } else {
      final.set(key, [...members]);
    }
  }

  for (const [parent, emails] of overflow) {
    const generalKey = `${parent} > General`;
    const siblings = [...final.keys()].filter((k) => k.startsWith(`${parent} > `));

    if (siblings.length === 1 && emails.length < MIN_TEAM_SIZE) {
      const target = final.get(siblings[0] ?? "");
      if (target) target.push(...emails);
    } else if (final.has(generalKey)) {
      const target = final.get(generalKey);
      if (target) target.push(...emails);
    } else {
      final.set(generalKey, emails);
    }
  }

  const toRemove: string[] = [];
  for (const [key, members] of final) {
    if (members.length < MIN_TEAM_SIZE && key.endsWith(" > General")) {
      const parent = key.split(" > ")[0] ?? key;
      const siblings = [...final.keys()].filter((k) => k.startsWith(`${parent} > `) && k !== key);
      if (siblings.length > 0) {
        const largest = siblings.reduce((a, b) =>
          (final.get(a)?.length ?? 0) >= (final.get(b)?.length ?? 0) ? a : b,
        );
        const target = final.get(largest);
        if (target) target.push(...members);
        toRemove.push(key);
      }
    }
  }
  for (const key of toRemove) final.delete(key);

  const toRemove2: string[] = [];
  for (const [key, members] of final) {
    if (members.length < MIN_TEAM_SIZE) {
      const generalGroup = final.get("General > General") ?? [];
      generalGroup.push(...members);
      final.set("General > General", generalGroup);
      toRemove2.push(key);
    }
  }
  for (const key of toRemove2) final.delete(key);

  return final;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    csv: string;
    apply?: boolean;
    selectedEmails?: string[];
  };

  const rows = parseCsv(body.csv);
  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Could not parse CSV. Expected columns: Email, Department. Optional: Group, Team, Display name, Job title.",
      },
      { status: 400 },
    );
  }

  const hibobByEmail = new Map<string, CsvRow>();
  for (const row of rows) {
    if (row.email) hibobByEmail.set(row.email, row);
  }

  const hasGroupColumn = rows.some((r) => r.group.trim() !== "");

  const db = getDb();
  const members = db
    .prepare("SELECT email, user_id, name FROM members WHERE is_removed = 0")
    .all() as Array<{ email: string; user_id: string | null; name: string }>;

  const currentGroups = getGroupsWithMembers();
  const currentGroupByEmail = new Map<string, string>();
  for (const g of currentGroups) {
    for (const email of g.emails) {
      currentGroupByEmail.set(email, g.name);
    }
  }

  const rawGroupMap = new Map<string, string[]>();
  const noMatch: Array<{ email: string; name: string; currentGroup: string }> = [];

  for (const member of members) {
    const bob = hibobByEmail.get(member.email.toLowerCase());
    if (!bob) {
      noMatch.push({
        email: member.email,
        name: member.name,
        currentGroup: currentGroupByEmail.get(member.email) ?? "Unassigned",
      });
      continue;
    }

    const key = buildGroupKey(bob);
    const list = rawGroupMap.get(key) ?? [];
    list.push(member.email);
    rawGroupMap.set(key, list);
  }

  const finalGroups = consolidateGroups(rawGroupMap);

  const emailToNewGroup = new Map<string, string>();
  for (const [groupName, emails] of finalGroups) {
    for (const email of emails) {
      emailToNewGroup.set(email, groupName);
    }
  }

  const changes: Array<{
    email: string;
    name: string;
    department: string;
    title: string;
    currentGroup: string;
    newGroup: string;
  }> = [];

  for (const member of members) {
    const newGroup = emailToNewGroup.get(member.email);
    if (!newGroup) continue;
    const currentGroup = currentGroupByEmail.get(member.email) ?? "Unassigned";
    if (newGroup === currentGroup) continue;

    const bob = hibobByEmail.get(member.email.toLowerCase());
    changes.push({
      email: member.email,
      name: bob?.name || member.name,
      department: bob?.department ?? "",
      title: bob?.title ?? "",
      currentGroup,
      newGroup,
    });
  }

  const preview = {
    totalMembers: members.length,
    matched: members.length - noMatch.length,
    hasGroupColumn,
    moves: changes.length,
    keeps: members.length - noMatch.length - changes.length,
    noMatch: noMatch.length,
    changes,
    groups: [...finalGroups.entries()]
      .map(([name, emails]) => ({ name, memberCount: emails.length }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    noMatchMembers: noMatch,
  };

  if (!body.apply) {
    return NextResponse.json(preview);
  }

  const existingGroupIds = new Map<string, string>();
  for (const g of currentGroups) {
    existingGroupIds.set(g.name, g.id);
  }

  let nextId = Date.now();
  for (const [groupName] of finalGroups) {
    if (!existingGroupIds.has(groupName)) {
      const id = `import_${nextId++}`;
      db.prepare(
        "INSERT INTO billing_groups (id, name, member_count, spend_cents) VALUES (?, ?, 0, 0)",
      ).run(id, groupName);
      existingGroupIds.set(groupName, id);
    }
  }

  const selectedSet = body.selectedEmails
    ? new Set(body.selectedEmails)
    : new Set(changes.map((c) => c.email));

  let applied = 0;
  for (const change of changes) {
    if (!selectedSet.has(change.email)) continue;
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
