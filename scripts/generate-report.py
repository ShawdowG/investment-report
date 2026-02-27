#!/usr/bin/env python3
"""
Generate a fully auto-filled daily investment report using live prices +
rule-based analysis. No API keys or LLM required.

Usage:
  python scripts/generate-report.py            # auto-detect slot from UTC time
  python scripts/generate-report.py eu
  python scripts/generate-report.py us-open
  python scripts/generate-report.py pre-close
  python scripts/generate-report.py pre-close --force   # overwrite existing
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

DISPLAY_NAMES = {
    "^GSPC":   ("^GSPC",     "S&P 500"),
    "^NDX":    ("^NDQ",      "Nasdaq 100"),
    "GC=F":    ("GC=F",      "Gold"),
    "BTC-USD": ("BTC-USD",   "Bitcoin"),
    "ADBE":    ("ADBE.VI",   "Adobe"),
    "NVO":     ("NOVO-B.CO", "Novo Nordisk"),
    "AAPL":    ("AAPL",      "Apple"),
    "TSLA":    ("TSLA",      "Tesla"),
    "GOOG":    ("GOOG",      "Alphabet"),
    "NVDA":    ("NVDA",      "NVIDIA"),
    "AMZN":    ("AMZN",      "Amazon"),
    "MSFT":    ("MSFT",      "Microsoft"),
    "META":    ("META",      "Meta"),
    "DUOL":    ("DUOL",      "Duolingo"),
    "AMD":     ("AMD",       "AMD"),
    "BABA":    ("BABA",      "Alibaba"),
    "LMT":     ("LMT",       "Lockheed Martin"),
    "BA":      ("BA",        "Boeing"),
    "TM":      ("TM",        "Toyota"),
    "V":       ("V",         "Visa"),
    "MA":      ("MA",        "Mastercard"),
    "NFLX":    ("NFLX",      "Netflix"),
    "RDDT":    ("RDDT",      "Reddit"),
}

# Tickers that are indices/macro — excluded from equity breadth
INDEX_TICKERS = {"^GSPC", "^NDQ", "GC=F", "BTC-USD"}

# Sector groupings (display tickers)
TECH_TICKERS     = {"AAPL", "NVDA", "MSFT", "GOOG", "META", "AMZN", "AMD", "ADBE.VI"}
PAYMENTS_TICKERS = {"V", "MA"}
DEFENSE_TICKERS  = {"LMT", "BA"}
GROWTH_TICKERS   = {"NFLX", "DUOL", "RDDT", "TSLA"}
INTL_TICKERS     = {"BABA", "TM", "NOVO-B.CO"}

SLOT_SCHEDULE = {
    ( 7, 12): "eu",
    (14, 17): "us-open",
    (19, 22): "pre-close",
}

SLOT_TITLES = {
    "eu":        "EU/Nordic Morning",
    "us-open":   "US Open +15m",
    "pre-close": "US Pre-close",
}


# ── Price fetch ───────────────────────────────────────────────────────────────

def detect_slot() -> str:
    hour = datetime.now(timezone.utc).hour
    for (start, end), slot in SLOT_SCHEDULE.items():
        if start <= hour < end:
            return slot
    if hour < 7:   return "eu"
    if hour < 14:  return "us-open"
    return "pre-close"


def fetch_prices(symbols: list[str]) -> list[dict]:
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
            closes = raw["Close"] if len(symbols) == 1 else raw[sym]["Close"]
            closes = closes.dropna()
            if len(closes) < 1:
                print(f"  [WARN] No data for {sym}")
                continue
            price      = float(closes.iloc[-1])
            prev       = float(closes.iloc[-2]) if len(closes) >= 2 else price
            pct        = (price - prev) / prev * 100 if prev else 0.0
            change_abs = price - prev
            display_sym, name = DISPLAY_NAMES.get(sym, (sym, sym))
            rows.append({
                "yf_symbol":  sym,
                "ticker":     display_sym,
                "name":       name,
                "price":      price,
                "change_abs": change_abs,
                "change_pct": pct,
            })
        except Exception as e:
            print(f"  [WARN] {sym}: {e}")
    return rows


def format_pct(pct: float) -> str:
    sign = "+" if pct >= 0 else ""
    return f"{sign}{pct:.2f}%"


def fmt_bold(r: dict) -> str:
    return f"**{r['ticker']} ({format_pct(r['change_pct'])})**"


# ── Rule-based analysis engine ────────────────────────────────────────────────

def find(rows: list[dict], ticker: str) -> dict | None:
    return next((r for r in rows if r["ticker"] == ticker), None)


def detect_regime(sp_pct: float, ndx_pct: float, breadth: float,
                  gold_pct: float, btc_pct: float) -> str:
    """Classify market regime from index moves + breadth + macro signals."""
    index_avg = (sp_pct + ndx_pct) / 2

    if index_avg > 0.7 and breadth > 0.65:
        return "risk-on"
    if index_avg > 0.3 and breadth > 0.55:
        return "mild risk-on"
    if index_avg < -0.7 and breadth < 0.35:
        return "risk-off"
    if index_avg < -0.3 and breadth < 0.45:
        return "mild risk-off"
    # Defensive flight: gold up strongly while equities soft
    if gold_pct > 1.0 and index_avg < -0.1:
        return "risk-off / defensive rotation"
    # Mixed: gold up but equities also up
    if gold_pct > 0.5 and index_avg > 0.1:
        return "mixed / cautious risk-on"
    if abs(index_avg) < 0.2 and 0.45 < breadth < 0.55:
        return "neutral"
    if index_avg > 0:
        return "mild risk-on"
    return "mild risk-off"


def sector_read(equity_rows: list[dict]) -> dict:
    """Compute average move per sector group."""
    def avg(tickers):
        relevant = [r for r in equity_rows if r["ticker"] in tickers]
        if not relevant:
            return 0.0
        return sum(r["change_pct"] for r in relevant) / len(relevant)
    return {
        "tech":     avg(TECH_TICKERS),
        "payments": avg(PAYMENTS_TICKERS),
        "defense":  avg(DEFENSE_TICKERS),
        "growth":   avg(GROWTH_TICKERS),
        "intl":     avg(INTL_TICKERS),
    }


def tickers_str(items: list[dict], max_n: int = 4) -> str:
    return ", ".join(fmt_bold(r) for r in items[:max_n])


def generate_alpha(sp_pct, ndx_pct, regime, breadth,
                   positive, negative, flat,
                   outliers_up, outliers_dn,
                   top_gainers, top_losers,
                   sectors, slot) -> list[str]:
    """3 strategic bullet points."""
    bullets = []

    # ── Bullet 1: overall tape structure ──────────────────────────────────────
    n_pos, n_neg, n_flat = len(positive), len(negative), len(flat)
    breadth_pct = int(breadth * 100)

    if "risk-on" in regime and "mild" not in regime:
        b1 = (f"The tape is clearly constructive: indices firm "
              f"(S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}) "
              f"with {breadth_pct}% of tracked names positive — broad participation supports the move.")
    elif "mild risk-on" in regime:
        b1 = (f"Tape is modestly positive: S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}. "
              f"Breadth is constructive ({n_pos} up, {n_neg} down) but not euphoric — "
              f"selective rather than broad-based buying.")
    elif "risk-off" in regime and "mild" not in regime:
        b1 = (f"Clear risk-off session: indices under pressure "
              f"(S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}) "
              f"with {n_neg}/{n_pos + n_neg} tracked names negative — selling is broad, not isolated.")
    elif "mild risk-off" in regime or "defensive" in regime:
        b1 = (f"Session leans risk-off: S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}. "
              f"Breadth is soft ({n_pos} positive vs {n_neg} negative) "
              f"but selling pressure remains orderly — no signs of forced liquidation.")
    else:
        b1 = (f"Indecisive tape: S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)} with "
              f"{n_pos} positive and {n_neg} negative names — "
              f"no clear directional conviction; market digesting recent moves.")
    bullets.append(b1)

    # ── Bullet 2: sector rotation ──────────────────────────────────────────────
    sector_parts = []
    if sectors["defense"] > 1.0:
        sector_parts.append(f"defense bid (avg {format_pct(sectors['defense'])})")
    if sectors["tech"] < -1.5:
        sector_parts.append(f"tech under pressure (avg {format_pct(sectors['tech'])})")
    elif sectors["tech"] > 1.0:
        sector_parts.append(f"tech leading (avg {format_pct(sectors['tech'])})")
    if sectors["payments"] > 0.5:
        sector_parts.append(f"payments holding (avg {format_pct(sectors['payments'])})")
    if sectors["intl"] > 0.5:
        sector_parts.append(f"international strength")
    if sectors["intl"] < -0.8:
        sector_parts.append(f"international weakness")

    if outliers_up or outliers_dn:
        names = [r["ticker"] for r in (outliers_up + outliers_dn)[:3]]
        outlier_note = f"Isolate catalyst-driven outliers ({', '.join(names)}) — these are stock-specific, not market signals."
        bullets.append(outlier_note)
    elif sector_parts:
        bullets.append("Rotation signals: " + "; ".join(sector_parts) + ".")
    else:
        # Fallback: leadership quality note
        top_name = top_gainers[0]["ticker"] if top_gainers else "—"
        bullets.append(
            f"Leadership quality is mixed; {top_name} shows relative strength "
            f"but no single sector is driving the session with conviction."
        )

    # ── Bullet 3: strategic posture recommendation ─────────────────────────────
    if "risk-on" in regime and "mild" not in regime:
        b3 = "Maintain full strategic exposure; add on pullbacks to liquid leaders with confirmed momentum."
    elif "mild risk-on" in regime:
        b3 = ("Keep strategic exposure near target; no urgency to add beta here — "
              "wait for breadth to confirm before sizing up.")
    elif "risk-off" in regime and "mild" not in regime:
        b3 = ("Reduce gross exposure; prioritize capital preservation over catching bounces. "
              "Re-assess after a session of stabilization.")
    elif "mild risk-off" in regime or "defensive" in regime:
        b3 = ("Tilt defensively: trim high-beta positions, avoid forcing new longs into weakness. "
              "Let the tape show stabilization before re-engaging.")
    else:
        b3 = ("Stay patient with current positions; avoid adding or reducing aggressively "
              "until directional clarity emerges — market is range-bound.")
    bullets.append(b3)

    return bullets


def generate_beta(sp_pct, ndx_pct, top_gainers, top_losers,
                  outliers_up, outliers_dn, equity_rows, slot) -> list[str]:
    """3 tactical bullet points for today's session."""
    bullets = []

    # ── Bullet 1: key movers + outlier isolation ───────────────────────────────
    all_outliers = outliers_up + outliers_dn
    if all_outliers:
        names = " / ".join(
            f"{r['ticker']} ({format_pct(r['change_pct'])})" for r in all_outliers[:3]
        )
        bullets.append(
            f"Outlier moves today: {names}. "
            f"These are catalyst-driven (likely earnings or news) — do not read them as market-wide signals."
        )
    else:
        if top_gainers:
            bullets.append(
                f"Top movers: {tickers_str(top_gainers[:3])}. "
                f"No extreme outliers — moves reflect broad tape direction rather than isolated catalysts."
            )

    # ── Bullet 2: entry framework for the slot ────────────────────────────────
    # Find names that are near flat — potential mean-reversion or coiled setups
    flat_names = [r for r in equity_rows if abs(r["change_pct"]) < 0.3]
    flat_str = ", ".join(r["ticker"] for r in flat_names[:4]) if flat_names else None

    if slot == "eu":
        if sp_pct > 0:
            b2 = ("European session showing positive pre-market tone. "
                  "Prefer adding to liquid names early if indices hold gains past the first 30 minutes.")
        else:
            b2 = ("EU open is soft. Avoid pre-market chasing; "
                  "wait for London open confirmation before committing to direction.")
    elif slot == "us-open":
        if sp_pct > 0.2:
            b2 = (f"S&P holding {format_pct(sp_pct)} into open — "
                  f"allow incremental adds in confirmed leaders, but wait for 30-min opening range before sizing up.")
        elif sp_pct < -0.2:
            b2 = (f"S&P opening weak ({format_pct(sp_pct)}). "
                  f"Avoid buying the first dip — let the tape stabilize into the 10am window before re-engaging.")
        else:
            b2 = ("Flat open. Watch for early-session direction to develop; "
                  "prefer breakout entries over market buys in the middle of the range.")
    else:  # pre-close
        if sp_pct > 0.2:
            b2 = ("Indices positive into the close — "
                  "momentum names can be held or lightly added, but avoid chasing late-day rips.")
        elif sp_pct < -0.2:
            b2 = ("Heading into close on weakness — trim exposure rather than adding. "
                  "Final-hour selling can accelerate; protect open profits.")
        else:
            b2 = ("Flat pre-close. Stay with current positions; "
                  "no strong conviction signal for a directional add into end of day.")
    bullets.append(b2)

    # ── Bullet 3: risk management note ───────────────────────────────────────
    if top_losers:
        worst = top_losers[0]
        if worst["change_pct"] < -5:
            bullets.append(
                f"Hard stop discipline: {worst['ticker']} ({format_pct(worst['change_pct'])}) "
                f"shows what happens without exit rules. Keep position sizes appropriate to volatility today."
            )
        else:
            bullets.append(
                f"Manage size on laggards: {tickers_str(top_losers[:3])} are showing weakness — "
                f"cut or hedge rather than averaging down against the tape."
            )
    else:
        bullets.append(
            "Risk management: keep stops snug on any new entries today. "
            "Breadth is not strong enough to absorb wide stop distances."
        )

    return bullets


