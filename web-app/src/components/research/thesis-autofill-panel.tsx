"use client";

/**
 * SPEC-031 W15.C — "Suggest from data" panel.
 *
 * Sits next to the "Copy to ChatGPT" button on the thesis deep-dive form.
 * The user clicks "Suggest from data" and the panel renders a per-field diff
 * (current value vs proposed value) against the live form state. Each row has
 * Accept / Skip controls, plus a global "Accept all" — the pattern mirrors
 * {@link ThesisImportPanel} so the two assist surfaces feel consistent.
 *
 * Suggestions come from {@link suggestFromData}, a deterministic helper that
 * templates one line per field against the pipeline payload. No LLM, no I/O.
 *
 * The component calls back to the parent form via `onApply(patch)` rather
 * than touching localStorage directly — the parent owns thesis state and
 * persists on submit.
 */

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  FundamentalsSnapshot,
  MarketPositionNotes,
  Scenario,
  Thesis,
  ValuationNotes,
} from "@/lib/domain/thesis";
import { SCENARIO_KINDS } from "@/lib/domain/thesis";
import type { CompanyInfo } from "@/lib/domain/company";
import type { QuoteSnapshot } from "@/lib/quotes/snapshots";
import {
  suggestFromData,
  type SuggestionReport,
  type ThesisSuggestion,
} from "@/lib/research/thesis-autofill";

interface ThesisAutofillPanelProps {
  /** Live in-form state — used to render the "current" side of each diff row. */
  thesis: Thesis;
  /** Company payload from `data/company/SYMBOL.json`, or null when absent. */
  company: CompanyInfo | null;
  /** Quote snapshot for the symbol — supplies currency + last close for Δ%. */
  snapshot: QuoteSnapshot | undefined;
  /** Parent form merges the patch into its granular state hooks. */
  onApply: (patch: Partial<Thesis>) => void;
}

type FieldId = string;

interface DiffRow {
  id: FieldId;
  label: string;
  current: string | null;
  proposed: string;
  /** Closure that, given the latest thesis state, returns the patch for just this row. */
  apply: (thesis: Thesis) => Partial<Thesis>;
}

const FUNDAMENTALS_LABEL: Record<keyof FundamentalsSnapshot, string> = {
  revenueGrowth: "Revenue growth",
  margins: "Margins",
  fcf: "Free cash flow",
  balanceSheet: "Balance sheet",
  segmentGrowth: "Segment / region growth",
  guidance: "Guidance",
  capitalAllocation: "Capital allocation",
};

const MARKET_POSITION_LABEL: Record<keyof MarketPositionNotes, string> = {
  realCompetition: "Real competition",
  dominanceToday: "Dominance today",
  durability: "Durability",
  newMarkets: "New markets",
  newAreasProven: "New areas proven",
};

const VALUATION_LABEL: Record<keyof ValuationNotes, string> = {
  metricsTracked: "Metrics tracked",
  growthAssumed: "Growth assumed",
  marginAssumed: "Margin assumed",
  multipleAssumed: "Multiple assumed",
  notes: "Notes",
};

function joinList(items: readonly string[] | undefined): string | null {
  if (!items || items.length === 0) return null;
  return items.map((s) => `- ${s}`).join("\n");
}

