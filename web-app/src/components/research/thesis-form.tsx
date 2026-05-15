"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BadgeSelect,
  SectionHeader,
  type BadgeSelectOption,
} from "@/components/ui/stitch";
import {
  deleteThesis,
  getThesis,
  upsertThesis,
} from "@/lib/storage/thesis-store";
import type {
  PlannedAction,
  Thesis,
  TradeLevel,
} from "@/lib/domain/thesis";
import { buildPrefill, type ThesisPrefill } from "@/lib/research/thesis-prefill";
import { calcAllAddsTriggered } from "@/lib/research/position-calculator";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { getPortfolio } from "@/lib/storage/portfolio-store";
import { getWatchlist } from "@/lib/storage/watchlist-store";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";

interface ThesisFormProps {
  symbol: string;
  snapshots: QuoteSnapshotMap;
}

type Mode = "quick" | "deep";

const STORAGE_ERROR_MESSAGE =
  "Failed to save thesis — your browser storage may be full";

const PLANNED_ACTION_OPTIONS: BadgeSelectOption<PlannedAction>[] = [
  { value: "hold", label: "Hold" },
  { value: "add", label: "Add" },
  { value: "trim", label: "Trim" },
  { value: "sell", label: "Sell" },
  { value: "watch", label: "Watch" },
];

const PLANNED_ACTION_LABEL: Record<PlannedAction, string> = {
  hold: "Hold",
  add: "Add",
  trim: "Trim",
  sell: "Sell",
  watch: "Watch",
};

interface FormState {
  thesisPointsRaw: string;
  add1: string;
  add2: string;
  add3: string;
  maxPositionSize: string;
  plannedAction: PlannedAction | "";
}

function emptyForm(): FormState {
  return {
    thesisPointsRaw: "",
    add1: "",
    add2: "",
    add3: "",
    maxPositionSize: "",
    plannedAction: "",
  };
}

function formFromThesis(thesis: Thesis): FormState {
  const adds = thesis.tradeLevels
    .filter((l) => l.kind === "add")
    .sort((a, b) => (a.level ?? 99) - (b.level ?? 99));
  const byLevel = new Map<number, TradeLevel>();
  adds.forEach((lvl, i) => {
    const level = lvl.level ?? (i + 1);
    byLevel.set(level, lvl);
  });
  return {
    thesisPointsRaw: thesis.thesisPoints.join("\n"),
    add1: byLevel.get(1)?.price?.toString() ?? "",
    add2: byLevel.get(2)?.price?.toString() ?? "",
    add3: byLevel.get(3)?.price?.toString() ?? "",
    maxPositionSize: thesis.maxPositionSize?.toString() ?? "",
    plannedAction: thesis.plannedAction ?? "",
  };
}

function formFromPrefill(prefill: ThesisPrefill): FormState {
  return {
    thesisPointsRaw: "",
    add1: "",
    add2: "",
    add3: "",
    maxPositionSize: "",
    plannedAction: prefill.plannedAction ?? "",
  };
}

function parseNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildTradeLevels(form: FormState): TradeLevel[] {
  const out: TradeLevel[] = [];
  const triples: [string, 1 | 2 | 3][] = [
    [form.add1, 1],
    [form.add2, 2],
    [form.add3, 3],
  ];
  for (const [raw, level] of triples) {
    const price = parseNumber(raw);
    if (price === undefined) continue;
    out.push({ kind: "add", price, level });
  }
  return out;
}

