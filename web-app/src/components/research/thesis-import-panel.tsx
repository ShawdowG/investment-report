"use client";

/**
 * SPEC-025 W9.B + W9.C — Import panel for ChatGPT response markdown.
 *
 * Sits at the bottom of the thesis deep-dive form. The user pastes the
 * markdown response into a textarea, clicks "Try to import", and the
 * heuristic parser ({@link parseChatGPTResponse}) produces a structured
 * fragment. The component then renders a per-field diff (current value
 * vs proposed value) with Accept / Skip controls; the user can also
 * Accept All. Unmatched content is shown at the bottom with two
 * routing options ("Append to analysis notes" / "Move to new note").
 *
 * The panel calls back to the parent form via `onApply(patch)` rather
 * than touching localStorage directly — the parent owns thesis state
 * and persists on submit.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/stitch";
import type {
  Concerns,
  FundamentalsSnapshot,
  MarketPositionNotes,
  Scenario,
  ScenarioKind,
  Thesis,
  ValuationNotes,
} from "@/lib/domain/thesis";
import { SCENARIO_KINDS } from "@/lib/domain/thesis";
import {
  parseChatGPTResponse,
  type ImportReport,
  type ParsedThesisFragment,
} from "@/lib/research/thesis-import";

interface ThesisImportPanelProps {
  thesis: Thesis;
  onApply: (patch: Partial<Thesis>) => void;
}

type FieldId = string;

interface DiffRow {
  id: FieldId;
  label: string;
  /** Existing string representation, or null if empty. */
  current: string | null;
  /** Proposed string representation. */
  proposed: string;
  /** Closure that, when called, returns a Partial<Thesis> patch applying just this row. */
  apply: (thesis: Thesis) => Partial<Thesis>;
}

const SCENARIO_LABEL: Record<ScenarioKind, string> = {
  worst: "Worst case",
  bear: "Bear case",
  base: "Base case",
  better: "Better case",
  moonshot: "Moonshot",
};

const CONCERN_LABEL: Record<keyof Concerns, string> = {
  valuation: "Valuation",
  competition: "Competition",
  macro: "Macro",
  execution: "Execution",
  other: "Other",
};

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

/** Stringify a list for the diff preview. */
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

