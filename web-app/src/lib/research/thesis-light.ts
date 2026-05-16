/**
 * SPEC-023 W8.H — small helper that resolves the current "light" for a
 * thesis. Watchlist / portfolio surfaces use {@link getAllThesisLights} once
 * per mount so N rows don't translate to N localStorage reads.
 */

import type { Light } from "@/lib/domain/thesis";
import { getTheses, getThesis } from "@/lib/storage/thesis-store";
import type { Thesis } from "@/lib/domain/thesis";

/**
 * The Thesis domain type doesn't (yet — see W8.B-D) carry a `currentLight`
 * field. Read it defensively as an optional sidecar. Theses that pre-date the
 * field default to "yellow" — neutral, so the dot is informative but not
 * alarming.
 */
type WithLight = Thesis & { currentLight?: Light };

function readLight(thesis: Thesis | null): Light | null {
  if (!thesis) return null;
  const tagged = thesis as WithLight;
  if (tagged.currentLight === "green" || tagged.currentLight === "yellow" || tagged.currentLight === "red") {
    return tagged.currentLight;
  }
  return "yellow";
}

/** Returns the current light for `symbol`, or null if no thesis exists. */
export function getThesisLight(symbol: string): Light | null {
  const thesis = getThesis(symbol);
  return readLight(thesis);
}

/**
 * Reads every thesis from localStorage once and returns a `symbol → light`
 * map. Use this in row-rendering components that need to decorate N
 * symbols — the alternative (`getThesisLight` per row) re-parses the entire
 * theses blob N times.
 */
export function getAllThesisLights(): Record<string, Light> {
  const theses = getTheses();
  const out: Record<string, Light> = {};
  for (const [sym, thesis] of Object.entries(theses)) {
    const light = readLight(thesis);
    if (light !== null) out[sym] = light;
  }
  return out;
}

/** Tailwind class for the colored dot. */
export const LIGHT_DOT_CLASS: Record<Light, string> = {
  green: "bg-regime-risk-on",
  yellow: "bg-regime-neutral",
  red: "bg-regime-risk-off",
};

/** Accessible label for screen readers. */
export const LIGHT_ARIA: Record<Light, string> = {
  green: "Thesis: green",
  yellow: "Thesis: yellow",
  red: "Thesis: red",
};
