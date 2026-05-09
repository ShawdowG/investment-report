export const dynamic = 'force-static';

import { loadSearchIndex } from "@/lib/reports";
import { adaptMovers, deriveNewsFromMovers } from "@/lib/adapters";
import { AppShell } from "@/components/layout/app-shell";
import { HeaderBar } from "@/components/header-bar";
import { MarketPulse } from "@/components/market-pulse";
import { TakeawayPanel } from "@/components/takeaway-panel";
import { DiscussionPanel } from "@/components/discussion-panel";
import { TickerTable } from "@/components/ticker-table";
import { NewsMoversTable } from "@/components/news-movers-table";
import { TacticalQuickPanel } from "@/components/tactical-quick-panel";
import { WatchlistImpactCard } from "@/components/dashboard/watchlist-impact-card";

const stripBullet = (line: string) => line.replace(/^[-•]\s*/, "").trim();

export default function DashboardPage() {
  const index = loadSearchIndex();
  const latest = index.items[0];

  if (!latest) {
    return (
      <AppShell>
        <p className="text-muted-foreground">No reports available yet.</p>
      </AppShell>
    );
  }

  // SPEC-002 finish: read structured payload, do not re-parse markdown.
  const alpha = (latest.sections?.alpha ?? []).map(stripBullet).filter(Boolean);
  const beta = (latest.sections?.beta ?? []).map(stripBullet).filter(Boolean);
  const checklist = (latest.sections?.checklist ?? latest.sections?.pulse ?? [])
    .map(stripBullet)
    .filter(Boolean);
  const { agreement = "", disagreement = "", resolution = "" } =
    latest.discussion ?? {};

  const movers = adaptMovers(latest.movers ?? []);
  const newsRows = deriveNewsFromMovers(latest.movers ?? []);

  const regime = latest.regime || "Neutral";
  const summary = latest.summary || "";

  return (
    <AppShell>
      <div className="space-y-6">
        <HeaderBar date={latest.date} slot={latest.slot} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MarketPulse regime={regime} summary={summary} pulse={checklist} />
          <TakeawayPanel checklist={checklist} />
        </div>

        <DiscussionPanel
          alpha={alpha}
          beta={beta}
          agreement={agreement}
          disagreement={disagreement}
          resolution={resolution}
        />

        <TacticalQuickPanel beta={beta} resolution={resolution} regime={regime} />

        <TickerTable movers={movers} />

        <NewsMoversTable rows={newsRows} />

        <WatchlistImpactCard latest={latest} />
      </div>
    </AppShell>
  );
}