def generate_discussion(regime, breadth, sp_pct,
                         top_gainers, outliers_up, outliers_dn) -> dict:
    """Alpha vs Beta discussion: agreement / disagreement / resolution."""
    bullish_regime = "risk-on" in regime or "mild risk-on" in regime
    bearish_regime = "risk-off" in regime or "mild risk-off" in regime or "defensive" in regime

    if bullish_regime:
        agreement = (
            f"Regime is {regime} — both strategic and tactical views agree "
            f"that the bias is constructive and positions should stay risk-on."
        )
        disagreement = (
            "Strategic view prefers holding existing exposure for multi-day follow-through; "
            "tactical view is cautious about adding at current levels without a clean pullback entry."
        )
        resolution = (
            "Hold current positions with discipline; add only on intraday dips to support levels. "
            "Do not chase extended names."
        )
    elif bearish_regime:
        agreement = (
            f"Both views agree the tape is {regime} — no urgency to add risk. "
            f"Capital preservation takes priority."
        )
        disagreement = (
            "Strategic view sees this as a normal correction within a larger trend and argues against panic selling; "
            "tactical view notes breadth is weak enough to justify trimming gross exposure now."
        )
        resolution = (
            "Trim highest-beta positions to reduce drawdown risk. "
            "Re-enter with smaller sizes once the tape shows two consecutive sessions of stabilization."
        )
    else:
        agreement = (
            f"Regime is {regime} — both views agree there is no strong edge today. "
            f"The tape is directionless and forcing trades is a mistake."
        )
        disagreement = (
            "Strategic view leans toward holding through chop given the macro backdrop; "
            "tactical view prefers cutting positions to reduce overnight risk in an uncertain tape."
        )
        resolution = (
            "Stay flat on new positions. Monitor existing holdings with tighter stops than usual. "
            "Reassess at the next session with fresh data."
        )

    return {"agreement": agreement, "disagreement": disagreement, "resolution": resolution}


