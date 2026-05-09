import * as React from "react";

import { cn } from "@/lib/utils";
import { TickerCell } from "./ticker-cell";

interface MoverRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  ticker: string;
  name?: string;
  /** Display price. Numbers are formatted with $ prefix and 2 decimals. Strings pass through. */
  price?: string | number;
  /** Percent change, signed. Determines colour and sign-prefixed display. */
  pct: number;
}

function formatPrice(price: string | number | undefined): string | null {
  if (price === undefined) return null;
  if (typeof price === "number") return `$${price.toFixed(2)}`;
  return price;
}

export function MoverRow({ className, ticker, name, price, pct, ...props }: MoverRowProps) {
  const colorClass =
    pct > 0
      ? "text-regime-risk-on"
      : pct < 0
        ? "text-regime-risk-off"
        : "text-regime-neutral";
  const pctText = `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
  const priceText = formatPrice(price);

  return (
    <div
      data-slot="mover-row"
      className={cn(
        "flex justify-between items-center p-3 bg-surface-variant/50 rounded-lg border border-border-subtle/50 hover:bg-surface-variant/70 transition-colors",
        className,
      )}
      {...props}
    >
      <TickerCell variant="withLetters" symbol={ticker} name={name} />
      <div className="text-right shrink-0">
        {priceText ? (
          <div className="font-data-mono text-data-mono text-text-primary">{priceText}</div>
        ) : null}
        <div className={cn("font-data-mono text-xs", colorClass)}>{pctText}</div>
      </div>
    </div>
  );
}
