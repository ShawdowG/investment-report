#!/usr/bin/env python3
"""
Fetch daily OHLCV history + fundamentals for the v4 cockpit.

Usage:
  python scripts/fetch-quotes.py [--symbols SYM1,SYM2] [--period 1y] [--out data/quotes]
                                 [--company-out data/company] [--no-company-info]

Writes data/quotes/SYMBOL.json per ticker with shape:
  { symbol, meta: { name, currency, exchange, ... }, daily: [{ date, o, h, l, c, v }] }

Also writes data/company/SYMBOL.json with the CompanyInfo shape from SPEC-029 §5
(description, valuation metrics, analyst consensus, earnings calendar, top-5 news).
Macro indices without a business summary are skipped with a stderr warning.

Frontend (SPEC-015 + SPEC-029) reads these as static JSON. Cron runs daily.
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone, date
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


DESCRIPTION_MAX_CHARS = 1500
NEWS_LIMIT = 5


def _iso_date_from_unix(value):
    """yfinance often returns epoch seconds. Convert to ISO date (YYYY-MM-DD)."""
    n = _safe_number(value)
    if n is None:
        return None
    try:
        return datetime.fromtimestamp(int(n), tz=timezone.utc).date().isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def _iso_datetime_from_unix(value):
    """Convert epoch seconds to a full ISO 8601 UTC datetime (Zulu)."""
    n = _safe_number(value)
    if n is None:
        return None
    try:
        return (
            datetime.fromtimestamp(int(n), tz=timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        )
    except (OverflowError, OSError, ValueError):
        return None


def _coerce_iso_date(value):
    """Normalise an arbitrary yfinance date-ish value to ISO YYYY-MM-DD."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return _iso_date_from_unix(value)
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        # yfinance sometimes returns a pre-formatted date string; trim to YYYY-MM-DD
        return value[:10]
    return None


def _next_earnings_date(ticker, info):
    """Pull the next earnings date from ticker.calendar or info, whichever responds."""
    try:
        calendar = ticker.calendar
    except Exception:
        calendar = None
    if calendar is not None:
        # newer yfinance: dict-like; older: DataFrame
        if isinstance(calendar, dict):
            raw = calendar.get("Earnings Date") or calendar.get("earningsDate")
            if isinstance(raw, (list, tuple)) and raw:
                raw = raw[0]
            iso = _coerce_iso_date(raw)
            if iso:
                return iso
        else:
            try:
                # Pandas DataFrame fallback: row label "Earnings Date"
                if "Earnings Date" in getattr(calendar, "index", []):
                    raw = calendar.loc["Earnings Date"][0]
                    iso = _coerce_iso_date(raw)
                    if iso:
                        return iso
            except Exception:
                pass
    # info.get("earningsDate") is sometimes a list of unix seconds
    raw = (info or {}).get("earningsDate")
    if isinstance(raw, (list, tuple)) and raw:
        raw = raw[0]
    return _coerce_iso_date(raw)


def _truncate_description(text):
    if not text:
        return None
    s = str(text).strip()
    if not s:
        return None
    if len(s) <= DESCRIPTION_MAX_CHARS:
        return s
    return s[:DESCRIPTION_MAX_CHARS].rstrip() + "..."


def _build_news(raw_news):
    """Top-N news items shaped to CompanyNewsItem."""
    out = []
    if not raw_news:
        return out
    for item in raw_news[:NEWS_LIMIT]:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        link = item.get("link") or item.get("url")
        if not title or not link:
            continue
        published = _iso_datetime_from_unix(item.get("providerPublishTime"))
        out.append({
            "title": str(title),
            "publisher": str(item.get("publisher") or ""),
            "url": str(link),
            "publishedAt": published or "",
        })
    return out


