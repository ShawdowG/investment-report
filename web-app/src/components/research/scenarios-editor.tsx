"use client";

import { useMemo, type ChangeEvent } from "react";
import type { Scenario, ScenarioKind } from "@/lib/domain/thesis";
import { fmtMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface ScenariosEditorProps {
  scenarios: Scenario[];
  onChange: (next: Scenario[]) => void;
  /** Current price (snapshot.lastClose) — drives the highlight line on the fan strip. */
  currentPrice?: number;
  currency?: string;
}

const KIND_LABELS: Record<ScenarioKind, string> = {
  worst: "Worst case",
  bear: "Bear case",
  base: "Base case",
  better: "Better case",
  moonshot: "Moonshot",
};

const KIND_SHORT: Record<ScenarioKind, string> = {
  worst: "Worst",
  bear: "Bear",
  base: "Base",
  better: "Better",
  moonshot: "Moon",
};

function parseNumberInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Five-row scenario table mirroring framework §7. Below the table, a horizontal
 * "fan strip" plots each scenario's priceTarget on a shared axis (min→max of all
 * targets), with the current snapshot price drawn as a vertical line. The "EV"
 * pill is the probability-weighted expected price target across scenarios that
 * have *both* a target and a probability; it appears only when at least 3
 * scenarios qualify.
 */
