import { isOwnerRole } from "@/lib/types";

export function RoleBadge({ role }: { role: string }) {
  if (!role) return null;
  const color = isOwnerRole(role)
    ? "bg-orange-600/20 text-orange-400"
    : "bg-zinc-800 text-zinc-400";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>{role}</span>;
}