def _build_company_info(symbol, ticker, info, generated_at):
    """Shape yfinance fields into the CompanyInfo contract (SPEC-029 §5).

    Returns None when the symbol has no business summary (macro index / commodity).
    """
    info = info or {}
    description = _truncate_description(info.get("longBusinessSummary"))
    if not description:
        return None

    def opt_num(key):
        return _safe_number(info.get(key))

    metrics = {
        "trailingPE": opt_num("trailingPE"),
        "forwardPE": opt_num("forwardPE"),
        "priceToBook": opt_num("priceToBook"),
        "enterpriseToEbitda": opt_num("enterpriseToEbitda"),
        "dividendYield": opt_num("dividendYield"),
        "payoutRatio": opt_num("payoutRatio"),
        "profitMargins": opt_num("profitMargins"),
        "operatingMargins": opt_num("operatingMargins"),
        "returnOnAssets": opt_num("returnOnAssets"),
        "returnOnEquity": opt_num("returnOnEquity"),
        # SPEC-030 W14.A — extra Yahoo-style overview stats consumed by
        # <StockOverview>: 5Y monthly beta, trailing EPS, and the ex-dividend
        # date. yfinance returns `exDividendDate` as unix seconds; normalise to
        # an ISO date string so the TS loader can treat it as a plain string.
        "beta": opt_num("beta"),
        "trailingEps": opt_num("trailingEps"),
        "exDividendDate": _iso_date_from_unix(info.get("exDividendDate")),
    }
    metrics = {k: v for k, v in metrics.items() if v is not None}

    analyst = {
        "recommendationMean": opt_num("recommendationMean"),
        "targetMeanPrice": opt_num("targetMeanPrice"),
    }
    analyst = {k: v for k, v in analyst.items() if v is not None}

    calendar = {}
    earnings_iso = _next_earnings_date(ticker, info)
    if earnings_iso:
        calendar["earningsDate"] = earnings_iso
    last_fye = _iso_date_from_unix(info.get("lastFiscalYearEnd"))
    if last_fye:
        calendar["lastFiscalYearEnd"] = last_fye

    try:
        raw_news = ticker.news
    except Exception:
        raw_news = []
    news = _build_news(raw_news)

    employees = info.get("fullTimeEmployees")
    employees_int = None
    if employees is not None:
        try:
            employees_int = int(employees)
        except (TypeError, ValueError):
            employees_int = None

    company = {
        "symbol": symbol,
        "generatedAt": generated_at,
        "description": description,
        "industry": info.get("industry") or None,
        "sector": info.get("sector") or None,
        "country": info.get("country") or None,
        "website": info.get("website") or None,
        "employees": employees_int,
        "city": info.get("city") or None,
        "state": info.get("state") or None,
        "metrics": metrics,
        "analyst": analyst,
        "calendar": calendar,
        "news": news,
    }
    # Drop top-level None values (keep metrics/analyst/calendar/news containers even if empty)
    keep_empty = {"metrics", "analyst", "calendar", "news", "symbol", "generatedAt", "description"}
    return {k: v for k, v in company.items() if v is not None or k in keep_empty}


def fetch_one(symbol, period, generated_at, include_company=True):
    """Fetch and shape one ticker.

    Returns a dict { quote, company } on success; quote is None on failure,
    company is None when the symbol lacks a business summary (macro/index)
    or when include_company is False.
    """
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
            return {"quote": None, "company": None}
        quote = {"symbol": symbol, "meta": meta, "daily": daily}
        company = None
        if include_company:
            try:
                company = _build_company_info(symbol, ticker, info, generated_at)
            except Exception as exc:
                print(
                    f"[company-info] {symbol}: build failed ({exc}); skipping company write",
                    file=sys.stderr,
                )
                company = None
            if company is None:
                print(
                    f"[company-info] skipping {symbol}: no business summary",
                    file=sys.stderr,
                )
        return {"quote": quote, "company": company}
    except Exception as exc:
        print(f"  WARN {symbol}: {exc}", file=sys.stderr)
        return {"quote": None, "company": None}


def _write_json(path, payload):
    """Pretty-print JSON to disk. UTF-8 without BOM, ensure_ascii=False for clean diffs."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


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
        help="Output directory for OHLCV JSON (default: data/quotes)",
    )
    parser.add_argument(
        "--company-out",
        default="data/company",
        help="Output directory for CompanyInfo JSON (default: data/company)",
    )
    parser.add_argument(
        "--no-company-info",
        action="store_true",
        help="Skip writing data/company/*.json (quotes only)",
    )
    args = parser.parse_args()

    targets = (
        [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
        if args.symbols
        else TICKERS
    )
    out_dir = args.out
    company_out_dir = args.company_out
    include_company = not args.no_company_info
    os.makedirs(out_dir, exist_ok=True)
    if include_company:
        os.makedirs(company_out_dir, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    ok = 0
    company_ok = 0
    for sym in targets:
        print(f"  {sym}...", end=" ", flush=True)
        result = fetch_one(sym, args.period, generated_at, include_company=include_company)
        quote = result.get("quote")
        company = result.get("company")
        if quote is None:
            print("SKIP")
            continue
        # Filename uses the ticker as-is so /ticker/[symbol] route maps cleanly.
        path = os.path.join(out_dir, f"{sym}.json")
        _write_json(path, quote)
        last = quote["daily"][-1]
        suffix = ""
        if include_company and company is not None:
            company_path = os.path.join(company_out_dir, f"{sym}.json")
            _write_json(company_path, company)
            company_ok += 1
            suffix = " +company"
        print(f"{len(quote['daily']):>4} bars, last close ${last['close']:.2f}{suffix}")
        ok += 1

    print(f"\nDone: {ok}/{len(targets)} tickers -> {out_dir}/")
    if include_company:
        print(f"Company info: {company_ok}/{len(targets)} -> {company_out_dir}/")
    if ok < len(targets):
        missing = [s for s in targets if not os.path.exists(os.path.join(out_dir, f"{s}.json"))]
        print(f"Missing: {', '.join(missing)}", file=sys.stderr)
        sys.exit(2 if ok == 0 else 0)


if __name__ == "__main__":
    main()
