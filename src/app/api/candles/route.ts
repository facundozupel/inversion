import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get("symbol") || "AAPL";
  const range = searchParams.get("range") || "6mo";
  const interval = searchParams.get("interval") || "1d";

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: res.status }
    );
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];

  if (!result) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};

  const candles = timestamps.map((t: number, i: number) => ({
    time: t,
    open: quote.open?.[i],
    high: quote.high?.[i],
    low: quote.low?.[i],
    close: quote.close?.[i],
    volume: quote.volume?.[i],
  })).filter((c: { open: number | null }) => c.open !== null);

  return NextResponse.json({
    symbol: meta.symbol,
    currency: meta.currency,
    exchangeName: meta.exchangeName,
    candles,
  });
}