function fmtChecks(values: readonly boolean[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.map((v) => (v ? "x" : "·")).join(" ");
}

/* ------------------------------------------------------------------ */
/* Diff row builders                                                  */
/* ------------------------------------------------------------------ */

function buildDiffRows(thesis: Thesis, fragment: ParsedThesisFragment): DiffRow[] {
  const rows: DiffRow[] = [];

  // Thesis points.
  if (fragment.thesisPoints && fragment.thesisPoints.length > 0) {
    rows.push({
      id: "thesisPoints",
      label: "Thesis points",
      current: joinList(thesis.thesisPoints),
      proposed: joinList(fragment.thesisPoints) ?? "",
      apply: () => ({ thesisPoints: fragment.thesisPoints! }),
    });
  }

  // Concerns — one row per key.
  if (fragment.concerns) {
    for (const key of Object.keys(fragment.concerns) as (keyof Concerns)[]) {
      const proposed = fragment.concerns[key];
      if (!proposed) continue;
      rows.push({
        id: `concerns.${key}`,
        label: `Concerns → ${CONCERN_LABEL[key]}`,
        current: thesis.concerns[key] ?? null,
        proposed,
        apply: (t) => ({ concerns: { ...t.concerns, [key]: proposed } }),
      });
    }
  }

  // Fundamentals.
  if (fragment.fundamentals) {
    for (const key of Object.keys(fragment.fundamentals) as (keyof FundamentalsSnapshot)[]) {
      const proposed = fragment.fundamentals[key];
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

  // Market position.
  if (fragment.marketPosition) {
    for (const key of Object.keys(fragment.marketPosition) as (keyof MarketPositionNotes)[]) {
      const proposed = fragment.marketPosition[key];
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

  // Valuation.
  if (fragment.valuation) {
    for (const key of Object.keys(fragment.valuation) as (keyof ValuationNotes)[]) {
      const proposed = fragment.valuation[key];
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

  // Scenarios — merge by kind.
  if (fragment.scenarios && fragment.scenarios.length > 0) {
    for (const sc of fragment.scenarios) {
      if (!sc.kind) continue;
      const kind = sc.kind;
      const currentSc = thesis.scenarios.find((s) => s.kind === kind);
      const proposedText = fmtScenarioProposed(sc);
      rows.push({
        id: `scenarios.${kind}`,
        label: `Scenarios → ${SCENARIO_LABEL[kind]}`,
        current: fmtScenarioCurrent(currentSc),
        proposed: proposedText,
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

  // Core / optional drivers.
  if (fragment.coreDrivers && fragment.coreDrivers.length > 0) {
    rows.push({
      id: "coreDrivers",
      label: "Core growth drivers",
      current: joinList(thesis.coreDrivers),
      proposed: joinList(fragment.coreDrivers) ?? "",
      apply: () => ({ coreDrivers: fragment.coreDrivers! }),
    });
  }
  if (fragment.optionalDrivers && fragment.optionalDrivers.length > 0) {
    rows.push({
      id: "optionalDrivers",
      label: "Optional upside drivers",
      current: joinList(thesis.optionalDrivers),
      proposed: joinList(fragment.optionalDrivers) ?? "",
      apply: () => ({ optionalDrivers: fragment.optionalDrivers! }),
    });
  }

  // Questions.
  if (fragment.questions && fragment.questions.length > 0) {
    rows.push({
      id: "questions",
      label: "Open questions",
      current: joinList(thesis.questions),
      proposed: joinList(fragment.questions) ?? "",
      apply: () => ({ questions: fragment.questions! }),
    });
  }

  // Classified points.
  if (fragment.classifiedPoints && fragment.classifiedPoints.length > 0) {
    rows.push({
      id: "classifiedPoints",
      label: "Classified points",
      current: thesis.classifiedPoints.length > 0
        ? thesis.classifiedPoints.map((p) => `- (${p.type}) ${p.point}`).join("\n")
        : null,
      proposed: fragment.classifiedPoints
        .map((p) => `- (${p.type}) ${p.point}`)
        .join("\n"),
      apply: () => ({ classifiedPoints: fragment.classifiedPoints! }),
    });
  }

  // Checklists.
  if (fragment.greenChecks && fragment.greenChecks.some(Boolean)) {
    rows.push({
      id: "greenChecks",
      label: "Checklist → Green",
      current: fmtChecks(thesis.greenChecks),
      proposed: fmtChecks(fragment.greenChecks) ?? "",
      apply: () => ({ greenChecks: fragment.greenChecks! }),
    });
  }
  if (fragment.yellowChecks && fragment.yellowChecks.some(Boolean)) {
    rows.push({
      id: "yellowChecks",
      label: "Checklist → Yellow",
      current: fmtChecks(thesis.yellowChecks),
      proposed: fmtChecks(fragment.yellowChecks) ?? "",
      apply: () => ({ yellowChecks: fragment.yellowChecks! }),
    });
  }
  if (fragment.redChecks && fragment.redChecks.some(Boolean)) {
    rows.push({
      id: "redChecks",
      label: "Checklist → Red",
      current: fmtChecks(thesis.redChecks),
      proposed: fmtChecks(fragment.redChecks) ?? "",
      apply: () => ({ redChecks: fragment.redChecks! }),
    });
  }
  if (fragment.trimSellChecks && fragment.trimSellChecks.some(Boolean)) {
    rows.push({
      id: "trimSellChecks",
      label: "Checklist → Trim/Sell",
      current: fmtChecks(thesis.trimSellChecks),
      proposed: fmtChecks(fragment.trimSellChecks) ?? "",
      apply: () => ({ trimSellChecks: fragment.trimSellChecks! }),
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function ThesisImportPanel({ thesis, onApply }: ThesisImportPanelProps) {
  const [raw, setRaw] = useState<string>("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [skipped, setSkipped] = useState<Set<FieldId>>(() => new Set());
  const [accepted, setAccepted] = useState<Set<FieldId>>(() => new Set());

  const rows = useMemo<DiffRow[]>(() => {
    if (!report) return [];
    return buildDiffRows(thesis, report.parsed);
  }, [thesis, report]);

  function handleTryImport() {
    if (!raw.trim()) {
      setReport(null);
      setSkipped(new Set());
      setAccepted(new Set());
      return;
    }
    const result = parseChatGPTResponse(raw);
    setReport(result);
    setSkipped(new Set());
    setAccepted(new Set());
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
    // Merge sequentially so each apply sees the cumulative state.
    let cumulative: Thesis = thesis;
    const aggregatedPatch: Partial<Thesis> = {};
    for (const row of rows) {
      if (accepted.has(row.id) || skipped.has(row.id)) continue;
      const patch = row.apply(cumulative);
      cumulative = { ...cumulative, ...patch };
      Object.assign(aggregatedPatch, patch);
    }
    onApply(aggregatedPatch);
    setAccepted((prev) => {
      const next = new Set(prev);
      for (const row of rows) next.add(row.id);
      return next;
    });
  }

  function handleClear() {
    setRaw("");
    setReport(null);
    setSkipped(new Set());
    setAccepted(new Set());
  }

  const pendingRows = rows.filter((r) => !accepted.has(r.id) && !skipped.has(r.id));
  const matchedSoFar = accepted.size;

  return (
    <details className="group rounded-md border border-border-subtle bg-surface-elevated">
      <summary className="flex cursor-pointer items-start justify-between gap-3 px-3 py-2 list-none [&::-webkit-details-marker]:hidden">
        <div className="space-y-0.5">
          <span className="block font-label-caps text-label-caps uppercase text-text-primary">
            Import ChatGPT response
          </span>
          <span className="block font-body-compact text-body-compact text-text-secondary">
            Heuristic parser — review before saving. Paste the response, click Try to import.
          </span>
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 font-data-mono text-body-compact text-text-secondary group-open:rotate-90 transition-transform"
        >
          ▸
        </span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border-subtle">
        <SectionHeader
          title="Paste markdown"
          caption="Drop the full ChatGPT response below — headings, bullets, and tables are recognised."
        />
        <textarea
          aria-label="ChatGPT response markdown"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={10}
          placeholder={"## Bull case\n- ...\n\n## Bear case\n- Valuation: ...\n\n## Scenarios\n| Kind | Business | Valuation | Price | Probability |\n| --- | --- | --- | --- | --- |\n| Worst | ... | ... | ... | ... |"}
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTryImport}
            disabled={raw.trim().length === 0}
          >
            Try to import
          </Button>
          {report ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-text-secondary"
            >
              Clear
            </Button>
          ) : null}
        </div>

        {report ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border-subtle bg-surface p-3 space-y-1">
              <p className="font-body-compact text-body-compact text-text-primary">
                Parser matched <span className="font-data-mono">{rows.length}</span>{" "}
                {rows.length === 1 ? "field" : "fields"} from the response.{" "}
                {accepted.size > 0 ? (
                  <>
                    Accepted <span className="font-data-mono">{matchedSoFar}</span> so far.
                  </>
                ) : null}{" "}
                {report.unmatched
                  ? "Some content was unrecognised — route it below."
                  : "No unmatched content."}
              </p>
              {report.warnings.length > 0 ? (
                <ul className="font-body-compact text-body-compact text-regime-neutral list-disc list-inside">
                  {report.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              ) : null}
              {pendingRows.length > 0 ? (
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAcceptAll}
                  >
                    Accept all ({pendingRows.length})
                  </Button>
                </div>
              ) : null}
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
            ) : (
              <p className="font-body-compact text-body-compact text-text-secondary">
                No structured fields matched. Use the unmatched routing below.
              </p>
            )}

            {report.unmatched ? (
              <div className="rounded-md border border-border-subtle bg-surface p-3 space-y-2">
                <SectionHeader
                  title="Unmatched content"
                  caption="Anything the parser couldn't classify. Routing UI lands in a follow-up commit."
                />
                <pre className="whitespace-pre-wrap max-h-48 overflow-auto rounded border border-border-subtle bg-surface-variant px-2 py-1 font-data-mono text-data-mono text-text-secondary">
                  {report.unmatched}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
