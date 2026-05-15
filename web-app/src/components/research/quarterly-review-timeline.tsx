"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionHeader } from "@/components/ui/stitch";
import { fmtDateTime } from "@/lib/utils/format";
import {
  deleteReview,
  listByThesis,
} from "@/lib/storage/quarterly-review-store";
import type {
  Light,
  QuarterlyReview,
} from "@/lib/domain/quarterly-review";
import { cn } from "@/lib/utils";

interface QuarterlyReviewTimelineProps {
  thesisSymbol: string;
  /** Bumped by the parent when a new review is saved, to trigger a refresh. */
  refreshKey?: number;
}

const LIGHT_DOT: Record<Light, string> = {
  green: "bg-regime-risk-on",
  yellow: "bg-regime-neutral",
  red: "bg-regime-risk-off",
};

function previewWhy(why: string): string {
  const cleaned = why.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 100) return cleaned;
  return cleaned.slice(0, 99).trimEnd() + "…";
}

export function QuarterlyReviewTimeline({
  thesisSymbol,
  refreshKey = 0,
}: QuarterlyReviewTimelineProps) {
  const upper = thesisSymbol.toUpperCase();
  const [items, setItems] = useState<QuarterlyReview[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(listByThesis(upper));
    setHydrated(true);
  }, [upper, refreshKey]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    if (!pendingDelete) return;
    try {
      deleteReview(pendingDelete);
      setItems(listByThesis(upper));
      setPendingDelete(null);
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[quarterly-review] delete failed", err);
      }
      setError("Failed to delete review.");
      setPendingDelete(null);
    }
  }

  if (!hydrated) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding">
        <SectionHeader
          title="Quarterly reviews"
          caption="No reviews yet — add one after each earnings report."
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-card-padding space-y-3">
      <SectionHeader
        title={`Quarterly reviews (${items.length})`}
        caption="Newest first. Click a row to expand."
      />
      {error ? (
        <p role="alert" className="font-body-compact text-body-compact text-regime-risk-off">
          {error}
        </p>
      ) : null}
      <ol className="space-y-2">
        {items.map((review) => {
          const open = expanded.has(review.id);
          return (
            <li
              key={review.id}
              className="rounded-md border border-border-subtle bg-surface-variant"
            >
              <button
                type="button"
                onClick={() => toggle(review.id)}
                aria-expanded={open}
                aria-controls={`qr-body-${review.id}`}
                className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-surface-elevated/60 transition-colors rounded-md"
              >
                {open ? (
                  <ChevronDown className="size-4 mt-0.5 text-text-secondary shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-4 mt-0.5 text-text-secondary shrink-0" aria-hidden="true" />
                )}
                <span
                  aria-label={`Light: ${review.light}`}
                  className={cn(
                    "inline-block size-2.5 rounded-full mt-1.5 shrink-0",
                    LIGHT_DOT[review.light],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-data-mono text-data-mono text-text-primary">
                      {review.quarterLabel}
                    </span>
                    <span className="font-body-compact text-body-compact text-text-secondary">
                      {fmtDateTime(review.createdAt)}
                    </span>
                  </div>
                  {review.lightWhy ? (
                    <p className="font-body-compact text-body-compact text-text-secondary mt-0.5">
                      {previewWhy(review.lightWhy)}
                    </p>
                  ) : null}
                </div>
              </button>
              {open ? (
                <div
                  id={`qr-body-${review.id}`}
                  className="border-t border-border-subtle px-3 py-3 space-y-3"
                >
                  <ReviewSection title="What changed">
                    {review.changes.revenue ? <ReviewLine label="Revenue" value={review.changes.revenue} /> : null}
                    {review.changes.margins ? <ReviewLine label="Margins" value={review.changes.margins} /> : null}
                    {review.changes.fcf ? <ReviewLine label="FCF" value={review.changes.fcf} /> : null}
                    {review.changes.guidance ? <ReviewLine label="Guidance" value={review.changes.guidance} /> : null}
                    {review.changes.segmentGrowth ? <ReviewLine label="Segment growth" value={review.changes.segmentGrowth} /> : null}
                    {review.changes.productRoadmap ? <ReviewLine label="Product / roadmap" value={review.changes.productRoadmap} /> : null}
                    {review.changes.risks ? <ReviewLine label="Risks" value={review.changes.risks} /> : null}
                  </ReviewSection>
                  <ReviewSection title="Thesis status">
                    <BulletList label="Stronger" items={review.thesisStatus.stronger} />
                    <BulletList label="Weaker" items={review.thesisStatus.weaker} />
                    <BulletList label="Unchanged" items={review.thesisStatus.unchanged} />
                  </ReviewSection>
                  {review.lightWhy ? (
                    <ReviewSection title={`Why ${review.light}`}>
                      <p className="font-body-compact text-body-compact text-text-primary whitespace-pre-wrap">
                        {review.lightWhy}
                      </p>
                    </ReviewSection>
                  ) : null}
                  <ReviewSection title="Next report watchlist">
                    <BulletList label="" items={review.nextReportWatch} />
                  </ReviewSection>
                  <ReviewSection title="Updated view">
                    {review.updatedView.companyQuality ? <ReviewLine label="Company quality" value={review.updatedView.companyQuality} /> : null}
                    {review.updatedView.valuation ? <ReviewLine label="Valuation" value={review.updatedView.valuation} /> : null}
                    {review.updatedView.thesisStrength ? <ReviewLine label="Thesis strength" value={review.updatedView.thesisStrength} /> : null}
                    {review.updatedView.averagingDownRisk ? <ReviewLine label="Averaging-down risk" value={review.updatedView.averagingDownRisk} /> : null}
                    {review.updatedView.mostImportantNextCheck ? <ReviewLine label="Most important next check" value={review.updatedView.mostImportantNextCheck} /> : null}
                  </ReviewSection>
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(review.id)}
                      className="text-text-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4 mr-1" aria-hidden="true" />
                      Delete review
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this quarterly review?"
        description="The review entry will be erased from this device. The parent thesis is unchanged."
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  // Render nothing if every child is null/empty — keeps the expanded body tidy.
  const childArray = Array.isArray(children) ? children : [children];
  const hasContent = childArray.some((c) => c !== null && c !== false && c !== undefined);
  if (!hasContent) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="font-label-caps text-label-caps uppercase text-text-secondary">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="font-body-compact text-body-compact text-text-primary">
      <span className="text-text-secondary">{label}: </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="font-body-compact text-body-compact text-text-primary">
      {label ? <span className="text-text-secondary">{label}: </span> : null}
      <ul className="list-disc list-inside marker:text-text-secondary">
        {items.map((item, idx) => (
          <li key={idx} className="whitespace-pre-wrap">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