export function ScenariosEditor({
  scenarios,
  onChange,
  currentPrice,
  currency = "USD",
}: ScenariosEditorProps) {
  function update<K extends keyof Scenario>(idx: number, key: K, value: Scenario[K]) {
    const next = scenarios.map((row, i) => {
      if (i !== idx) return row;
      const merged: Scenario = { ...row, [key]: value };
      // Treat blank strings / undefined numeric as field removal so we don't
      // persist empty values back into localStorage.
      if (
        (key === "businessAssumptions" ||
          key === "valuationAssumptions" ||
          key === "meaning") &&
        (value === undefined || value === "")
      ) {
        delete merged[key];
      }
      if (
        (key === "priceTarget" || key === "probability") &&
        (value === undefined || (typeof value === "number" && !Number.isFinite(value)))
      ) {
        delete merged[key];
      }
      return merged;
    });
    onChange(next);
  }

  const { ev, fanStrip } = useMemo(() => {
    const withTarget = scenarios.filter(
      (s): s is Scenario & { priceTarget: number } =>
        typeof s.priceTarget === "number" && Number.isFinite(s.priceTarget),
    );
    const targets = withTarget.map((s) => s.priceTarget);
    const min = targets.length > 0 ? Math.min(...targets) : 0;
    const max = targets.length > 0 ? Math.max(...targets) : 0;
    const span = max - min;

    // Position helper: 0..1 fraction along the axis. If all targets collapse
    // to the same value, fall back to center.
    const fraction = (px: number) => {
      if (span <= 0) return 0.5;
      return (px - min) / span;
    };

    const evRows = scenarios.filter(
      (s): s is Scenario & { priceTarget: number; probability: number } =>
        typeof s.priceTarget === "number" &&
        Number.isFinite(s.priceTarget) &&
        typeof s.probability === "number" &&
        Number.isFinite(s.probability),
    );
    let evValue: number | null = null;
    if (evRows.length >= 3) {
      evValue = evRows.reduce(
        (acc, r) => acc + r.priceTarget * (r.probability / 100),
        0,
      );
    }

    const currentFrac =
      typeof currentPrice === "number" &&
      Number.isFinite(currentPrice) &&
      targets.length > 0
        ? Math.max(-0.1, Math.min(1.1, fraction(currentPrice)))
        : null;

    return {
      ev: evValue,
      fanStrip: {
        hasTargets: targets.length > 0,
        min,
        max,
        markers: withTarget.map((s) => ({
          kind: s.kind,
          price: s.priceTarget,
          frac: Math.max(0, Math.min(1, fraction(s.priceTarget))),
        })),
        currentFrac,
      },
    };
  }, [scenarios, currentPrice]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-3 px-3">
        <table className="w-full border-collapse text-left font-body-compact text-body-compact">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary">
                Scenario
              </th>
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary">
                Business
              </th>
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary">
                Valuation
              </th>
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary w-24">
                Target
              </th>
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary w-20">
                Prob %
              </th>
              <th className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-secondary">
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((row, idx) => (
              <tr
                key={row.kind}
                className="border-b border-border-subtle/60 align-top"
              >
                <td className="px-2 py-2 font-label-caps text-label-caps uppercase text-text-primary">
                  {KIND_LABELS[row.kind]}
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <textarea
                    aria-label={`${KIND_LABELS[row.kind]} business assumptions`}
                    value={row.businessAssumptions ?? ""}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      update(idx, "businessAssumptions", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <textarea
                    aria-label={`${KIND_LABELS[row.kind]} valuation assumptions`}
                    value={row.valuationAssumptions ?? ""}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      update(idx, "valuationAssumptions", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`${KIND_LABELS[row.kind]} price target`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.priceTarget ?? ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      update(idx, "priceTarget", parseNumberInput(e.target.value))
                    }
                    className="w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    aria-label={`${KIND_LABELS[row.kind]} probability`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    max={100}
                    value={row.probability ?? ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const v = parseNumberInput(e.target.value);
                      update(
                        idx,
                        "probability",
                        v === undefined ? undefined : Math.max(0, Math.min(100, v)),
                      );
                    }}
                    className="w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <textarea
                    aria-label={`${KIND_LABELS[row.kind]} meaning`}
                    value={row.meaning ?? ""}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      update(idx, "meaning", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-label-caps text-label-caps uppercase text-text-secondary">
            Scenario fan
          </span>
          {ev !== null ? (
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-0.5 font-data-mono text-body-compact text-text-primary">
              EV {fmtMoney(ev, currency)}
            </span>
          ) : (
            <span className="font-body-compact text-body-compact text-text-secondary">
              EV needs 3+ targets with probabilities
            </span>
          )}
        </div>
        {fanStrip.hasTargets ? (
          <div
            className="relative h-16 rounded-md border border-border-subtle bg-surface-variant"
            aria-label="Scenario price target distribution"
            role="img"
          >
            {/* Axis baseline */}
            <div className="absolute left-3 right-3 top-1/2 h-px bg-border-subtle" />
            {/* Current price line */}
            {fanStrip.currentFrac !== null ? (
              <div
                className="absolute top-2 bottom-2 w-px bg-regime-neutral"
                style={{
                  left: `calc(${0.75}rem + (100% - 1.5rem) * ${fanStrip.currentFrac})`,
                }}
                aria-label={`Current price ${currentPrice ?? ""}`}
              >
                <span
                  className={cn(
                    "absolute -top-1 left-1 font-label-caps text-label-caps uppercase whitespace-nowrap text-regime-neutral",
                  )}
                >
                  Now
                </span>
              </div>
            ) : null}
            {/* Markers per scenario kind */}
            {fanStrip.markers.map((m) => (
              <div
                key={m.kind}
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  left: `calc(${0.75}rem + (100% - 1.5rem) * ${m.frac})`,
                }}
              >
                <div className="-translate-x-1/2 flex flex-col items-center gap-0.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block size-2.5 rounded-full border",
                      m.kind === "worst" || m.kind === "bear"
                        ? "bg-regime-risk-off border-regime-risk-off"
                        : m.kind === "base"
                          ? "bg-regime-neutral border-regime-neutral"
                          : "bg-regime-risk-on border-regime-risk-on",
                    )}
                  />
                  <span className="font-label-caps text-label-caps uppercase whitespace-nowrap text-text-secondary">
                    {KIND_SHORT[m.kind]}
                  </span>
                  <span className="font-data-mono text-body-compact text-text-primary">
                    {fmtMoney(m.price, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body-compact text-body-compact text-text-secondary">
            Fill in a price target on any scenario to plot the fan strip.
          </p>
        )}
      </div>
    </div>
  );
}
