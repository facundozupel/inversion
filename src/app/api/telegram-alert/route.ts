import { NextResponse } from "next/server";
import { analyzeCandles } from "@/lib/candle-patterns";
import { computeVixStatus, computeSafeToTrade } from "@/lib/market-context";

const STOCKS = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq ETF" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Google" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "JPM", name: "JPMorgan" },
  { symbol: "V", name: "Visa" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
];

async function fetchChart(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d&includePrePost=false`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) return null;
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  return timestamps.map((t: number, i: number) => ({
    time: t,
    open: quote.open?.[i],
    high: quote.high?.[i],
    low: quote.low?.[i],
    close: quote.close?.[i],
    volume: quote.volume?.[i],
  })).filter((c: { open: number | null }) => c.open !== null);
}

async function fetchMarketContext() {
  const symbols = ["^GSPC", "^IXIC", "^VIX"];
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d&includePrePost=false`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) return null;
      const json = await res.json();
      return json.chart?.result?.[0]?.meta ?? null;
    })
  );

  const getMeta = (i: number) => results[i].status === "fulfilled" ? results[i].value : null;

  const indices = [
    { symbol: "^GSPC", name: "S&P 500", meta: getMeta(0) },
    { symbol: "^IXIC", name: "Nasdaq", meta: getMeta(1) },
  ].map((idx) => {
    const price = idx.meta?.regularMarketPrice ?? 0;
    const prev = idx.meta?.chartPreviousClose ?? price;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    return { ...idx, price, change, changePercent, isPositive: change >= 0 };
  });

  const vixMeta = getMeta(2);
  const vixLevel = vixMeta?.regularMarketPrice ?? 0;
  const vixPrev = vixMeta?.chartPreviousClose ?? vixLevel;
  const vix = {
    level: vixLevel,
    change: vixLevel - vixPrev,
    changePercent: vixPrev ? ((vixLevel - vixPrev) / vixPrev) * 100 : 0,
    status: computeVixStatus(vixLevel),
  };

  return { indices, vix };
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
  return res.ok;
}

export async function GET() {
  const market = await fetchMarketContext();
  const safeToTrade = computeSafeToTrade(market.vix, market.indices);

  // Header
  let msg = "*REPORTE DIARIO DE INVERSION*\n";
  msg += new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + "\n\n";

  // Mercado
  msg += "*CONTEXTO DEL MERCADO*\n";
  for (const idx of market.indices) {
    const arrow = idx.isPositive ? "+" : "";
    msg += `${idx.name}: ${idx.price.toFixed(2)} (${arrow}${idx.changePercent.toFixed(2)}%)\n`;
  }
  msg += `VIX: ${market.vix.level.toFixed(2)} — ${market.vix.status === "danger" ? "PELIGRO" : market.vix.status === "elevated" ? "ELEVADO" : "NORMAL"}\n`;
  msg += `\n${safeToTrade ? "SEGURO PARA OPERAR" : "PRECAUCION — NO IDEAL PARA OPERAR"}\n\n`;

  // Analizar cada stock
  const buySignals: string[] = [];
  const sellSignals: string[] = [];
  const waitSignals: string[] = [];

  for (const stock of STOCKS) {
    const candles = await fetchChart(stock.symbol);
    if (!candles || candles.length < 5) continue;
    const analysis = analyzeCandles(candles);
    if (!analysis) continue;

    const last = candles[candles.length - 1];
    const price = last.close < 10 ? last.close.toFixed(4) : last.close.toFixed(2);
    const rsiTag = analysis.rsi.status === "sobrevendido" ? " [RSI " + analysis.rsi.value + " SOBREVENDIDO]" : analysis.rsi.status === "sobrecomprado" ? " [RSI " + analysis.rsi.value + " SOBRECOMPRADO]" : " [RSI " + analysis.rsi.value + "]";
    const line = `${stock.symbol} (${stock.name}) — $${price}${rsiTag} | Score: ${analysis.score > 0 ? "+" : ""}${analysis.score}`;

    if (analysis.action === "buy") {
      buySignals.push(line + `\n  Target: $${analysis.target < 10 ? analysis.target.toFixed(4) : analysis.target.toFixed(2)} | Stop: $${analysis.stopLoss < 10 ? analysis.stopLoss.toFixed(4) : analysis.stopLoss.toFixed(2)}`);
    } else if (analysis.action === "sell") {
      sellSignals.push(`${stock.symbol} — $${price}`);
    } else {
      waitSignals.push(`${stock.symbol} — $${price}`);
    }
  }

  // Senales
  if (buySignals.length > 0) {
    msg += "*COMPRAR*\n";
    for (const s of buySignals) msg += s + "\n";
    msg += "\n";
  }

  if (sellSignals.length > 0) {
    msg += "*VENDER*\n";
    msg += sellSignals.join("\n") + "\n\n";
  }

  if (waitSignals.length > 0) {
    msg += "*ESPERAR*\n";
    msg += waitSignals.join("\n") + "\n\n";
  }

  if (buySignals.length === 0) {
    msg += "_Ningun activo cumple las condiciones hoy. No operar._\n\n";
  }

  msg += `Ver detalle: https://inversion.facundo.click`;

  const sent = await sendTelegram(msg);

  return NextResponse.json({
    ok: sent,
    safe: safeToTrade,
    buy: buySignals.length,
    sell: sellSignals.length,
    wait: waitSignals.length,
  });
}
