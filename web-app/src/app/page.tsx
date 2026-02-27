export const dynamic = 'force-static';

import { loadSearchIndex, loadReportMarkdown, parseFrontmatter, extractSection } from "@/lib/reports";
import { adaptMovers, deriveNewsFromMovers } from "@/lib/adapters";
import { Navbar } from "@/components/navbar";
import { HeaderBar } from "@/components/header-bar";
import { MarketPulse } from "@/components/market-pulse";
import { TakeawayPanel } from "@/components/takeaway-panel";
import { DiscussionPanel } from "@/components/discussion-panel";
import { TickerTable } from "@/components/ticker-table";
import { NewsMoversTable } from "@/components/news-movers-table";

export default function DashboardPage() {
  const index = loadSearchIndex();
  const latest = index.items[0];

  if (!latest) {
    return (
      <>
        <Navbar currentPath="/" />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-muted-foreground">No reports available yet.</p>
        </main>
      </>
    );
  }

  const markdown = loadReportMarkdown(latest.date, latest.slot);
  const { meta, body } = markdown
    ? parseFrontmatter(markdown)
    : { meta: {}, body: "" };

  // Extract sections from the markdown body
  const alphaLines = extractSection(body, "## 2) ALPHA").filter(
    (l) => l.trim().startsWith("- ")
  );
  const betaLines = extractSection(body, "## 3) BETA").filter(
    (l) => l.trim().startsWith("- ")
  );
  const pulseLines = extractSection(body, "## 5) Unified Action Checklist").filter(
    (l) => l.trim().startsWith("- ")
  );

  const alpha = alphaLines.map((l) => l.replace(/^[-•]\s*/, "").trim());
  const beta = betaLines.map((l) => l.replace(/^[-•]\s*/, "").trim());
  const pulse = pulseLines.map((l) => l.replace(/^[-•]\s*/, "").trim());

  // Discussion
  const discussionLines = extractSection(body, "## 4) Agent Discussion");
  const parseDiscussionField = (label: string) => {
    const line = discussionLines.find((l) => l.includes(label));
    return line ? line.replace(/.*\*\*[^*]+\*\*:\s*/, "").trim() : "";
  };
  const agreement = parseDiscussionField("Agreement");
  const disagreement = parseDiscussionField("Disagreement");
  const resolution = parseDiscussionField("Resolution");

  // Movers — sourced from search index item (parsed from GAMMA table)
  const rawMovers = (latest as unknown as { movers?: unknown[] }).movers ?? [];
  const movers = adaptMovers(rawMovers);
  const newsRows = deriveNewsFromMovers(rawMovers);

  const regime = (meta.regime as string) || latest.regime || "Neutral";
  const summary = (meta.summary as string) || latest.summary || "";
  const posture = beta[0] ?? "";

  return (
    <>
      <Navbar currentPath="/" />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <HeaderBar date={latest.date} slot={latest.slot} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MarketPulse regime={regime} summary={summary} pulse={pulse} />
          <TakeawayPanel summary={summary} posture={posture} />
        </div>

        <DiscussionPanel
          alpha={alpha}
          beta={beta}
          agreement={agreement}
          disagreement={disagreement}
          resolution={resolution}
        />

        <TickerTable movers={movers} />

        <NewsMoversTable rows={newsRows} />
      </main>
    </>
  );
}
