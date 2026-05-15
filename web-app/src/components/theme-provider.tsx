"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme toggle landed 2026-05-15. Default is dark (the original Stitch
 * palette); light mode is the ADR-007 follow-up palette. System preference
 * is respected via `enableSystem`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
