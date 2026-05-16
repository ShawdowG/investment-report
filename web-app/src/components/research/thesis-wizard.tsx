"use client";

/**
 * SPEC-028 W12.C — Guided wizard shell for the thesis form.
 *
 * The wizard walks the 9 framework steps (see lib/research/wizard-steps.ts)
 * one at a time. It is *suggestive* — empty steps can be skipped, the
 * progress bar fills based on each step's `isComplete` predicate, and a
 * "Skip to Deep dive" escape hatch is visible on every step.
 *
 * State lives in the parent (thesis-form.tsx): `thesis` is the in-memory
 * form snapshot, `onChange` patches it. The wizard's own state is just the
 * current step index — switching steps never loses field values.
 *
 * W12.D layers the resume banner + Restart-from-step-1 confirmation on top.
 * W12.E wires the per-step bodies to the real editors; for now the body is
 * a generic placeholder so the shell is verifiable in isolation.
 */

import { Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BadgeSelect, SectionHeader, Tag, type BadgeSelectOption } from "@/components/ui/stitch";
import { cn } from "@/lib/utils";
import type {
  ClassifiedPointType,
  ClassifiedThesisPoint,
  PlannedAction,
  Thesis,
  TradeLevel,
} from "@/lib/domain/thesis";
import {
  WIZARD_STEPS,
  findResumeStep,
  type WizardStepMeta,
} from "@/lib/research/wizard-steps";
import { ScenariosEditor } from "@/components/research/scenarios-editor";
import { ThesisChecklists } from "@/components/research/thesis-checklists";
import { calcAllAddsTriggered } from "@/lib/research/position-calculator";
import { fmtMoney, fmtPct } from "@/lib/utils/format";

export interface ThesisWizardProps {
  /** Current in-memory thesis state (form snapshot, not yet persisted). */
  thesis: Thesis;
  /** Patch the form state. The parent reduces the patch into its hooks. */
  onChange: (next: Thesis) => void;
  /** Commit the current state and exit the wizard (Save & exit + Finish). */
  onSave: () => void | Promise<void>;
  /** Hand off to Deep dive mode while keeping all field values. */
  onSkipToDeepDive: () => void;
}

export function ThesisWizard({
  thesis,
  onChange,
  onSave,
  onSkipToDeepDive,
}: ThesisWizardProps) {
  // SPEC-028 W12.C — start on the first incomplete step so the user picks up
  // where they left off. W12.D layers the resume banner + restart confirmation
  // when that initial step is past Setup (i.e. resumedAtIdx > 0).
  const initialStepId = useMemo(() => findResumeStep(thesis), []);
  const initialIdx = WIZARD_STEPS.findIndex((s) => s.id === initialStepId);
  const [currentIdx, setCurrentIdx] = useState<number>(
    initialIdx >= 0 ? initialIdx : 0,
  );
  const [restartOpen, setRestartOpen] = useState(false);

  const step = WIZARD_STEPS[currentIdx];
  const totalSteps = WIZARD_STEPS.length;
  const completed = WIZARD_STEPS.map((s) => s.isComplete(thesis));
  const completedCount = completed.filter(Boolean).length;
  const isLast = currentIdx === totalSteps - 1;
  const isFirst = currentIdx === 0;
  // Banner only visible while the user is still parked on the auto-resumed
  // step — once they navigate, the banner disappears (the cursor speaks for
  // itself from then on).
  const resumedAtIdx = initialIdx > 0 ? initialIdx : -1;
  const resumedStep =
    resumedAtIdx >= 0 ? WIZARD_STEPS[resumedAtIdx] : null;
  const showResumeBanner = resumedStep !== null && currentIdx === resumedAtIdx;

  function goPrev() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }
  function goNext() {
    if (currentIdx < totalSteps - 1) setCurrentIdx(currentIdx + 1);
  }

  return (
    <Card className="p-card-padding gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader
            title={`${step.title} (${step.frameworkSection})`}
            caption={`Step ${currentIdx + 1} of ${totalSteps}`}
          />
          <span className="font-label-caps text-label-caps uppercase text-text-secondary">
            {completedCount} / {totalSteps} filled
          </span>
        </div>
        <WizardProgressBar
          completed={completed}
          currentIdx={currentIdx}
          onJump={(idx) => setCurrentIdx(idx)}
        />
      </div>

      {showResumeBanner && resumedStep ? (
        <ResumeBanner
          stepNumber={resumedAtIdx + 1}
          totalSteps={totalSteps}
          stepTitle={resumedStep.title}
          onRestart={() => setRestartOpen(true)}
        />
      ) : null}

      <div className="space-y-2">
        <Tag>Framework {step.frameworkSection}</Tag>
        <p className="font-body-compact text-body-compact text-text-secondary leading-relaxed">
          {step.prompt}
        </p>
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-variant p-card-padding">
        <WizardStepBody step={step} thesis={thesis} onChange={onChange} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={isFirst}
        >
          ← Previous
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void onSave()}
            className="text-text-secondary hover:text-text-primary"
          >
            Save & exit
          </Button>
          <button
            type="button"
            onClick={onSkipToDeepDive}
            className="rounded-md px-2 py-1 font-body-compact text-body-compact text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Skip to Deep dive
          </button>
          {isLast ? (
            <Button type="button" size="sm" onClick={() => void onSave()}>
              Finish
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={goNext}>
              Next →
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={restartOpen}
        title="Jump back to step 1?"
        description="Your filled fields aren't lost — just the wizard cursor moves to the Setup step."
        confirmLabel="Jump back"
        cancelLabel="Cancel"
        onConfirm={() => {
          setCurrentIdx(0);
          setRestartOpen(false);
        }}
        onCancel={() => setRestartOpen(false)}
      />
    </Card>
  );
}

