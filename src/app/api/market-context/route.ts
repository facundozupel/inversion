import { NextResponse } from "next/server";
import { computeVixStatus, computePutCallStatus } from "@/lib/market-context";

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

async function fetchPutCallRatio() {
  try {
    const res = await fetch("https://cdn.cboe.com/api/global/delayed_quotes/options/_SPX.json", {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const opts = json.data?.options || [];

    let putVol = 0;
    let callVol = 0;
    for (const o of opts) {
      const sym: string = o.option || "";
      const vol: number = o.volume || 0;
      let optType: string | null = null;
      for (const ch of sym.slice(3)) {
        if (ch === "C") { optType = "C"; break; }
        if (ch === "P") { optType = "P"; break; }
      }
      if (optType === "P") putVol += vol;
      else if (optType === "C") callVol += vol;
    }

    if (callVol === 0) return null;
    const ratio = Math.round((putVol / callVol) * 1000) / 1000;
    const status = computePutCallStatus(ratio);

    let description: string;
    if (status === "miedo") {
      description = "Ratio " + ratio.toFixed(2) + " — mas puts que calls. Los institucionales se estan cubriendo. Sentimiento de miedo.";
    } else if (status === "codicia") {
      description = "Ratio " + ratio.toFixed(2) + " — mas calls que puts. Los institucionales apuestan al alza. Sentimiento de codicia (precaucion).";
    } else {
      description = "Ratio " + ratio.toFixed(2) + " — equilibrio entre puts y calls. Sentimiento neutral.";
    }

    return { ratio, putVolume: putVol, callVolume: callVol, status, description };
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.allSettled([
    ...INDICES.map((i) => fetchQuote(i.symbol)),
    fetchQuote("^VIX"),
    fetchPutCallRatio(),
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

  const putCallResult = results[INDICES.length + 1];
  const putCall = putCallResult.status === "fulfilled" ? putCallResult.value : null;

  return NextResponse.json({ indices, vix, putCall });
}
