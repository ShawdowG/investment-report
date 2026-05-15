"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
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

function parseSymbolList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function DashboardSettingsPanel() {
  const [settings, setSettings] = useState<DashboardSettings>(
    DEFAULT_DASHBOARD_SETTINGS,
  );
  const [indexDraft, setIndexDraft] = useState(
    DEFAULT_DASHBOARD_SETTINGS.indexSymbols.join(", "),
  );
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
    applyPatch({ indexSymbols: parsed });
  }

  function handleReset() {
    const next = resetDashboardSettings();
    setSettings(next);
    setIndexDraft(next.indexSymbols.join(", "));
  }

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
        hint="Comma-separated tickers shown in the top row. Examples: ^GSPC, ^NDX, BTC-USD, GC=F"
      >
        <input
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
      </Field>

      <Field
        label="Top movers source"
        hint="Universe = all 23 tickers in the quote feed. Watchlist = only symbols you've added on /watchlist. Falls back to universe when watchlist is empty."
      >
        <div className="flex gap-3">
          <Radio
            name="topMoversSource"
            checked={settings.topMoversSource === "universe"}
            label="Universe"
            onSelect={() =>
              applyPatch({ topMoversSource: "universe" as TopMoversSource })
            }
          />
          <Radio
            name="topMoversSource"
            checked={settings.topMoversSource === "watchlist"}
            label="Watchlist"
            onSelect={() =>
              applyPatch({ topMoversSource: "watchlist" as TopMoversSource })
            }
          />
        </div>
      </Field>

      <Field label="Top movers limit" hint="How many rows the card shows.">
        <input
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
          checked={settings.topMoversExcludeIndices}
          onChange={(checked) => applyPatch({ topMoversExcludeIndices: checked })}
        />
      </Field>

      <Field
        label="Watchlist high-attention threshold"
        hint="Day Δ% bigger than this bumps a watchlist symbol into the 'High attention' bucket."
      >
        <div className="flex items-center gap-2">
          <input
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
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-label-caps text-label-caps text-text-secondary uppercase block">
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
  name,
  checked,
  label,
  onSelect,
}: {
  name: string;
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="accent-primary"
      />
      <span className="font-body-compact text-body-compact text-text-primary">
        {label}
      </span>
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      <span className="font-body-compact text-body-compact text-text-secondary">
        {checked ? "Enabled" : "Disabled"}
      </span>
    </label>
  );
}
