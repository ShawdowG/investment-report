"use client";

/**
 * SPEC-023 W8.K — Read mode renderer for a saved thesis.
 *
 * Renders the structured thesis as clean typographic blocks (no form
 * affordances) so the user sees their thesis at a glance after saving.
 * Section order mirrors the deep-dive editor in `thesis-form.tsx` so the
 * mental model carries over when the user clicks "Edit". Empty sections are
 * suppressed entirely — we never render a half-blank table.
 *
 * The "Edit" button at the top of the header strip is the only handoff back to
 * the form; the parent `ThesisForm` owns the actual view↔edit toggle state.
 */

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import { LightTrajectory } from "./light-trajectory";
import { MarkdownBody } from "./markdown-body";
import { LIGHT_ARIA, LIGHT_DOT_CLASS } from "@/lib/research/thesis-light";
import type {
  ClassifiedPointType,
  ClassifiedThesisPoint,
  Concerns,
  FundamentalsSnapshot,
  Light,
  MarketPositionNotes,
  PlannedAction,
  Scenario,
  Thesis,
  TradeLevel,
  TradeLevelKind,
  ValuationNotes,
} from "@/lib/domain/thesis";
import { fmtDate, fmtMoney } from "@/lib/utils/format";

const PLANNED_ACTION_LABEL: Record<PlannedAction, string> = {
  hold: "Hold",
  add: "Add",
  trim: "Trim",
  sell: "Sell",
  watch: "Watch",
};

const LIGHT_LABEL: Record<Light, string> = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
};

const CLASSIFIED_POINT_LABEL: Record<ClassifiedPointType, string> = {
  core: "Core",
  optional: "Optional",
  valuation: "Valuation",
  risk: "Risk",
};

const TRADE_KIND_LABEL: Record<TradeLevelKind, string> = {
  add: "Add",
  trim: "Trim",
  sell: "Sell",
};

const SCENARIO_LABEL: Record<Scenario["kind"], string> = {
  worst: "Worst case",
  bear: "Bear",
  base: "Base",
  better: "Better",
  moonshot: "Moonshot",
};

const FUNDAMENTAL_ROWS: { key: keyof FundamentalsSnapshot; label: string }[] = [
  { key: "revenueGrowth", label: "Revenue growth" },
  { key: "margins", label: "Margins" },
  { key: "fcf", label: "Free cash flow" },
  { key: "balanceSheet", label: "Balance sheet" },
  { key: "segmentGrowth", label: "Segment / region growth" },
  { key: "guidance", label: "Guidance" },
  { key: "capitalAllocation", label: "Capital allocation" },
];

const MARKET_POSITION_ROWS: { key: keyof MarketPositionNotes; label: string }[] = [
  { key: "realCompetition", label: "Real competition" },
  { key: "dominanceToday", label: "Dominance today" },
  { key: "durability", label: "Durability" },
  { key: "newMarkets", label: "New markets" },
  { key: "newAreasProven", label: "New areas proven?" },
];

const VALUATION_ROWS: { key: keyof ValuationNotes; label: string }[] = [
  { key: "metricsTracked", label: "Metrics tracked" },
  { key: "growthAssumed", label: "Growth assumed" },
  { key: "marginAssumed", label: "Margin assumed" },
  { key: "multipleAssumed", label: "Multiple assumed" },
  { key: "notes", label: "Notes" },
];

const CONCERN_ROWS: { key: keyof Concerns; label: string }[] = [
  { key: "valuation", label: "Valuation" },
  { key: "competition", label: "Competition" },
  { key: "macro", label: "Macro" },
  { key: "execution", label: "Execution" },
  { key: "other", label: "Other" },
];

const GREEN_LABELS = [
  "Revenue or earnings growth still strong",
  "Margins healthy or improving",
  "FCF growing or stable",
  "Demand & moat intact",
  "Management executing",
  "Valuation reasonable",
  "Macro / regulatory tailwind",
  "Catalysts ahead",
  "Conviction high",
];

const YELLOW_LABELS = [
  "Growth slowing without explanation",
  "Margin or FCF pressure",
  "Competition or moat erosion",
  "Execution stumble",
  "Macro/regulatory headwind",
  "Valuation hot vs fundamentals",
];

