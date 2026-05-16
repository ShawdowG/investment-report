"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/stitch";
import type { Thesis } from "@/lib/domain/thesis";
import { buildChatGPTPrompt } from "@/lib/research/thesis-markdown";
import { cn } from "@/lib/utils";

interface ResearchHelpersProps {
  symbol: string;
  /**
   * Existing saved thesis — used by the "Open ChatGPT" button to build the
   * prompt. Null when the user is on a fresh thesis (the button stays
   * disabled until the user saves at least once).
   */
  thesis: Thesis | null;
  /**
   * Company name from `CompanyInfo.name` — feeds the Macrotrends slug so the
   * external link lands on the right per-ticker page instead of bouncing
   * through Google. Optional; falls back to Google search when absent.
   */
  companyName?: string;
  /** Whether the panel renders open on first mount. */
  defaultOpen?: boolean;
}

/**
 * SPEC-029 Layer B — Research helpers panel rendered above the thesis form.
 *
 * After SPEC-030 W14.D this panel only carries the external research link
 * grid + the Copy-to-ChatGPT button; the company description, valuation
 * tables, profitability, analyst, calendar, and news sections moved into
 * <StockOverview> at the top of the page.
 *
 * The whole panel stays collapsible — open by default for new theses,
 * collapsed for existing ones (controlled by the caller via `defaultOpen`).
 */
export function ResearchHelpers({
  symbol,
  thesis,
  companyName,
  defaultOpen = false,
}: ResearchHelpersProps) {
  const [open, setOpen] = useState(defaultOpen);
  const upper = symbol.toUpperCase();

  return (
    <Card className="p-card-padding gap-3">
      <SectionHeader
        title={
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 text-left transition-colors hover:text-text-primary"
          >
            <ChevronDown
              className={cn(
                "size-4 text-text-secondary transition-transform",
                open ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden="true"
            />
            Research helpers
          </button>
        }
        caption={
          open
            ? "External research sources and a Copy-to-ChatGPT shortcut for the saved thesis."
            : undefined
        }
      />
      {open ? (
        <div className="space-y-4">
          <ExternalLinksSection
            symbol={upper}
            thesis={thesis}
            companyName={companyName}
          />
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// External research links sub-section (W13.D)
// ---------------------------------------------------------------------------

interface ExternalLinkSpec {
  label: string;
  href: string;
}

/**
 * Macrotrends per-ticker URLs need a kebab-case company slug (e.g. `apple`
 * for AAPL). Derive it from the company name we now capture on
 * `CompanyInfo.name`. Drops legal suffixes ("Inc.", "Corp.", etc.) and
 * collapses whitespace + punctuation to single hyphens. Returns undefined
 * when no name is available so we fall back to Google search.
 */
function macroTrendsSlug(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const stripped = name
    .toLowerCase()
    // Drop common legal suffixes so the slug matches Macrotrends's path style.
    .replace(/\b(inc|incorporated|corp|corporation|company|co|ltd|limited|llc|plc|sa|nv|ag|holdings?)\b\.?/g, "")
    .replace(/[,.&]/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stripped.length > 0 ? stripped : undefined;
}

function buildExternalLinks(
  symbol: string,
  companyName: string | undefined,
): ExternalLinkSpec[] {
  const encoded = encodeURIComponent(`${symbol} stock news`);
  const macroSlug = macroTrendsSlug(companyName);
  const macroHref = macroSlug
    ? `https://www.macrotrends.net/stocks/charts/${symbol}/${macroSlug}/financial-statements`
    : `https://www.google.com/search?q=${encodeURIComponent(`macrotrends ${symbol}`)}`;
  return [
    { label: "Yahoo Finance", href: `https://finance.yahoo.com/quote/${symbol}` },
    {
      label: "Yahoo Stats",
      href: `https://finance.yahoo.com/quote/${symbol}/key-statistics`,
    },
    {
      label: "SEC EDGAR 10-K",
      href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-K&dateb=&owner=include&count=40`,
    },
    { label: "Macrotrends", href: macroHref },
    {
      label: "Seeking Alpha",
      href: `https://seekingalpha.com/symbol/${symbol}`,
    },
    {
      label: "Google Finance",
      href: `https://www.google.com/finance/quote/${symbol}`,
    },
    {
      label: "Google News",
      href: `https://www.google.com/search?q=${encoded}&tbm=nws`,
    },
    { label: "Stocktwits", href: `https://stocktwits.com/symbol/${symbol}` },
  ];
}

function ExternalLinksSection({
  symbol,
  thesis,
  companyName,
}: {
  symbol: string;
  thesis: Thesis | null;
  companyName?: string;
}) {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Match the existing "Saved" pulse pattern from thesis-form: auto-dismiss
  // the confirmation after a short window so the user sees confirmation but
  // the UI doesn't stay stuck on it.
  useEffect(() => {
    if (copiedAt === null) return;
    const handle = setTimeout(() => setCopiedAt(null), 2500);
    return () => clearTimeout(handle);
  }, [copiedAt]);

  async function handleChatGPT() {
    if (!thesis) return;
    const prompt = buildChatGPTPrompt(thesis);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setCopiedAt(Date.now());
      setCopyError(null);
      window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[research-helpers] copy failed", err);
      }
      setCopyError("Couldn't copy — select the thesis manually.");
    }
  }

  const links = buildExternalLinks(symbol, companyName);

  return (
    <div className="space-y-2">
      <div className="font-label-caps text-label-caps uppercase text-text-secondary">
        External research
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {links.map((link) => (
          <Button
            key={link.label}
            asChild
            variant="outline"
            size="sm"
            className="justify-between"
          >
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span>
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleChatGPT}
          disabled={!thesis}
          aria-label="Copy thesis prompt and open ChatGPT"
          className="justify-between"
          title={
            thesis
              ? "Copy the §10 prompt and open chat.openai.com"
              : "Save your thesis first to enable the ChatGPT prompt"
          }
        >
          <span>Open ChatGPT</span>
          <Sparkles className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {copiedAt !== null ? (
        <p
          role="status"
          aria-live="polite"
          className="font-label-caps text-label-caps uppercase text-regime-risk-on animate-pulse"
        >
          Prompt copied — paste into ChatGPT
        </p>
      ) : copyError ? (
        <p
          role="alert"
          className="font-body-compact text-body-compact text-regime-risk-off"
        >
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
