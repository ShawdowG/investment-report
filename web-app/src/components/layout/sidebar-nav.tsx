"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  EXPLORE_NAVIGATION,
  PRIMARY_NAVIGATION,
  SETTINGS_NAVIGATION,
  isActiveNavigation,
  type NavigationItem,
} from "./navigation";

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
      <nav aria-label="Primary navigation" className="flex-1 flex flex-col gap-1.5">
        {PRIMARY_NAVIGATION.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActiveNavigation(pathname, item.href)}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
        {!collapsed ? (
          <p className="mb-1 mt-5 px-4 font-label-caps text-label-caps uppercase text-text-secondary">
            Explore
          </p>
        ) : (
          <div className="my-3 h-px bg-border-subtle" aria-hidden="true" />
        )}
        {EXPLORE_NAVIGATION.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActiveNavigation(pathname, item.href)}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
        <div className="mt-auto">
          <SidebarLink
            item={SETTINGS_NAVIGATION}
            active={isActiveNavigation(pathname, SETTINGS_NAVIGATION.href)}
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
  item: NavigationItem;
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
        "flex min-h-11 items-center rounded-lg font-body-compact text-body-compact transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
