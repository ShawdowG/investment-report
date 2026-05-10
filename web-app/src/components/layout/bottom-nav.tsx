"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", Icon: LayoutDashboard },
  { href: "/watchlist", label: "Watch", Icon: Eye },
  { href: "/portfolio", label: "Folio", Icon: Wallet },
  { href: "/research", label: "Research", Icon: NotebookPen },
  { href: "/tickers", label: "Tickers", Icon: LineChart },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border-subtle z-40"
    >
      <ul className="grid grid-cols-6 h-16">
        {NAV.map((item) => {
          const active = isActiveHref(pathname, item.href);
          const { Icon, label } = item;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full transition-colors",
                  active
                    ? "text-on-primary-container bg-primary-container/25"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="text-[10px] font-label-caps uppercase tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
