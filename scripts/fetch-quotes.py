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

# Bands used to label the multi-year trajectory of operating margin / FCF.
# Numbers below were chosen to be tight enough that a steady business reads as
# "stable" but a clear regime change (e.g. AAPL services mix → margin lift)
# reads as "expanding".
TREND_MARGIN_TOL = 0.01      # 1 percentage point band around 5y high/low
TREND_FCF_TOL_PCT = 0.05     # ±5% band around 5y average for FCF


def _row_value(df, candidates, col_index=0):
    """Return df.loc[name].iloc[col_index] for the first matching row name.

    yfinance row names vary by symbol (e.g. "Total Revenue" vs "TotalRevenue"),
    so we look up a list of candidates and return the first hit as a float.
    """
    if df is None or getattr(df, "empty", True):
        return None
    try:
        index_labels = list(df.index)
    except Exception:
        return None
    for name in candidates:
        if name in index_labels:
            try:
                series = df.loc[name]
                if col_index >= len(series):
                    continue
                return _safe_number(series.iloc[col_index])
            except Exception:
                continue
    return None


def _row_series(df, candidates):
    """Return (column_dates, [floats]) for the first matching row in df.

    Columns are returned newest-first (yfinance default ordering).
    """
    if df is None or getattr(df, "empty", True):
        return None, []
    try:
        index_labels = list(df.index)
    except Exception:
        return None, []
    for name in candidates:
        if name in index_labels:
            try:
                series = df.loc[name]
                values = [_safe_number(v) for v in series.tolist()]
                cols = list(series.index)
                return cols, values
            except Exception:
                continue
    return None, []


def _trend_label(latest, low, high, tol):
    """Classify latest vs the 5y band as expanding / stable / compressing."""
    if latest is None or low is None or high is None:
        return None
    if latest > high - tol:
        return "expanding"
    if latest < low + tol:
        return "compressing"
    return "stable"


def _trend_vs_avg(latest, avg, tol_pct):
    """Classify latest vs a 5y average using a percentage tolerance band."""
    if latest is None or avg is None or avg == 0:
        return None
    delta_pct = (latest - avg) / abs(avg)
    if delta_pct > tol_pct:
        return "expanding"
    if delta_pct < -tol_pct:
        return "compressing"
    return "stable"


# yfinance "Action" strings map to our four-state lastChange enum. The "main"
# action (re-iterating an existing grade) is treated as a reiteration. "init"
# = first coverage. "up" / "down" = grade changes.
_RECOMMENDATION_ACTION_MAP = {
    "up": "upgrade",
    "down": "downgrade",
    "init": "init",
    "main": "reiterate",
    "reit": "reiterate",
}

# Lexicographic compare of analyst grades is unreliable ("Sell" > "Buy"
# alphabetically). Rank them numerically so a higher number == more bullish.
_GRADE_RANK = {
    "strong sell": 1,
    "sell": 2,
    "underperform": 2,
    "underweight": 2,
    "negative": 2,
    "reduce": 2,
    "neutral": 3,
    "hold": 3,
    "equal-weight": 3,
    "equal weight": 3,
    "market perform": 3,
    "sector perform": 3,
    "perform": 3,
    "in-line": 3,
    "buy": 4,
    "overweight": 4,
    "outperform": 4,
    "positive": 4,
    "accumulate": 4,
    "add": 4,
    "strong buy": 5,
    "conviction buy": 5,
}


def _classify_grade_change(from_grade, to_grade):
    """Return 'upgrade' / 'downgrade' / 'reiterate' from two grade strings."""
    if not to_grade:
        return None
    if not from_grade:
        return "init"
    fr = _GRADE_RANK.get(str(from_grade).strip().lower())
    to = _GRADE_RANK.get(str(to_grade).strip().lower())
    if fr is None or to is None:
        # Can't rank → fall back to a string compare
        return "reiterate" if str(from_grade).strip().lower() == str(to_grade).strip().lower() else None
    if to > fr:
        return "upgrade"
    if to < fr:
        return "downgrade"
    return "reiterate"


