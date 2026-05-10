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
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/research", label: "Research", Icon: NotebookPen },
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

interface SidebarNavProps {
  onItemClick?: () => void;
}

export function SidebarNav({ onItemClick }: SidebarNavProps) {
  const pathname = usePathname() ?? "/";
  return (
    <>
      <Link href="/" className="block mb-8 px-4" onClick={onItemClick}>
        <h1 className="font-h2 text-h2 text-text-primary">Investment Report</h1>
        <p className="font-body-compact text-body-compact text-text-secondary mt-1">
          Personal market cockpit
        </p>
      </Link>
      <nav className="flex-1 flex flex-col gap-1.5">
        {NAV.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActiveHref(pathname, item.href)}
            onClick={onItemClick}
          />
        ))}
        <div className="mt-auto">
          <SidebarLink
            item={SETTINGS_ITEM}
            active={isActiveHref(pathname, SETTINGS_ITEM.href)}
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
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const { href, label, Icon } = item;
  return (
    <Link
      href={href}
      onClick={onClick}
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
