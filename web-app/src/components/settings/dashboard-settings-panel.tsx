"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  type DashboardSettings,
  type TopMoversSource,
} from "@/lib/domain/dashboard-settings";
import {
  getDashboardSettings,
  resetDashboardSettings,
  updateDashboardSettings,
} from "@/lib/storage/dashboard-settings-store";
import { normalizeSymbol } from "@/lib/parsing/normalize-symbol";

function parseSymbolList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Validate a raw token list against the quote universe.
 * - Each token is normalized (case, exchange prefix, etc.).
 * - Tokens that normalize cleanly AND match a known symbol => valid.
 * - Everything else is flagged as unknown — we keep the original spelling so
 *   the user can see what they typed in the chip and remove it.
 */
function splitValidation(
  tokens: string[],
  known: Set<string>,
): { valid: string[]; unknown: string[] } {
  const valid: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const normalized = normalizeSymbol(token);
    if (normalized && known.has(normalized)) {
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      valid.push(normalized);
    } else {
      unknown.push(token);
    }
  }
  return { valid, unknown };
}

export function DashboardSettingsPanel({
  knownSymbols,
}: {
  knownSymbols: string[];
}) {
  const knownSet = useMemo(() => new Set(knownSymbols), [knownSymbols]);

  const [settings, setSettings] = useState<DashboardSettings>(
    DEFAULT_DASHBOARD_SETTINGS,
  );
  const [indexDraft, setIndexDraft] = useState(
    DEFAULT_DASHBOARD_SETTINGS.indexSymbols.join(", "),
  );
  const [unknownIndexSymbols, setUnknownIndexSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = getDashboardSettings();
    setSettings(loaded);
    setIndexDraft(loaded.indexSymbols.join(", "));
    setReady(true);
  }, []);

  function applyPatch(patch: Partial<DashboardSettings>) {
    const next = updateDashboardSettings(patch);
    setSettings(next);
    if (patch.indexSymbols) setIndexDraft(next.indexSymbols.join(", "));
  }

  function handleIndexBlur() {
    const parsed = parseSymbolList(indexDraft);
    const { valid, unknown } = splitValidation(parsed, knownSet);
    setUnknownIndexSymbols(unknown);
    applyPatch({ indexSymbols: valid });
    // Rewrite the input so it only shows valid, saved symbols.
    setIndexDraft(valid.join(", "));
  }

  function removeUnknown(symbol: string) {
    setUnknownIndexSymbols((prev) => prev.filter((s) => s !== symbol));
  }

  function handleReset() {
    const next = resetDashboardSettings();
    setSettings(next);
    setIndexDraft(next.indexSymbols.join(", "));
    setUnknownIndexSymbols([]);
  }

  // Stable ids so every label↔input pair has a matching htmlFor / id.
  // Clicking a label focuses its input and screen readers announce the link.
  const indexInputId = useId();
  const topMoversLimitId = useId();
  const watchlistThresholdId = useId();
  const topMoversSourceName = useId();
  const topMoversSourceUniverseId = useId();
  const topMoversSourceWatchlistId = useId();
  const excludeIndicesId = useId();
  const equityChartCollapsedId = useId();

  if (!ready) {
    return (
      <Card className="p-card-padding gap-4">
        <SectionHeader
          title="Dashboard preferences"
          caption="Loading…"
        />
      </Card>
    );
  }

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Dashboard preferences"
        caption="Controls the dashboard's index pulse, top movers and watchlist impact cards."
      />

      <Field
        label="Index symbols"
        htmlFor={indexInputId}
        hint="Comma-separated tickers shown in the top row. Examples: ^GSPC, ^NDX, BTC-USD, GC=F"
      >
        <input
          id={indexInputId}
          type="text"
          value={indexDraft}
          onChange={(e) => setIndexDraft(e.target.value)}
          onBlur={handleIndexBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full rounded-md border border-border-subtle bg-surface-variant px-3 py-1.5 font-data-mono text-data-mono text-text-primary focus:outline-none focus:border-primary/60"
        />
        {unknownIndexSymbols.length > 0 ? (
          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {unknownIndexSymbols.map((sym) => (
                <Tag
                  key={sym}
                  className="border-regime-risk-off text-regime-risk-off bg-surface-variant gap-1 pr-1"
                >
                  <span className="font-data-mono">{sym}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${sym}`}
                    onClick={() => removeUnknown(sym)}
                    className="inline-flex items-center justify-center rounded hover:bg-surface-elevated text-regime-risk-off"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Tag>
              ))}
            </div>
            <p className="text-xs text-regime-risk-off">
              {unknownIndexSymbols.length} unknown symbol
              {unknownIndexSymbols.length === 1 ? "" : "s"} — not in the quote feed and won't render.
            </p>
          </div>
        ) : null}
      </Field>

      <Field
        label="Top movers source"
        hint="Universe = all 23 tickers in the quote feed. Watchlist = only symbols you've added on /watchlist. Falls back to universe when watchlist is empty."
      >
        <div className="flex gap-3">
          <Radio
            id={topMoversSourceUniverseId}
            name={topMoversSourceName}
            checked={settings.topMoversSource === "universe"}
            label="Universe"
            onSelect={() =>
              applyPatch({ topMoversSource: "universe" as TopMoversSource })
            }
          />
          <Radio
            id={topMoversSourceWatchlistId}
            name={topMoversSourceName}
            checked={settings.topMoversSource === "watchlist"}
            label="Watchlist"
            onSelect={() =>
              applyPatch({ topMoversSource: "watchlist" as TopMoversSource })
            }
          />
        </div>
      </Field>

      <Field
        label="Top movers limit"
        htmlFor={topMoversLimitId}
        hint="How many rows the card shows."
      >
        <input
          id={topMoversLimitId}
          type="number"
          min={1}
          max={50}
          value={settings.topMoversLimit}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n)) applyPatch({ topMoversLimit: n });
          }}
          className="w-24 rounded-md border border-border-subtle bg-surface-variant px-3 py-1.5 font-data-mono text-data-mono text-text-primary focus:outline-none focus:border-primary/60"
        />
      </Field>

      <Field
        label="Exclude indices from movers"
        hint="When on, the index symbols above are dropped from the movers pool."
      >
        <Checkbox
          id={excludeIndicesId}
          checked={settings.topMoversExcludeIndices}
          onChange={(checked) => applyPatch({ topMoversExcludeIndices: checked })}
        />
      </Field>

      <Field
        label="Watchlist high-attention threshold"
        htmlFor={watchlistThresholdId}
        hint="Day Δ% bigger than this bumps a watchlist symbol into the 'High attention' bucket."
      >
        <div className="flex items-center gap-2">
          <input
            id={watchlistThresholdId}
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={settings.watchlistHighThresholdPct}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value);
              if (Number.isFinite(n))
                applyPatch({ watchlistHighThresholdPct: n });
            }}
            className="w-24 rounded-md border border-border-subtle bg-surface-variant px-3 py-1.5 font-data-mono text-data-mono text-text-primary focus:outline-none focus:border-primary/60"
          />
          <span className="font-body-compact text-body-compact text-text-secondary">
            %
          </span>
        </div>
      </Field>

      <Field
        label="Equity chart collapsed by default"
        hint="The portfolio equity chart starts hidden so it doesn't dominate the page; toggle it open inline."
      >
        <Checkbox
          id={equityChartCollapsedId}
          checked={settings.equityChartCollapsed}
          onChange={(checked) => applyPatch({ equityChartCollapsed: checked })}
        />
      </Field>

      <div className="pt-2">
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4 mr-1" aria-hidden="true" />
          Reset to defaults
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="font-label-caps text-label-caps text-text-secondary uppercase block"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

function Radio({
  id,
  name,
  checked,
  label,
  onSelect,
}: {
  id: string;
  name: string;
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="accent-primary cursor-pointer"
      />
      <label
        htmlFor={id}
        className="font-body-compact text-body-compact text-text-primary cursor-pointer"
      >
        {label}
      </label>
    </span>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary cursor-pointer"
      />
      <label
        htmlFor={id}
        className="font-body-compact text-body-compact text-text-secondary cursor-pointer"
      >
        {checked ? "Enabled" : "Disabled"}
      </label>
    </span>
  );
}
