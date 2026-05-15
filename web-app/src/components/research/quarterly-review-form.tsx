"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BadgeSelect, SectionHeader } from "@/components/ui/stitch";
import { createReview } from "@/lib/storage/quarterly-review-store";
import { upsertThesis } from "@/lib/storage/thesis-store";
import type {
  Light,
  QuarterlyReview,
  QuarterlyReviewInput,
} from "@/lib/domain/quarterly-review";
import type { Thesis } from "@/lib/domain/thesis";
import { cn } from "@/lib/utils";

interface QuarterlyReviewFormProps {
  thesis: Thesis | null;
  thesisSymbol: string;
  onSaved: (review: QuarterlyReview) => void;
  onCancel: () => void;
}

interface FormState {
  quarterLabel: string;
  // changes
  revenue: string;
  margins: string;
  fcf: string;
  guidance: string;
  segmentGrowth: string;
  productRoadmap: string;
  risks: string;
  // status (one bullet per line)
  stronger: string;
  weaker: string;
  unchanged: string;
  // light
  light: Light;
  lightWhy: string;
  // next report watch (one per line)
  nextReportWatch: string;
  // updated view
  companyQuality: string;
  valuation: string;
  thesisStrength: string;
  averagingDownRisk: string;
  mostImportantNextCheck: string;
}

const STORAGE_ERROR_MESSAGE =
  "Failed to save review — your browser storage may be full";

const LIGHT_OPTIONS: { value: Light; label: string }[] = [
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
];

const LIGHT_DOT: Record<Light, string> = {
  green: "bg-regime-risk-on",
  yellow: "bg-regime-neutral",
  red: "bg-regime-risk-off",
};

function defaultQuarterLabel(): string {
  const now = new Date();
  const m = now.getMonth(); // 0..11
  // Current calendar quarter — user can edit if reviewing prior quarter.
  const q = Math.floor(m / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}

function emptyForm(): FormState {
  return {
    quarterLabel: defaultQuarterLabel(),
    revenue: "",
    margins: "",
    fcf: "",
    guidance: "",
    segmentGrowth: "",
    productRoadmap: "",
    risks: "",
    stronger: "",
    weaker: "",
    unchanged: "",
    light: "yellow",
    lightWhy: "",
    nextReportWatch: "",
    companyQuality: "",
    valuation: "",
    thesisStrength: "",
    averagingDownRisk: "",
    mostImportantNextCheck: "",
  };
}

function bulletsFromText(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.replace(/^[-*]\s+/, "").trim())
    .filter((s) => s.length > 0);
}

interface ThesisExtras {
  // W8.B-D will add these to the Thesis domain. Read defensively.
  fundamentals?: {
    revenueGrowth?: string;
    margins?: string;
    fcf?: string;
    guidance?: string;
    segmentGrowth?: string;
    capitalAllocation?: string;
  };
}

