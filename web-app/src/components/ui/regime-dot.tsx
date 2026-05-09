import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const dotVariants = cva("size-2 rounded-full shrink-0", {
  variants: {
    regime: {
      "risk-on": "bg-regime-risk-on",
      "risk-off": "bg-regime-risk-off",
      neutral: "bg-regime-neutral",
    },
  },
  defaultVariants: {
    regime: "neutral",
  },
});

interface RegimeDotProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof dotVariants> {
  label?: string;
  caption?: string;
}

export function RegimeDot({ className, regime, label, caption, ...props }: RegimeDotProps) {
  return (
    <div
      data-slot="regime-dot"
      data-regime={regime}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <span aria-hidden="true" className={cn(dotVariants({ regime }))} />
      <div className="flex flex-col">
        {label ? (
          <span className="font-body-compact text-body-compact text-text-primary">{label}</span>
        ) : null}
        {caption ? (
          <span className="font-label-caps text-label-caps text-text-secondary">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}

export { dotVariants as regimeDotVariants };
