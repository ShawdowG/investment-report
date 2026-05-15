"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeader, Tag } from "@/components/ui/stitch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Thesis, TradeLevelKind } from "@/lib/domain/thesis";
import { findCrossedZones } from "@/lib/quotes/zones";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { getTheses } from "@/lib/storage/thesis-store";
import { fmtMoney, fmtPct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface CrossedZonesCardProps {
  snapshots: QuoteSnapshotMap;
  /** Percent window for "near a level" — read from dashboard settings. */
  proximityPct: number;
}

const KIND_LABEL: Record<TradeLevelKind, string> = {
  add: "Add",
  trim: "Trim",
  sell: "Sell",
};

const KIND_TONE: Record<TradeLevelKind, string> = {
  add: "text-regime-risk-on border-regime-risk-on/30 bg-regime-risk-on/10",
  trim: "text-regime-neutral border-regime-neutral/30 bg-regime-neutral/10",
  sell: "text-regime-risk-off border-regime-risk-off/30 bg-regime-risk-off/10",
};

export function CrossedZonesCard({
  snapshots,
  proximityPct,
}: CrossedZonesCardProps) {
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = getTheses();
    setTheses(Object.values(map));
    setReady(true);
  }, []);

  const hasAnyLevels = useMemo(
    () => theses.some((t) => t.tradeLevels.length > 0),
    [theses],
  );

  const zones = useMemo(
    () => findCrossedZones(theses, snapshots, proximityPct),
    [theses, snapshots, proximityPct],
  );

  if (!ready) {
    return null;
  }

  // Not-yet state: nothing rendered until the user has at least one thesis
  // with a defined trade level.
  if (!hasAnyLevels) {
    return null;
  }

  return (
    <Card className="p-card-padding gap-4">
      <SectionHeader
        title="Crossed thesis zones"
        caption={`Tickers within ±${proximityPct}% of a trade level you defined`}
      />
      {zones.length === 0 ? (
        <p className="font-body-compact text-body-compact text-text-secondary">
          No thesis levels are within ±{proximityPct}% of today's close.
        </p>
      ) : (
        <div className="rounded-lg border border-border-subtle">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                  Symbol
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
                  Zone
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Level
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Now
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Δ vs level
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone, idx) => {
                const snap = snapshots[zone.symbol];
                const currency = snap?.currency ?? "USD";
                const trancheSuffix =
                  zone.level.kind !== "sell" && zone.level.level
                    ? ` L${zone.level.level}`
                    : "";
                const tone = KIND_TONE[zone.level.kind];
                const distanceColor =
                  zone.distancePct > 0
                    ? "text-regime-risk-on"
                    : zone.distancePct < 0
                      ? "text-regime-risk-off"
                      : "text-text-secondary";
                return (
                  <TableRow key={`${zone.symbol}-${zone.level.kind}-${zone.level.price}-${idx}`}>
                    <TableCell>
                      <Link
                        href={`/research/thesis/${encodeURIComponent(zone.symbol)}`}
                        className="font-data-mono text-data-mono text-text-primary hover:text-primary transition-colors"
                      >
                        {zone.symbol}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Tag className={cn("font-label-caps", tone)}>
                        {KIND_LABEL[zone.level.kind]}
                        {trancheSuffix}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                      {fmtMoney(zone.level.price, currency)}
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                      {fmtMoney(zone.currentPrice, currency)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-data-mono text-data-mono",
                        distanceColor,
                      )}
                    >
                      {fmtPct(zone.distancePct)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