def generate_checklist(top_gainers, top_losers, outliers_up, outliers_dn,
                        sp_pct, ndx_pct, regime, slot) -> list[str]:
    """5 actionable checklist items."""
    items = []

    # 1. Leaders
    if top_gainers:
        items.append(f"Watch upside leaders for continuation: {tickers_str(top_gainers[:5])}")
    # 2. Laggards
    if top_losers:
        items.append(f"Monitor laggards for hidden weakness: {tickers_str(top_losers[:5])}")

    # 3. Outlier note
    if outliers_up:
        names = ", ".join(r["ticker"] for r in outliers_up[:2])
        items.append(f"Treat large-gap winners ({names}) as isolated events — confirm catalyst before entering.")
    if outliers_dn:
        names = ", ".join(r["ticker"] for r in outliers_dn[:2])
        items.append(f"Avoid catching falling knives: {names} — wait for a full session of base-building before re-entry.")

    # 4. Index breadth checkpoint
    breadth_note = (
        f"Confirm whether index move (S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}) "
        f"is backed by broad participation or driven by just 2–3 names."
    )
    items.append(breadth_note)

    # 5. Session-specific risk note
    if slot == "pre-close":
        items.append("Pre-close: avoid adding new positions in the last 30 minutes — let today's price discovery complete.")
    elif slot == "us-open":
        items.append("Reassess gross exposure after the 30-minute opening range sets — do not trade the first 5 minutes.")
    else:
        items.append("EU session: watch US futures for directional cue into the New York open.")

    return items[:5]


