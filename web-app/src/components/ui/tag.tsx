import * as React from "react";

import { cn } from "@/lib/utils";

export function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs text-text-secondary bg-surface-variant border border-border-subtle",
        className,
      )}
      {...props}
    />
  );
}
