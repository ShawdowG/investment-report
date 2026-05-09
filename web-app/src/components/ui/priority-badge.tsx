import * as React from "react";
import { ChevronDown, ChevronsUp, Minus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const priorityVariants = cva(
  "inline-flex items-center gap-1 font-badge text-badge",
  {
    variants: {
      priority: {
        high: "text-error",
        med: "text-regime-neutral",
        low: "text-text-secondary",
      },
    },
    defaultVariants: {
      priority: "med",
    },
  },
);

const PRIORITY_LABELS = { high: "High", med: "Med", low: "Low" } as const;

const PRIORITY_ICONS = {
  high: ChevronsUp,
  med: Minus,
  low: ChevronDown,
} as const;

interface PriorityBadgeProps
  extends Omit<React.ComponentProps<"span">, "children">,
    VariantProps<typeof priorityVariants> {
  label?: string;
}

export function PriorityBadge({
  className,
  priority,
  label,
  ...props
}: PriorityBadgeProps) {
  const key = priority ?? "med";
  const Icon = PRIORITY_ICONS[key];
  const resolvedLabel = label ?? PRIORITY_LABELS[key];
  return (
    <span
      data-slot="priority-badge"
      data-priority={priority}
      className={cn(priorityVariants({ priority }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {resolvedLabel}
    </span>
  );
}

export { priorityVariants };
