#!/usr/bin/env python3
"""
Generate a daily investment report scaffold with live GAMMA price data.

Usage:
  python scripts/generate-report.py            # auto-detect slot from UTC time
  python scripts/generate-report.py eu         # force slot
  python scripts/generate-report.py us-open
  python scripts/generate-report.py pre-close
"""

import sys
import json
import os
from datetime import datetime, timezone, timedelta

import yfinance as yf

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

WATCHLIST = [
    "BTC-USD", "GC=F", "^GSPC", "^NDX",
    "AAPL", "TSLA", "GOOG", "NVDA", "AMZN", "MSFT", "META",
    "DUOL", "ADBE", "AMD", "BABA", "LMT", "BA", "TM",
    "V", "MA", "NFLX", "RDDT", "NVO",
]

# Display symbol overrides (what appears in the report)
DISPLAY_NAMES = {
    "^GSPC":   ("^GSPC",    "S&P 500"),
    "^NDX":    ("^NDQ",     "Nasdaq 100"),
    "GC=F":    ("GC=F",     "Gold"),
    "BTC-USD": ("BTC-USD",  "Bitcoin"),
    "ADBE":    ("ADBE.VI",  "Adobe"),
    "NVO":     ("NOVO-B.CO","Novo Nordisk"),
    "AAPL":    ("AAPL",     "Apple"),
    "TSLA":    ("TSLA",     "Tesla"),
    "GOOG":    ("GOOG",     "Alphabet"),
    "NVDA":    ("NVDA",     "NVIDIA"),
    "AMZN":    ("AMZN",     "Amazon"),
    "MSFT":    ("MSFT",     "Microsoft"),
    "META":    ("META",     "Meta"),
    "DUOL":    ("DUOL",     "Duolingo"),
    "AMD":     ("AMD",      "AMD"),
    "BABA":    ("BABA",     "Alibaba"),
    "LMT":     ("LMT",      "Lockheed Martin"),
    "BA":      ("BA",       "Boeing"),
    "TM":      ("TM",       "Toyota"),
    "V":       ("V",        "Visa"),
    "MA":      ("MA",       "Mastercard"),
    "NFLX":    ("NFLX",     "Netflix"),
    "RDDT":    ("RDDT",     "Reddit"),
}

SLOT_SCHEDULE = {
    # UTC hour range → slot name
    ( 7, 12): "eu",
    (14, 17): "us-open",
    (19, 22): "pre-close",
}

SLOT_TITLES = {
    "eu":        "EU/Nordic Morning",
    "us-open":   "US Open +15m",
    "pre-close": "US Pre-close",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def detect_slot() -> str:
    hour = datetime.now(timezone.utc).hour
    for (start, end), slot in SLOT_SCHEDULE.items():
        if start <= hour < end:
            return slot
    # Outside schedule — pick closest upcoming slot
    if hour < 7:
        return "eu"
    if hour < 14:
        return "us-open"
    return "pre-close"


def fetch_prices(symbols: list[str]) -> list[dict]:
    """Download 2 days of OHLCV for all symbols in one batch request."""
    print(f"Fetching {len(symbols)} symbols from Yahoo Finance...")
    raw = yf.download(
        tickers=symbols,
        period="2d",
        interval="1d",
        group_by="ticker",
        auto_adjust=True,
        progress=False,
    )

    rows = []
    for sym in symbols:
        try:
            if len(symbols) == 1:
                closes = raw["Close"]
            else:
                closes = raw[sym]["Close"]

            closes = closes.dropna()
            if len(closes) < 1:
                print(f"  [WARN] No data for {sym}")
                continue

            price = float(closes.iloc[-1])
            prev  = float(closes.iloc[-2]) if len(closes) >= 2 else price
            pct   = (price - prev) / prev * 100 if prev else 0.0
            change_abs = price - prev

            display_sym, name = DISPLAY_NAMES.get(sym, (sym, sym))
            rows.append({
                "yf_symbol":   sym,
                "ticker":      display_sym,
                "name":        name,
                "price":       price,
                "change_abs":  change_abs,
                "change_pct":  pct,
            })
        except Exception as e:
            print(f"  [WARN] {sym}: {e}")

    return rows


def format_pct(pct: float) -> str:
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.2f}%"


def build_gamma_table(rows: list[dict]) -> str:
    lines = ["Ticker | Price | Δ%", "---|---:|---:"]
    for r in rows:
        ticker = r["ticker"]
        price  = f"{r['price']:.2f}"
        pct    = format_pct(r["change_pct"])
        lines.append(f"{ticker} | {price} | {pct}")
    return "\n".join(lines)