def generate_summary(sp_pct, ndx_pct, breadth, top_gainers,
                      outliers_up, regime, slot) -> tuple[str, str, str]:
    """Returns (summary, main_driver, posture) strings."""
    breadth_pct = int(breadth * 100)
    title = SLOT_TITLES[slot]

    # Summary (one sentence for frontmatter)
    leaders = ", ".join(r["ticker"] for r in top_gainers[:3])
    summary = (
        f"{title} shows {regime} conditions. "
        f"S&P {format_pct(sp_pct)}, NDQ {format_pct(ndx_pct)}, "
        f"{breadth_pct}% of tracked names positive, led by {leaders}."
    )

    # Main driver
    if outliers_up:
        main_driver = (
            f"Session dominated by idiosyncratic movers "
            f"({', '.join(r['ticker'] for r in outliers_up[:2])}) alongside "
            f"{'broad index strength' if sp_pct > 0 else 'soft index backdrop'}."
        )
    elif sp_pct > 0.4:
        main_driver = f"Index-driven bid (S&P {format_pct(sp_pct)}) with {breadth_pct}% breadth support."
    elif sp_pct < -0.4:
        main_driver = f"Index-led selling (S&P {format_pct(sp_pct)}) with {breadth_pct}% of names positive."
    else:
        main_driver = f"Quiet session; S&P {format_pct(sp_pct)}, no dominant catalyst — tape drifting."

    # Posture
    if "risk-on" in regime and "mild" not in regime:
        posture = "Fully pro-risk — hold longs, tighten stops only on extended names."
    elif "mild risk-on" in regime:
        posture = "Slightly pro-risk with discipline — add on strength confirmation, avoid over-sizing."
    elif "risk-off" in regime and "mild" not in regime:
        posture = "Defensive — reduce gross, protect capital, no new longs until tape stabilizes."
    elif "mild risk-off" in regime or "defensive" in regime:
        posture = "Cautious — tilt defensively, trim beta, wait for stabilization signal."
    else:
        posture = "Neutral — hold current positions, no new directional bets until clarity improves."

    return summary, main_driver, posture


