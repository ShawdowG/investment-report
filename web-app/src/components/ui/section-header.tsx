import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  caption?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionHeader({
  className,
  title,
  caption,
  action,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    >
      <div className="space-y-1">
        <h2 className="font-h2 text-h2 text-text-primary">{title}</h2>
        {caption ? (
          <p className="font-body-compact text-body-compact text-text-secondary">
            {caption}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
