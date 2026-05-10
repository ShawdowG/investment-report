"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * v4 cockpit is dark-only per ADR-007 (Stitch handoff is dark-only).
 * `forcedTheme` overrides system preference and any persisted user choice
 * so the app always renders against the Stitch palette.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" forcedTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
