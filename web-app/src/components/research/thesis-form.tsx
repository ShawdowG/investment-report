"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  BadgeSelect,
  SectionHeader,
  type BadgeSelectOption,
} from "@/components/ui/stitch";
import {
  deleteThesis,
  getThesis,
  upsertThesis,
} from "@/lib/storage/thesis-store";
import type {
  ClassifiedPointType,
  ClassifiedThesisPoint,
  Concerns,
  FundamentalsSnapshot,
  Light,
  MarketPositionNotes,
  PlannedAction,
  ResearchNote,
  Scenario,
  Thesis,
  TradeLevel,
  ValuationNotes,
} from "@/lib/domain/thesis";
import {
  GREEN_CHECK_COUNT,
  RED_CHECK_COUNT,
  TRIM_SELL_CHECK_COUNT,
  YELLOW_CHECK_COUNT,
  defaultScenarios,
  emptyChecks,
} from "@/lib/domain/thesis";
import { ScenariosEditor } from "@/components/research/scenarios-editor";
import { ThesisChecklists } from "@/components/research/thesis-checklists";
import { ThesisNotes } from "@/components/research/thesis-notes";
import { ThesisView } from "@/components/research/thesis-view";
import { buildPrefill, type ThesisPrefill } from "@/lib/research/thesis-prefill";
import { calcAllAddsTriggered } from "@/lib/research/position-calculator";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { getPortfolio } from "@/lib/storage/portfolio-store";
import { getWatchlist } from "@/lib/storage/watchlist-store";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { cn } from "@/lib/utils";
import { QuarterlyReviewForm } from "./quarterly-review-form";
import { QuarterlyReviewTimeline } from "./quarterly-review-timeline";
import { buildChatGPTPrompt } from "@/lib/research/thesis-markdown";

interface ThesisFormProps {
  symbol: string;
  snapshots: QuoteSnapshotMap;
}

type Mode = "quick" | "deep";
type ViewMode = "view" | "edit";

const STORAGE_ERROR_MESSAGE =
  "Failed to save thesis — your browser storage may be full";

const PLANNED_ACTION_OPTIONS: BadgeSelectOption<PlannedAction>[] = [
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

interface FormState {
  thesisPointsRaw: string;
  add1: string;
  add2: string;
  add3: string;
  maxPositionSize: string;
  plannedAction: PlannedAction | "";
}

function emptyForm(): FormState {
  return {
    thesisPointsRaw: "",
    add1: "",
    add2: "",
    add3: "",
    maxPositionSize: "",
    plannedAction: "",
  };
}

function formFromThesis(thesis: Thesis): FormState {
  const adds = thesis.tradeLevels
    .filter((l) => l.kind === "add")
    .sort((a, b) => (a.level ?? 99) - (b.level ?? 99));
  const byLevel = new Map<number, TradeLevel>();
  adds.forEach((lvl, i) => {
    const level = lvl.level ?? (i + 1);
    byLevel.set(level, lvl);
  });
  return {
    thesisPointsRaw: thesis.thesisPoints.join("\n"),
    add1: byLevel.get(1)?.price?.toString() ?? "",
    add2: byLevel.get(2)?.price?.toString() ?? "",
    add3: byLevel.get(3)?.price?.toString() ?? "",
    maxPositionSize: thesis.maxPositionSize?.toString() ?? "",
    plannedAction: thesis.plannedAction ?? "",
  };
}

function formFromPrefill(prefill: ThesisPrefill): FormState {
  return {
    thesisPointsRaw: "",
    add1: "",
    add2: "",
    add3: "",
    maxPositionSize: "",
    plannedAction: prefill.plannedAction ?? "",
  };
}

function parseNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Drop blank strings so we don't persist empty `""` fields to localStorage. */
function compactStrings<T extends object>(obj: T): T {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = value;
    }
  }
  return out as T;
}

/** Split one-bullet-per-line text into a string[], discarding blanks. */
function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.replace(/^\s*[-*]\s*/, "").trim())
    .filter((s) => s.length > 0);
}

