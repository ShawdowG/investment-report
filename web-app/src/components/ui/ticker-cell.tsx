import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const tickerCellVariants = cva("flex items-center gap-3 min-w-0", {
  variants: {
    variant: {
      compact: "",
      withLetters: "",
    },
  },
  defaultVariants: { variant: "compact" },
});

interface TickerCellProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof tickerCellVariants> {
  symbol: string;
  name?: string;
}

export function TickerCell({
  className,
  variant,
  symbol,
  name,
  ...props
}: TickerCellProps) {
  const letters = symbol.slice(0, 2).toUpperCase();
  return (
    <div
      data-slot="ticker-cell"
      data-variant={variant ?? "compact"}
      className={cn(tickerCellVariants({ variant }), className)}
      {...props}
    >
      {variant === "withLetters" ? (
        <div
          aria-hidden="true"
          className="size-8 rounded bg-surface-elevated flex items-center justify-center font-label-caps text-label-caps text-text-primary shrink-0"
        >
          {letters}
        </div>
      ) : null}
      <div className="min-w-0 flex flex-col">
        <span className="font-data-mono text-data-mono text-text-primary truncate">
          {symbol}
        </span>
        {name ? (
          <span className="font-body-compact text-text-secondary text-[11px] leading-tight truncate">
            {name}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export { tickerCellVariants };
