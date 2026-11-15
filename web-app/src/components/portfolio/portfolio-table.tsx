"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioPosition } from "@/lib/domain/portfolio";
import type { PortfolioPnLRow } from "@/lib/quotes/portfolio-pnl";
import { fmtMoney, fmtMoneySigned, fmtPct } from "@/lib/utils/format";
import type { Light } from "@/lib/domain/thesis";
import {
  getAllThesisLights,
  LIGHT_ARIA,
  LIGHT_DOT_CLASS,
} from "@/lib/research/thesis-light";
import { cn } from "@/lib/utils";

export type PortfolioUpdatePatch = Partial<
  Pick<PortfolioPosition, "quantity" | "avgPrice">
>;

interface PortfolioTableProps {
  positions: PortfolioPosition[];
  onRemove: (symbol: string) => void;
  onUpdate?: (symbol: string, patch: PortfolioUpdatePatch) => void;
  /** When provided, renders the full P&L columns. Rows without a matching
   *  snapshot still render cost-basis but show "—" for live values. */
  pnlRows?: PortfolioPnLRow[];
}

function pnlColorClass(n: number): string {
  if (n > 0) return "text-regime-risk-on";
  if (n < 0) return "text-regime-risk-off";
  return "text-text-secondary";
}

interface NumericEditCellProps {
  symbol: string;
  field: "quantity" | "avgPrice";
  value: number;
  display: string;
  ariaLabel: string;
  onUpdate: (symbol: string, patch: PortfolioUpdatePatch) => void;
  className?: string;
}

