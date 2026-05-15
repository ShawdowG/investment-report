export const dynamic = "force-static";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ThesisForm } from "@/components/research/thesis-form";
import { ThesisLiveHeader } from "@/components/research/thesis-live-header";
import { loadAllQuoteSnapshots } from "@/lib/quotes/snapshots";
import { loadCompactDaily } from "@/lib/quotes/compact-daily";
import { listQuoteSymbols } from "@/lib/quotes/load-quote";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return listQuoteSymbols().map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} thesis — Investment Report` };
}

export default async function ThesisPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol).toUpperCase();

  const snapshots = loadAllQuoteSnapshots();
  const compactDaily = loadCompactDaily();
  const snapshot = snapshots[symbol];
  const bars = compactDaily[symbol] ?? [];

  return (
    <AppShell>
      <ThesisLiveHeader symbol={symbol} snapshot={snapshot} compactDaily={bars} />
      <div className="space-y-6 pt-4">
        <header className="space-y-1">
          <Link
            href="/research"
            className="font-body-compact text-body-compact text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Research
          </Link>
          <h1 className="font-h1 text-h1 text-text-primary">
            {symbol} thesis
          </h1>
          <p className="font-body-compact text-body-compact text-text-secondary">
            Capture the §1 input snapshot, your thesis bullets, and the trade
            plan. Deep-dive sections (fundamentals, scenarios, light) ship in
            W8.B-L.
          </p>
        </header>
        <ThesisForm symbol={symbol} snapshots={snapshots} />
      </div>
    </AppShell>
  );
}
