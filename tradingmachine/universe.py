"""Named baskets of symbols to scan.

Screening is only useful if you can point it at a real list without typing 200
tickers. These are curated, liquid, and grouped the way a desk actually thinks
about them — by sector, by asset class, by size.
"""

from __future__ import annotations

MEGACAP = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "AVGO", "TSLA", "BRK-B",
    "JPM", "LLY", "V", "XOM", "UNH", "MA", "COST", "HD", "PG", "JNJ", "WMT",
    "NFLX", "ORCL", "ABBV", "BAC", "CRM", "CVX", "KO", "AMD", "PEP", "TMO",
]

TECH = [
    "AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "CRM", "AMD", "ADBE", "CSCO", "ACN",
    "INTC", "QCOM", "TXN", "INTU", "IBM", "NOW", "AMAT", "MU", "ADI", "LRCX",
    "KLAC", "PANW", "SNPS", "CDNS", "ANET", "MRVL", "FTNT", "ON", "SMCI", "DELL",
]

COMMS = ["GOOGL", "META", "NFLX", "DIS", "CMCSA", "T", "VZ", "TMUS", "EA", "WBD"]

FINANCIALS = [
    "BRK-B", "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "AXP", "SPGI",
    "BLK", "C", "SCHW", "CB", "PGR", "MMC", "PYPL", "COF", "USB", "PNC",
]

HEALTHCARE = [
    "LLY", "UNH", "JNJ", "ABBV", "MRK", "TMO", "ABT", "DHR", "PFE", "AMGN",
    "ISRG", "BMY", "GILD", "VRTX", "CVS", "MDT", "REGN", "ELV", "CI", "ZTS",
]

CONSUMER = [
    "AMZN", "TSLA", "WMT", "COST", "HD", "PG", "KO", "PEP", "MCD", "NKE",
    "SBUX", "LOW", "TJX", "BKNG", "MDLZ", "CL", "MO", "PM", "TGT", "DG",
]

ENERGY = ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "WMB"]

INDUSTRIALS = [
    "CAT", "GE", "RTX", "UNP", "HON", "BA", "LMT", "DE", "UPS", "ADP",
    "ETN", "ITW", "NOC", "GD", "CSX", "EMR", "FDX", "WM", "PH", "NSC",
]

MATERIALS_UTILITIES = [
    "LIN", "SHW", "APD", "ECL", "FCX", "NEM", "NEE", "DUK", "SO", "D",
    "AEP", "SRE", "EXC", "XEL", "ED",
]

REITS = ["PLD", "AMT", "EQIX", "WELL", "SPG", "PSA", "O", "CCI", "DLR", "VICI"]

#: Broad index, sector, bond, and commodity ETFs — the cheapest way to trade a
#: theme without single-name risk.
ETFS = [
    "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO",          # broad US
    "XLK", "XLF", "XLE", "XLV", "XLY", "XLP",           # sectors
    "XLI", "XLU", "XLB", "XLRE", "XLC",
    "EFA", "EEM", "FXI", "EWJ", "EWZ",                  # international
    "TLT", "IEF", "SHY", "LQD", "HYG", "AGG",           # bonds
    "GLD", "SLV", "USO", "UNG", "DBC",                  # commodities
    "ARKK", "SMH", "SOXX", "IBIT", "VNQ",               # thematic
]

CRYPTO = [
    "BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "ADA-USD",
    "AVAX-USD", "DOGE-USD", "LINK-USD", "DOT-USD", "LTC-USD",
]

#: High-attention retail names — meme stocks, short-squeeze candidates, and the
#: speculative-growth tickers that trend on social feeds.
#:
#: These move on narrative and positioning, not earnings. Expect ATR to run
#: 5–15% of price where a megacap runs 1–2%, which means ATR sizing will hand
#: you a much smaller position for the same dollar risk — that is the system
#: working, not a bug. Several have no profits and some are heavily shorted.
MEME_STOCKS = [
    "GME", "AMC", "BB", "PLTR", "SOFI", "HOOD", "RIVN", "LCID", "DJT",
    "MSTR", "COIN", "MARA", "RIOT", "SMCI", "IONQ", "RKLB", "ASTS",
    "CVNA", "AFRM", "UPST", "NIO", "CHPT", "PLUG", "SPCE", "TLRY",
    "WULF", "BBAI", "SOUN", "QBTS", "RGTI", "OKLO", "CRCL", "HIMS",
    "APP", "TSLA", "NVDA",
]