/** 9-segment progress bar driven by `isComplete` per step. */
function WizardProgressBar({
  completed,
  currentIdx,
  onJump,
}: {
  completed: boolean[];
  currentIdx: number;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="list" aria-label="Wizard progress">
      {WIZARD_STEPS.map((s, idx) => {
        const isDone = completed[idx];
        const isCurrent = idx === currentIdx;
        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onJump(idx)}
            aria-label={`${s.title} — step ${idx + 1}${isDone ? ", complete" : ""}${isCurrent ? ", current" : ""}`}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              isDone ? "bg-regime-risk-on" : "bg-surface-variant",
              isCurrent && "ring-2 ring-ring/40 ring-offset-1 ring-offset-surface",
            )}
            title={`${idx + 1}. ${s.title}`}
          />
        );
      })}
    </div>
  );
}

/**
 * SPEC-028 W12.D — pointer to the auto-resumed step with a "Restart from
 * step 1" escape hatch. The actual reset goes through a ConfirmDialog so
 * the user has a beat to decide; the dialog body is explicit that fields
 * are not wiped.
 */
function ResumeBanner({
  stepNumber,
  totalSteps,
  stepTitle,
  onRestart,
}: {
  stepNumber: number;
  totalSteps: number;
  stepTitle: string;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2">
      <p className="font-body-compact text-body-compact text-text-secondary">
        Resuming at step {stepNumber} of {totalSteps} —{" "}
        <span className="text-text-primary">{stepTitle}</span>.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="rounded font-body-compact text-body-compact text-text-secondary underline-offset-2 hover:underline hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Restart from step 1
      </button>
    </div>
  );
}

/**
 * SPEC-028 W12.E — per-step body router. Each step renders only its own
 * editor; switching steps preserves field values because the parent owns
 * `thesis` state. Editors mutate the in-memory thesis via `onChange`, which
 * thesis-form.tsx fans out to the granular form hooks.
 */
