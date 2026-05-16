"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/stitch";
import { cn } from "@/lib/utils";

/**
 * SPEC-023 W8.I — collapsible reference panel on `/research`.
 *
 * Two sections:
 *   1. Source hierarchy (framework §3) — what to trust, in order.
 *   2. Valuation methods (framework §6) — the 7 metrics table + 5 core questions.
 *
 * Both default to collapsed; tables are content-only (no logic).
 */
export function ResearchHelp() {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-card-padding space-y-4">
      <SectionHeader
        title="Reference"
        caption="Pinned framework excerpts — open the sections you need while writing a thesis."
      />
      <SourceHierarchySection />
      <ValuationMethodsSection />
    </div>
  );
}

function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border-subtle bg-surface-variant">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-elevated/60 transition-colors rounded-md"
      >
        {open ? (
          <ChevronDown className="size-4 text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 text-text-secondary" aria-hidden="true" />
        )}
        <span className="font-label-caps text-label-caps uppercase text-text-primary">
          {title}
        </span>
      </button>
      {open ? (
        <div className="border-t border-border-subtle px-3 py-3 space-y-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

interface TableRow3 {
  cells: [string, string, string];
}

function ReferenceTable({
  headers,
  rows,
  alignLastRight = false,
}: {
  headers: [string, string, string];
  rows: TableRow3[];
  alignLastRight?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle">
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "py-1.5 px-2 text-left font-label-caps text-label-caps uppercase text-text-secondary",
                  alignLastRight && i === headers.length - 1 ? "text-right" : "",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border-subtle/40 last:border-b-0">
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={cn(
                    "py-1.5 px-2 font-body-compact text-body-compact text-text-primary align-top",
                    alignLastRight && i === row.cells.length - 1 ? "text-right" : "",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// — §3 Source hierarchy ——————————————————————————————————————————————————
const SOURCE_ROWS: TableRow3[] = [
  {
    cells: [
      "Annual report / 10-K / 10-Q",
      "Financial facts, risks, official strategy",
      "High",
    ],
  },
  {
    cells: [
      "Investor letter / earnings call",
      "Management guidance and roadmap",
      "High",
    ],
  },
  {
    cells: [
      "Official macro data",
      "Inflation, rates, consumer trends",
      "High",
    ],
  },
  {
    cells: [
      "Reputable financial data",
      "Price, market cap, multiples, estimates",
      "Medium-high",
    ],
  },
  {
    cells: [
      "Industry research",
      "Market share, TAM, category growth",
      "Medium",
    ],
  },
  {
    cells: [
      "News",
      "Recent catalysts and events",
      "Medium",
    ],
  },
  {
    cells: [
      "Reddit / forums",
      "Sentiment, bull/bear arguments, crowd narratives",
      "Low-medium",
    ],
  },
];

function SourceHierarchySection() {
  return (
    <Disclosure title="Source hierarchy (§3)">
      <p className="font-body-compact text-body-compact text-text-secondary">
        Use better sources for stronger claims.
      </p>
      <ReferenceTable
        headers={["Source type", "Best use", "Trust level"]}
        rows={SOURCE_ROWS}
        alignLastRight
      />
      <p className="font-body-compact text-body-compact text-text-secondary italic">
        Reddit and forums are useful for discovering arguments, but not enough
        for factual proof.
      </p>
    </Disclosure>
  );
}

// — §6 Valuation methods ——————————————————————————————————————————————————
const VALUATION_ROWS: TableRow3[] = [
  {
    cells: [
      "P/E",
      "Profitable companies",
      "Can look cheap if earnings are temporarily high",
    ],
  },
  {
    cells: [
      "Forward P/E",
      "Expected earnings",
      "Depends on analyst estimates",
    ],
  },
  {
    cells: [
      "EV/EBITDA",
      "Mature operating businesses",
      "Can ignore capex / content economics",
    ],
  },
  {
    cells: [
      "Price / free cash flow",
      "Cash generation",
      "Distorted by timing and one-offs",
    ],
  },
  {
    cells: [
      "EV/sales",
      "High-growth companies",
      "Dangerous if margins disappoint",
    ],
  },
  {
    cells: [
      "DCF",
      "Long-term cash flow",
      "Very sensitive to assumptions",
    ],
  },
  {
    cells: [
      "Reverse DCF",
      "What price implies",
      "Depends on chosen assumptions",
    ],
  },
];

const CORE_VALUATION_QUESTIONS = [
  "What revenue growth is the current price assuming?",
  "What margin is the current price assuming?",
  "What multiple must the market keep paying?",
  "What happens if the company performs well but the multiple compresses?",
  "Is the stock cheap, fair, or simply high quality?",
];

function ValuationMethodsSection() {
  return (
    <Disclosure title="Valuation methods (§6)">
      <p className="font-body-compact text-body-compact text-text-secondary">
        Use more than one metric.
      </p>
      <ReferenceTable
        headers={["Metric", "Best for", "Watch out for"]}
        rows={VALUATION_ROWS}
      />
      <div className="space-y-1.5 pt-1">
        <h4 className="font-label-caps text-label-caps uppercase text-text-secondary">
          Core valuation questions
        </h4>
        <ul className="list-disc list-inside marker:text-text-secondary space-y-0.5">
          {CORE_VALUATION_QUESTIONS.map((q, i) => (
            <li
              key={i}
              className="font-body-compact text-body-compact text-text-primary"
            >
              {q}
            </li>
          ))}
        </ul>
      </div>
    </Disclosure>
  );
}
