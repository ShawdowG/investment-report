"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server-render / pre-hydration: render a stable placeholder to avoid
  // mismatch — `resolvedTheme` is undefined until next-themes hydrates.
  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className="text-text-secondary p-2 rounded-full inline-flex"
      >
        <Sun className="size-5" />
      </span>
    );
  }

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const next = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
      className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-surface-variant"
    >
      <Icon className="size-5" />
    </button>
  );
}
