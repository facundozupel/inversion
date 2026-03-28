import { NextResponse } from "next/server";
import { computeVixStatus } from "@/lib/market-context";

const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
];

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&includePrePost=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 120 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.chart?.result?.[0]?.meta ?? null;
}

export async function GET() {
  const results = await Promise.allSettled([
    ...INDICES.map((i) => fetchQuote(i.symbol)),
    fetchQuote("^VIX"),
  ]);

  const indices = INDICES.map((idx, i) => {
    const meta = results[i].status === "fulfilled" ? results[i].value : null;
    if (!meta) {
      return { symbol: idx.symbol, name: idx.name, price: 0, change: 0, changePercent: 0, isPositive: true };
    }
    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    return {
      symbol: idx.symbol,
      name: idx.name,
      price,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  });

  const vixResult = results[INDICES.length];
  const vixMeta = vixResult.status === "fulfilled" ? vixResult.value : null;
  const vixLevel = vixMeta?.regularMarketPrice ?? 0;
  const vixPrev = vixMeta?.chartPreviousClose ?? vixMeta?.previousClose ?? vixLevel;
  const vixChange = vixLevel - vixPrev;
  const vixChangePercent = vixPrev ? (vixChange / vixPrev) * 100 : 0;

  const vix = {
    level: vixLevel,
    change: vixChange,
    changePercent: vixChangePercent,
    status: computeVixStatus(vixLevel),
  };

  return NextResponse.json({ indices, vix });
}
