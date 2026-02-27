#!/usr/bin/env python3
"""
Fetch market snapshot for investment report generation.

Usage:
  python scripts/fetch-snapshot.py [eu|us-open|pre-close] [--output PATH]

Outputs a gamma_snapshot.json file with live prices from Yahoo Finance.
Requires: pip install yfinance
"""

import sys
import os
import json
import argparse
from datetime import datetime, timezone

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Watchlist — edit this to add/remove tickers
# Use Yahoo Finance symbols (US market preferred for consistency)
# ---------------------------------------------------------------------------
WATCHLIST = [
    "BTC-USD", "GC=F",           # Crypto + Commodities
    "^GSPC", "^NDX",             # Indices (S&P 500, Nasdaq 100)
    "AAPL", "TSLA", "GOOG", "NVDA", "AMZN", "MSFT", "META",  # Mega-caps
    "DUOL", "ADBE", "AMD", "BABA",  # Growth/Tech
    "LMT", "BA", "TM",           # Industrials
    "V", "MA",                   # Financials
    "NFLX", "RDDT",              # Media/Social
    "NVO",                       # Healthcare (Novo Nordisk ADR)
]

# Macro indicators — fetched separately, not as movers
MACRO_SYMBOLS = {
    "VIX":   "^VIX",
    "DXY":   "DX-Y.NYB",
    "US10Y": "^TNX",
}

# Human-readable names (fallback to symbol if not listed)
NAMES = {
    "BTC-USD": "Bitcoin",
    "GC=F":    "Gold",
    "^GSPC":   "S&P 500",
    "^NDX":    "Nasdaq 100",
    "AAPL":    "Apple",
    "TSLA":    "Tesla",
    "GOOG":    "Alphabet",
    "NVDA":    "NVIDIA",
    "AMZN":    "Amazon",
    "MSFT":    "Microsoft",
    "META":    "Meta",
    "DUOL":    "Duolingo",
    "ADBE":    "Adobe",
    "AMD":     "AMD",
    "BABA":    "Alibaba",
    "LMT":     "Lockheed Martin",
    "BA":      "Boeing",
    "TM":      "Toyota",
    "V":       "Visa",
    "MA":      "Mastercard",
    "NFLX":    "Netflix",
    "RDDT":    "Reddit",
    "NVO":     "Novo Nordisk",
}

def fetch_ticker(symbol):
    """Fetch price data for a single symbol. Returns dict or None on failure."""
    try:
        t = yf.Ticker(symbol)
        fi = t.fast_info
        price = fi.last_price
        prev = fi.previous_close
        if price is None or prev is None or prev == 0:
            return None
        change = round(price - prev, 4)
        change_pct = round((price - prev) / prev * 100, 4)
        return {
            "symbol": symbol,
            "name": NAMES.get(symbol, symbol),
            "price": round(price, 4),
            "prevClose": round(prev, 4),
            "change": change,
            "changePct": change_pct,
        }
    except Exception as e:
        print(f"  WARN {symbol}: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="Fetch market snapshot")
    parser.add_argument(
        "slot",
        nargs="?",
        default="eu",
        choices=["eu", "us-open", "pre-close"],
        help="Report slot (default: eu)",
    )
    parser.add_argument(
        "--output",
        default="data/gamma_snapshot.json",
        help="Output path (default: data/gamma_snapshot.json)",
    )
    parser.add_argument(
        "--date",
        default=None,
        help="Override date (YYYY-MM-DD). Defaults to today.",
    )
    args = parser.parse_args()

    date = args.date or datetime.now().strftime("%Y-%m-%d")
    generated_at = datetime.now(timezone.utc).isoformat()

    print(f"Fetching {len(WATCHLIST)} tickers for {date} / {args.slot}...")

    # Fetch watchlist prices
    prices = {}
    for sym in WATCHLIST:
        print(f"  {sym}...", end=" ", flush=True)
        result = fetch_ticker(sym)
        if result:
            prices[sym] = result
            print(f"{result['price']:,.2f}  {result['changePct']:+.2f}%")
        else:
            print("SKIP")

    # Fetch macro indicators
    macro = {}
    print("\nFetching macro indicators...")
    for name, sym in MACRO_SYMBOLS.items():
        print(f"  {name} ({sym})...", end=" ", flush=True)
        result = fetch_ticker(sym)
        if result:
            macro[name] = {
                "symbol": sym,
                "price": result["price"],
                "changePct": result["changePct"],
            }
            print(f"{result['price']:,.2f}  {result['changePct']:+.2f}%")
        else:
            macro[name] = None
            print("UNAVAILABLE")

    snapshot = {
        "v": 2,
        "generatedAt": generated_at,
        "date": date,
        "slot": args.slot,
        "watchlist": WATCHLIST,
        "prices": prices,
        "macro": macro,
    }

    # Write output
    out_path = args.output
    os.makedirs(os.path.dirname(out_path) if os.path.dirname(out_path) else ".", exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(snapshot, f, indent=2)

    fetched = len(prices)
    total = len(WATCHLIST)
    print(f"\nSnapshot written → {out_path}  ({fetched}/{total} tickers, {len(macro)} macro)")
    if fetched < total:
        missing = [s for s in WATCHLIST if s not in prices]
        print(f"Missing: {', '.join(missing)}")

if __name__ == "__main__":
    main()
