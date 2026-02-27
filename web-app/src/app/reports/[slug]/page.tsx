export const dynamic = 'force-static';

import { notFound } from "next/navigation";
import Link from "next/link";
import { loadSearchIndex, loadReportMarkdown, parseFrontmatter, extractSection } from "@/lib/reports";
import { adaptMovers, deriveNewsFromMovers } from "@/lib/adapters";
import { Navbar } from "@/components/navbar";
import { HeaderBar } from "@/components/header-bar";
import { MarketPulse } from "@/components/market-pulse";
import { TakeawayPanel } from "@/components/takeaway-panel";
import { DiscussionPanel } from "@/components/discussion-panel";
import { TickerTable } from "@/components/ticker-table";
import { NewsMoversTable } from "@/components/news-movers-table";
import { MdRenderer } from "@/components/md-renderer";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const index = loadSearchIndex();
  return index.items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const index = loadSearchIndex();
  const item = index.items.find((i) => i.slug === slug);
  return {
    title: item
      ? `${item.date} ${item.title} — Investment Report`
      : "Report — Investment Report",
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;

  // Derive date and slot from slug: {date}-{slot}
  const slotParts = ["pre-close", "us-open", "eu"];
  let date = "";
  let slot = "";
  for (const s of slotParts) {
    if (slug.endsWith(`-${s}`)) {
      slot = s;
      date = slug.slice(0, slug.length - s.length - 1);
      break;
    }
  }

  if (!date || !slot) notFound();

  const markdown = loadReportMarkdown(date, slot);
  if (!markdown) notFound();

  const { meta, body } = parseFrontmatter(markdown);

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

  const discussionLines = extractSection(body, "## 4) Agent Discussion");
  const parseDiscussionField = (label: string) =>
    (discussionLines.find((l) => l.includes(label)) ?? "")
      .replace(/.*\*\*[^*]+\*\*:\s*/, "")
      .trim();

  const agreement = parseDiscussionField("Agreement");
  const disagreement = parseDiscussionField("Disagreement");
  const resolution = parseDiscussionField("Resolution");

  // Load movers from search index item
  const index = loadSearchIndex();
  const indexItem = index.items.find((i) => i.slug === slug);
  const rawMovers = (indexItem as unknown as { movers?: unknown[] })?.movers ?? [];
  const movers = adaptMovers(rawMovers);
  const newsRows = deriveNewsFromMovers(rawMovers);

  const regime = (meta.regime as string) || "";
  const summary = (meta.summary as string) || "";
  const title = (meta.title as string) || `${date} — ${slot}`;

  // Strip GAMMA section from body for the raw markdown display
  const bodyWithoutGamma = body
    .split("\n")
    .reduce(
      (acc: { lines: string[]; skip: boolean }, line) => {
        if (line.trim().startsWith("## 1) GAMMA")) return { lines: acc.lines, skip: true };
        if (acc.skip && line.trim().startsWith("## ")) return { lines: [...acc.lines, line], skip: false };
        if (!acc.skip) return { lines: [...acc.lines, line], skip: false };
        return acc;
      },
      { lines: [], skip: false }
    )
    .lines.join("\n");

  return (
    <>
      <Navbar currentPath="/reports" />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground">
            Reports
          </Link>
          <span>/</span>
          <span className="text-foreground">{slug}</span>
        </nav>

        <HeaderBar title={title} date={date} slot={slot} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MarketPulse regime={regime} summary={summary} pulse={pulse} />
          <TakeawayPanel checklist={pulse} />
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

        {/* Tickers chip row */}
        {indexItem?.tickers && indexItem.tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {indexItem.tickers.slice(0, 16).map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* Raw markdown body (minus GAMMA table) */}
        <div className="rounded-lg border border-border bg-card p-4">
          <MdRenderer markdown={bodyWithoutGamma} />
        </div>
      </main>
    </>
  );
}
