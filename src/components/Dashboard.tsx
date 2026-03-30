"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import CandlestickChart from "@/components/CandlestickChart";
import MarketContext from "@/components/MarketContext";
import { analyzeCandles, CandleAnalysis } from "@/lib/candle-patterns";
import { EarningsEvent } from "@/lib/market-context";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockData {
  symbol: string;
  currency: string;
  exchangeName: string;
  candles: CandleData[];
}

interface StockSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  analysis: CandleAnalysis | null;
  loading: boolean;
}

const STOCK_CATEGORIES = [
  {
    category: "Indices / ETFs",
    stocks: [
      { symbol: "SPY", name: "S&P 500 ETF" },
      { symbol: "QQQ", name: "Nasdaq ETF" },
    ],
  },
  {
    category: "Big Tech",
    stocks: [
      { symbol: "AAPL", name: "Apple" },
      { symbol: "MSFT", name: "Microsoft" },
      { symbol: "GOOGL", name: "Google" },
      { symbol: "AMZN", name: "Amazon" },
      { symbol: "META", name: "Meta" },
      { symbol: "TSLA", name: "Tesla" },
      { symbol: "NFLX", name: "Netflix" },
    ],
  },
  {
    category: "Semiconductores",
    stocks: [
      { symbol: "NVDA", name: "NVIDIA" },
      { symbol: "AMD", name: "AMD" },
      { symbol: "AVGO", name: "Broadcom" },
      { symbol: "TSM", name: "TSMC" },
      { symbol: "ARM", name: "ARM Holdings" },
      { symbol: "INTC", name: "Intel" },
      { symbol: "QCOM", name: "Qualcomm" },
      { symbol: "MU", name: "Micron" },
      { symbol: "MRVL", name: "Marvell" },
      { symbol: "SMCI", name: "Super Micro" },
    ],
  },
  {
    category: "Tech / Software",
    stocks: [
      { symbol: "CRM", name: "Salesforce" },
      { symbol: "PLTR", name: "Palantir" },
    ],
  },
  {
    category: "Salud / Pharma",
    stocks: [
      { symbol: "LLY", name: "Eli Lilly" },
      { symbol: "UNH", name: "UnitedHealth" },
      { symbol: "PFE", name: "Pfizer" },
      { symbol: "ABBV", name: "AbbVie" },
      { symbol: "MRNA", name: "Moderna" },
    ],
  },
  {
    category: "Finanzas / Otros",
    stocks: [
      { symbol: "JPM", name: "JPMorgan" },
      { symbol: "V", name: "Visa" },
      { symbol: "DIS", name: "Disney" },
    ],
  },
  {
    category: "Crypto / Forex",
    stocks: [
      { symbol: "BTC-USD", name: "Bitcoin" },
      { symbol: "ETH-USD", name: "Ethereum" },
      { symbol: "EURUSD=X", name: "EUR/USD" },
    ],
  },
];

const STOCKS = STOCK_CATEGORIES.flatMap((cat) => cat.stocks);

const RANGES = [
  { label: "1M", value: "1mo", interval: "1d" },
  { label: "3M", value: "3mo", interval: "1d" },
  { label: "6M", value: "6mo", interval: "1d" },
  { label: "1A", value: "1y", interval: "1wk" },
  { label: "5A", value: "5y", interval: "1mo" },
];