def load_previous_regime() -> tuple[str, str]:
    """Load regime + summary from the most recent report in search-index.json."""
    index_path = os.path.join(ROOT, "data", "search-index.json")
    try:
        with open(index_path, encoding="utf-8") as f:
            index = json.load(f)
        latest = index.get("items", [{}])[0]
        return latest.get("regime", "neutral"), latest.get("summary", "")
    except Exception:
        return "neutral", ""


def build_mover_notes(rows: list[dict]) -> tuple[str, str]:
    """Return formatted lists of top gainers and laggards for the checklist."""
    sorted_rows = sorted(rows, key=lambda r: r["change_pct"], reverse=True)
    gainers  = [r for r in sorted_rows if r["change_pct"] > 0][:5]
    laggards = [r for r in sorted_rows if r["change_pct"] < 0][:5]

    def fmt(r):
        return f"**{r['ticker']} ({format_pct(r['change_pct'])})**"

    gainers_str  = ", ".join(fmt(r) for r in gainers)  or "none"
    laggards_str = ", ".join(fmt(r) for r in laggards) or "none"
    return gainers_str, laggards_str


# ── Report builder ────────────────────────────────────────────────────────────

def build_report(slot: str, date_str: str, rows: list[dict], prev_regime: str) -> str:
    gamma_table = build_gamma_table(rows)
    gainers, laggards = build_mover_notes(rows)
    title = SLOT_TITLES[slot]

    # Build tickers list for frontmatter (use display symbols)
    tickers_fm = ", ".join(r["ticker"] for r in rows)
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")

    return f"""---
date: {date_str}
slot: {slot}
title: {title}
regime: {prev_regime}
summary: (fill in)
tickers: [{tickers_fm}]
---

# {title} — {date_str}

- **Regime:** {prev_regime}
- **Main driver:** (fill in)
- **Posture:** (fill in)

## 1) GAMMA — Data Pack
{gamma_table}

## 2) ALPHA — Strategic View
- (fill in — macro/sector thesis, multi-week view)
- (fill in)
- (fill in)

## 3) BETA — Tactical View
- (fill in — today's specific setup, short-term)
- (fill in)
- (fill in)

## 4) Agent Discussion
- **Agreement:** (fill in)
- **Disagreement:** (fill in)
- **Resolution:** (fill in)

## 5) Unified Action Checklist
- Watch upside leaders for continuation: {gainers}
- Monitor laggards for weakness: {laggards}
- (fill in — specific trade or watch action)
- (fill in)
- (fill in)

## 6) Source & Verification Notes
- Snapshot source: yfinance auto-fetch generated {now_iso}.
- Proxy mapping used: ADBE.VI → ADBE.US, NOVO-B.CO → NVO.US (ADR).
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    slot = sys.argv[1] if len(sys.argv) > 1 else detect_slot()
    if slot not in SLOT_TITLES:
        print(f"Unknown slot '{slot}'. Use: eu | us-open | pre-close")
        sys.exit(1)

    # Oslo (CET/CEST) is UTC+1 in winter, UTC+2 in summer
    # Use the local date of the Oslo morning the report is for
    date_str = datetime.now(timezone(timedelta(hours=1))).strftime("%Y-%m-%d")

    print(f"Generating report: {date_str} / {slot}")

    rows = fetch_prices(WATCHLIST)
    if not rows:
        print("ERROR: No price data fetched. Aborting.")
        sys.exit(1)

    prev_regime, _ = load_previous_regime()

    report = build_report(slot, date_str, rows, prev_regime)

    out_path = os.path.join(ROOT, "reports", "daily", f"{date_str}-{slot}.md")

    # Don't overwrite an existing report (protect manual edits)
    if os.path.exists(out_path):
        print(f"Report already exists: {out_path}")
        print("Delete it first if you want to regenerate.")
        sys.exit(1)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Written: {out_path}")

    # Print a quick price summary to stdout
    print(f"\n{'Ticker':<12} {'Price':>10} {'Chg%':>8}")
    print("-" * 32)
    for r in sorted(rows, key=lambda x: x["change_pct"], reverse=True):
        print(f"{r['ticker']:<12} {r['price']:>10.2f} {format_pct(r['change_pct']):>8}")


if __name__ == "__main__":
    main()
