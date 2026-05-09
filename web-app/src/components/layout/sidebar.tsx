"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Eye,
  LayoutDashboard,
  LineChart,
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
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/watchlist", label: "Watchlist", Icon: Eye },
  { href: "/portfolio", label: "Portfolio", Icon: Wallet },
  { href: "/tickers", label: "Tickers", Icon: LineChart },
];

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  Icon: Settings,
};

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface/80 backdrop-blur-md border-r border-border-subtle py-6 px-4 z-50">
      <Link href="/" className="block mb-8 px-4">
        <h1 className="font-h2 text-h2 text-text-primary">Investment Report</h1>
        <p className="font-body-compact text-body-compact text-text-secondary mt-1">
          Personal market cockpit
        </p>
      </Link>
      <nav className="flex-1 flex flex-col gap-1.5">
        {NAV.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
        ))}
        <div className="mt-auto">
          <SidebarLink
            item={SETTINGS_ITEM}
            active={isActiveHref(pathname, SETTINGS_ITEM.href)}
          />
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 transition-all font-body-compact text-body-compact",
        active
          ? "bg-primary-container text-on-primary-container font-semibold"
          : "text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
