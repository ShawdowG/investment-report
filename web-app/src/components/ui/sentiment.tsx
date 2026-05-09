import * as React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sentimentVariants = cva(
  "inline-flex items-center gap-1 font-data-mono text-data-mono",
  {
    variants: {
      sentiment: {
        bullish: "text-regime-risk-on",
        bearish: "text-regime-risk-off",
        neutral: "text-regime-neutral",
      },
    },
    defaultVariants: {
      sentiment: "neutral",
    },
  },
);

const SENTIMENT_LABELS = {
  bullish: "Positive",
  bearish: "Negative",
  neutral: "Neutral",
} as const;

const SENTIMENT_ICONS = {
  bullish: ArrowUp,
  bearish: ArrowDown,
  neutral: Minus,
} as const;

interface SentimentProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof sentimentVariants> {
  label?: string;
}

export function Sentiment({ className, sentiment, label, ...props }: SentimentProps) {
  const key = sentiment ?? "neutral";
  const Icon = SENTIMENT_ICONS[key];
  const resolvedLabel = label ?? SENTIMENT_LABELS[key];
  return (
    <span
      data-slot="sentiment"
      data-sentiment={sentiment}
      className={cn(sentimentVariants({ sentiment }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {resolvedLabel}
    </span>
  );
}

export { sentimentVariants };
