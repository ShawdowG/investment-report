"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartCandlestick,
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
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/research", label: "Research", Icon: NotebookPen },
  { href: "/watchlist", label: "Watchlist", Icon: Eye },
  { href: "/portfolio", label: "Portfolio", Icon: Wallet },
  { href: "/strategies", label: "Strategies", Icon: ChartCandlestick },
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

interface SidebarNavProps {
  onItemClick?: () => void;
  collapsed?: boolean;
}

export function SidebarNav({ onItemClick, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname() ?? "/";
  return (
    <>
      <Link
        href="/"
        className={cn("block mb-8", collapsed ? "px-1 text-center" : "px-4")}
        onClick={onItemClick}
        title={collapsed ? "Investment Report" : undefined}
      >
        {collapsed ? (
          <span className="font-h2 text-h2 text-text-primary">IR</span>
        ) : (
          <>
            <h1 className="font-h2 text-h2 text-text-primary">Investment Report</h1>
            <p className="font-body-compact text-body-compact text-text-secondary mt-1">
              Personal market cockpit
            </p>
          </>
        )}
      </Link>
      <nav className="flex-1 flex flex-col gap-1.5">
        {NAV.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
        <div className="mt-auto">
          <SidebarLink
            item={SETTINGS_ITEM}
            active={isActiveHref(pathname, SETTINGS_ITEM.href)}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        </div>
      </nav>
    </>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg transition-all font-body-compact text-body-compact",
        collapsed ? "gap-0 px-3 py-3 justify-center" : "gap-3 px-4 py-3",
        active
          ? "bg-primary-container text-on-primary-container font-semibold"
          : "text-text-secondary hover:bg-surface-bright/50 hover:text-text-primary",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
