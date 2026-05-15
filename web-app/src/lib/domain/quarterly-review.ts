/**
 * SPEC-023 §5 — `QuarterlyReview` shape. One thesis has many reviews; each
 * captures the framework §9 "quarterly thesis check" template after an
 * earnings report. Saving a review also bumps the parent thesis's
 * `currentLight` so the dashboard / watchlist indicators stay fresh.
 *
 * `Light` is defined here (rather than imported from `./thesis`) so W8.F can
 * ship before the W8.B-D batch extends the thesis domain type — see the
 * top-level note in `./thesis.ts`. When the thesis grows a `currentLight`
 * field it will use this same alias.
 */

export type Light = "green" | "yellow" | "red";

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