function fmtScenarioCurrent(scenario: Scenario | undefined): string | null {
  if (!scenario) return null;
  const parts: string[] = [];
  if (scenario.businessAssumptions) parts.push(`Business: ${scenario.businessAssumptions}`);
  if (scenario.valuationAssumptions) parts.push(`Valuation: ${scenario.valuationAssumptions}`);
  if (scenario.priceTarget !== undefined) parts.push(`Price: ${scenario.priceTarget}`);
  if (scenario.probability !== undefined) parts.push(`Probability: ${scenario.probability}%`);
  if (scenario.meaning) parts.push(`Meaning: ${scenario.meaning}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

function fmtScenarioProposed(scenario: Partial<Scenario>): string {
  const parts: string[] = [];
  if (scenario.businessAssumptions) parts.push(`Business: ${scenario.businessAssumptions}`);
  if (scenario.valuationAssumptions) parts.push(`Valuation: ${scenario.valuationAssumptions}`);
  if (scenario.priceTarget !== undefined) parts.push(`Price: ${scenario.priceTarget}`);
  if (scenario.probability !== undefined) parts.push(`Probability: ${scenario.probability}%`);
  if (scenario.meaning) parts.push(`Meaning: ${scenario.meaning}`);
  return parts.length > 0 ? parts.join("\n") : "(no fields)";
}

/* ------------------------------------------------------------------ */
/* Diff row builders                                                  */
/* ------------------------------------------------------------------ */

function buildDiffRows(thesis: Thesis, parsed: ThesisSuggestion): DiffRow[] {
  const rows: DiffRow[] = [];

  if (parsed.marketPosition) {
    for (const key of Object.keys(parsed.marketPosition) as (keyof MarketPositionNotes)[]) {
      const proposed = parsed.marketPosition[key];
      if (!proposed) continue;
      rows.push({
        id: `marketPosition.${key}`,
        label: `Market position → ${MARKET_POSITION_LABEL[key]}`,
        current: thesis.marketPosition[key] ?? null,
        proposed,
        apply: (t) => ({ marketPosition: { ...t.marketPosition, [key]: proposed } }),
      });
    }
  }

  if (parsed.fundamentals) {
    for (const key of Object.keys(parsed.fundamentals) as (keyof FundamentalsSnapshot)[]) {
      const proposed = parsed.fundamentals[key];
      if (!proposed) continue;
      rows.push({
        id: `fundamentals.${key}`,
        label: `Fundamentals → ${FUNDAMENTALS_LABEL[key]}`,
        current: thesis.fundamentals[key] ?? null,
        proposed,
        apply: (t) => ({ fundamentals: { ...t.fundamentals, [key]: proposed } }),
      });
    }
  }

  if (parsed.valuation) {
    for (const key of Object.keys(parsed.valuation) as (keyof ValuationNotes)[]) {
      const proposed = parsed.valuation[key];
      if (!proposed) continue;
      rows.push({
        id: `valuation.${key}`,
        label: `Valuation → ${VALUATION_LABEL[key]}`,
        current: thesis.valuation[key] ?? null,
        proposed,
        apply: (t) => ({ valuation: { ...t.valuation, [key]: proposed } }),
      });
    }
  }

  if (parsed.scenarios && parsed.scenarios.length > 0) {
    for (const sc of parsed.scenarios) {
      const kind = sc.kind ?? "base";
      const currentSc = thesis.scenarios.find((s) => s.kind === kind);
      rows.push({
        id: `scenarios.${kind}`,
        label: `Scenarios → Base case`,
        current: fmtScenarioCurrent(currentSc),
        proposed: fmtScenarioProposed(sc),
        apply: (t) => {
          const merged = SCENARIO_KINDS.map((k) => {
            const base = t.scenarios.find((s) => s.kind === k) ?? { kind: k };
            if (k === kind) {
              return { ...base, ...sc, kind: k };
            }
            return base;
          });
          return { scenarios: merged };
        },
      });
    }
  }

  if (parsed.questions && parsed.questions.length > 0) {
    rows.push({
      id: "questions",
      label: "Open questions",
      current: joinList(thesis.questions),
      // Append, don't replace — the user's existing bullets stay (per W15.C spec).
      proposed: joinList([...thesis.questions, ...parsed.questions]) ?? "",
      apply: (t) => {
        const next = Array.from(new Set([...t.questions, ...(parsed.questions ?? [])]));
        return { questions: next };
      },
    });
  }

  if (parsed.thesisPoints && parsed.thesisPoints.length > 0) {
    rows.push({
      id: "thesisPoints",
      label: "Thesis points",
      current: joinList(thesis.thesisPoints),
      proposed: joinList([...thesis.thesisPoints, ...parsed.thesisPoints]) ?? "",
      apply: (t) => {
        const next = Array.from(new Set([...t.thesisPoints, ...(parsed.thesisPoints ?? [])]));
        return { thesisPoints: next };
      },
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function ThesisAutofillPanel({
  thesis,
  company,
  snapshot,
  onApply,
}: ThesisAutofillPanelProps) {
  const [report, setReport] = useState<SuggestionReport | null>(null);
  const [accepted, setAccepted] = useState<Set<FieldId>>(() => new Set());
  const [skipped, setSkipped] = useState<Set<FieldId>>(() => new Set());
  const [appliedAt, setAppliedAt] = useState<number | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);

  const rows = useMemo<DiffRow[]>(() => {
    if (!report) return [];
    return buildDiffRows(thesis, report.parsed);
  }, [thesis, report]);

  function reset() {
    setReport(null);
    setAccepted(new Set());
    setSkipped(new Set());
  }

  function handleSuggest() {
    const result = suggestFromData(company, snapshot);
    setReport(result);
    setAccepted(new Set());
    setSkipped(new Set());
    setAppliedAt(null);
    setAppliedCount(0);
  }

  function handleAcceptRow(row: DiffRow) {
    const patch = row.apply(thesis);
    onApply(patch);
    setAccepted((prev) => {
      const next = new Set(prev);
      next.add(row.id);
      return next;
    });
  }

  function handleSkipRow(row: DiffRow) {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(row.id);
      return next;
    });
  }

  function handleAcceptAll() {
    let cumulative: Thesis = thesis;
    const aggregated: Partial<Thesis> = {};
    let applied = 0;
    for (const row of rows) {
      if (accepted.has(row.id) || skipped.has(row.id)) continue;
      const patch = row.apply(cumulative);
      cumulative = { ...cumulative, ...patch };
      Object.assign(aggregated, patch);
      applied += 1;
    }
    if (applied === 0) return;
    onApply(aggregated);
    // Collapse to a status pulse — clearing report + state hides the diff rows
    // and shows the "Suggestions applied" line.
    setAppliedCount(accepted.size + applied);
    setAppliedAt(Date.now());
    setReport(null);
    setAccepted(new Set());
    setSkipped(new Set());
    window.setTimeout(() => setAppliedAt(null), 1500);
  }

  function handleCancel() {
    reset();
  }

  const pendingRows = rows.filter((r) => !accepted.has(r.id) && !skipped.has(r.id));
  const disabled = company === null;
  const disabledTitle = disabled
    ? "No company data for this symbol — pipeline hasn't ingested it yet"
    : undefined;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggest}
          disabled={disabled}
          title={disabledTitle}
          aria-label="Suggest from data"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Suggest from data
        </Button>
        {appliedAt !== null ? (
          <span
            role="status"
            className="font-body-compact text-body-compact text-regime-risk-on"
          >
            Suggestions applied — {appliedCount} field{appliedCount === 1 ? "" : "s"} updated.
          </span>
        ) : null}
      </div>

      {report ? (
        <div className="rounded-md border border-border-subtle bg-surface-elevated p-3 space-y-3">
          <div className="space-y-1">
            <p className="font-body-compact text-body-compact text-text-primary">
              Computed{" "}
              <span className="font-data-mono">{report.matchedFieldCount}</span>{" "}
              {report.matchedFieldCount === 1 ? "suggestion" : "suggestions"} from{" "}
              <span className="font-data-mono">{thesis.symbol}</span>&rsquo;s company data
              <span className="text-text-secondary">
                {" "}
                ({report.matchedFieldCount}/{report.totalFieldCount} considered)
              </span>
              .
            </p>
            {rows.length === 0 ? (
              <p className="font-body-compact text-body-compact text-text-secondary">
                No suggestions could be generated — the pipeline payload is too sparse to
                template any fields. Try again after the next pipeline run.
              </p>
            ) : null}
            {report.warnings.length > 0 ? (
              <ul className="font-body-compact text-body-compact text-regime-neutral list-disc list-inside">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pendingRows.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAcceptAll}
              >
                Accept all ({pendingRows.length})
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-text-secondary"
            >
              Cancel
            </Button>
          </div>

          {rows.length > 0 ? (
            <div className="space-y-2">
              {rows.map((row) => {
                const isAccepted = accepted.has(row.id);
                const isSkipped = skipped.has(row.id);
                return (
                  <div
                    key={row.id}
                    className="rounded-md border border-border-subtle bg-surface p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-label-caps text-label-caps uppercase text-text-primary">
                        {row.label}
                      </span>
                      {isAccepted ? (
                        <span className="font-label-caps text-label-caps uppercase text-regime-risk-on">
                          Accepted
                        </span>
                      ) : isSkipped ? (
                        <span className="font-label-caps text-label-caps uppercase text-text-secondary">
                          Skipped
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcceptRow(row)}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSkipRow(row)}
                            className="text-text-secondary"
                          >
                            Skip
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="font-label-caps text-label-caps uppercase text-text-secondary">
                          Current
                        </span>
                        <pre className="whitespace-pre-wrap rounded border border-border-subtle bg-surface-variant px-2 py-1 font-data-mono text-data-mono text-text-secondary">
                          {row.current ?? "(empty)"}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <span className="font-label-caps text-label-caps uppercase text-text-secondary">
                          Proposed
                        </span>
                        <pre className="whitespace-pre-wrap rounded border border-border-subtle bg-surface-variant px-2 py-1 font-data-mono text-data-mono text-text-primary">
                          {row.proposed}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