function WizardStepBody({
  step,
  thesis,
  onChange,
}: {
  step: WizardStepMeta;
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  switch (step.id) {
    case "setup":
      return <SetupStep thesis={thesis} onChange={onChange} />;
    case "thesisPoints":
      return <ThesisPointsStep thesis={thesis} onChange={onChange} />;
    case "classify":
      return <ClassifyStep thesis={thesis} onChange={onChange} />;
    case "fundamentals":
      return <FundamentalsStep thesis={thesis} onChange={onChange} />;
    case "marketPosition":
      return <MarketPositionStep thesis={thesis} onChange={onChange} />;
    case "valuation":
      return <ValuationStep thesis={thesis} onChange={onChange} />;
    case "scenarios":
      return <ScenariosStep thesis={thesis} onChange={onChange} />;
    case "tradePlan":
      return <TradePlanStep thesis={thesis} onChange={onChange} />;
    case "lightChecklists":
      return <LightChecklistsStep thesis={thesis} onChange={onChange} />;
    default:
      return null;
  }
}

const PLANNED_ACTION_OPTIONS: BadgeSelectOption<PlannedAction | "">[] = [
  { value: "" as PlannedAction | "", label: "Not set" },
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

const CLASSIFIED_POINT_OPTIONS: BadgeSelectOption<ClassifiedPointType>[] = [
  { value: "core", label: "Core" },
  { value: "optional", label: "Optional" },
  { value: "valuation", label: "Valuation" },
  { value: "risk", label: "Risk" },
];

const CLASSIFIED_POINT_LABEL: Record<ClassifiedPointType, string> = {
  core: "Core",
  optional: "Optional",
  valuation: "Valuation",
  risk: "Risk",
};

/** Split one-bullet-per-line text into a string[], discarding blanks. */
function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.replace(/^\s*[-*]\s*/, "").trim())
    .filter((s) => s.length > 0);
}

function parsePositiveNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function patch(thesis: Thesis, partial: Partial<Thesis>): Thesis {
  return { ...thesis, ...partial };
}

// ── Step 1: Setup ──────────────────────────────────────────────────────────
function SetupStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block font-label-caps text-label-caps uppercase text-text-secondary">
            Planned action
          </label>
          <BadgeSelect<PlannedAction | "">
            value={thesis.plannedAction ?? ""}
            options={PLANNED_ACTION_OPTIONS}
            onSelect={(next) =>
              onChange(
                patch(thesis, { plannedAction: next === "" ? undefined : next }),
              )
            }
            ariaLabel={`Planned action for ${thesis.symbol}`}
          >
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
              {thesis.plannedAction ? PLANNED_ACTION_LABEL[thesis.plannedAction] : "Not set"}
            </span>
          </BadgeSelect>
        </div>
        <FieldRow label="Time horizon" htmlFor="wiz-horizon">
          <input
            id="wiz-horizon"
            type="text"
            value={thesis.timeHorizon ?? ""}
            onChange={(e) =>
              onChange(patch(thesis, { timeHorizon: e.target.value || undefined }))
            }
            placeholder="3-5 years"
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </FieldRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border border-border-subtle bg-surface px-3 py-2">
        <ReadOnlyField
          label="Current price (at creation)"
          value={
            thesis.currentPriceAtCreation !== undefined
              ? fmtMoney(thesis.currentPriceAtCreation)
              : "—"
          }
        />
        <ReadOnlyField
          label="Avg entry"
          value={
            thesis.avgEntryPrice !== undefined ? fmtMoney(thesis.avgEntryPrice) : "—"
          }
        />
        <ReadOnlyField
          label="Position size"
          value={
            thesis.positionSize !== undefined
              ? fmtMoney(thesis.positionSize)
              : "—"
          }
        />
      </div>
    </div>
  );
}

// ── Step 2: Thesis points ──────────────────────────────────────────────────
function ThesisPointsStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  const thesisRaw = thesis.thesisPoints.join("\n");
  return (
    <div className="space-y-3">
      <FieldRow label="Thesis bullets (one per line)" htmlFor="wiz-thesis-points">
        <textarea
          id="wiz-thesis-points"
          value={thesisRaw}
          onChange={(e) =>
            onChange(patch(thesis, { thesisPoints: linesToList(e.target.value) }))
          }
          rows={6}
          placeholder={"- Asia is underpenetrated\n- Pricing power is intact\n- Optional games upside"}
          className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
        />
      </FieldRow>
      <FieldRow label="Concerns" htmlFor="wiz-concerns-other">
        <textarea
          id="wiz-concerns-other"
          value={thesis.concerns.other ?? ""}
          onChange={(e) =>
            onChange(
              patch(thesis, {
                concerns: { ...thesis.concerns, other: e.target.value || undefined },
              }),
            )
          }
          rows={4}
          placeholder="Valuation, competition, macro, execution — what might break the thesis?"
          className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
        />
      </FieldRow>
      <FieldRow label="Open questions (one per line)" htmlFor="wiz-questions">
        <textarea
          id="wiz-questions"
          value={thesis.questions.join("\n")}
          onChange={(e) =>
            onChange(patch(thesis, { questions: linesToList(e.target.value) }))
          }
          rows={4}
          placeholder={"- Can earnings grow 15% for 5 years?\n- What would make this thesis break?"}
          className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
        />
      </FieldRow>
    </div>
  );
}