function buildTradeLevels(form: FormState): TradeLevel[] {
  const out: TradeLevel[] = [];
  const triples: [string, 1 | 2 | 3][] = [
    [form.add1, 1],
    [form.add2, 2],
    [form.add3, 3],
  ];
  for (const [raw, level] of triples) {
    const price = parseNumber(raw);
    if (price === undefined) continue;
    out.push({ kind: "add", price, level });
  }
  return out;
}

export function ThesisForm({ symbol, snapshots }: ThesisFormProps) {
  const upper = symbol.toUpperCase();
  const snapshot = snapshots[upper];

  const [existing, setExisting] = useState<Thesis | null>(null);
  const [prefill, setPrefill] = useState<ThesisPrefill>({});
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [scenarios, setScenarios] = useState<Scenario[]>(() => defaultScenarios());
  const [light, setLight] = useState<Light>("yellow");
  const [greenChecks, setGreenChecks] = useState<boolean[]>(() => emptyChecks(GREEN_CHECK_COUNT));
  const [yellowChecks, setYellowChecks] = useState<boolean[]>(() => emptyChecks(YELLOW_CHECK_COUNT));
  const [redChecks, setRedChecks] = useState<boolean[]>(() => emptyChecks(RED_CHECK_COUNT));
  const [trimSellChecks, setTrimSellChecks] = useState<boolean[]>(() => emptyChecks(TRIM_SELL_CHECK_COUNT));
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [fundamentals, setFundamentals] = useState<FundamentalsSnapshot>({});
  const [marketPosition, setMarketPosition] = useState<MarketPositionNotes>({});
  const [coreDriversRaw, setCoreDriversRaw] = useState<string>("");
  const [optionalDriversRaw, setOptionalDriversRaw] = useState<string>("");
  const [valuation, setValuation] = useState<ValuationNotes>({});
  const [classifiedPoints, setClassifiedPoints] = useState<ClassifiedThesisPoint[]>([]);
  const [concerns, setConcerns] = useState<Concerns>({});
  const [questionsRaw, setQuestionsRaw] = useState<string>("");
  const [analysisNotes, setAnalysisNotes] = useState<string>("");
  const [mode, setMode] = useState<Mode>("quick");
  // SPEC-023 W8.K — once a thesis has been saved (i.e. `getThesis(symbol)`
  // returned a record on mount) the user lands on a clean read-only view and
  // must opt into editing. Brand-new theses (no stored record) jump straight
  // to the form so the first-save flow is uninterrupted.
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // SPEC-023 W8.F — quarterly review modal state.
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  // SPEC-023 W8.G — Copy-to-ChatGPT pulse.
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  // Initial hydration from localStorage + cross-store prefill.
  useEffect(() => {
    const stored = getThesis(upper);
    if (stored) {
      setExisting(stored);
      setForm(formFromThesis(stored));
      setScenarios(stored.scenarios);
      setLight(stored.currentLight);
      setGreenChecks(stored.greenChecks);
      setYellowChecks(stored.yellowChecks);
      setRedChecks(stored.redChecks);
      setTrimSellChecks(stored.trimSellChecks);
      setNotes(stored.notes);
      setFundamentals(stored.fundamentals);
      setMarketPosition(stored.marketPosition);
      setCoreDriversRaw(stored.coreDrivers.join("\n"));
      setOptionalDriversRaw(stored.optionalDrivers.join("\n"));
      setValuation(stored.valuation);
      setClassifiedPoints(stored.classifiedPoints);
      setConcerns(stored.concerns);
      setQuestionsRaw(stored.questions.join("\n"));
      setAnalysisNotes(stored.analysisNotes ?? "");
      // Existing thesis → default to clean read mode; user clicks "Edit" to
      // re-enter the form. Detected purely by getThesis() returning a record.
      setViewMode("view");
    } else {
      const prefilled = buildPrefill(upper, snapshots, getPortfolio(), getWatchlist());
      setPrefill(prefilled);
      setForm(formFromPrefill(prefilled));
      setScenarios(defaultScenarios());
      setLight("yellow");
      setGreenChecks(emptyChecks(GREEN_CHECK_COUNT));
      setYellowChecks(emptyChecks(YELLOW_CHECK_COUNT));
      setRedChecks(emptyChecks(RED_CHECK_COUNT));
      setTrimSellChecks(emptyChecks(TRIM_SELL_CHECK_COUNT));
      setNotes([]);
      setFundamentals({});
      setMarketPosition({});
      setCoreDriversRaw("");
      setOptionalDriversRaw("");
      setValuation({});
      setClassifiedPoints([]);
      setConcerns({});
      setQuestionsRaw("");
      setAnalysisNotes("");
      // No stored thesis → start in edit mode so the first-save flow is direct.
      setViewMode("edit");
    }
    setHydrated(true);
  }, [upper, snapshots]);

  // Saved-pulse auto-dismiss.
  useEffect(() => {
    if (savedAt === null) return;
    const handle = setTimeout(() => setSavedAt(null), 1500);
    return () => clearTimeout(handle);
  }, [savedAt]);

  // Copy-to-ChatGPT pulse auto-dismiss (slightly longer — the user is on their
  // way to ChatGPT and benefits from a still-visible confirmation).
  useEffect(() => {
    if (copiedAt === null) return;
    const handle = setTimeout(() => setCopiedAt(null), 2500);
    return () => clearTimeout(handle);
  }, [copiedAt]);

  async function handleCopyToChatGPT() {
    if (!existing) return;
    const prompt = buildChatGPTPrompt(existing);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCopiedAt(Date.now());
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[thesis] copy failed", err);
      }
      setError("Couldn't copy to clipboard — try selecting and copying manually.");
    }
  }


  const tradeLevels = useMemo(() => buildTradeLevels(form), [form]);
  const maxPos = parseNumber(form.maxPositionSize);
  const calc = useMemo(
    () => calcAllAddsTriggered(tradeLevels, maxPos),
    [tradeLevels, maxPos],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (error) setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const thesisPoints = form.thesisPointsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const now = new Date().toISOString();
    const cleanFundamentals = compactStrings(fundamentals);
    const cleanMarketPosition = compactStrings(marketPosition);
    const cleanValuation = compactStrings(valuation);
    const cleanConcerns = compactStrings(concerns);
    const coreDrivers = linesToList(coreDriversRaw);
    const optionalDrivers = linesToList(optionalDriversRaw);
    const questions = linesToList(questionsRaw);
    const cleanClassifiedPoints = classifiedPoints.filter(
      (p) => p.point.trim().length > 0,
    );
    const trimmedAnalysisNotes = analysisNotes.trim();

    const next: Thesis = existing
      ? {
          ...existing,
          thesisPoints,
          tradeLevels,
          scenarios,
          currentLight: light,
          greenChecks,
          yellowChecks,
          redChecks,
          trimSellChecks,
          notes,
          fundamentals: cleanFundamentals,
          marketPosition: cleanMarketPosition,
          coreDrivers,
          optionalDrivers,
          valuation: cleanValuation,
          classifiedPoints: cleanClassifiedPoints,
          concerns: cleanConcerns,
          questions,
          updatedAt: now,
        }
      : {
          symbol: upper,
          createdAt: now,
          updatedAt: now,
          thesisPoints,
          concerns: cleanConcerns,
          questions,
          classifiedPoints: cleanClassifiedPoints,
          tradeLevels,
          fundamentals: cleanFundamentals,
          marketPosition: cleanMarketPosition,
          coreDrivers,
          optionalDrivers,
          valuation: cleanValuation,
          scenarios,
          currentLight: light,
          greenChecks,
          yellowChecks,
          redChecks,
          trimSellChecks,
          notes,
        };

    if (maxPos !== undefined) next.maxPositionSize = maxPos;
    else delete next.maxPositionSize;
    if (form.plannedAction) next.plannedAction = form.plannedAction;
    else delete next.plannedAction;
    if (trimmedAnalysisNotes) next.analysisNotes = analysisNotes;
    else delete next.analysisNotes;

    // First-save: capture the prefill values that no longer have a home in the
    // quick-start form (price-at-creation, avgEntry/positionSize from portfolio).
    if (!existing) {
      if (prefill.currentPriceAtCreation !== undefined) {
        next.currentPriceAtCreation = prefill.currentPriceAtCreation;
      }
      if (prefill.avgEntryPrice !== undefined) {
        next.avgEntryPrice = prefill.avgEntryPrice;
      }
      if (prefill.positionSize !== undefined) {
        next.positionSize = prefill.positionSize;
      }
    }

    try {
      const saved = upsertThesis(next);
      setExisting(saved);
      setForm(formFromThesis(saved));
      setScenarios(saved.scenarios);
      setLight(saved.currentLight);
      setGreenChecks(saved.greenChecks);
      setYellowChecks(saved.yellowChecks);
      setRedChecks(saved.redChecks);
      setTrimSellChecks(saved.trimSellChecks);
      setNotes(saved.notes);
      setFundamentals(saved.fundamentals);
      setMarketPosition(saved.marketPosition);
      setCoreDriversRaw(saved.coreDrivers.join("\n"));
      setOptionalDriversRaw(saved.optionalDrivers.join("\n"));
      setValuation(saved.valuation);
      setClassifiedPoints(saved.classifiedPoints);
      setConcerns(saved.concerns);
      setQuestionsRaw(saved.questions.join("\n"));
      setAnalysisNotes(saved.analysisNotes ?? "");
      setSavedAt(Date.now());
      setError(null);
      // SPEC-023 W8.K — flip to read mode after a successful save so the user
      // immediately sees the clean rendered thesis. They can click "Edit" to
      // come back.
      setViewMode("view");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[thesis] save failed", err);
      }
      setError(STORAGE_ERROR_MESSAGE);
    }
  }

  function handleDelete() {
    try {
      deleteThesis(upper);
      setExisting(null);
      const prefilled = buildPrefill(upper, snapshots, getPortfolio(), getWatchlist());
      setPrefill(prefilled);
      setForm(formFromPrefill(prefilled));
      setScenarios(defaultScenarios());
      setLight("yellow");
      setGreenChecks(emptyChecks(GREEN_CHECK_COUNT));
      setYellowChecks(emptyChecks(YELLOW_CHECK_COUNT));
      setRedChecks(emptyChecks(RED_CHECK_COUNT));
      setTrimSellChecks(emptyChecks(TRIM_SELL_CHECK_COUNT));
      setNotes([]);
      setFundamentals({});
      setMarketPosition({});
      setCoreDriversRaw("");
      setOptionalDriversRaw("");
      setValuation({});
      setClassifiedPoints([]);
      setConcerns({});
      setQuestionsRaw("");
      setAnalysisNotes("");
      setConfirmDelete(false);
      setSavedAt(null);
      setError(null);
      // After deletion the symbol has no stored thesis again — same starting
      // state as a brand-new thesis flow.
      setViewMode("edit");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[thesis] delete failed", err);
      }
      setError("Failed to delete thesis.");
      setConfirmDelete(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-card-padding font-body-compact text-body-compact text-text-secondary">
        Loading thesis…
      </div>
    );
  }

  // SPEC-023 W8.K — show clean read mode for a saved thesis. The quarterly
  // review timeline still belongs underneath so the user can add a review
  // without flipping back into edit mode.
  if (viewMode === "view" && existing) {
    return (
      <div className="space-y-4">
        <ThesisView thesis={existing} onEdit={() => setViewMode("edit")} />
        <div className="space-y-3 pt-2">
          <QuarterlyReviewTimeline
            thesisSymbol={upper}
            refreshKey={reviewRefreshKey}
          />
          {!reviewFormOpen ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewFormOpen(true)}
              >
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Quarterly review
              </Button>
            </div>
          ) : (
            <QuarterlyReviewForm
              thesis={existing}
              thesisSymbol={upper}
              onSaved={(review) => {
                setReviewFormOpen(false);
                setReviewRefreshKey((k) => k + 1);
                const refreshed = getThesis(upper);
                if (refreshed) setExisting(refreshed);
                void review;
              }}
              onCancel={() => setReviewFormOpen(false)}
            />
          )}
        </div>
      </div>
    );
  }

  const calcColor =
    calc.pctOfMax === null
      ? "text-text-secondary"
      : calc.pctOfMax > 100
        ? "text-regime-risk-off"
        : calc.pctOfMax >= 80
          ? "text-regime-neutral"
          : "text-text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-label-caps uppercase text-text-secondary">
            Mode
          </span>
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={cn(
              "rounded-md px-2 py-1 font-body-compact text-body-compact",
              mode === "quick"
                ? "bg-surface-variant text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Quick start
          </button>
          <button
            type="button"
            onClick={() => setMode("deep")}
            className={cn(
              "rounded-md px-2 py-1 font-body-compact text-body-compact",
              mode === "deep"
                ? "bg-surface-variant text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            Deep dive →
          </button>
        </div>
        {copiedAt !== null ? (
          <span
            role="status"
            aria-live="polite"
            className="font-label-caps text-label-caps uppercase text-regime-risk-on animate-pulse"
          >
            Copied — paste into ChatGPT
          </span>
        ) : savedAt !== null ? (
          <span
            role="status"
            aria-live="polite"
            className="font-label-caps text-label-caps uppercase text-regime-risk-on animate-pulse"
          >
            Saved
          </span>
        ) : null}
      </div>

      {mode === "deep" ? (
        <Card className="p-card-padding gap-3">
          <SectionHeader
            title="Deep dive"
            caption="Optional sections mirroring the framework §4–§8. Save anytime — every field is optional."
          />
          <DeepDiveSection
            title="Classification (§2)"
            caption="Group thesis points by type. Core drivers must justify valuation; optional ones improve upside."
          >
            <ClassifiedPointsEditor
              points={classifiedPoints}
              onChange={setClassifiedPoints}
              symbol={upper}
            />
          </DeepDiveSection>
          <DeepDiveSection
            title="Concerns (§1)"
            caption="What might break the thesis? Leave blanks where you have nothing to log."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextAreaField
                label="Valuation"
                value={concerns.valuation ?? ""}
                onChange={(v) => setConcerns((c) => ({ ...c, valuation: v }))}
              />
              <TextAreaField
                label="Competition"
                value={concerns.competition ?? ""}
                onChange={(v) => setConcerns((c) => ({ ...c, competition: v }))}
              />
              <TextAreaField
                label="Macro"
                value={concerns.macro ?? ""}
                onChange={(v) => setConcerns((c) => ({ ...c, macro: v }))}
              />
              <TextAreaField
                label="Execution"
                value={concerns.execution ?? ""}
                onChange={(v) => setConcerns((c) => ({ ...c, execution: v }))}
              />
            </div>
            <TextAreaField
              label="Other"
              value={concerns.other ?? ""}
              onChange={(v) => setConcerns((c) => ({ ...c, other: v }))}
              rows={3}
            />
          </DeepDiveSection>
          <DeepDiveSection
            title="Questions (§1)"
            caption="One question per line — the things you want answered before adding or trimming."
          >
            <TextAreaField
              label="Open questions"
              value={questionsRaw}
              onChange={setQuestionsRaw}
              rows={6}
            />
          </DeepDiveSection>
          <DeepDiveSection
            title="Fundamentals (§4)"
            caption="Quarterly check on the seven framework rows — leave any blank."
            defaultOpen
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextAreaField
                label="Revenue growth"
                helper="Latest quarter, TTM, guidance."
                value={fundamentals.revenueGrowth ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, revenueGrowth: v }))}
              />
              <TextAreaField
                label="Margins"
                helper="Gross / operating / net."
                value={fundamentals.margins ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, margins: v }))}
              />
              <TextAreaField
                label="Free cash flow"
                helper="Reported and normalised."
                value={fundamentals.fcf ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, fcf: v }))}
              />
              <TextAreaField
                label="Balance sheet"
                helper="Net debt, cash, maturities."
                value={fundamentals.balanceSheet ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, balanceSheet: v }))}
              />
              <TextAreaField
                label="Segment / region growth"
                helper="Where the growth is coming from."
                value={fundamentals.segmentGrowth ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, segmentGrowth: v }))}
              />
              <TextAreaField
                label="Guidance"
                helper="Raised, stable, or cut."
                value={fundamentals.guidance ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, guidance: v }))}
              />
              <TextAreaField
                label="Capital allocation"
                helper="Buybacks, M&A, reinvestment."
                value={fundamentals.capitalAllocation ?? ""}
                onChange={(v) => setFundamentals((f) => ({ ...f, capitalAllocation: v }))}
              />
            </div>
          </DeepDiveSection>
          <DeepDiveSection
            title="Market position (§5)"
            caption="Real competition, dominance, durability, new markets."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextAreaField
                label="Real competition"
                helper="Who is the company actually competing against?"
                value={marketPosition.realCompetition ?? ""}
                onChange={(v) =>
                  setMarketPosition((m) => ({ ...m, realCompetition: v }))
                }
              />
              <TextAreaField
                label="Dominance today"
                helper="What does the company own outright?"
                value={marketPosition.dominanceToday ?? ""}
                onChange={(v) =>
                  setMarketPosition((m) => ({ ...m, dominanceToday: v }))
                }
              />
              <TextAreaField
                label="Durability"
                helper="Is the dominance defensible?"
                value={marketPosition.durability ?? ""}
                onChange={(v) =>
                  setMarketPosition((m) => ({ ...m, durability: v }))
                }
              />
              <TextAreaField
                label="New markets"
                helper="Adjacent expansion paths."
                value={marketPosition.newMarkets ?? ""}
                onChange={(v) =>
                  setMarketPosition((m) => ({ ...m, newMarkets: v }))
                }
              />
              <TextAreaField
                label="New areas proven?"
                helper="Proven or still optional?"
                value={marketPosition.newAreasProven ?? ""}
                onChange={(v) =>
                  setMarketPosition((m) => ({ ...m, newAreasProven: v }))
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextAreaField
                label="Core growth drivers"
                helper="One per line — pricing, units, geo, margin, FCF, buybacks."
                value={coreDriversRaw}
                onChange={setCoreDriversRaw}
                rows={5}
              />
              <TextAreaField
                label="Optional upside drivers"
                helper="One per line — new products, AI, live events, partnerships."
                value={optionalDriversRaw}
                onChange={setOptionalDriversRaw}
                rows={5}
              />
            </div>
          </DeepDiveSection>
          <DeepDiveSection
            title="Valuation (§6)"
            caption="Which metrics, what assumptions, what is the price pricing in?"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextAreaField
                label="Metrics tracked"
                helper="e.g. fwd P/E, EV/EBITDA, P/FCF, EV/sales."
                value={valuation.metricsTracked ?? ""}
                onChange={(v) =>
                  setValuation((val) => ({ ...val, metricsTracked: v }))
                }
              />
              <TextAreaField
                label="Growth assumed"
                helper="What revenue growth does the current price imply?"
                value={valuation.growthAssumed ?? ""}
                onChange={(v) =>
                  setValuation((val) => ({ ...val, growthAssumed: v }))
                }
              />
              <TextAreaField
                label="Margin assumed"
                helper="Operating / net margin the multiple bakes in."
                value={valuation.marginAssumed ?? ""}
                onChange={(v) =>
                  setValuation((val) => ({ ...val, marginAssumed: v }))
                }
              />
              <TextAreaField
                label="Multiple assumed"
                helper="What multiple must the market keep paying?"
                value={valuation.multipleAssumed ?? ""}
                onChange={(v) =>
                  setValuation((val) => ({ ...val, multipleAssumed: v }))
                }
              />
            </div>
            <TextAreaField
              label="Notes"
              helper="Cheap / fair / high-quality? What if the multiple compresses?"
              value={valuation.notes ?? ""}
              onChange={(v) => setValuation((val) => ({ ...val, notes: v }))}
              rows={3}
            />
          </DeepDiveSection>
          <DeepDiveSection title="Scenarios (§7)" caption="Five canonical scenarios with optional price targets + probabilities.">
            <ScenariosEditor
              scenarios={scenarios}
              onChange={setScenarios}
              currentPrice={snapshot?.lastClose}
              currency={snapshot?.currency ?? "USD"}
            />
          </DeepDiveSection>
          <DeepDiveSection title="Light + checklists (§8)" caption="Manual green / yellow / red call, plus the framework checklists as inputs.">
            <ThesisChecklists
              light={light}
              onLightChange={setLight}
              greenChecks={greenChecks}
              onGreenChange={setGreenChecks}
              yellowChecks={yellowChecks}
              onYellowChange={setYellowChecks}
              redChecks={redChecks}
              onRedChange={setRedChecks}
              trimSellChecks={trimSellChecks}
              onTrimSellChange={setTrimSellChecks}
            />
          </DeepDiveSection>
          <DeepDiveSection title="Notes" caption="Multiple markdown notes — paste ChatGPT responses, log observations, transcribe calls.">
            <ThesisNotes notes={notes} onChange={setNotes} />
          </DeepDiveSection>
          <DeepDiveSection
            title="Analysis notes (§10)"
            caption="Free-form markdown blob — the ChatGPT round-trip target (W9 will parse this back to structured fields)."
          >
            <TextAreaField
              label="Markdown"
              value={analysisNotes}
              onChange={setAnalysisNotes}
              rows={10}
            />
          </DeepDiveSection>
        </Card>
      ) : null}

      <Card className="p-card-padding gap-4">
        <SectionHeader title="Ticker" />
        <div className="font-data-mono text-h2 text-text-primary">{upper}</div>
        {snapshot ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            Current price snapshot · {fmtMoney(snapshot.lastClose, snapshot.currency)} · as of {snapshot.asOf}
          </p>
        ) : (
          <p className="font-body-compact text-body-compact text-text-secondary">
            No quote available for this symbol — the thesis will still save.
          </p>
        )}
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="My thesis"
          caption="What is the market underestimating? What have you observed? Why can this company win?"
        />
        <Field label="One bullet per line" htmlFor="thesis-points">
          <textarea
            id="thesis-points"
            value={form.thesisPointsRaw}
            onChange={(e) => update("thesisPointsRaw", e.target.value)}
            rows={6}
            aria-required="true"
            placeholder={"- Asia is underpenetrated\n- Pricing power is intact\n- Optional games upside"}
            className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 leading-relaxed"
          />
        </Field>
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader
          title="Buying plan"
          caption="Three add levels and your max position size."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Add level 1 ($)" htmlFor="thesis-add-1">
            <input
              id="thesis-add-1"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add1}
              onChange={(e) => update("add1", e.target.value)}
              placeholder="100.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Add level 2 ($)" htmlFor="thesis-add-2">
            <input
              id="thesis-add-2"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add2}
              onChange={(e) => update("add2", e.target.value)}
              placeholder="85.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="Add level 3 ($)" htmlFor="thesis-add-3">
            <input
              id="thesis-add-3"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.add3}
              onChange={(e) => update("add3", e.target.value)}
              placeholder="70.00"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
        </div>
        <Field label="Maximum position size ($)" htmlFor="thesis-max-pos">
          <input
            id="thesis-max-pos"
            type="number"
            inputMode="decimal"
            step="any"
            value={form.maxPositionSize}
            onChange={(e) => update("maxPositionSize", e.target.value)}
            placeholder="20000"
            className="w-full sm:w-60 rounded-md border border-border-subtle bg-surface-elevated px-3 py-1.5 font-data-mono text-data-mono text-text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </Field>
        {tradeLevels.length > 0 ? (
          <div className={cn("font-body-compact text-body-compact", calcColor)}>
            If all {tradeLevels.length} {tradeLevels.length === 1 ? "add" : "adds"} trigger:{" "}
            <span className="font-data-mono">
              {calc.totalShares.toFixed(calc.totalShares < 10 ? 2 : 0)}{" "}
              {calc.totalShares === 1 ? "share" : "shares"}
            </span>{" "}
            /{" "}
            <span className="font-data-mono">{fmtMoney(calc.totalDollars)}</span>
            {calc.pctOfMax !== null ? (
              <>
                {" "}
                /{" "}
                <span className="font-data-mono">{fmtPct(calc.pctOfMax, 0)} of max</span>
              </>
            ) : null}
            {calc.exceedsMax ? (
              <span className="ml-2 font-label-caps text-label-caps uppercase text-regime-risk-off">
                Exceeds your max position size
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="p-card-padding gap-3">
        <SectionHeader title="Planned action" />
        <div className="flex items-center gap-3">
          <BadgeSelect<PlannedAction | "">
            value={form.plannedAction}
            options={[
              { value: "" as PlannedAction | "", label: "Not set" },
              ...PLANNED_ACTION_OPTIONS,
            ]}
            onSelect={(next) => update("plannedAction", next)}
            ariaLabel={`Planned action for ${upper}`}
          >
            <span className="inline-flex items-center rounded-md border border-border-subtle bg-surface-variant px-2 py-1 font-body-compact text-body-compact text-text-primary">
              {form.plannedAction ? PLANNED_ACTION_LABEL[form.plannedAction] : "Not set"}
            </span>
          </BadgeSelect>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="font-body-compact text-body-compact text-regime-risk-off">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-text-secondary hover:text-destructive"
            >
              <Trash2 className="size-4 mr-1" aria-hidden="true" />
              Delete thesis
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {existing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyToChatGPT}
            >
              Copy to ChatGPT
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            {existing ? "Save thesis" : "Create thesis"}
          </Button>
        </div>
      </div>

      {existing ? (
        <div className="space-y-3 pt-2">
          <QuarterlyReviewTimeline
            thesisSymbol={upper}
            refreshKey={reviewRefreshKey}
          />
          {!reviewFormOpen ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewFormOpen(true)}
              >
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Quarterly review
              </Button>
            </div>
          ) : (
            <QuarterlyReviewForm
              thesis={existing}
              thesisSymbol={upper}
              onSaved={(review) => {
                setReviewFormOpen(false);
                setReviewRefreshKey((k) => k + 1);
                // Pull the latest thesis (light may have been bumped by the review save).
                const refreshed = getThesis(upper);
                if (refreshed) setExisting(refreshed);
                // Suppress unused-var warning for the saved review id.
                void review;
              }}
              onCancel={() => setReviewFormOpen(false)}
            />
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this thesis?"
        description={`Remove the thesis for ${upper}? Any saved bullets, trade levels, and planned action will be erased from this device.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
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
      <label htmlFor={htmlFor} className="block font-label-caps text-label-caps uppercase text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Editable list of classified thesis points (§2). Each row has free-text input
 * for the point, a BadgeSelect for the type (core / optional / valuation /
 * risk), and a `needsProof` checkbox.
 */
function ClassifiedPointsEditor({
  points,
  onChange,
  symbol,
}: {
  points: ClassifiedThesisPoint[];
  onChange: (next: ClassifiedThesisPoint[]) => void;
  symbol: string;
}) {
  function update(idx: number, patch: Partial<ClassifiedThesisPoint>) {
    onChange(points.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function add() {
    onChange([
      ...points,
      { point: "", type: "core", needsProof: false },
    ]);
  }
  function remove(idx: number) {
    onChange(points.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {points.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No classified points yet — add one to separate core drivers from
          optional upside.
        </p>
      ) : null}
      {points.map((p, idx) => (
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
              ariaLabel={`Type for ${symbol} thesis point ${idx + 1}`}
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

/**
 * Free-text textarea field for deep-dive sub-objects. Stable id is derived from
 * the label so screen readers can announce it; helper text appears in the
 * caption row beneath the label.
 */
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
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block font-label-caps text-label-caps uppercase text-text-secondary"
      >
        {label}
      </label>
      {helper ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          {helper}
        </p>
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

/**
 * Collapsible deep-dive subsection. Uses native <details>/<summary> so it
 * doesn't fight the form's submit flow — the open state is purely visual and
 * preserved across renders. `defaultOpen` controls whether the section renders
 * expanded on first mount.
 */
function DeepDiveSection({
  title,
  caption,
  defaultOpen = false,
  children,
}: {
  title: string;
  caption?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-border-subtle bg-surface-elevated"
    >
      <summary className="flex cursor-pointer items-start justify-between gap-3 px-3 py-2 list-none [&::-webkit-details-marker]:hidden">
        <div className="space-y-0.5">
          <span className="block font-label-caps text-label-caps uppercase text-text-primary">
            {title}
          </span>
          {caption ? (
            <span className="block font-body-compact text-body-compact text-text-secondary">
              {caption}
            </span>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 font-data-mono text-body-compact text-text-secondary group-open:rotate-90 transition-transform"
        >
          ▸
        </span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border-subtle">
        {children}
      </div>
    </details>
  );
}