def _build_recommendations(ticker):
    """Compute the recommendations sub-object for SPEC-031 §5.

    Reads ticker.recommendations (a DataFrame of analyst rec history). We
    report only the most-recent row — its date, the firm, the from/to grade,
    and a normalised lastChange label. Returns None when no rec data is
    available (typical for non-US tickers / commodities / indices).
    """
    try:
        recs = ticker.recommendations
    except Exception:
        recs = None
    if recs is None or getattr(recs, "empty", True):
        return None

    # The DataFrame may be indexed by datetime OR have a "Date" column. Sort
    # so that .iloc[-1] is the most recent row regardless of source ordering.
    try:
        sorted_df = recs.sort_index()
        latest_row = sorted_df.iloc[-1]
        latest_index = sorted_df.index[-1]
    except Exception:
        return None

    last_changed_at = None
    if hasattr(latest_index, "strftime"):
        last_changed_at = latest_index.strftime("%Y-%m-%d")
    else:
        s = str(latest_index)
        if len(s) >= 10:
            last_changed_at = s[:10]

    def _get(row, *names):
        for n in names:
            try:
                v = row.get(n) if hasattr(row, "get") else row[n]
            except (KeyError, IndexError):
                continue
            if v is None:
                continue
            s = str(v).strip()
            if s and s.lower() != "nan":
                return s
        return None

    firm = _get(latest_row, "Firm", "firm")
    from_grade = _get(latest_row, "From Grade", "FromGrade", "fromGrade")
    to_grade = _get(latest_row, "To Grade", "ToGrade", "toGrade")
    action = _get(latest_row, "Action", "action")

    last_change = None
    if action:
        last_change = _RECOMMENDATION_ACTION_MAP.get(action.strip().lower())
    if last_change is None:
        last_change = _classify_grade_change(from_grade, to_grade)

    out = {
        "lastChangedAt": last_changed_at,
        "lastChange": last_change,
        "lastFirm": firm,
        "lastFromGrade": from_grade,
        "lastToGrade": to_grade,
    }
    # If literally nothing came back, treat as no data.
    if not any(v is not None for v in out.values()):
        return None
    return out


