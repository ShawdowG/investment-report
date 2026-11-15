"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import {
  EXPLORE_NAVIGATION,
  PRIMARY_NAVIGATION,
  SETTINGS_NAVIGATION,
  isActiveNavigation,
} from "./navigation";

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = [...EXPLORE_NAVIGATION, SETTINGS_NAVIGATION];
  const moreActive = moreItems.some((item) =>
    isActiveNavigation(pathname, item.href),
  );
  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
      <ul className="grid h-16 grid-cols-5">
        {PRIMARY_NAVIGATION.map((item) => {
          const active = isActiveNavigation(pathname, item.href);
          const { Icon, label } = item;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "text-on-primary-container bg-primary-container/25"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="text-[10px] font-label-caps tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex h-full w-full min-h-11 flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              moreActive
                ? "bg-primary-container/25 text-on-primary-container"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <MoreHorizontal className="size-5 shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-label-caps tracking-wide">More</span>
          </button>
        </li>
      </ul>
      </nav>
      <Sheet
        open={moreOpen}
        title="More"
        description="Explore market tools or open app settings."
        side="bottom"
        onClose={() => setMoreOpen(false)}
      >
        <nav aria-label="More destinations">
          <ul className="space-y-2">
            {moreItems.map(({ href, label, description, Icon }) => {
              const active = isActiveNavigation(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-border-subtle bg-surface-variant text-text-primary hover:bg-surface-elevated",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span
                        className={cn(
                          "block text-xs",
                          active ? "text-on-primary-container/80" : "text-text-secondary",
                        )}
                      >
                        {description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