function NumericEditCell({
  symbol,
  field,
  value,
  display,
  ariaLabel,
  onUpdate,
  className,
}: NumericEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = Number(draft);
    if (Number.isFinite(next) && next > 0 && next !== value) {
      onUpdate(symbol, { [field]: next } as PortfolioUpdatePatch);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        aria-label={ariaLabel}
        className={`w-full rounded border border-border-subtle bg-surface-elevated px-2 py-0.5 text-right font-data-mono text-data-mono text-text-primary outline-none focus:border-text-primary ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      aria-label={`Edit ${ariaLabel}`}
      className={`w-full rounded text-right hover:opacity-80 ${className ?? ""}`}
    >
      {display}
    </button>
  );
}

export function PortfolioTable({
  positions,
  onRemove,
  onUpdate,
  pnlRows,
}: PortfolioTableProps) {
  // SPEC-023 W8.H — single localStorage read for thesis lights across the
  // whole table.
  const [thesisLights, setThesisLights] = useState<Record<string, Light>>({});
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  useEffect(() => {
    setThesisLights(getAllThesisLights());
  }, []);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-subtle bg-surface p-card-padding">
        <h2 className="font-h2 text-h2 text-text-primary">Add your first position</h2>
        <p className="mt-1 font-body-compact text-body-compact text-text-secondary">
          Positions are manual and stay in this browser. Add quantity and average price above to calculate performance.
        </p>
      </div>
    );
  }
  const totalCost = positions.reduce((sum, p) => sum + p.quantity * p.avgPrice, 0);
  const pnlBySymbol = new Map<string, PortfolioPnLRow>(
    (pnlRows ?? []).map((r) => [r.symbol, r]),
  );
  const hasPnL = pnlRows !== undefined;
  const editable = onUpdate !== undefined;

  return (
    <>
    <div className="space-y-3 md:hidden" aria-label="Portfolio positions">
      {positions.map((position) => {
        const pnl = pnlBySymbol.get(position.symbol);
        return (
          <article key={position.symbol} className="rounded-xl border border-border-subtle bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/ticker/${encodeURIComponent(position.symbol)}`}
                  className="inline-flex min-h-11 items-center font-data-mono text-lg font-semibold text-text-primary underline-offset-4 hover:underline"
                >
                  {position.symbol}
                </Link>
                {thesisLights[position.symbol] ? (
                  <Link
                    href={`/research/thesis/${encodeURIComponent(position.symbol)}`}
                    className="ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs text-text-secondary hover:bg-surface-variant hover:text-text-primary"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 rounded-full",
                        LIGHT_DOT_CLASS[thesisLights[position.symbol]],
                      )}
                    />
                    Thesis
                  </Link>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${position.symbol}`}
                onClick={() => setPendingRemove(position.symbol)}
              >
                <X />
              </Button>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs text-text-secondary">Current value</dt>
                <dd className="mt-1 font-data-mono text-text-primary">
                  {pnl ? fmtMoney(pnl.currentValue, pnl.currency) : "Quote unavailable"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">Total P&amp;L</dt>
                <dd className={cn("mt-1 font-data-mono", pnl ? pnlColorClass(pnl.totalPnL) : "text-text-secondary")}>
                  {pnl ? `${fmtMoneySigned(pnl.totalPnL, pnl.currency)} (${fmtPct(pnl.totalPnLPct)})` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">Quantity</dt>
                <dd className="mt-1">
                  {editable && onUpdate ? (
                    <NumericEditCell
                      symbol={position.symbol}
                      field="quantity"
                      value={position.quantity}
                      display={String(position.quantity)}
                      ariaLabel={`Quantity for ${position.symbol}`}
                      onUpdate={onUpdate}
                      className="min-h-11 text-left"
                    />
                  ) : position.quantity}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">Average price</dt>
                <dd className="mt-1">
                  {editable && onUpdate ? (
                    <NumericEditCell
                      symbol={position.symbol}
                      field="avgPrice"
                      value={position.avgPrice}
                      display={fmtMoney(position.avgPrice)}
                      ariaLabel={`Average price for ${position.symbol}`}
                      onUpdate={onUpdate}
                      className="min-h-11 text-left"
                    />
                  ) : fmtMoney(position.avgPrice)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-text-secondary">Tap quantity or average price to edit.</p>
          </article>
        );
      })}
    </div>
    <div className="hidden rounded-lg border border-border-subtle bg-surface overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase">
              Symbol
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Qty
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Avg price
            </TableHead>
            <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
              Total cost
            </TableHead>
            {hasPnL ? (
              <>
                <TableHead className="hidden md:table-cell font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Last close
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Current value
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Total P&L
                </TableHead>
                <TableHead className="font-label-caps text-label-caps text-text-secondary uppercase text-right">
                  Day P&L
                </TableHead>
              </>
            ) : null}
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => {
            const pnl = pnlBySymbol.get(p.symbol);
            return (
              <TableRow key={p.symbol}>
                <TableCell className="font-data-mono text-data-mono text-text-primary">
                  <span className="inline-flex items-center gap-2">
                    {thesisLights[p.symbol] ? (
                      <Link
                        href={`/research/thesis/${encodeURIComponent(p.symbol)}`}
                        aria-label={LIGHT_ARIA[thesisLights[p.symbol]]}
                        className="inline-block size-1.5 rounded-full hover:opacity-80 transition-opacity"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-block size-1.5 rounded-full",
                            LIGHT_DOT_CLASS[thesisLights[p.symbol]],
                          )}
                        />
                      </Link>
                    ) : null}
                    <span>{p.symbol}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                  {editable && onUpdate ? (
                    <NumericEditCell
                      symbol={p.symbol}
                      field="quantity"
                      value={p.quantity}
                      display={String(p.quantity)}
                      ariaLabel={`Quantity for ${p.symbol}`}
                      onUpdate={onUpdate}
                    />
                  ) : (
                    p.quantity
                  )}
                </TableCell>
                <TableCell className="text-right font-data-mono text-data-mono text-text-secondary">
                  {editable && onUpdate ? (
                    <NumericEditCell
                      symbol={p.symbol}
                      field="avgPrice"
                      value={p.avgPrice}
                      display={fmtMoney(p.avgPrice)}
                      ariaLabel={`Average price for ${p.symbol}`}
                      onUpdate={onUpdate}
                    />
                  ) : (
                    fmtMoney(p.avgPrice)
                  )}
                </TableCell>
                <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                  {fmtMoney(p.quantity * p.avgPrice)}
                </TableCell>
                {hasPnL ? (
                  <>
                    <TableCell className="hidden md:table-cell text-right font-data-mono text-data-mono text-text-secondary">
                      {pnl ? fmtMoney(pnl.lastClose, pnl.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-data-mono text-data-mono text-text-primary">
                      {pnl ? fmtMoney(pnl.currentValue, pnl.currency) : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-data-mono text-data-mono ${
                        pnl ? pnlColorClass(pnl.totalPnL) : "text-text-secondary"
                      }`}
                    >
                      {pnl ? (
                        <>
                          <div>{fmtMoneySigned(pnl.totalPnL, pnl.currency)}</div>
                          <div className="text-[11px]">{fmtPct(pnl.totalPnLPct)}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-data-mono text-data-mono ${
                        pnl && pnl.dayPnL !== null
                          ? pnlColorClass(pnl.dayPnL)
                          : "text-text-secondary"
                      }`}
                    >
                      {pnl && pnl.dayPnL !== null ? (
                        <>
                          <div>{fmtMoneySigned(pnl.dayPnL, pnl.currency)}</div>
                          {pnl.dayPnLPct !== null ? (
                            <div className="text-[11px]">{fmtPct(pnl.dayPnLPct)}</div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${p.symbol}`}
                    onClick={() => setPendingRemove(p.symbol)}
                  >
                    <X />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t border-border-subtle px-card-padding py-2 flex justify-between font-body-compact text-body-compact">
        <span className="text-text-secondary">
          {positions.length} position{positions.length === 1 ? "" : "s"}
        </span>
        <span className="text-text-primary font-data-mono">Total cost {fmtMoney(totalCost)}</span>
      </div>
    </div>
    <ConfirmDialog
      open={pendingRemove !== null}
      title={`Remove ${pendingRemove ?? "position"} from the portfolio?`}
      description="This removes the manual holding and its performance calculations. Watchlist, thesis, notes, and research files stay unchanged."
      confirmLabel="Remove position"
      destructive
      onConfirm={() => {
        if (pendingRemove) onRemove(pendingRemove);
        setPendingRemove(null);
      }}
      onCancel={() => setPendingRemove(null)}
    />
    </>
  );
}
