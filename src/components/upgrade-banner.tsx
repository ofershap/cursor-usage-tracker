"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const UPGRADE_URL = "https://cursor-usage-tracker.sticklight.app/";

const FEATURES = [
  { title: "Server Deployment", desc: "Production-ready hosting on your infrastructure" },
  { title: "Remote Database", desc: "PostgreSQL, MySQL - connect any remote DB" },
  { title: "Authentication & RBAC", desc: "SSO, role-based access, team permissions" },
  { title: "Onboarding & Support", desc: "Hands-on setup, migration help, priority support" },
  { title: "White-Label Branding", desc: "Your logo, colors, and custom domain" },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="8" fill="rgb(16 185 129 / 0.15)" />
      <path
        d="M5 8l2 2 4-4"
        stroke="rgb(52 211 153)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[420px] mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-[scaleIn_200ms_ease-out]">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="px-6 pt-6 pb-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1l1.5 3.1L11 4.5 8.5 7l.6 3.5L6 8.8 2.9 10.5l.6-3.5L1 4.5l3.5-.4L6 1z"
                fill="rgb(52 211 153)"
              />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-400 tracking-wide uppercase">
              Pro
            </span>
          </div>

          <h2 className="text-xl font-bold text-white mb-1.5">Unlock the Full Experience</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Everything you need to run Cursor Tracker in production
            <br />
            Deployed, secured, and supported.
          </p>
        </div>

        <div className="px-6 pb-5">
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <Check />
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-zinc-100">{f.title}</span>
                  <span className="text-[12px] text-zinc-500">{f.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-6 pt-1 space-y-3">
          <a
            href={UPGRADE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full text-center rounded-xl py-3 text-sm font-semibold text-white transition-all overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 transition-all" />
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
            <span className="relative flex items-center justify-center gap-2">
              Get Started
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <path
                  d="M5 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
          <p className="text-center text-[11px] text-zinc-600">
            No commitment required · Free consultation included
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}

export function UpgradeBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
      >
        Free Version
      </button>
      {open && createPortal(<Modal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
