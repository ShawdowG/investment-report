/**
 * SPEC-028 W12.A — guided wizard step metadata.
 *
 * Each step mirrors a section of `docs/research-framework.md` and exposes:
 *   - title / framework anchor / one-paragraph prompt for the header
 *   - an `isComplete(thesis)` predicate driving the progress bar
 *
 * Predicates are deliberately lenient — the wizard nudges, it does not gate.
 * If the user wants to skip a step, they can. The bar just shows "you have
 * plenty here" rather than green-lighting any minimum bar of rigor.
 */

import type { Thesis } from "@/lib/domain/thesis";

export type WizardStepId =
  | "setup"
  | "thesisPoints"
  | "classify"
  | "fundamentals"
  | "marketPosition"
  | "valuation"
  | "scenarios"
  | "tradePlan"
  | "lightChecklists";

export interface WizardStepMeta {
  id: WizardStepId;
  /** Short display title for the header + progress bar tooltip. */
  title: string;
  /** Section anchor in docs/research-framework.md, e.g. "§1" or "§4". */
  frameworkSection: string;
  /** One-paragraph framework-derived prompt rendered under the title. */
  prompt: string;
  /** Tests whether the thesis is "complete enough" at this step. */
  isComplete: (thesis: Thesis) => boolean;
}

/** Count of non-empty entries in a string array (after trimming). */
function nonEmpty(values: readonly string[]): number {
  let n = 0;
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) n += 1;
  }
  return n;
}

/** Count of non-empty string fields on a record (after trimming). */
function filledStringFields(record: object): number {
  let n = 0;
  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim().length > 0) n += 1;
  }
  return n;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    id: "setup",
    title: "Setup",
    frameworkSection: "§1",
    prompt:
      "Snapshot the position and intent. What is the ticker, your time horizon, and what are you planning to do — hold, add, trim, sell, or just watch? This frames every other step.",
    isComplete: (t) =>
      !!t.plannedAction &&
      typeof t.timeHorizon === "string" &&
      t.timeHorizon.trim().length > 0,
  },
  {
    id: "thesisPoints",
    title: "Thesis points",
    frameworkSection: "§1",
    prompt:
      "Write down what you believe the market is underestimating, what you have personally observed, why this company can win, and which concerns or questions you still have. Aim for 3-5 sharp bullets.",
    isComplete: (t) => t.thesisPoints.length >= 1,
  },
  {
    id: "classify",
    title: "Classify",
    frameworkSection: "§2",
    prompt:
      "Restate each thesis point and tag it as a core driver, optional upside, valuation claim, or risk. Core drivers must justify the valuation on their own; optional drivers can improve the upside but should not carry the case.",
    isComplete: (t) => {
      // Empty thesis can't be "classified" — fail the step until points exist.
      if (t.thesisPoints.length === 0) return false;
      return t.classifiedPoints.length >= t.thesisPoints.length;
    },
  },
  {
    id: "fundamentals",
    title: "Fundamentals",
    frameworkSection: "§4",
    prompt:
      "Did the business get weaker, or did only the stock price fall? Walk the seven framework rows — revenue growth, margins, free cash flow, balance sheet, segment/region growth, guidance, and capital allocation — and note what stands out this quarter.",
    isComplete: (t) => filledStringFields(t.fundamentals) >= 3,
  },
  {
    id: "marketPosition",
    title: "Market position",
    frameworkSection: "§5",
    prompt:
      "What market is the company really competing in? What does it dominate today, is that durable, and what new markets or product lines could expand the opportunity? Separate the core growth drivers from the optional upside drivers.",
    isComplete: (t) =>
      filledStringFields(t.marketPosition) >= 2 || t.coreDrivers.length > 0,
  },
  {
    id: "valuation",
    title: "Valuation",
    frameworkSection: "§6",
    prompt:
      "What does the current price assume — what growth, what margin, what multiple? Use more than one metric, and call out what happens if the company performs but the multiple compresses.",
    isComplete: (t) => filledStringFields(t.valuation) >= 2,
  },
  {
    id: "scenarios",
    title: "Scenarios",
    frameworkSection: "§7",
    prompt:
      "Avoid one price target — sketch worst, bear, base, better, and moonshot cases with business + valuation assumptions. What would make the stock fall 50%, and what would make it compound for years?",
    isComplete: (t) => {
      let withTarget = 0;
      for (const s of t.scenarios) {
        if (typeof s.priceTarget === "number" && Number.isFinite(s.priceTarget)) {
          withTarget += 1;
        }
      }
      return withTarget >= 3;
    },
  },
  {
    id: "tradePlan",
    title: "Trade plan",
    frameworkSection: "§1",
    prompt:
      "Translate the thesis into a buying plan. Three add levels and a maximum position size keep position sizing honest when the price gives you a chance to add.",
    isComplete: (t) => {
      const hasAdd = t.tradeLevels.some(
        (lvl) =>
          lvl.kind === "add" &&
          typeof lvl.price === "number" &&
          Number.isFinite(lvl.price) &&
          lvl.price > 0,
      );
      const hasMax =
        typeof t.maxPositionSize === "number" &&
        Number.isFinite(t.maxPositionSize) &&
        t.maxPositionSize > 0;
      return hasAdd || hasMax;
    },
  },
  {
    id: "lightChecklists",
    title: "Light + checklists",
    frameworkSection: "§8",
    prompt:
      "Set the current light (green / yellow / red) and run through the framework's four checklists — most of green to add, slow down on yellow, stop and re-underwrite on red, trim or sell when valuation runs ahead of the thesis.",
    isComplete: (t) => {
      let ticked = 0;
      for (const group of [t.greenChecks, t.yellowChecks, t.redChecks, t.trimSellChecks]) {
        for (const v of group) {
          if (v) ticked += 1;
        }
      }
      // Touch nonEmpty so it stays available for future predicate tuning.
      void nonEmpty;
      return ticked >= 3;
    },
  },
];

/**
 * Find the first incomplete step, or the last step when everything is done.
 * Used to drop the user back into Guided mode on the step that still needs
 * attention.
 */
export function findResumeStep(thesis: Thesis): WizardStepId {
  for (const step of WIZARD_STEPS) {
    if (!step.isComplete(thesis)) return step.id;
  }
  return WIZARD_STEPS[WIZARD_STEPS.length - 1].id;
}
