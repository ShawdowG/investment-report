"use client";

import type { Light } from "@/lib/domain/thesis";
import { BadgeSelect } from "@/components/ui/stitch";
import { cn } from "@/lib/utils";

interface ThesisChecklistsProps {
  light: Light;
  onLightChange: (next: Light) => void;
  greenChecks: boolean[];
  onGreenChange: (next: boolean[]) => void;
  yellowChecks: boolean[];
  onYellowChange: (next: boolean[]) => void;
  redChecks: boolean[];
  onRedChange: (next: boolean[]) => void;
  trimSellChecks: boolean[];
  onTrimSellChange: (next: boolean[]) => void;
}

/**
 * Item text mirrors framework §8 1:1. If the framework changes, update both.
 * Counts: 9 green, 6 yellow, 8 red, 6 trim-sell (matches SPEC-023 §5).
 */
export const GREEN_ITEMS: readonly string[] = [
  "Price fell mostly because of market weakness or valuation compression.",
  "Revenue growth remains close to guidance.",
  "Margins are stable or expanding.",
  "Free cash flow remains strong after adjusting for one-offs.",
  "Key growth drivers are still working.",
  "Competitive position is stable or improving.",
  "Management is executing the roadmap.",
  "Valuation is more attractive than before.",
  "Position size remains within your risk limit.",
];

export const YELLOW_ITEMS: readonly string[] = [
  "Growth slows but does not break the thesis.",
  "Margins are slightly weaker.",
  "Guidance is mixed.",
  "The stock is cheaper but still not clearly cheap.",
  "New initiatives are promising but not proven.",
  "Macro pressure is rising.",
];

export const RED_ITEMS: readonly string[] = [
  "Management cuts guidance sharply.",
  "The most important growth driver stalls.",
  "Margins deteriorate without a temporary explanation.",
  "Free cash flow weakens structurally.",
  "Competitors take durable share.",
  "The company overpays for growth.",
  "Balance sheet risk rises.",
  "The original thesis is no longer true.",
];

export const TRIM_SELL_ITEMS: readonly string[] = [
  "Valuation becomes far ahead of realistic growth.",
  "The thesis has played out.",
  "Better risk/reward opportunities exist.",
  "Position size becomes too large.",
  "Fundamentals weaken over multiple quarters.",
  "Management credibility declines.",
];

const LIGHT_LABEL: Record<Light, string> = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
};

const LIGHT_DOT_CLASS: Record<Light, string> = {
  green: "bg-regime-risk-on",
  yellow: "bg-regime-neutral",
  red: "bg-regime-risk-off",
};

/**
 * Renders the §8 add/hold/sell checklists. The user picks the current light
 * manually (no auto-derivation per SPEC-023 §3 "Out of scope"). Each group is
 * a list of fixed framework items with a checkbox; check arrays are kept at
 * fixed length so they line up 1:1 with item indices on save.
 */
export function ThesisChecklists({
  light,
  onLightChange,
  greenChecks,
  onGreenChange,
  yellowChecks,
  onYellowChange,
  redChecks,
  onRedChange,
  trimSellChecks,
  onTrimSellChange,
}: ThesisChecklistsProps) {
  function toggle(arr: boolean[], idx: number, push: (next: boolean[]) => void) {
    const next = arr.slice();
    next[idx] = !next[idx];
    push(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="font-label-caps text-label-caps uppercase text-text-secondary">
          Current light
        </span>
        <BadgeSelect<Light>
          value={light}
          options={[
            { value: "green", label: "Green" },
            { value: "yellow", label: "Yellow" },
            { value: "red", label: "Red" },
          ]}
          onSelect={onLightChange}
          ariaLabel="Current thesis light"
        >
          <span className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
            <span
              aria-hidden="true"
              className={cn("inline-block size-2.5 rounded-full", LIGHT_DOT_CLASS[light])}
            />
            {LIGHT_LABEL[light]}
          </span>
        </BadgeSelect>
        <span className="font-body-compact text-body-compact text-text-secondary">
          Set manually — checklists below are inputs you weigh yourself.
        </span>
      </div>

      <ChecklistGroup
        title="Green light — add"
        accentClass="text-regime-risk-on"
        items={GREEN_ITEMS}
        checks={greenChecks}
        onToggle={(idx) => toggle(greenChecks, idx, onGreenChange)}
      />
      <ChecklistGroup
        title="Yellow light — slow down"
        accentClass="text-regime-neutral"
        items={YELLOW_ITEMS}
        checks={yellowChecks}
        onToggle={(idx) => toggle(yellowChecks, idx, onYellowChange)}
      />
      <ChecklistGroup
        title="Red light — stop and re-underwrite"
        accentClass="text-regime-risk-off"
        items={RED_ITEMS}
        checks={redChecks}
        onToggle={(idx) => toggle(redChecks, idx, onRedChange)}
      />
      <ChecklistGroup
        title="Trim or sell triggers"
        accentClass="text-regime-risk-off"
        items={TRIM_SELL_ITEMS}
        checks={trimSellChecks}
        onToggle={(idx) => toggle(trimSellChecks, idx, onTrimSellChange)}
      />
    </div>
  );
}

function ChecklistGroup({
  title,
  accentClass,
  items,
  checks,
  onToggle,
}: {
  title: string;
  accentClass: string;
  items: readonly string[];
  checks: boolean[];
  onToggle: (idx: number) => void;
}) {
  const ticked = checks.filter(Boolean).length;
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-label-caps text-label-caps uppercase",
            accentClass,
          )}
        >
          {title}
        </span>
        <span className="font-data-mono text-body-compact text-text-secondary">
          {ticked}/{items.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, idx) => {
          const checked = Boolean(checks[idx]);
          return (
            <li key={idx} className="flex items-start gap-2">
              <input
                id={`check-${title}-${idx}`}
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(idx)}
                className="mt-0.5 size-4 shrink-0 rounded border-border-subtle bg-surface-elevated accent-primary"
              />
              <label
                htmlFor={`check-${title}-${idx}`}
                className={cn(
                  "font-body-compact text-body-compact cursor-pointer",
                  checked ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {item}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
