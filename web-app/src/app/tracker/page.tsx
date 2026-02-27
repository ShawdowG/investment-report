import { loadSearchIndex } from "@/lib/reports";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReportItem } from "@/types/reports";

export const metadata = {
  title: "Tracker — Investment Report",
};

const REGIME_COLORS: Record<string, string> = {
  "risk-on": "bg-green-100 text-green-800 border-green-200",
  "risk-off": "bg-red-100 text-red-800 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  mixed: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

function regimeClass(regime: string): string {
  const key = regime.toLowerCase().replace(/\s+/g, "-");
  return REGIME_COLORS[key] ?? REGIME_COLORS["neutral"];
}

const SLOT_LABELS: Record<string, string> = {
  eu: "EU",
  "us-open": "US Open",
  "pre-close": "Pre-close",
};

function buildTickerFrequency(items: ReportItem[]) {
  const freq: Record<string, { count: number; pctSum: number }> = {};
  for (const item of items) {
    for (const ticker of item.tickers ?? []) {
      if (!freq[ticker]) freq[ticker] = { count: 0, pctSum: 0 };
      freq[ticker].count++;
    }
  }
  return Object.entries(freq)
    .map(([ticker, { count }]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count);
}

export default function TrackerPage() {
  const index = loadSearchIndex();
  const items = index.items;
  const tickerFreq = buildTickerFrequency(items);

  return (
    <>
      <Navbar currentPath="/tracker" />
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Regime history and ticker frequency across all reports.
          </p>
        </div>

        {/* Regime History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Regime History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead className="hidden sm:table-cell">Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell className="font-mono text-xs">{item.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {SLOT_LABELS[item.slot] ?? item.slot}
                    </TableCell>
                    <TableCell>
                      {item.regime ? (
                        <Badge
                          variant="outline"
                          className={cn("text-xs", regimeClass(item.regime))}
                        >
                          {item.regime}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground sm:table-cell">
                      {item.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Ticker Frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ticker Frequency</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickerFreq.map(({ ticker, count }) => (
                  <TableRow key={ticker}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {ticker}
                    </TableCell>
                    <TableCell className="text-right text-xs">{count}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {items.length > 0
                        ? `${((count / items.length) * 100).toFixed(0)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
