"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { canViewUser, isOwnerRole, type Viewer } from "@/lib/types";

const ViewerContext = createContext<Viewer>({ email: null, restricted: [] });

export function ViewerProvider({ value, children }: { value: Viewer; children: React.ReactNode }) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export const useViewer = () => useContext(ViewerContext);

export function UserLink({
  email,
  className,
  title,
  children,
}: {
  email: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (!canViewUser(useViewer(), email)) {
    return (
      <span
        className={`${className?.replace(/hover:\S+/g, "")} opacity-40 cursor-not-allowed`}
        title="Admins only"
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={`/users/${encodeURIComponent(email)}`} className={className} title={title}>
      {children}
    </Link>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (!role) return null;
  const color = isOwnerRole(role)
    ? "bg-orange-600/20 text-orange-400"
    : "bg-zinc-800 text-zinc-400";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>{role}</span>;
}