// ── Step 3: Classify ───────────────────────────────────────────────────────
function ClassifyStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  function update(idx: number, mut: Partial<ClassifiedThesisPoint>) {
    const next = thesis.classifiedPoints.map((p, i) =>
      i === idx ? { ...p, ...mut } : p,
    );
    onChange(patch(thesis, { classifiedPoints: next }));
  }
  function add() {
    onChange(
      patch(thesis, {
        classifiedPoints: [
          ...thesis.classifiedPoints,
          { point: "", type: "core", needsProof: false },
        ],
      }),
    );
  }
  function remove(idx: number) {
    onChange(
      patch(thesis, {
        classifiedPoints: thesis.classifiedPoints.filter((_, i) => i !== idx),
      }),
    );
  }
  return (
    <div className="space-y-2">
      {thesis.classifiedPoints.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No classified points yet — add one to separate core drivers from
          optional upside.
        </p>
      ) : null}
      {thesis.classifiedPoints.map((p, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface p-2 sm:flex-row sm:items-start"
        >
          <textarea
            aria-label={`Thesis point ${idx + 1}`}
            value={p.point}
            onChange={(e) => update(idx, { point: e.target.value })}
            rows={2}
            placeholder="Asia is underpenetrated"
            className="flex-1 rounded-md border border-border-subtle bg-surface-elevated px-2 py-1 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="flex shrink-0 items-center gap-2">
            <BadgeSelect<ClassifiedPointType>
              value={p.type}
              options={CLASSIFIED_POINT_OPTIONS}
              onSelect={(next) => update(idx, { type: next })}
              ariaLabel={`Type for ${thesis.symbol} thesis point ${idx + 1}`}
            >
              <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
                {CLASSIFIED_POINT_LABEL[p.type]}
              </span>
            </BadgeSelect>
            <label className="inline-flex items-center gap-1 font-body-compact text-body-compact text-text-secondary">
              <input
                type="checkbox"
                checked={p.needsProof}
                onChange={(e) => update(idx, { needsProof: e.target.checked })}
                className="size-4 rounded border-border-subtle bg-surface-elevated accent-primary"
              />
              Needs proof
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(idx)}
              className="text-text-secondary hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="sr-only">Remove point</span>
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        + Add point
      </Button>
    </div>
  );
}

// ── Step 4: Fundamentals ───────────────────────────────────────────────────
function FundamentalsStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  const f = thesis.fundamentals;
  function set<K extends keyof typeof f>(key: K, value: string) {
    onChange(
      patch(thesis, {
        fundamentals: { ...f, [key]: value || undefined },
      }),
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextAreaField
        label="Revenue growth"
        helper="Latest quarter, TTM, guidance."
        value={f.revenueGrowth ?? ""}
        onChange={(v) => set("revenueGrowth", v)}
      />
      <TextAreaField
        label="Margins"
        helper="Gross / operating / net."
        value={f.margins ?? ""}
        onChange={(v) => set("margins", v)}
      />
      <TextAreaField
        label="Free cash flow"
        helper="Reported and normalised."
        value={f.fcf ?? ""}
        onChange={(v) => set("fcf", v)}
      />
      <TextAreaField
        label="Balance sheet"
        helper="Net debt, cash, maturities."
        value={f.balanceSheet ?? ""}
        onChange={(v) => set("balanceSheet", v)}
      />
      <TextAreaField
        label="Segment / region growth"
        helper="Where the growth is coming from."
        value={f.segmentGrowth ?? ""}
        onChange={(v) => set("segmentGrowth", v)}
      />
      <TextAreaField
        label="Guidance"
        helper="Raised, stable, or cut."
        value={f.guidance ?? ""}
        onChange={(v) => set("guidance", v)}
      />
      <TextAreaField
        label="Capital allocation"
        helper="Buybacks, M&A, reinvestment."
        value={f.capitalAllocation ?? ""}
        onChange={(v) => set("capitalAllocation", v)}
      />
    </div>
  );
}

