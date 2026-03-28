import { NextRequest, NextResponse } from "next/server";

const SKIP_SYMBOLS = new Set(["BTC-USD", "ETH-USD", "EURUSD=X"]);

async function fetchEarningsDate(symbol: string): Promise<{ symbol: string; earningsDate: number | null }> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { symbol, earningsDate: null };
    const json = await res.json();
    const dates = json.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate;
    if (dates && dates.length > 0) {
      return { symbol, earningsDate: dates[0].raw };
    }
    return { symbol, earningsDate: null };
  } catch {
    return { symbol, earningsDate: null };
  }
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") || "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !SKIP_SYMBOLS.has(s));

  if (symbols.length === 0) {
    return NextResponse.json({ earnings: [] });
  }

  const results = await Promise.allSettled(symbols.map(fetchEarningsDate));

  const now = Date.now();
  const oneDay = 86400000;

  const earnings = results
    .filter((r): r is PromiseFulfilledResult<{ symbol: string; earningsDate: number | null }> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.earningsDate !== null)
    .map((r) => {
      const daysUntil = Math.ceil((r.earningsDate! * 1000 - now) / oneDay);
      return {
        symbol: r.symbol,
        earningsDate: r.earningsDate!,
        daysUntil,
        isRedFlag: daysUntil >= 0 && daysUntil <= 3,
      };
    })
    .filter((r) => r.daysUntil >= -1 && r.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return NextResponse.json({ earnings });
}