function lastValue(thesis: Thesis | null, key: keyof NonNullable<ThesisExtras["fundamentals"]>): string | null {
  const extras = thesis as (Thesis & ThesisExtras) | null;
  const value = extras?.fundamentals?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function QuarterlyReviewForm({
  thesis,
  thesisSymbol,
  onSaved,
  onCancel,
}: QuarterlyReviewFormProps) {
  const upper = thesisSymbol.toUpperCase();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const lastRevenue = useMemo(() => lastValue(thesis, "revenueGrowth"), [thesis]);
  const lastMargins = useMemo(() => lastValue(thesis, "margins"), [thesis]);
  const lastFcf = useMemo(() => lastValue(thesis, "fcf"), [thesis]);
  const lastGuidance = useMemo(() => lastValue(thesis, "guidance"), [thesis]);
  const lastSegmentGrowth = useMemo(() => lastValue(thesis, "segmentGrowth"), [thesis]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: QuarterlyReviewInput = {
      thesisSymbol: upper,
      quarterLabel: form.quarterLabel.trim() || defaultQuarterLabel(),
      changes: {
        ...(form.revenue.trim() ? { revenue: form.revenue.trim() } : {}),
        ...(form.margins.trim() ? { margins: form.margins.trim() } : {}),
        ...(form.fcf.trim() ? { fcf: form.fcf.trim() } : {}),
        ...(form.guidance.trim() ? { guidance: form.guidance.trim() } : {}),
        ...(form.segmentGrowth.trim() ? { segmentGrowth: form.segmentGrowth.trim() } : {}),
        ...(form.productRoadmap.trim() ? { productRoadmap: form.productRoadmap.trim() } : {}),
        ...(form.risks.trim() ? { risks: form.risks.trim() } : {}),
      },
      thesisStatus: {
        stronger: bulletsFromText(form.stronger),
        weaker: bulletsFromText(form.weaker),
        unchanged: bulletsFromText(form.unchanged),
      },
      light: form.light,
      lightWhy: form.lightWhy.trim(),
      nextReportWatch: bulletsFromText(form.nextReportWatch),
      updatedView: {
        ...(form.companyQuality.trim() ? { companyQuality: form.companyQuality.trim() } : {}),
        ...(form.valuation.trim() ? { valuation: form.valuation.trim() } : {}),
        ...(form.thesisStrength.trim() ? { thesisStrength: form.thesisStrength.trim() } : {}),
        ...(form.averagingDownRisk.trim() ? { averagingDownRisk: form.averagingDownRisk.trim() } : {}),
        ...(form.mostImportantNextCheck.trim()
          ? { mostImportantNextCheck: form.mostImportantNextCheck.trim() }
          : {}),
      },
    };

    try {
      const created = createReview(input);
      // Bump the parent thesis's currentLight to match the review.
      // We tolerate the case where the field isn't part of the Thesis type yet
      // (W8.B-D will formalise it); upsertThesis spreads extra keys through.
      if (thesis) {
        const patched = {
          ...thesis,
          currentLight: form.light,
        } as Thesis;
        try {
          upsertThesis(patched);
        } catch {
          // Non-fatal — the review itself saved.
        }
      }
      onSaved(created);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[quarterly-review] save failed", err);
      }
      setError(STORAGE_ERROR_MESSAGE);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Card className="p-card-padding gap-3">
        <SectionHeader
          title={`Quarterly review · ${upper}`}
          caption="Framework §9 — capture what changed since last earnings."
        />
        <Field label="Quarter" htmlFor="qr-quarter-label">
          <input
            id="qr-quarter-label"
            type="text"
            value={form.quarterLabel}
            onChange={(e) => update("quarterLabel", e.target.value)}
            placeholder="Q3 2026"
            className="w-full sm:w-60 rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="1. What changed?"
          caption="Compare to prior quarter / guidance. Empty fields are fine."
        />
        <DiffField
          id="qr-revenue"
          label="Revenue"
          value={form.revenue}
          previous={lastRevenue}
          onChange={(v) => update("revenue", v)}
          placeholder="e.g. +18% YoY vs +15% guided"
        />
        <DiffField
          id="qr-margins"
          label="Margins"
          value={form.margins}
          previous={lastMargins}
          onChange={(v) => update("margins", v)}
          placeholder="Gross / operating / net"
        />
        <DiffField
          id="qr-fcf"
          label="Free cash flow"
          value={form.fcf}
          previous={lastFcf}
          onChange={(v) => update("fcf", v)}
          placeholder="Reported and normalized"
        />
        <DiffField
          id="qr-guidance"
          label="Guidance"
          value={form.guidance}
          previous={lastGuidance}
          onChange={(v) => update("guidance", v)}
          placeholder="Raised / held / cut"
        />
        <DiffField
          id="qr-segment-growth"
          label="Segment / region growth"
          value={form.segmentGrowth}
          previous={lastSegmentGrowth}
          onChange={(v) => update("segmentGrowth", v)}
          placeholder="Where is growth coming from?"
        />
        <DiffField
          id="qr-product-roadmap"
          label="Product / roadmap"
          value={form.productRoadmap}
          previous={null}
          onChange={(v) => update("productRoadmap", v)}
          placeholder="New launches, milestones, pivots"
        />
        <DiffField
          id="qr-risks"
          label="Risks"
          value={form.risks}
          previous={null}
          onChange={(v) => update("risks", v)}
          placeholder="New / heightened / mitigated"
        />
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="2. Thesis status"
          caption="One bullet per line."
        />
        <Field label="Stronger" htmlFor="qr-stronger">
          <textarea
            id="qr-stronger"
            value={form.stronger}
            onChange={(e) => update("stronger", e.target.value)}
            rows={3}
            placeholder={"- Pricing power confirmed by 7% ASP\n- Asia ARPU keeps climbing"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Weaker" htmlFor="qr-weaker">
          <textarea
            id="qr-weaker"
            value={form.weaker}
            onChange={(e) => update("weaker", e.target.value)}
            rows={3}
            placeholder={"- Sub adds slowed for the second quarter"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Unchanged" htmlFor="qr-unchanged">
          <textarea
            id="qr-unchanged"
            value={form.unchanged}
            onChange={(e) => update("unchanged", e.target.value)}
            rows={3}
            placeholder={"- Free cash flow conversion remains strong"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="3. Add / hold / sell light"
          caption="Manual call — saving the review also updates the thesis's current light."
        />
        <div className="flex items-center gap-3">
          <span
            aria-label={`Light: ${form.light}`}
            className={cn(
              "inline-block size-3 rounded-full",
              LIGHT_DOT[form.light],
            )}
          />
          <BadgeSelect<Light>
            value={form.light}
            options={LIGHT_OPTIONS}
            onSelect={(next) => update("light", next)}
            ariaLabel={`Light for the ${upper} ${form.quarterLabel || ""} review`}
          >
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary uppercase">
              {form.light}
            </span>
          </BadgeSelect>
        </div>
        <Field label="Why" htmlFor="qr-light-why">
          <textarea
            id="qr-light-why"
            value={form.lightWhy}
            onChange={(e) => update("lightWhy", e.target.value)}
            rows={3}
            placeholder="Short reasoning — green/yellow/red driver."
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="4. Next report watchlist"
          caption="One metric per line. What would change your light?"
        />
        <Field label="Metrics to watch" htmlFor="qr-next-watch">
          <textarea
            id="qr-next-watch"
            value={form.nextReportWatch}
            onChange={(e) => update("nextReportWatch", e.target.value)}
            rows={4}
            placeholder={"- Operating margin reversal\n- Asia ARPU\n- Capex run-rate"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader title="5. Updated view" />
        <Field label="Company quality" htmlFor="qr-quality">
          <textarea
            id="qr-quality"
            value={form.companyQuality}
            onChange={(e) => update("companyQuality", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Valuation" htmlFor="qr-valuation">
          <textarea
            id="qr-valuation"
            value={form.valuation}
            onChange={(e) => update("valuation", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Thesis strength" htmlFor="qr-thesis-strength">
          <textarea
            id="qr-thesis-strength"
            value={form.thesisStrength}
            onChange={(e) => update("thesisStrength", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Averaging-down risk" htmlFor="qr-averaging-down-risk">
          <textarea
            id="qr-averaging-down-risk"
            value={form.averagingDownRisk}
            onChange={(e) => update("averagingDownRisk", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        <Field label="Most important next check" htmlFor="qr-next-check">
          <textarea
            id="qr-next-check"
            value={form.mostImportantNextCheck}
            onChange={(e) => update("mostImportantNextCheck", e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
      </Card>

      {error ? (
        <p role="alert" className="font-body-compact text-body-compact text-regime-risk-off">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save review
        </Button>
      </div>
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

interface DiffFieldProps {
  id: string;
  label: string;
  value: string;
  previous: string | null;
  onChange: (next: string) => void;
  placeholder?: string;
}

function DiffField({ id, label, value, previous, onChange, placeholder }: DiffFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block font-label-caps text-label-caps uppercase text-text-secondary"
      >
        {label}
      </label>
      {previous ? (
        <p className="font-body-compact text-body-compact text-text-secondary italic">
          Last {label.toLowerCase()}: {previous}
        </p>
      ) : null}
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </div>
  );
}
