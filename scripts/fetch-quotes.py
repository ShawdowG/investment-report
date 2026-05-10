#!/usr/bin/env python3
"""
Fetch daily OHLCV history + fundamentals for the v4 cockpit.

Usage:
  python scripts/fetch-quotes.py [--symbols SYM1,SYM2] [--period 1y] [--out data/quotes]

Writes data/quotes/SYMBOL.json per ticker with shape:
  { symbol, meta: { name, currency, exchange, ... }, daily: [{ date, o, h, l, c, v }] }

Frontend (SPEC-015) reads these as static JSON. Cron runs daily.
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Make scripts/ importable so _tickers can be loaded both as `python scripts/fetch-quotes.py`
# and as `python -m scripts.fetch-quotes` style invocations.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from _tickers import NAMES, TICKERS  # noqa: E402

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance", file=sys.stderr)
    sys.exit(1)


def _safe_number(value):
    """Return value as a float if finite, else None."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _build_meta(info, fallback_name, generated_at):
    """Pull a small, opinionated subset of yfinance info into our meta shape."""
    meta = {"generatedAt": generated_at}
    name = (info or {}).get("longName") or (info or {}).get("shortName") or fallback_name
    if name:
        meta["name"] = name
    for src_key, dst_key in [
        ("currency", "currency"),
        ("exchange", "exchange"),
        ("sector", "sector"),
        ("industry", "industry"),
        ("marketCap", "marketCap"),
        ("trailingPE", "peRatio"),
        ("dividendYield", "dividendYield"),
    ]:
        v = (info or {}).get(src_key)
        if dst_key in {"marketCap", "peRatio", "dividendYield"}:
            v = _safe_number(v)
        if v is not None and v != "":
            meta[dst_key] = v
    return meta


def _build_daily(history):
    """Convert a yfinance DataFrame to our chronological daily array."""
    bars = []
    if history is None or history.empty:
        return bars
    for ts, row in history.iterrows():
        date = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
        o = _safe_number(row.get("Open"))
        h = _safe_number(row.get("High"))
        l = _safe_number(row.get("Low"))
        c = _safe_number(row.get("Close"))
        v = _safe_number(row.get("Volume"))
        if c is None:
            continue
        bars.append({
            "date": date,
            "open": round(o, 4) if o is not None else None,
            "high": round(h, 4) if h is not None else None,
            "low": round(l, 4) if l is not None else None,
            "close": round(c, 4),
            "volume": int(v) if v is not None else None,
        })
    return bars


def fetch_one(symbol, period, generated_at):
    """Fetch and shape one ticker. Returns dict on success, None on failure."""
    try:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period=period, auto_adjust=True)
        info = {}
        try:
            info = ticker.info or {}
        except Exception:
            # yfinance .info is flaky for some symbols; tolerate it
            info = {}
        meta = _build_meta(info, NAMES.get(symbol, symbol), generated_at)
        daily = _build_daily(history)
        if not daily:
            print(f"  WARN {symbol}: empty history", file=sys.stderr)
            return None
        return {"symbol": symbol, "meta": meta, "daily": daily}
    except Exception as exc:
        print(f"  WARN {symbol}: {exc}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="Fetch daily OHLCV per ticker")
    parser.add_argument(
        "--symbols",
        help="Comma-separated symbol subset (default: full TICKERS list from scripts/_tickers.py)",
    )
    parser.add_argument(
        "--period",
        default="10y",
        help="yfinance period string (default: 10y; gives 1M/3M/6M/YTD/1Y/3Y/5Y/10Y range pills coverage)",
    )
    parser.add_argument(
        "--out",
        default="data/quotes",
        help="Output directory (default: data/quotes)",
    )
    args = parser.parse_args()

    targets = (
        [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
        if args.symbols
        else TICKERS
    )
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    ok = 0
    for sym in targets:
        print(f"  {sym}...", end=" ", flush=True)
        result = fetch_one(sym, args.period, generated_at)
        if result is None:
            print("SKIP")
            continue
        # Filename uses the ticker as-is so /ticker/[symbol] route maps cleanly.
        path = os.path.join(out_dir, f"{sym}.json")
        with open(path, "w") as f:
            json.dump(result, f, indent=2)
        last = result["daily"][-1]
        print(f"{len(result['daily']):>4} bars, last close ${last['close']:.2f}")
        ok += 1

    print(f"\nDone: {ok}/{len(targets)} tickers -> {out_dir}/")
    if ok < len(targets):
        missing = [s for s in targets if not os.path.exists(os.path.join(out_dir, f"{s}.json"))]
        print(f"Missing: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2 if ok == 0 else 0)


if __name__ == "__main__":
    main()