// ── Step 5: Market position ────────────────────────────────────────────────
function MarketPositionStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  const m = thesis.marketPosition;
  function set<K extends keyof typeof m>(key: K, value: string) {
    onChange(
      patch(thesis, {
        marketPosition: { ...m, [key]: value || undefined },
      }),
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextAreaField
          label="Real competition"
          helper="Who is the company actually competing against?"
          value={m.realCompetition ?? ""}
          onChange={(v) => set("realCompetition", v)}
        />
        <TextAreaField
          label="Dominance today"
          helper="What does the company own outright?"
          value={m.dominanceToday ?? ""}
          onChange={(v) => set("dominanceToday", v)}
        />
        <TextAreaField
          label="Durability"
          helper="Is the dominance defensible?"
          value={m.durability ?? ""}
          onChange={(v) => set("durability", v)}
        />
        <TextAreaField
          label="New markets"
          helper="Adjacent expansion paths."
          value={m.newMarkets ?? ""}
          onChange={(v) => set("newMarkets", v)}
        />
        <TextAreaField
          label="New areas proven?"
          helper="Proven or still optional?"
          value={m.newAreasProven ?? ""}
          onChange={(v) => set("newAreasProven", v)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextAreaField
          label="Core growth drivers"
          helper="One per line — pricing, units, geo, margin, FCF, buybacks."
          value={thesis.coreDrivers.join("\n")}
          onChange={(v) =>
            onChange(patch(thesis, { coreDrivers: linesToList(v) }))
          }
          rows={5}
        />
        <TextAreaField
          label="Optional upside drivers"
          helper="One per line — new products, AI, live events, partnerships."
          value={thesis.optionalDrivers.join("\n")}
          onChange={(v) =>
            onChange(patch(thesis, { optionalDrivers: linesToList(v) }))
          }
          rows={5}
        />
      </div>
    </div>
  );
}

// ── Step 6: Valuation ──────────────────────────────────────────────────────
function ValuationStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  const v = thesis.valuation;
  function set<K extends keyof typeof v>(key: K, value: string) {
    onChange(
      patch(thesis, {
        valuation: { ...v, [key]: value || undefined },
      }),
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextAreaField
          label="Metrics tracked"
          helper="e.g. fwd P/E, EV/EBITDA, P/FCF, EV/sales."
          value={v.metricsTracked ?? ""}
          onChange={(val) => set("metricsTracked", val)}
        />
        <TextAreaField
          label="Growth assumed"
          helper="What revenue growth does the current price imply?"
          value={v.growthAssumed ?? ""}
          onChange={(val) => set("growthAssumed", val)}
        />
        <TextAreaField
          label="Margin assumed"
          helper="Operating / net margin the multiple bakes in."
          value={v.marginAssumed ?? ""}
          onChange={(val) => set("marginAssumed", val)}
        />
        <TextAreaField
          label="Multiple assumed"
          helper="What multiple must the market keep paying?"
          value={v.multipleAssumed ?? ""}
          onChange={(val) => set("multipleAssumed", val)}
        />
      </div>
      <TextAreaField
        label="Notes"
        helper="Cheap / fair / high-quality? What if the multiple compresses?"
        value={v.notes ?? ""}
        onChange={(val) => set("notes", val)}
        rows={3}
      />
    </div>
  );
}

// ── Step 7: Scenarios ──────────────────────────────────────────────────────
function ScenariosStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  return (
    <ScenariosEditor
      scenarios={thesis.scenarios}
      onChange={(next) => onChange(patch(thesis, { scenarios: next }))}
      currentPrice={thesis.currentPriceAtCreation}
    />
  );
}

