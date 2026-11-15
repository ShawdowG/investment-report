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

export interface NavigationItem {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
}

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  {
    href: "/",
    label: "Today",
    description: "Personal attention and market context",
    Icon: LayoutDashboard,
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    description: "Track instruments you are considering",
    Icon: Eye,
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    description: "Review manual holdings and performance",
    Icon: Wallet,
  },
  {
    href: "/research",
    label: "Research",
    description: "Manage theses and research dispatches",
    Icon: NotebookPen,
  },
];

export const EXPLORE_NAVIGATION: NavigationItem[] = [
  {
    href: "/tickers",
    label: "Tickers",
    description: "Browse the available quote universe",
    Icon: LineChart,
  },
  {
    href: "/strategies",
    label: "Strategies",
    description: "Build and inspect local backtests",
    Icon: ChartCandlestick,
  },
];

export const SETTINGS_NAVIGATION: NavigationItem = {
  href: "/settings",
  label: "Settings",
  description: "Preferences, backup, and local storage",
  Icon: Settings,
};

export function isActiveNavigation(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
