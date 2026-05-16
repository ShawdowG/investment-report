/**
 * SPEC-026 W10.B — derive the alert list surfaced in the TopBar drawer.
 *
 * Two kinds:
 * - "crossed-zone": a trade level is within `proximityPct` of today's close.
 * - "stale-thesis": the thesis hasn't been updated in `staleAfterDays` days.
 *
 * Both emit a `ThesisAlert` with a human-readable detail + a link to the
 * thesis page. Pure function over (theses, snapshots, settings) so it's
 * trivially unit-testable.
 */

import type { Thesis, TradeLevel } from "@/lib/domain/thesis";
import type { QuoteSnapshotMap } from "@/lib/quotes/snapshots";
import { fmtMoney, fmtPct } from "@/lib/utils/format";

export interface ThesisAlert {
  kind: "crossed-zone" | "stale-thesis";
  symbol: string;
  detail: string;
  href: string;
}

const KIND_LABEL = { add: "Add", trim: "Trim", sell: "Sell" } as const;

function formatLevelLabel(level: TradeLevel): string {
  const tranche =
    level.kind !== "sell" && level.level ? ` L${level.level}` : "";
  return `${KIND_LABEL[level.kind]}${tranche}`;
}

function hrefForSymbol(symbol: string): string {
  return `/research/thesis/${encodeURIComponent(symbol)}`;
}

export function buildAlerts(
  theses: Thesis[],
  snapshots: QuoteSnapshotMap,
  proximityPct: number,
  staleAfterDays: number,
): ThesisAlert[] {
  const out: ThesisAlert[] = [];
  const now = Date.now();
  const staleMs =
    Number.isFinite(staleAfterDays) && staleAfterDays > 0
      ? staleAfterDays * 86_400_000
      : Number.POSITIVE_INFINITY;
  const proximity =
    Number.isFinite(proximityPct) && proximityPct >= 0 ? proximityPct : 0;

  for (const thesis of theses) {
    // Crossed-zone alerts — one per matching level.
    const snap = snapshots[thesis.symbol];
    if (snap && Number.isFinite(snap.lastClose)) {
      const currentPrice = snap.lastClose;
      const currency = snap.currency ?? "USD";
      for (const lvl of thesis.tradeLevels) {
        if (!Number.isFinite(lvl.price) || lvl.price <= 0) continue;
        const distancePct = ((currentPrice - lvl.price) / lvl.price) * 100;
        if (Math.abs(distancePct) <= proximity) {
          const detail = `${formatLevelLabel(lvl)} @ ${fmtMoney(
            lvl.price,
            currency,
          )} — current ${fmtMoney(currentPrice, currency)} (${fmtPct(
            distancePct,
          )})`;
          out.push({
            kind: "crossed-zone",
            symbol: thesis.symbol,
            detail,
            href: hrefForSymbol(thesis.symbol),
          });
        }
      }
    }

    // Stale-thesis alert — one per thesis, regardless of snapshot.
    const updatedTs = new Date(thesis.updatedAt).getTime();
    if (Number.isFinite(updatedTs)) {
      const ageMs = now - updatedTs;
      if (ageMs > staleMs) {
        const days = Math.floor(ageMs / 86_400_000);
        out.push({
          kind: "stale-thesis",
          symbol: thesis.symbol,
          detail: `Last updated ${days} days ago`,
          href: hrefForSymbol(thesis.symbol),
        });
      }
    }
  }

  return out;
}
