"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BadgeSelectOption<T extends string> {
  value: T;
  label: string;
}

interface BadgeSelectProps<T extends string> {
  value: T;
  options: BadgeSelectOption<T>[];
  onSelect: (next: T) => void;
  ariaLabel: string;
  children: ReactNode;
  /** Hide the trailing chevron — useful when the badge already implies clickability. */
  hideChevron?: boolean;
  className?: string;
}

/**
 * Theme-aware inline dropdown that wraps a badge/trigger and shows a portal-rendered
 * listbox below it. Promoted to `components/ui/` (W0.1) so /portfolio, /ticker etc.
 * can reuse the same UX as /watchlist. Supports full keyboard nav via the
 * `aria-activedescendant` pattern:
 *
 *  - Trigger has focus → ArrowDown / Enter / Space opens the menu (active = selected).
 *  - Menu has focus → ArrowUp/Down moves active, Home/End jump to first/last,
 *    Enter/Space commits, Escape closes (returns focus to trigger), Tab closes
 *    and lets focus continue.
 *
 * Closes on click-outside, scroll (capture), and window resize.
 */
export function BadgeSelect<T extends string>({
  value,
  options,
  onSelect,
  ariaLabel,
  children,
  hideChevron = false,
  className,
}: BadgeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const idPrefix = useId();
  const menuId = `${idPrefix}-menu`;
  const optionId = (idx: number) => `${idPrefix}-opt-${idx}`;

  // When opening, jump active to the currently-selected option.
  useEffect(() => {
    if (!open) return;
    const selected = options.findIndex((o) => o.value === value);
    setActiveIdx(selected >= 0 ? selected : 0);
  }, [open, options, value]);

  // Position the menu under the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // After open, focus the menu so keyboard events land there.
  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  // Click-outside, Escape on doc (for users mid-scroll), scroll/resize close.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onSelect(opt.value);
    close(true);
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIdx(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIdx(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIdx);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex items-center gap-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        {children}
        {!hideChevron && (
          <ChevronDown aria-hidden="true" className="size-3 text-text-secondary" />
        )}
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label={ariaLabel}
              aria-activedescendant={optionId(activeIdx)}
              tabIndex={-1}
              onKeyDown={onMenuKeyDown}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                zIndex: 100,
                outline: "none",
              }}
              className="min-w-[8rem] rounded-md border border-border-subtle bg-surface py-1 shadow-lg"
            >
              {options.map((opt, idx) => {
                const selected = opt.value === value;
                const active = idx === activeIdx;
                return (
                  <div
                    key={opt.value}
                    id={optionId(idx)}
                    role="option"
                    aria-selected={selected}
                    onClick={() => commit(idx)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      "block w-full select-none cursor-pointer px-3 py-1.5 font-body-compact text-body-compact transition-colors",
                      active
                        ? "bg-primary-container/20 text-text-primary"
                        : "text-text-secondary hover:text-text-primary",
                      selected && "font-semibold",
                    )}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
