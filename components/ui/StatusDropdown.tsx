"use client";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  type ContactStatus,
  CONTACT_STATUSES,
  STATUS_STYLE,
} from "@/components/ConnectionCard";

const GAP = 6;       // px gap between trigger and menu
const MENU_W = 164;  // min-width kept in sync with className below

interface Props {
  status:   ContactStatus;
  onChange: (s: ContactStatus) => void;
  disabled?: boolean;
}

export default function StatusDropdown({ status, onChange, disabled }: Props) {
  const [open, setOpen]     = useState(false);
  const [style, setStyle]   = useState<React.CSSProperties>({});
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Positioning ─────────────────────────────────────────────────────────────
  function calcStyle(): React.CSSProperties {
    if (!btnRef.current) return {};
    const r            = btnRef.current.getBoundingClientRect();
    const spaceAbove   = r.top;
    const spaceBelow   = window.innerHeight - r.bottom;
    const goAbove      = spaceAbove > spaceBelow || spaceBelow < 120;

    // Horizontal: prefer left-align, clamp so menu doesn't overflow right edge
    const leftIdeal = r.left;
    const left      = Math.min(leftIdeal, window.innerWidth - MENU_W - 8);

    if (goAbove) {
      return { position: "fixed", bottom: window.innerHeight - r.top + GAP, left };
    }
    return { position: "fixed", top: r.bottom + GAP, left };
  }

  // ── Open / close ────────────────────────────────────────────────────────────
  function handleToggle() {
    if (disabled) return;
    if (!open) setStyle(calcStyle());
    setOpen((o) => !o);
  }

  // ── Outside click ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !btnRef.current?.contains(t) &&
        !menuRef.current?.contains(t)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── Reposition on scroll / resize ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function reposition() { setStyle(calcStyle()); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerStyle = STATUS_STYLE[status];

  // ── Menu (portal) ───────────────────────────────────────────────────────────
  const menu =
    open && typeof document !== "undefined"
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="z-[9999] bg-[#0d0d0d] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl"
            style={{ ...style, minWidth: MENU_W }}
          >
            {CONTACT_STATUSES.map((s) => {
              const st = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className="w-full text-left text-xs px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-2.5"
                  style={{ color: st.pill.color as string }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.dot }}
                  />
                  {s}
                  {s === status && (
                    <svg
                      className="w-3 h-3 ml-auto opacity-70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={disabled}
        className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-opacity hover:opacity-80 whitespace-nowrap flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        style={triggerStyle.pill}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: triggerStyle.dot }}
        />
        {status}
        <svg
          className="w-3 h-3 opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {menu}
    </>
  );
}