export function ThesisForm({ symbol, snapshots }: ThesisFormProps) {
  const upper = symbol.toUpperCase();
  const snapshot = snapshots[upper];

  const [existing, setExisting] = useState<Thesis | null>(null);
  const [prefill, setPrefill] = useState<ThesisPrefill>({});
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [mode, setMode] = useState<Mode>("quick");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initial hydration from localStorage + cross-store prefill.
  useEffect(() => {
    const stored = getThesis(upper);
    if (stored) {
      setExisting(stored);
      setForm(formFromThesis(stored));
    } else {
      const prefilled = buildPrefill(upper, snapshots, getPortfolio(), getWatchlist());
      setPrefill(prefilled);
      setForm(formFromPrefill(prefilled));
    }
    setHydrated(true);
  }, [upper, snapshots]);

  // Saved-pulse auto-dismiss.
  useEffect(() => {
    if (savedAt === null) return;
    const handle = setTimeout(() => setSavedAt(null), 1500);
    return () => clearTimeout(handle);
  }, [savedAt]);

  const tradeLevels = useMemo(() => buildTradeLevels(form), [form]);
  const maxPos = parseNumber(form.maxPositionSize);
  const calc = useMemo(
    () => calcAllAddsTriggered(tradeLevels, maxPos),
    [tradeLevels, maxPos],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const thesisPoints = form.thesisPointsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const now = new Date().toISOString();
    const next: Thesis = existing
      ? {
          ...existing,
          thesisPoints,
          tradeLevels,
          updatedAt: now,
        }
      : {
          symbol: upper,
          createdAt: now,
          updatedAt: now,
          thesisPoints,
          concerns: {},
          questions: [],
          classifiedPoints: [],
          tradeLevels,
        };

    if (maxPos !== undefined) next.maxPositionSize = maxPos;
    else delete next.maxPositionSize;
    if (form.plannedAction) next.plannedAction = form.plannedAction;
    else delete next.plannedAction;

    // First-save: capture the prefill values that no longer have a home in the
    // quick-start form (price-at-creation, avgEntry/positionSize from portfolio).
    if (!existing) {
      if (prefill.currentPriceAtCreation !== undefined) {
        next.currentPriceAtCreation = prefill.currentPriceAtCreation;
      }
      if (prefill.avgEntryPrice !== undefined) {
        next.avgEntryPrice = prefill.avgEntryPrice;
      }
      if (prefill.positionSize !== undefined) {
        next.positionSize = prefill.positionSize;
      }
    }

    try {
      const saved = upsertThesis(next);
      setExisting(saved);
      setForm(formFromThesis(saved));
      setSavedAt(Date.now());
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[thesis] save failed", err);
      }
      setError(STORAGE_ERROR_MESSAGE);
    }
  }

  function handleDelete() {
    try {
      deleteThesis(upper);
      setExisting(null);
      const prefilled = buildPrefill(upper, snapshots, getPortfolio(), getWatchlist());
      setPrefill(prefilled);
      setForm(formFromPrefill(prefilled));
      setConfirmDelete(false);
      setSavedAt(null);
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[thesis] delete failed", err);
      }
      setError("Failed to delete thesis.");
      setConfirmDelete(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading thesis…
      </div>
    );
  }

  const calcColor =
    calc.pctOfMax === null
      ? "text-text-secondary"
      : calc.pctOfMax > 100
        ? "text-regime-risk-off"
        : calc.pctOfMax >= 80
          ? "text-regime-neutral"
          : "text-text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps uppercase text-text-secondary">
            Mode
          </span>
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={cn(
              "rounded-md px-2 py-1 font-body-compact text-body-compact",
              mode === "quick"
                ? "bg-surface-variant text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Quick start
          </button>
          <button
            type="button"
            onClick={() => setMode("deep")}
            className={cn(
              "rounded-md px-2 py-1 font-body-compact text-body-compact",
              mode === "deep"
                ? "bg-surface-variant text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Deep dive →
          </button>
        </div>
        {savedAt !== null ? (
          <span
            role="status"
            aria-live="polite"
            className="font-label-caps text-label-caps uppercase text-regime-risk-on animate-pulse"
          >
            Saved
          </span>
        ) : null}
      </div>

      {mode === "deep" ? (
        <Card className="p-card-padding gap-2">
          <SectionHeader
            title="Deep dive"
            caption="Coming soon — fundamentals, scenarios, valuation, light. (W8.B-L)"
          />
          <p className="font-body-compact text-body-compact text-text-secondary">
            The deep-dive sections of SPEC-023 (§4 fundamentals, §5 market position,
            §6 valuation, §7 scenarios, §8 light / checklists, attached notes)
            are reserved for the next batch of workstreams. For now, the
            quick-start tab below is the entire form.
          </p>
        </Card>
      ) : null}

      <Card className="p-card-padding gap-4">
        <SectionHeader title="Ticker" />
        <div className="font-data-mono text-h2 text-text-primary">{upper}</div>
        {snapshot ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            Current price snapshot · {fmtMoney(snapshot.lastClose, snapshot.currency)} · as of {snapshot.asOf}
          </p>
        ) : (
          <p className="font-body-compact text-body-compact text-text-secondary">
            No quote available for this symbol — the thesis will still save.
          </p>
        )}
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="My thesis"
          caption="What is the market underestimating? What have you observed? Why can this company win?"
        />
        <Field label="One bullet per line" htmlFor="thesis-points">
          <textarea
            id="thesis-points"
            value={form.thesisPointsRaw}
            onChange={(e) => update("thesisPointsRaw", e.target.value)}
            rows={6}
            placeholder={"- Asia is underpenetrated\n- Pricing power is intact\n- Optional games upside"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="Buying plan"
          caption="Three add levels and your max position size."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Add level 1 ($)" htmlFor="thesis-add-1">
            <input
              id="thesis-add-1"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add1}
              onChange={(e) => update("add1", e.target.value)}
              placeholder="100.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Add level 2 ($)" htmlFor="thesis-add-2">
            <input
              id="thesis-add-2"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add2}
              onChange={(e) => update("add2", e.target.value)}
              placeholder="85.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Add level 3 ($)" htmlFor="thesis-add-3">
            <input
              id="thesis-add-3"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add3}
              onChange={(e) => update("add3", e.target.value)}
              placeholder="70.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
        </div>
        <Field label="Maximum position size ($)" htmlFor="thesis-max-pos">
          <input
            id="thesis-max-pos"
            type="number"
            inputMode="decimal"
            step="any"
            value={form.maxPositionSize}
            onChange={(e) => update("maxPositionSize", e.target.value)}
            placeholder="20000"
            className="w-full sm:w-60 rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        {tradeLevels.length > 0 ? (
          <div className={cn("font-body-compact text-body-compact", calcColor)}>
            If all {tradeLevels.length} {tradeLevels.length === 1 ? "add" : "adds"} trigger:{" "}
            <span className="font-data-mono">
              {calc.totalShares.toFixed(calc.totalShares < 10 ? 2 : 0)}{" "}
              {calc.totalShares === 1 ? "share" : "shares"}
            </span>{" "}
            /{" "}
            <span className="font-data-mono">{fmtMoney(calc.totalDollars)}</span>
            {calc.pctOfMax !== null ? (
              <>
                {" "}
                /{" "}
                <span className="font-data-mono">{fmtPct(calc.pctOfMax, 0)} of max</span>
              </>
            ) : null}
            {calc.exceedsMax ? (
              <span className="ml-2 font-label-caps text-label-caps uppercase text-regime-risk-off">
                Exceeds your max position size
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader title="Planned action" />
        <div className="flex items-center gap-3">
          <BadgeSelect<PlannedAction | "">
            value={form.plannedAction}
            options={[
              { value: "" as PlannedAction | "", label: "Not set" },
              ...PLANNED_ACTION_OPTIONS,
            ]}
            onSelect={(next) => update("plannedAction", next)}
            ariaLabel={`Planned action for ${upper}`}
          >
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
              {form.plannedAction ? PLANNED_ACTION_LABEL[form.plannedAction] : "Not set"}
            </span>
          </BadgeSelect>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="font-body-compact text-body-compact text-regime-risk-off">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div>
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-text-secondary hover:text-destructive"
            >
              <Trash2 className="size-4 mr-1" aria-hidden="true" />
              Delete thesis
            </Button>
          ) : null}
        </div>
        <Button type="submit" size="sm">
          {existing ? "Save thesis" : "Create thesis"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this thesis?"
        description={`Remove the thesis for ${upper}? Any saved bullets, trade levels, and planned action will be erased from this device.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block font-label-caps text-label-caps uppercase text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}