def _build_financials(ticker):
    """Compute the financials sub-object for SPEC-031 §5.

    Reads income_stmt / cashflow / balance_sheet from yfinance. Returns None
    when no income statement is available (typical for ETFs / indices /
    macros like ^GSPC). All inner fields are optional — missing rows produce
    None rather than failing the whole block.
    """
    try:
        income = ticker.income_stmt
    except Exception:
        income = None
    if income is None or getattr(income, "empty", True):
        return None

    try:
        cashflow = ticker.cashflow
    except Exception:
        cashflow = None
    try:
        balance = ticker.balance_sheet
    except Exception:
        balance = None

    # --- Revenue ---
    rev_cols, rev_values = _row_series(income, ["Total Revenue", "TotalRevenue"])
    latest_annual = rev_values[0] if rev_values else None
    latest_annual_date = None
    if rev_cols:
        first_col = rev_cols[0]
        if hasattr(first_col, "strftime"):
            latest_annual_date = first_col.strftime("%Y-%m-%d")
        else:
            latest_annual_date = str(first_col)[:10]
    yoy_pct = None
    if len(rev_values) >= 2 and rev_values[0] is not None and rev_values[1] not in (None, 0):
        yoy_pct = (rev_values[0] - rev_values[1]) / rev_values[1] * 100.0
    cagr5y = None
    if len(rev_values) >= 6 and rev_values[0] is not None and rev_values[5] not in (None, 0):
        try:
            cagr5y = ((rev_values[0] / rev_values[5]) ** (1.0 / 5.0) - 1.0) * 100.0
        except (ValueError, ZeroDivisionError):
            cagr5y = None

    # --- Operating margin (per-year op income / total revenue) ---
    _, op_income_values = _row_series(income, ["Operating Income", "OperatingIncome"])
    margins = []
    if rev_values and op_income_values:
        for op, rev in zip(op_income_values, rev_values):
            if op is None or rev in (None, 0):
                margins.append(None)
            else:
                margins.append(op / rev)
    margin_latest = margins[0] if margins else None
    margin_window = [m for m in margins[:5] if m is not None]
    margin_high = max(margin_window) if margin_window else None
    margin_low = min(margin_window) if margin_window else None
    margin_trend = _trend_label(margin_latest, margin_low, margin_high, TREND_MARGIN_TOL)

    # --- Free cash flow (prefer explicit row; fall back to OCF - CapEx) ---
    _, fcf_values = _row_series(cashflow, ["Free Cash Flow", "FreeCashFlow"])
    if not fcf_values:
        _, ocf_values = _row_series(cashflow, ["Operating Cash Flow", "OperatingCashFlow"])
        _, capex_values = _row_series(
            cashflow, ["Capital Expenditure", "CapitalExpenditure", "Capital Expenditures"]
        )
        if ocf_values and capex_values:
            fcf_values = []
            for ocf, capex in zip(ocf_values, capex_values):
                if ocf is None:
                    fcf_values.append(None)
                else:
                    capex_abs = abs(capex) if capex is not None else 0
                    fcf_values.append(ocf - capex_abs)
    fcf_latest = fcf_values[0] if fcf_values else None
    fcf_window = [v for v in fcf_values[:5] if v is not None]
    fcf_avg = sum(fcf_window) / len(fcf_window) if fcf_window else None
    fcf_trend = _trend_vs_avg(fcf_latest, fcf_avg, TREND_FCF_TOL_PCT)

    # --- Balance sheet ---
    total_debt = _row_value(balance, ["Total Debt", "TotalDebt"])
    if total_debt is None:
        long_term = _row_value(balance, ["Long Term Debt", "LongTermDebt"])
        current_debt = _row_value(balance, ["Current Debt", "CurrentDebt"])
        if long_term is not None or current_debt is not None:
            total_debt = (long_term or 0) + (current_debt or 0)

    total_cash = _row_value(
        balance, ["Cash And Short Term Investments", "CashAndShortTermInvestments"]
    )
    if total_cash is None:
        cash_only = _row_value(
            balance, ["Cash And Cash Equivalents", "CashAndCashEquivalents"]
        )
        sti = _row_value(balance, ["Short Term Investments", "ShortTermInvestments"])
        if cash_only is not None or sti is not None:
            total_cash = (cash_only or 0) + (sti or 0)

    net_cash = None
    if total_cash is not None and total_debt is not None:
        net_cash = total_cash - total_debt

    current_assets = _row_value(balance, ["Current Assets", "CurrentAssets"])
    current_liab = _row_value(balance, ["Current Liabilities", "CurrentLiabilities"])
    current_ratio = None
    if current_assets is not None and current_liab not in (None, 0):
        current_ratio = current_assets / current_liab

    return {
        "revenue": {
            "latestAnnual": _safe_number(latest_annual),
            "latestAnnualDate": latest_annual_date,
            "yoyPct": _safe_number(yoy_pct),
            "cagr5y": _safe_number(cagr5y),
        },
        "operatingMargin": {
            "latest": _safe_number(margin_latest),
            "fiveYearHigh": _safe_number(margin_high),
            "fiveYearLow": _safe_number(margin_low),
            "trend": margin_trend,
        },
        "freeCashFlow": {
            "latestAnnual": _safe_number(fcf_latest),
            "fiveYearAvg": _safe_number(fcf_avg),
            "trend": fcf_trend,
        },
        "balanceSheet": {
            "totalDebt": _safe_number(total_debt),
            "totalCash": _safe_number(total_cash),
            "netCash": _safe_number(net_cash),
            "currentRatio": _safe_number(current_ratio),
        },
    }


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

    try:
        financials = _build_financials(ticker)
    except Exception as exc:
        print(
            f"[financials] {symbol}: build failed ({exc}); skipping financials",
            file=sys.stderr,
        )
        financials = None
    if financials is None:
        print(f"[financials] skipping {symbol}: no income statement", file=sys.stderr)
    else:
        company["financials"] = financials

    try:
        recommendations = _build_recommendations(ticker)
    except Exception as exc:
        print(
            f"[recommendations] {symbol}: build failed ({exc}); skipping",
            file=sys.stderr,
        )
        recommendations = None
    if recommendations is None:
        print(f"[recommendations] skipping {symbol}: no rec history", file=sys.stderr)
    else:
        company["recommendations"] = recommendations

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