# ── GAMMA table ───────────────────────────────────────────────────────────────

def build_gamma_table(rows: list[dict]) -> str:
    lines = ["Ticker | Price | Δ%", "---|---:|---:"]
    for r in rows:
        lines.append(f"{r['ticker']} | {r['price']:.2f} | {format_pct(r['change_pct'])}")
    return "\n".join(lines)


def load_previous_regime() -> str:
    index_path = os.path.join(ROOT, "data", "search-index.json")
    try:
        with open(index_path, encoding="utf-8") as f:
            index = json.load(f)
        return index.get("items", [{}])[0].get("regime", "neutral")
    except Exception:
        return "neutral"


# ── Full report assembly ──────────────────────────────────────────────────────

def build_report(slot: str, date_str: str, rows: list[dict]) -> str:
    # ── Split rows into index vs equity ───────────────────────────────────────
    equity_rows = [r for r in rows if r["ticker"] not in INDEX_TICKERS]

    sp   = find(rows, "^GSPC")
    ndx  = find(rows, "^NDQ")
    gold = find(rows, "GC=F")
    btc  = find(rows, "BTC-USD")

    sp_pct   = sp["change_pct"]   if sp   else 0.0
    ndx_pct  = ndx["change_pct"]  if ndx  else 0.0
    gold_pct = gold["change_pct"] if gold else 0.0
    btc_pct  = btc["change_pct"]  if btc  else 0.0

    positive = [r for r in equity_rows if r["change_pct"] >  0.05]
    negative = [r for r in equity_rows if r["change_pct"] < -0.05]
    flat     = [r for r in equity_rows if abs(r["change_pct"]) <= 0.05]
    breadth  = len(positive) / len(equity_rows) if equity_rows else 0.5

    all_sorted   = sorted(equity_rows, key=lambda r: r["change_pct"], reverse=True)
    top_gainers  = all_sorted[:5]
    top_losers   = all_sorted[-5:][::-1]
    outliers_up  = [r for r in equity_rows if r["change_pct"] >  5.0]
    outliers_dn  = [r for r in equity_rows if r["change_pct"] < -5.0]

    sectors = sector_read(equity_rows)
    regime  = detect_regime(sp_pct, ndx_pct, breadth, gold_pct, btc_pct)

    # ── Generate sections ─────────────────────────────────────────────────────
    alpha      = generate_alpha(sp_pct, ndx_pct, regime, breadth,
                                positive, negative, flat,
                                outliers_up, outliers_dn,
                                top_gainers, top_losers, sectors, slot)
    beta       = generate_beta(sp_pct, ndx_pct, top_gainers, top_losers,
                               outliers_up, outliers_dn, equity_rows, slot)
    discussion = generate_discussion(regime, breadth, sp_pct,
                                     top_gainers, outliers_up, outliers_dn)
    checklist  = generate_checklist(top_gainers, top_losers, outliers_up, outliers_dn,
                                    sp_pct, ndx_pct, regime, slot)
    summary, main_driver, posture = generate_summary(
        sp_pct, ndx_pct, breadth, top_gainers, outliers_up, regime, slot
    )

    gamma_table  = build_gamma_table(rows)
    tickers_fm   = ", ".join(r["ticker"] for r in rows)
    now_iso      = datetime.now(timezone.utc).isoformat(timespec="seconds")
    title        = SLOT_TITLES[slot]

    alpha_md     = "\n".join(f"- {b}" for b in alpha)
    beta_md      = "\n".join(f"- {b}" for b in beta)
    checklist_md = "\n".join(f"- {item}" for item in checklist)

    return f"""---
date: {date_str}
slot: {slot}
title: {title}
regime: {regime}
summary: {summary}
tickers: [{tickers_fm}]
---

# {title} — {date_str}

- **Regime:** {regime}
- **Main driver:** {main_driver}
- **Posture:** {posture}

## 1) GAMMA — Data Pack
{gamma_table}

## 2) ALPHA — Strategic View
{alpha_md}

## 3) BETA — Tactical View
{beta_md}

## 4) Agent Discussion
- **Agreement:** {discussion['agreement']}
- **Disagreement:** {discussion['disagreement']}
- **Resolution:** {discussion['resolution']}

## 5) Unified Action Checklist
{checklist_md}

## 6) Source & Verification Notes
- Snapshot source: yfinance auto-fetch generated {now_iso}.
- Proxy mapping used: ADBE.VI → ADBE.US, NOVO-B.CO → NVO.US (ADR).
- Analysis generated by rule-based engine (no LLM). All text is derived deterministically from price data.
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args  = sys.argv[1:]
    force = "--force" in args
    args  = [a for a in args if a != "--force"]

    slot = args[0] if args else detect_slot()
    if slot not in SLOT_TITLES:
        print(f"Unknown slot '{slot}'. Use: eu | us-open | pre-close")
        sys.exit(1)

    date_str = datetime.now(timezone(timedelta(hours=1))).strftime("%Y-%m-%d")
    print(f"Generating report: {date_str} / {slot}")

    rows = fetch_prices(WATCHLIST)
    if not rows:
        print("ERROR: No price data fetched. Aborting.")
        sys.exit(1)

    out_path = os.path.join(ROOT, "reports", "daily", f"{date_str}-{slot}.md")

    if os.path.exists(out_path) and not force:
        print(f"Report already exists: {out_path}")
        print("Use --force to overwrite.")
        sys.exit(1)

    report = build_report(slot, date_str, rows)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Written: {out_path}")
    print(f"\n{'Ticker':<12} {'Price':>10} {'Chg%':>8}")
    print("-" * 32)
    for r in sorted(rows, key=lambda x: x["change_pct"], reverse=True):
        print(f"{r['ticker']:<12} {r['price']:>10.2f} {format_pct(r['change_pct']):>8}")


if __name__ == "__main__":
    main()