#: Memecoins. The most speculative sleeve here by a wide margin: no cash flows,
#: no floor, and drawdowns of 80–90% are routine rather than exceptional.
MEMECOINS = [
    "DOGE-USD", "SHIB-USD", "PEPE-USD", "WIF-USD", "BONK-USD", "FLOKI-USD",
    "TRUMP-USD", "POPCAT-USD", "MOG-USD", "TURBO-USD", "SPX-USD",
    "FARTCOIN-USD", "BOME-USD",
]

FOREX = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "AUDUSD=X", "USDCAD=X",
    "USDCHF=X", "NZDUSD=X", "EURGBP=X", "EURJPY=X", "GBPJPY=X",
]

FUTURES = ["ES=F", "NQ=F", "YM=F", "RTY=F", "CL=F", "GC=F", "SI=F", "ZN=F", "NG=F", "HG=F"]

INDICES = ["^GSPC", "^NDX", "^DJI", "^RUT", "^VIX", "^FTSE", "^N225", "^GDAXI"]

SECTORS: dict[str, list[str]] = {
    "tech": TECH,
    "comms": COMMS,
    "financials": FINANCIALS,
    "healthcare": HEALTHCARE,
    "consumer": CONSUMER,
    "energy": ENERGY,
    "industrials": INDUSTRIALS,
    "materials": MATERIALS_UTILITIES,
    "reits": REITS,
}


def _dedupe(symbols: list[str]) -> list[str]:
    seen: dict[str, None] = {}
    for s in symbols:
        seen.setdefault(s.strip().upper(), None)
    return list(seen)


#: Everything equity-ish: the union of every sector plus the ETF sleeve.
STOCKS = _dedupe([s for group in SECTORS.values() for s in group])
ALL_EQUITY = _dedupe(STOCKS + ETFS)
FOMO = _dedupe(MEME_STOCKS + MEMECOINS)
EVERYTHING = _dedupe(ALL_EQUITY + CRYPTO + FOREX + FUTURES + INDICES + FOMO)

UNIVERSES: dict[str, list[str]] = {
    "megacap": MEGACAP,
    "stocks": STOCKS,
    "etfs": ETFS,
    "equity": ALL_EQUITY,
    "crypto": CRYPTO,
    "forex": FOREX,
    "futures": FUTURES,
    "indices": INDICES,
    "meme": MEME_STOCKS,
    "memecoins": MEMECOINS,
    "fomo": FOMO,
    "everything": EVERYTHING,
    **SECTORS,
}

#: Baskets whose volatility and drawdown profile warrant an explicit warning
#: in any UI that offers them.
HIGH_RISK = {"meme", "memecoins", "fomo"}


def resolve(spec: str | list[str] | None) -> list[str]:
    """Turn a universe name, a comma list, or an explicit list into symbols.

        resolve("tech")              -> the tech basket
        resolve("megacap,crypto")    -> both baskets, de-duplicated
        resolve("AAPL,MSFT")         -> those two symbols
        resolve(["AAPL", "tech"])    -> mixes names and tickers freely
    """
    if spec is None:
        return list(MEGACAP)
    parts = spec.split(",") if isinstance(spec, str) else list(spec)

    out: list[str] = []
    for raw in parts:
        token = raw.strip()
        if not token:
            continue
        key = token.lower()
        if key in UNIVERSES:
            out.extend(UNIVERSES[key])
        else:
            # Not a basket name, so treat it as a ticker as typed.
            out.append(token.upper())
    return _dedupe(out)


def describe(symbol: str) -> str:
    """Best-effort asset class for a symbol, for grouping in the UI."""
    s = symbol.upper()
    if s in MEMECOINS:
        return "memecoin"
    if s in CRYPTO or s.endswith("-USD"):
        return "crypto"
    if s in MEME_STOCKS and s not in STOCKS:
        return "meme"
    if s.endswith("=X"):
        return "forex"
    if s.endswith("=F"):
        return "futures"
    if s.startswith("^"):
        return "index"
    if s in ETFS:
        return "etf"
    for name, group in SECTORS.items():
        if s in group:
            return name
    return "stock"


def universe_names() -> list[str]:
    return sorted(UNIVERSES)