const RED_LABELS = [
  "Growth collapsing",
  "Margins / FCF deteriorating fast",
  "Moat broken",
  "Management quality concern",
  "Capital structure stress",
  "Regulatory shock",
  "Macro shock",
  "Conviction broken",
];

const TRIM_SELL_LABELS = [
  "Price above scenario base case",
  "Valuation stretched vs growth",
  "Position size > planned max",
  "Thesis weakening but not broken",
  "Capital better deployed elsewhere",
  "Risk-management trim",
];

interface ThesisViewProps {
  thesis: Thesis;
  onEdit: () => void;
}

function isEmptyObject(record: Record<string, string | undefined>): boolean {
  return Object.values(record).every((v) => !v || !v.trim());
}

export function ThesisView({ thesis, onEdit }: ThesisViewProps) {
  const {
    symbol,
    currentLight,
    plannedAction,
    updatedAt,
    currentPriceAtCreation,
    avgEntryPrice,
    positionSize,
    timeHorizon,
    thesisPoints,
    classifiedPoints,
    concerns,
    questions,
    tradeLevels,
    maxPositionSize,
    fundamentals,
    marketPosition,
    coreDrivers,
    optionalDrivers,
    valuation,
    scenarios,
    greenChecks,
    yellowChecks,
    redChecks,
    trimSellChecks,
    notes,
    analysisNotes,
  } = thesis;

  const hasSnapshot =
    currentPriceAtCreation !== undefined ||
    avgEntryPrice !== undefined ||
    positionSize !== undefined ||
    !!timeHorizon ||
    maxPositionSize !== undefined;
  const hasThesisPoints = thesisPoints.length > 0 || classifiedPoints.length > 0;
  const hasConcerns = !isEmptyObject(concerns as Record<string, string | undefined>);
  const hasQuestions = questions.length > 0;
  const hasTradePlan = tradeLevels.length > 0;
  const hasFundamentals = !isEmptyObject(fundamentals as Record<string, string | undefined>);
  const hasMarketPosition =
    !isEmptyObject(marketPosition as Record<string, string | undefined>) ||
    coreDrivers.length > 0 ||
    optionalDrivers.length > 0;
  const hasValuation = !isEmptyObject(valuation as Record<string, string | undefined>);
  const hasScenarios = scenarios.some(
    (s) =>
      s.priceTarget !== undefined ||
      s.probability !== undefined ||
      (s.meaning && s.meaning.trim()) ||
      (s.businessAssumptions && s.businessAssumptions.trim()) ||
      (s.valuationAssumptions && s.valuationAssumptions.trim()),
  );
  const tickedGreen = greenChecks.filter(Boolean).length;
  const tickedYellow = yellowChecks.filter(Boolean).length;
  const tickedRed = redChecks.filter(Boolean).length;
  const tickedTrimSell = trimSellChecks.filter(Boolean).length;
  const hasChecklists =
    tickedGreen + tickedYellow + tickedRed + tickedTrimSell > 0;
  const hasNotes = notes.length > 0;
  const hasAnalysisNotes = !!(analysisNotes && analysisNotes.trim());

  return (
    <div className="space-y-4">
      <Card className="p-card-padding gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`inline-block size-3 rounded-full ${LIGHT_DOT_CLASS[currentLight]}`}
              aria-label={LIGHT_ARIA[currentLight]}
              role="img"
            />
            <span className="font-data-mono text-h1 text-text-primary">
              {symbol}
            </span>
            <Tag>Light: {LIGHT_LABEL[currentLight]}</Tag>
            {plannedAction ? (
              <Tag>Plan: {PLANNED_ACTION_LABEL[plannedAction]}</Tag>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-label-caps text-label-caps uppercase text-text-secondary">
              Last updated {fmtDate(updatedAt)}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-4 mr-1" aria-hidden="true" />
              Edit
            </Button>
          </div>
        </div>
      </Card>

      {hasSnapshot ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Snapshot" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {currentPriceAtCreation !== undefined ? (
              <SnapshotCell
                label="Price at creation"
                value={fmtMoney(currentPriceAtCreation)}
              />
            ) : null}
            {avgEntryPrice !== undefined ? (
              <SnapshotCell label="Avg entry" value={fmtMoney(avgEntryPrice)} />
            ) : null}
            {positionSize !== undefined ? (
              <SnapshotCell
                label="Position size"
                value={positionSize.toString()}
              />
            ) : null}
            {maxPositionSize !== undefined ? (
              <SnapshotCell
                label="Max position"
                value={fmtMoney(maxPositionSize)}
              />
            ) : null}
            {timeHorizon ? (
              <SnapshotCell label="Time horizon" value={timeHorizon} />
            ) : null}
          </dl>
        </Card>
      ) : null}

      {hasThesisPoints ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Thesis points" />
          {thesisPoints.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 font-body-compact text-body-compact text-text-primary">
              {thesisPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}
          {classifiedPoints.length > 0 ? (
            <ul className="space-y-2 pt-1">
              {classifiedPoints.map((cp, i) => (
                <ClassifiedPointRow key={i} point={cp} />
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {hasConcerns ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Concerns" />
          <KeyValueTable
            rows={CONCERN_ROWS.map(({ key, label }) => ({
              label,
              value: concerns[key],
            }))}
          />
        </Card>
      ) : null}

      {hasQuestions ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Open questions" />
          <ul className="list-disc pl-5 space-y-1 font-body-compact text-body-compact text-text-primary">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {hasTradePlan ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Trade plan" />
          <TradeLevelsTable levels={tradeLevels} />
        </Card>
      ) : null}

      {hasFundamentals ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Fundamentals" />
          <KeyValueTable
            rows={FUNDAMENTAL_ROWS.map(({ key, label }) => ({
              label,
              value: fundamentals[key],
            }))}
          />
        </Card>
      ) : null}

      {hasMarketPosition ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Market position" />
          <KeyValueTable
            rows={MARKET_POSITION_ROWS.map(({ key, label }) => ({
              label,
              value: marketPosition[key],
            }))}
          />
          {coreDrivers.length > 0 || optionalDrivers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {coreDrivers.length > 0 ? (
                <DriverList title="Core growth drivers" items={coreDrivers} />
              ) : null}
              {optionalDrivers.length > 0 ? (
                <DriverList
                  title="Optional upside drivers"
                  items={optionalDrivers}
                />
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {hasValuation ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Valuation" />
          <KeyValueTable
            rows={VALUATION_ROWS.map(({ key, label }) => ({
              label,
              value: valuation[key],
            }))}
          />
        </Card>
      ) : null}

      {hasScenarios ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Scenarios" />
          <ScenariosTable scenarios={scenarios} />
        </Card>
      ) : null}

      {hasChecklists ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Light + checklists" />
          <p className="font-body-compact text-body-compact text-text-secondary">
            Current light:{" "}
            <span className="font-semibold text-text-primary">
              {LIGHT_LABEL[currentLight]}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ChecklistGroup
              title="Green light"
              labels={GREEN_LABELS}
              checks={greenChecks}
            />
            <ChecklistGroup
              title="Yellow light"
              labels={YELLOW_LABELS}
              checks={yellowChecks}
            />
            <ChecklistGroup
              title="Red light"
              labels={RED_LABELS}
              checks={redChecks}
            />
            <ChecklistGroup
              title="Trim / sell triggers"
              labels={TRIM_SELL_LABELS}
              checks={trimSellChecks}
            />
          </div>
        </Card>
      ) : null}

      <LightTrajectory symbol={symbol} />

      {hasNotes ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Notes" />
          <div className="space-y-4">
            {notes.map((note) => (
              <article key={note.id} className="space-y-1">
                <header className="flex items-baseline justify-between gap-3">
                  <h3 className="font-h2 text-h2 text-text-primary">
                    {note.title || "Untitled note"}
                  </h3>
                  <span className="font-label-caps text-label-caps uppercase text-text-secondary shrink-0">
                    {fmtDate(note.updatedAt ?? note.createdAt)}
                  </span>
                </header>
                <MarkdownBody source={note.body} />
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      {hasAnalysisNotes ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader title="Analysis notes" />
          <MarkdownBody source={analysisNotes ?? ""} />
        </Card>
      ) : null}
    </div>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="font-label-caps text-label-caps uppercase text-text-secondary">
        {label}
      </dt>
      <dd className="font-data-mono text-body-compact text-text-primary">
        {value}
      </dd>
    </div>
  );
}

function ClassifiedPointRow({ point }: { point: ClassifiedThesisPoint }) {
  return (
    <li className="flex items-start gap-2 font-body-compact text-body-compact text-text-primary">
      <Tag className="shrink-0">{CLASSIFIED_POINT_LABEL[point.type]}</Tag>
      <span className="flex-1">{point.point}</span>
      {point.needsProof ? (
        <Tag className="shrink-0 bg-regime-neutral/10 text-regime-neutral border-regime-neutral/30">
          Needs proof
        </Tag>
      ) : null}
    </li>
  );
}

function KeyValueTable({
  rows,
}: {
  rows: { label: string; value: string | undefined }[];
}) {
  const filled = rows.filter((r) => r.value && r.value.trim().length > 0);
  if (filled.length === 0) return null;
  return (
    <dl className="divide-y divide-border-subtle">
      {filled.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3 py-2"
        >
          <dt className="font-label-caps text-label-caps uppercase text-text-secondary">
            {r.label}
          </dt>
          <dd className="font-body-compact text-body-compact text-text-primary whitespace-pre-wrap">
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TradeLevelsTable({ levels }: { levels: TradeLevel[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-body-compact text-body-compact text-text-primary">
        <thead>
          <tr className="text-left font-label-caps text-label-caps uppercase text-text-secondary">
            <th className="py-1 pr-3">Kind</th>
            <th className="py-1 pr-3">Level</th>
            <th className="py-1 pr-3">Price</th>
            <th className="py-1">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {levels.map((lvl, i) => (
            <tr key={i}>
              <td className="py-1 pr-3 align-top">{TRADE_KIND_LABEL[lvl.kind]}</td>
              <td className="py-1 pr-3 font-data-mono align-top">
                {lvl.level ?? "—"}
              </td>
              <td className="py-1 pr-3 font-data-mono align-top">
                <div>{fmtMoney(lvl.price)}</div>
                {lvl.lastCrossedAt ? (
                  <div className="text-text-secondary text-xs font-body-compact">
                    Last crossed: {fmtDate(lvl.lastCrossedAt)}
                  </div>
                ) : null}
              </td>
              <td className="py-1 text-text-secondary align-top">{lvl.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenariosTable({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-body-compact text-body-compact text-text-primary">
        <thead>
          <tr className="text-left font-label-caps text-label-caps uppercase text-text-secondary">
            <th className="py-1 pr-3">Scenario</th>
            <th className="py-1 pr-3">Price target</th>
            <th className="py-1 pr-3">Probability</th>
            <th className="py-1">Meaning</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {scenarios.map((s) => (
            <tr key={s.kind}>
              <td className="py-1 pr-3">{SCENARIO_LABEL[s.kind]}</td>
              <td className="py-1 pr-3 font-data-mono">
                {s.priceTarget !== undefined ? fmtMoney(s.priceTarget) : "—"}
              </td>
              <td className="py-1 pr-3 font-data-mono">
                {s.probability !== undefined ? `${s.probability}%` : "—"}
              </td>
              <td className="py-1 text-text-secondary">{s.meaning ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DriverList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <h4 className="font-label-caps text-label-caps uppercase text-text-secondary">
        {title}
      </h4>
      <ul className="list-disc pl-5 space-y-1 font-body-compact text-body-compact text-text-primary">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistGroup({
  title,
  labels,
  checks,
}: {
  title: string;
  labels: string[];
  checks: boolean[];
}) {
  const ticked = labels.filter((_, i) => checks[i]);
  if (ticked.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="font-label-caps text-label-caps uppercase text-text-secondary">
        {title}
      </h4>
      <ul className="list-disc pl-5 space-y-1 font-body-compact text-body-compact text-text-primary">
        {ticked.map((label, i) => (
          <li key={i}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