const SIGNAL_CONFIG = {
  strong_buy: { label: "Compra Fuerte", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  buy: { label: "Compra", color: "text-green-600", bg: "bg-green-50/50", border: "border-green-100" },
  hold: { label: "Mantener", color: "text-neutral-500", bg: "bg-neutral-50", border: "border-neutral-200" },
  sell: { label: "Venta", color: "text-red-500", bg: "bg-red-50/50", border: "border-red-100" },
  strong_sell: { label: "Venta Fuerte", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

function SignalBadge({ signal, score }: { signal: keyof typeof SIGNAL_CONFIG; score: number }) {
  const cfg = SIGNAL_CONFIG[signal];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      {cfg.label}
      <span className="opacity-60">{score > 0 ? "+" : ""}{score}</span>
    </div>
  );
}

function SignalDot({ type }: { type: "bullish" | "bearish" | "neutral" }) {
  const colors = { bullish: "bg-green-500", bearish: "bg-red-500", neutral: "bg-neutral-400" };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[type]} mt-1.5 shrink-0`} />;
}

const ACTION_CONFIG = {
  buy: { label: "COMPRAR", color: "text-white", bg: "bg-green-600" },
  sell: { label: "VENDER", color: "text-white", bg: "bg-red-600" },
  wait: { label: "ESPERAR", color: "text-neutral-600", bg: "bg-neutral-200" },
};

function ActionBadge({ action }: { action: "buy" | "sell" | "wait" }) {
  const cfg = ACTION_CONFIG[action];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const [summaries, setSummaries] = useState<StockSummary[]>(
    STOCKS.map((s) => ({ ...s, price: 0, change: 0, analysis: null, loading: true }))
  );
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [earningsFlags, setEarningsFlags] = useState<Record<string, EarningsEvent>>({});
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRange, setActiveRange] = useState("6mo");
  const [showOnlyReady, setShowOnlyReady] = useState(false);
  const [investAmount, setInvestAmount] = useState<string>("10000");

  useEffect(() => {
    STOCKS.forEach(async (stock) => {
      try {
        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(stock.symbol)}&range=3mo&interval=1d`);
        if (!res.ok) throw new Error();
        const json: StockData = await res.json();
        if (json.candles && json.candles.length > 0) {
          const last = json.candles[json.candles.length - 1];
          const first = json.candles[0];
          const change = first.open ? ((last.close - first.open) / first.open) * 100 : 0;
          const analysis = analyzeCandles(json.candles);
          setSummaries((prev) =>
            prev.map((s) =>
              s.symbol === stock.symbol
                ? { ...s, price: last.close, change, analysis, loading: false }
                : s
            )
          );
          setFetchedAt((prev) => {
            if (prev) return prev;
            const now = new Date();
            return now.toLocaleDateString("es-CL", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) +
              " a las " + now.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
          });
        }
      } catch {
        setSummaries((prev) =>
          prev.map((s) => (s.symbol === stock.symbol ? { ...s, loading: false } : s))
        );
      }
    });
  }, []);

  const fetchChart = useCallback(async (symbol: string, range: string) => {
    setLoading(true);
    const interval = RANGES.find((r) => r.value === range)?.interval || "1d";
    try {
      const res = await fetch(
        `/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (symbol: string) => {
    setSelected(symbol);
    fetchChart(symbol, activeRange);
  };

  const handleRangeChange = (range: string) => {
    setActiveRange(range);
    if (selected) fetchChart(selected, range);
  };

  const analysis = useMemo(() => {
    if (!data?.candles) return null;
    return analyzeCandles(data.candles);
  }, [data]);

  const lastCandle = data?.candles[data.candles.length - 1];
  const firstCandle = data?.candles[0];
  const priceChange = lastCandle && firstCandle ? lastCandle.close - firstCandle.open : 0;
  const pctChange = firstCandle?.open ? (priceChange / firstCandle.open) * 100 : 0;
  const selectedStock = STOCKS.find((s) => s.symbol === selected);
  const loadedCount = summaries.filter((s) => !s.loading).length;

  const handleEarningsLoaded = useCallback((events: EarningsEvent[]) => {
    const map: Record<string, EarningsEvent> = {};
    events.filter((e) => e.isRedFlag).forEach((e) => { map[e.symbol] = e; });
    setEarningsFlags(map);
  }, []);

  const filteredSummaries = showOnlyReady
    ? summaries.filter((s) => s.analysis?.action === "buy" && !earningsFlags[s.symbol])
    : summaries;

  const readyCount = summaries.filter((s) => s.analysis?.action === "buy" && !earningsFlags[s.symbol]).length;

  const investNum = parseFloat(investAmount) || 0;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Finanzas</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {"Senales de trading y graficos de velas"}
          {loadedCount < STOCKS.length ? (
            <span className="ml-2 text-neutral-300">
              {"Cargando " + loadedCount + "/" + STOCKS.length + "..."}
            </span>
          ) : fetchedAt ? (
            <span className="ml-2 text-neutral-300">
              {"Datos del " + fetchedAt}
            </span>
          ) : null}
        </p>
      </div>

      {/* Market Context */}
      <MarketContext onEarningsLoaded={handleEarningsLoaded} />

      {/* Filter + Simulator bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => setShowOnlyReady(!showOnlyReady)}
          className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showOnlyReady
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
          }`}
        >
          {showOnlyReady
            ? "Mostrando solo listos (" + readyCount + ")"
            : "Filtrar: listos para operar (" + readyCount + ")"
          }
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Inversion:</span>
          <input
            type="text"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-24 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
          />
          <span className="text-xs text-neutral-400">CLP</span>
        </div>

        {investNum > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-600">+1%: ${Math.round(investNum * 0.01).toLocaleString()}</span>
            <span className="text-green-600">+2%: ${Math.round(investNum * 0.02).toLocaleString()}</span>
            <span className="text-green-600">+3%: ${Math.round(investNum * 0.03).toLocaleString()}</span>
            <span className="text-red-500">-2%: -${Math.round(investNum * 0.02).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Stock Grid by Category */}
      <div className="space-y-8 mb-10">
        {STOCK_CATEGORIES.map((cat) => {
          const catSymbols = cat.stocks.map((s) => s.symbol);
          const catSummaries = filteredSummaries.filter((s) => catSymbols.includes(s.symbol));
          if (catSummaries.length === 0) return null;
          return (
            <div key={cat.category}>
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                {cat.category}
                <span className="ml-2 text-neutral-300 font-normal">{catSummaries.length}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catSummaries.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => handleSelect(s.symbol)}
                    className={`text-left p-4 rounded-lg border transition-all hover:shadow-sm ${
                      selected === s.symbol
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-100 hover:border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-neutral-900">{s.symbol}</span>
                        <span className="text-xs text-neutral-400 ml-2">{s.name}</span>
                      </div>
                      {s.loading ? (
                        <span className="text-xs text-neutral-300">...</span>
                      ) : s.analysis ? (
                        <div className="flex items-center gap-2">
                          {earningsFlags[s.symbol] && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                              {"Ganancias " + earningsFlags[s.symbol].daysUntil + "d"}
                            </span>
                          )}
                          <ActionBadge action={earningsFlags[s.symbol] && s.analysis.action === "buy" ? "wait" : s.analysis.action} />
                          <SignalBadge signal={s.analysis.signal} score={s.analysis.score} />
                        </div>
                      ) : null}
                    </div>
                    {!s.loading && s.price > 0 && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-light text-neutral-800">
                          {s.price < 10 ? s.price.toFixed(4) : s.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            s.change >= 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
                        </span>
                        {s.analysis && (
                          <span className="text-xs text-neutral-400 ml-auto">
                            {s.analysis.trend.direction}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {showOnlyReady && filteredSummaries.length === 0 && (
          <div className="text-center py-8 text-neutral-300 text-sm">
            Ningun activo cumple todas las condiciones hoy. Mejor no operar.
          </div>
        )}
      </div>

      {/* Dropdown + Range */}
      <div className="flex items-center gap-4 mb-6">
        <select
          id="stock-select"
          name="stock-select"
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          className="px-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white
                     focus:outline-none focus:border-neutral-400 transition-colors"
        >
          <option value="" disabled>Seleccionar activo...</option>
          {STOCK_CATEGORIES.map((cat) => (
            <optgroup key={cat.category} label={cat.category}>
              {cat.stocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {selected && (
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeRange === r.value
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {loading && <span className="text-xs text-neutral-400">Cargando grafico...</span>}
      </div>

      {/* Chart + Analysis */}
      {data && selected && (
        <>
          <div className="flex items-baseline gap-4 mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">{data.symbol}</h2>
            <span className="text-xs text-neutral-400">{selectedStock?.name}</span>
            {lastCandle && (
              <>
                <span className="text-2xl font-light text-neutral-900">
                  {lastCandle.close < 10 ? lastCandle.close.toFixed(4) : lastCandle.close.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-400 uppercase">{data.currency}</span>
                <span className={`text-sm font-medium ${priceChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%)
                </span>
              </>
            )}
            {analysis && (
              <span className="ml-auto">
                <SignalBadge signal={analysis.signal} score={analysis.score} />
              </span>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 border border-neutral-100 rounded-lg overflow-hidden min-w-0">
              <CandlestickChart
                key={`${data.symbol}-${activeRange}`}
                candles={data.candles}
                symbol={data.symbol}
              />
            </div>

            {analysis && (
              <div className="lg:w-80 shrink-0 space-y-5">
                {/* Accion final */}
                <div className={`rounded-lg p-4 border-2 ${
                  analysis.action === "buy"
                    ? "border-green-500 bg-green-50"
                    : analysis.action === "sell"
                    ? "border-red-500 bg-red-50"
                    : "border-neutral-300 bg-neutral-50"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Veredicto</h3>
                    <ActionBadge action={analysis.action} />
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {analysis.actionReason}
                  </p>
                </div>

                {/* Dos estrategias */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-lg p-3 border ${
                    analysis.conservative.action === "buy"
                      ? "border-green-200 bg-green-50/50"
                      : analysis.conservative.action === "sell"
                      ? "border-red-200 bg-red-50/50"
                      : "border-neutral-100"
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-[10px] font-semibold text-neutral-400 uppercase">Conservadora</h4>
                      <ActionBadge action={analysis.conservative.action} />
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">{analysis.conservative.reason}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${
                    analysis.aggressive.action === "buy"
                      ? "border-green-200 bg-green-50/50"
                      : analysis.aggressive.action === "sell"
                      ? "border-red-200 bg-red-50/50"
                      : "border-neutral-100"
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-[10px] font-semibold text-neutral-400 uppercase">Agresiva (rebote)</h4>
                      <ActionBadge action={analysis.aggressive.action} />
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">{analysis.aggressive.reason}</p>
                  </div>
                </div>

                {/* Target y Stop Loss */}
                {/* Soporte y Resistencia */}
                <div className="border border-neutral-100 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Niveles Clave (20 periodos)</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-red-500">Resistencia</span>
                      <span className="text-sm font-medium text-red-500">
                        {analysis.resistance < 10 ? analysis.resistance.toFixed(4) : analysis.resistance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Precio actual</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {lastCandle ? (lastCandle.close < 10 ? lastCandle.close.toFixed(4) : lastCandle.close.toFixed(2)) : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-600">Soporte</span>
                      <span className="text-sm font-medium text-green-600">
                        {analysis.support < 10 ? analysis.support.toFixed(4) : analysis.support.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TP / SL */}
                <div className="border border-neutral-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">TP / SL</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 font-medium">
                      {"Ratio " + analysis.riskReward}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-300 mb-3">
                    {"ATR: $" + (analysis.atr < 10 ? analysis.atr.toFixed(4) : analysis.atr.toFixed(2)) + " | " + analysis.timeframe}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-600">Take Profit (3x ATR)</span>
                      <span className="text-sm font-medium text-green-600">
                        {analysis.target < 10 ? analysis.target.toFixed(4) : analysis.target.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-red-500">Stop Loss (1.5x ATR)</span>
                      <span className="text-sm font-medium text-red-500">
                        {analysis.stopLoss < 10 ? analysis.stopLoss.toFixed(4) : analysis.stopLoss.toFixed(2)}
                      </span>
                    </div>
                    {investNum > 0 && lastCandle && (
                      <div className="border-t border-neutral-100 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-neutral-400">{"Si invertis $" + investNum.toLocaleString() + " CLP"}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-green-600">Ganancia objetivo</span>
                          <span className="text-sm font-medium text-green-600">
                            {"$" + Math.round(investNum * ((analysis.target - lastCandle.close) / lastCandle.close)).toLocaleString() + " CLP"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-red-500">Perdida maxima</span>
                          <span className="text-sm font-medium text-red-500">
                            {"-$" + Math.round(investNum * ((lastCandle.close - analysis.stopLoss) / lastCandle.close)).toLocaleString() + " CLP"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-neutral-100 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Lectura</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">{analysis.summary}</p>
                </div>

                <div className="border border-neutral-100 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Tendencia</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">{analysis.trend.description}</p>
                </div>

                <div className="border border-neutral-100 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Ultima Vela</h3>
                  <div className="flex items-start gap-2">
                    <SignalDot type={analysis.lastCandle.type} />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{analysis.lastCandle.name}</p>
                      <p className="text-xs text-neutral-500 leading-relaxed mt-1">{analysis.lastCandle.description}</p>
                    </div>
                  </div>
                </div>

                {analysis.recentPatterns.length > 0 && (
                  <div className="border border-neutral-100 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Patrones Detectados</h3>
                    <div className="space-y-3">
                      {analysis.recentPatterns.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <SignalDot type={p.type} />
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                            <p className="text-xs text-neutral-500 leading-relaxed mt-1">{p.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`border rounded-lg p-4 ${
                  analysis.rsi.status === "sobrevendido"
                    ? "border-green-300 bg-green-50/50"
                    : analysis.rsi.status === "sobrecomprado"
                    ? "border-red-300 bg-red-50/50"
                    : "border-neutral-100"
                }`}>
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">RSI (Fuerza Relativa)</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-2xl font-light ${
                      analysis.rsi.status === "sobrevendido"
                        ? "text-green-600"
                        : analysis.rsi.status === "sobrecomprado"
                        ? "text-red-600"
                        : "text-neutral-900"
                    }`}>
                      {analysis.rsi.value}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      analysis.rsi.status === "sobrevendido"
                        ? "bg-green-100 text-green-700"
                        : analysis.rsi.status === "sobrecomprado"
                        ? "bg-red-100 text-red-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}>
                      {analysis.rsi.status}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        analysis.rsi.value <= 30
                          ? "bg-green-500"
                          : analysis.rsi.value >= 70
                          ? "bg-red-500"
                          : "bg-neutral-400"
                      }`}
                      style={{ width: analysis.rsi.value + "%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-2">
                    <span>0 — Sobrevendido</span>
                    <span>Sobrecomprado — 100</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{analysis.rsi.description}</p>
                </div>

                <div className="border border-neutral-100 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Volumen</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed">{analysis.volumeSignal}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!selected && !loading && (
        <div className="text-center py-16 text-neutral-300 text-sm">
          Selecciona un activo arriba para ver el grafico
        </div>
      )}
    </>
  );
}
