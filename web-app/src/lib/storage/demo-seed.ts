import { removeKey } from "./local-storage";
import { addPosition, clearPortfolio } from "./portfolio-store";
import { createDispatch } from "./research-dispatches-store";
import { addNote } from "./ticker-notes-store";
import { addToWatchlist, clearWatchlist } from "./watchlist-store";

const DEMO_WATCHLIST: Parameters<typeof addToWatchlist>[0][] = [
  { symbol: "NVDA", status: "own", priority: "high", tags: ["AI", "Semi"] },
  { symbol: "MSFT", status: "own", priority: "high", tags: ["AI", "Cloud"] },
  { symbol: "AAPL", status: "watching", priority: "med", tags: ["Tech"] },
  { symbol: "AMD", status: "watching", priority: "high", tags: ["Semi"] },
  { symbol: "TSLA", status: "research", priority: "med", tags: ["EV", "Auto"] },
  { symbol: "BTC-USD", status: "watching", priority: "med", tags: ["Crypto"] },
  { symbol: "META", status: "research", priority: "low", tags: ["AI", "Social"] },
  { symbol: "BABA", status: "avoid", priority: "low", tags: ["China"] },
];

const DEMO_PORTFOLIO: Parameters<typeof addPosition>[0][] = [
  { symbol: "NVDA", quantity: 100, avgPrice: 180 },
  { symbol: "MSFT", quantity: 75, avgPrice: 380 },
  { symbol: "AAPL", quantity: 200, avgPrice: 240 },
  { symbol: "BTC-USD", quantity: 0.5, avgPrice: 65000 },
  { symbol: "TSLA", quantity: 50, avgPrice: 350 },
];

const DEMO_DISPATCHES: Parameters<typeof createDispatch>[0][] = [
  {
    title: "Weekly market take — risk-on with caveats",
    ticker: undefined,
    body:
      "S&P and Nasdaq both up on the week with constructive breadth. Mega-cap " +
      "AI names leading; rotation into semis (NVDA, AMD) suggests the cycle has " +
      "legs. Watching VIX <17 — complacency risk if it dips further. Defensive " +
      "names lagging.\n\nKey levels:\n- ^GSPC: support 7300, resistance 7450\n- " +
      "BTC: range $78k–$84k, breakout watch\n- Gold: holding $4700, hedge intact\n\n" +
      "Posture: stay long with stops; reduce on euphoric breadth (>80% advance).",
  },
  {
    title: "NVDA pre-earnings thesis",
    ticker: "NVDA",
    body:
      "Position sizing review heading into earnings.\n\nBull case: hyperscaler " +
      "capex commentary still firm; Blackwell ramp ahead of schedule per channel " +
      "checks. Datacenter mix should beat consensus.\n\nBear case: any guide " +
      "miss on China + auto exposure could shave 8–10%. Position sized to absorb.\n\n" +
      "Action: hold 100 shares through. Add only on >5% post-earnings drop.",
  },
  {
    title: "AI capex monitor — Q2 notes",
    ticker: undefined,
    body:
      "Tracking commentary across the four hyperscalers.\n\n- MSFT: capex guide " +
      "raised again; Azure AI revenue >40% YoY\n- META: capex now $90B, AI infra " +
      "specifically called out\n- GOOG: TPU + GPU split confusing the read\n- " +
      "AMZN: AWS reaccel narrative intact\n\nRead-through: NVDA still primary " +
      "beneficiary, AMD secondary on MI300X share gains.",
  },
];

const DEMO_NOTES: Record<string, string[]> = {
  NVDA: [
    "Watch $200 support — broke through multiple times, holds for now.",
    "Trim 10% on any move >$240 pre-earnings to manage sizing.",
  ],
  MSFT: ["Wait for Azure AI revenue split before adding more."],
  AAPL: ["Services revenue narrative weakening — re-evaluate at $290."],
};

/**
 * Wipe and re-seed all four user-data stores with realistic demo data.
 * Used from /settings -> "Load demo data" so the UI can be eyeballed
 * without manually typing positions/notes.
 */
export function loadDemoData(): void {
  clearAllUserData();

  for (const item of DEMO_WATCHLIST) {
    addToWatchlist(item);
  }
  for (const position of DEMO_PORTFOLIO) {
    addPosition(position);
  }
  for (const dispatch of DEMO_DISPATCHES) {
    createDispatch(dispatch);
  }
  for (const [symbol, bodies] of Object.entries(DEMO_NOTES)) {
    for (const body of bodies) {
      addNote(symbol, body);
    }
  }
}

/**
 * Clears the four user-data stores. Used from /settings -> "Clear all data"
 * and as the prelude to loadDemoData. Bypasses the per-item delete loops
 * (notes, dispatches) by removing the storage keys directly.
 */
export function clearAllUserData(): void {
  clearWatchlist();
  clearPortfolio();
  removeKey("ticker_notes");
  removeKey("research_dispatches");
}
