import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 rounded font-badge text-badge border",
  {
    variants: {
      status: {
        own: "bg-status-own/10 text-status-own border-status-own/20",
        watching: "bg-status-watching/10 text-status-watching border-status-watching/20",
        research: "bg-surface-elevated text-text-primary border-border-subtle",
        avoid: "bg-status-avoid/10 text-status-avoid border-status-avoid/20",
      },
    },
    defaultVariants: {
      status: "watching",
    },
  },
);

const STATUS_LABELS: Record<NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>, string> = {
  own: "Own",
  watching: "Watching",
  research: "Research",
  avoid: "Avoid",
};

interface StatusBadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

export function StatusBadge({ className, status, label, ...props }: StatusBadgeProps) {
  const resolvedLabel = label ?? STATUS_LABELS[status ?? "watching"];
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {resolvedLabel}
    </span>
  );
}

export { statusBadgeVariants };
