/**
 * SPEC-023 §5 — `QuarterlyReview` shape. One thesis has many reviews; each
 * captures the framework §9 "quarterly thesis check" template after an
 * earnings report. Saving a review also bumps the parent thesis's
 * `currentLight` so the dashboard / watchlist indicators stay fresh.
 */

export { type Light } from "./thesis";
import type { Light } from "./thesis";

export interface QuarterlyReviewChanges {
  revenue?: string;
  margins?: string;
  fcf?: string;
  guidance?: string;
  segmentGrowth?: string;
  productRoadmap?: string;
  risks?: string;
}

export interface QuarterlyReviewThesisStatus {
  stronger: string[];
  weaker: string[];
  unchanged: string[];
}

export interface QuarterlyReviewUpdatedView {
  companyQuality?: string;
  valuation?: string;
  thesisStrength?: string;
  averagingDownRisk?: string;
  mostImportantNextCheck?: string;
}

export interface QuarterlyReview {
  id: string;
  thesisSymbol: string; // uppercase symbol, FK → Thesis.symbol
  quarterLabel: string; // e.g. "Q3 2026" or "2026-Q3"
  createdAt: string;
  changes: QuarterlyReviewChanges;
  thesisStatus: QuarterlyReviewThesisStatus;
  light: Light;
  lightWhy: string;
  nextReportWatch: string[];
  updatedView: QuarterlyReviewUpdatedView;
}

export type QuarterlyReviewInput = Omit<QuarterlyReview, "id" | "createdAt">;
