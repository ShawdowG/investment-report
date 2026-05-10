"""
Canonical ticker list for the v4 cockpit. Single source of truth shared by
fetch-snapshot.py (intraday quotes) and fetch-quotes.py (daily OHLCV history).

To add a ticker: append to TICKERS, optionally add a friendly NAME entry.
Use Yahoo Finance symbols.
"""

TICKERS = [
    # Crypto + Commodities
    "BTC-USD",
    "GC=F",
    # Indices
    "^GSPC",
    "^NDX",
    # Mega-caps
    "AAPL",
    "TSLA",
    "GOOG",
    "NVDA",
    "AMZN",
    "MSFT",
    "META",
    # Growth / tech
    "DUOL",
    "ADBE",
    "AMD",
    "BABA",
    # Industrials
    "LMT",
    "BA",
    "TM",
    # Financials
    "V",
    "MA",
    # Media / social
    "NFLX",
    "RDDT",
    # Healthcare
    "NVO",
]

# Macro indicators — fetched only by intraday snapshot, not daily quotes
MACRO = {
    "VIX": "^VIX",
    "DXY": "DX-Y.NYB",
    "US10Y": "^TNX",
}

NAMES = {
    "BTC-USD": "Bitcoin",
    "GC=F": "Gold",
    "^GSPC": "S&P 500",
    "^NDX": "Nasdaq 100",
    "AAPL": "Apple",
    "TSLA": "Tesla",
    "GOOG": "Alphabet",
    "NVDA": "NVIDIA",
    "AMZN": "Amazon",
    "MSFT": "Microsoft",
    "META": "Meta",
    "DUOL": "Duolingo",
    "ADBE": "Adobe",
    "AMD": "AMD",
    "BABA": "Alibaba",
    "LMT": "Lockheed Martin",
    "BA": "Boeing",
    "TM": "Toyota",
    "V": "Visa",
    "MA": "Mastercard",
    "NFLX": "Netflix",
    "RDDT": "Reddit",
    "NVO": "Novo Nordisk",
}
