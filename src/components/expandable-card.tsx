"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M8.5 1.5H12.5V5.5M5.5 12.5H1.5V8.5M12.5 1.5L8 6M1.5 12.5L6 8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M9 5H13M9 5V1M9 5L13 1M5 9H1M5 9V13M5 9L1 13"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FullscreenOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm animate-[ecFadeIn_150ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-3 sm:inset-6 flex flex-col animate-[ecScaleIn_200ms_ease-out]">
        <div className="ec-fullscreen flex-1 min-h-0 overflow-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl [&>*]:h-full [&>*]:!rounded-none [&>*]:!border-0">
          {children}
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
          aria-label="Exit fullscreen"
        >
          <CollapseIcon />
        </button>
      </div>

      <style>{`
        @keyframes ecFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ecScaleIn { from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: scale(1) } }
        .ec-fullscreen * { max-height: none !important; }
        .ec-fullscreen > * { display: flex !important; flex-direction: column !important; }
        .ec-fullscreen > * > *:last-child { flex: 1 1 0% !important; min-height: 0 !important; }
        .ec-fullscreen .recharts-responsive-container { height: 100% !important; }
      `}</style>
    </div>
  );
}

export function ExpandableCard({
  children,
}: {
  children: ReactNode | ((expanded: boolean) => ReactNode);
}) {
  const [expanded, setExpanded] = useState(false);
  const close = useCallback(() => setExpanded(false), []);
  const render = (isExpanded: boolean) =>
    typeof children === "function" ? children(isExpanded) : children;

  return (
    <div className="relative group/ec">
      {render(false)}
      <button
        onClick={() => setExpanded(true)}
        className="absolute top-2 right-2 p-1 rounded-md text-zinc-600 opacity-0 group-hover/ec:opacity-100 hover:!text-zinc-200 hover:bg-zinc-700/60 transition-all"
        aria-label="Expand to fullscreen"
        title="Expand"
      >
        <ExpandIcon />
      </button>
      {expanded &&
        createPortal(
          <FullscreenOverlay onClose={close}>{render(true)}</FullscreenOverlay>,
          document.body,
        )}
    </div>
  );
}