// ── Step 8: Trade plan ─────────────────────────────────────────────────────
function TradePlanStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  const addByLevel = new Map<number, TradeLevel>();
  for (const lvl of thesis.tradeLevels) {
    if (lvl.kind === "add" && lvl.level) {
      addByLevel.set(lvl.level, lvl);
    }
  }
  const add1 = addByLevel.get(1)?.price?.toString() ?? "";
  const add2 = addByLevel.get(2)?.price?.toString() ?? "";
  const add3 = addByLevel.get(3)?.price?.toString() ?? "";

  function setAdd(level: 1 | 2 | 3, raw: string) {
    const price = parsePositiveNumber(raw);
    const others = thesis.tradeLevels.filter(
      (l) => !(l.kind === "add" && l.level === level),
    );
    const nextLevels: TradeLevel[] =
      price !== undefined ? [...others, { kind: "add", price, level }] : others;
    onChange(patch(thesis, { tradeLevels: nextLevels }));
  }
  function setMax(raw: string) {
    const v = parsePositiveNumber(raw);
    onChange(patch(thesis, { maxPositionSize: v }));
  }

  const calc = calcAllAddsTriggered(
    thesis.tradeLevels.filter((l) => l.kind === "add"),
    thesis.maxPositionSize,
  );
  const calcColor =
    calc.pctOfMax === null
      ? "text-text-secondary"
      : calc.pctOfMax > 100
        ? "text-regime-risk-off"
        : calc.pctOfMax >= 80
          ? "text-regime-neutral"
          : "text-text-secondary";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FieldRow label="Add level 1 ($)" htmlFor="wiz-add-1">
          <NumberInput id="wiz-add-1" value={add1} onChange={(v) => setAdd(1, v)} placeholder="100.00" />
        </FieldRow>
        <FieldRow label="Add level 2 ($)" htmlFor="wiz-add-2">
          <NumberInput id="wiz-add-2" value={add2} onChange={(v) => setAdd(2, v)} placeholder="85.00" />
        </FieldRow>
        <FieldRow label="Add level 3 ($)" htmlFor="wiz-add-3">
          <NumberInput id="wiz-add-3" value={add3} onChange={(v) => setAdd(3, v)} placeholder="70.00" />
        </FieldRow>
      </div>
      <FieldRow label="Maximum position size ($)" htmlFor="wiz-max-pos">
        <NumberInput
          id="wiz-max-pos"
          value={thesis.maxPositionSize !== undefined ? String(thesis.maxPositionSize) : ""}
          onChange={setMax}
          placeholder="20000"
          className="sm:w-60"
        />
      </FieldRow>
      {calc.totalShares > 0 ? (
        <div className={cn("font-body-compact text-body-compact", calcColor)}>
          If all adds trigger:{" "}
          <span className="font-data-mono">
            {calc.totalShares.toFixed(calc.totalShares < 10 ? 2 : 0)}{" "}
            {calc.totalShares === 1 ? "share" : "shares"}
          </span>{" "}
          / <span className="font-data-mono">{fmtMoney(calc.totalDollars)}</span>
          {calc.pctOfMax !== null ? (
            <>
              {" "}
              / <span className="font-data-mono">{fmtPct(calc.pctOfMax, 0)} of max</span>
            </>
          ) : null}
          {calc.exceedsMax ? (
            <span className="ml-2 font-label-caps text-label-caps uppercase text-regime-risk-off">
              Exceeds your max position size
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Step 9: Light + checklists ─────────────────────────────────────────────
function LightChecklistsStep({
  thesis,
  onChange,
}: {
  thesis: Thesis;
  onChange: (next: Thesis) => void;
}) {
  return (
    <ThesisChecklists
      light={thesis.currentLight}
      onLightChange={(next) => onChange(patch(thesis, { currentLight: next }))}
      greenChecks={thesis.greenChecks}
      onGreenChange={(next) => onChange(patch(thesis, { greenChecks: next }))}
      yellowChecks={thesis.yellowChecks}
      onYellowChange={(next) => onChange(patch(thesis, { yellowChecks: next }))}
      redChecks={thesis.redChecks}
      onRedChange={(next) => onChange(patch(thesis, { redChecks: next }))}
      trimSellChecks={thesis.trimSellChecks}
      onTrimSellChange={(next) => onChange(patch(thesis, { trimSellChecks: next }))}
    />
  );
}

// ── Shared primitives ──────────────────────────────────────────────────────
function FieldRow({
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
      <label
        htmlFor={htmlFor}
        className="block font-label-caps text-label-caps uppercase text-text-secondary"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="block font-label-caps text-label-caps uppercase text-text-secondary">
        {label}
      </span>
      <span className="font-data-mono text-body-compact text-text-primary">{value}</span>
    </div>
  );
}

function TextAreaField({
  label,
  helper,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  const id = `wiz-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block font-label-caps text-label-caps uppercase text-text-secondary"
      >
        {label}
      </label>
      {helper ? (
        <p className="font-body-compact text-body-compact text-text-secondary">{helper}</p>
      ) : null}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-body-compact text-body-compact text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
      />
    </div>
  );
}

function NumberInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    />
  );
}
