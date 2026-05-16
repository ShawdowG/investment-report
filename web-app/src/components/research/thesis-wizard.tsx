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

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import { cn } from "@/lib/utils";
import type { Thesis } from "@/lib/domain/thesis";
import {
  WIZARD_STEPS,
  findResumeStep,
  type WizardStepMeta,
} from "@/lib/research/wizard-steps";

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
 * W12.C placeholder body — generic confirmation that the step is active. The
 * real per-step editors are wired in W12.E. This keeps the shell verifiable
 * before the editor wiring lands.
 *
 * `thesis` + `onChange` are intentionally part of the signature already so
 * W12.E only changes the body, not the shell.
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
  // Keep the props referenced so eslint stays happy until W12.E wires them up.
  void thesis;
  void onChange;
  return (
    <p className="font-body-compact text-body-compact text-text-secondary">
      {step.title} editor wires in W12.E.
    </p>
  );
}
