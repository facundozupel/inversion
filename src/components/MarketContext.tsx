"use client";

import { useEffect, useState } from "react";
import {
  MarketIndex,
  VixData,
  PutCallData,
  EarningsEvent,
  computeRedFlags,
  computeSafeToTrade,
} from "@/lib/market-context";

const STOCK_SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","TSLA","NVDA","META","NFLX","AMD","JPM","V","DIS","SPY","QQQ"];

interface Props {
  onEarningsLoaded?: (earnings: EarningsEvent[]) => void;
}

export default function MarketContext({ onEarningsLoaded }: Props) {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [vix, setVix] = useState<VixData | null>(null);
  const [putCall, setPutCall] = useState<PutCallData | null>(null);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/market-context").then((r) => r.json()).catch(() => null),
      fetch("/api/earnings?symbols=" + STOCK_SYMBOLS.join(",")).then((r) => r.json()).catch(() => null),
    ]).then(([market, earningsData]) => {
      if (market) {
        setIndices(market.indices || []);
        setVix(market.vix || null);
        setPutCall(market.putCall || null);
      }
      const earningsList: EarningsEvent[] = earningsData?.earnings || [];
      setEarnings(earningsList);
      onEarningsLoaded?.(earningsList);
      setLoading(false);
    });
  }, [onEarningsLoaded]);

  if (loading) {
    return (
      <div className="border border-neutral-100 rounded-lg p-6 mb-8">
        <p className="text-xs text-neutral-300">Cargando contexto del mercado...</p>
      </div>
    );
  }

  const safeToTrade = vix ? computeSafeToTrade(vix, indices) : true;
  const redFlags = vix ? computeRedFlags(vix, earnings) : [];
  const earningsAlerts = earnings.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 14);

  return (
    <div className="mb-8 space-y-3">
      <div className="border border-neutral-100 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Contexto del Mercado
          </h2>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              safeToTrade
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {safeToTrade ? "SEGURO PARA OPERAR" : "PRECAUCION — NO IDEAL"}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pulso del Mercado */}
          <div>
            <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Pulso del Mercado
            </h3>
            <div className="space-y-2">
              {indices.map((idx) => (
                <div key={idx.symbol} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700">{idx.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {idx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        idx.isPositive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {idx.isPositive ? "+" : ""}
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VIX */}
          <div>
            <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Indice de Miedo (VIX)
            </h3>
            {vix && (
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`text-2xl font-light ${
                      vix.status === "danger"
                        ? "text-red-600"
                        : vix.status === "elevated"
                        ? "text-amber-500"
                        : "text-neutral-900"
                    }`}
                  >
                    {vix.level.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      vix.change >= 0 ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {vix.change >= 0 ? "+" : ""}
                    {vix.change.toFixed(2)}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    vix.status === "danger"
                      ? "bg-red-100 text-red-700"
                      : vix.status === "elevated"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {vix.status === "danger" ? "PELIGRO" : vix.status === "elevated" ? "ELEVADO" : "NORMAL"}
                </span>
              </div>
            )}
          </div>

          {/* Put/Call Ratio */}
          <div>
            <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Put/Call SPX (Institucional)
            </h3>
            {putCall ? (
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`text-2xl font-light ${
                      putCall.status === "miedo"
                        ? "text-red-600"
                        : putCall.status === "codicia"
                        ? "text-amber-500"
                        : "text-neutral-900"
                    }`}
                  >
                    {putCall.ratio.toFixed(2)}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    putCall.status === "miedo"
                      ? "bg-red-100 text-red-700"
                      : putCall.status === "codicia"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {putCall.status === "miedo" ? "MIEDO" : putCall.status === "codicia" ? "CODICIA" : "NEUTRAL"}
                </span>
                <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">{putCall.description}</p>
              </div>
            ) : (
              <p className="text-xs text-neutral-300">Sin datos</p>
            )}
          </div>

          {/* Earnings */}
          <div>
            <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Alertas de Ganancias
            </h3>
            {earningsAlerts.length > 0 ? (
              <div className="space-y-1.5">
                {earningsAlerts.map((e) => (
                  <div key={e.symbol} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">{e.symbol}</span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        e.isRedFlag
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "text-neutral-400"
                      }`}
                    >
                      {e.daysUntil === 0
                        ? "Hoy"
                        : e.daysUntil === 1
                        ? "Manana"
                        : e.daysUntil + " dias"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-300">Sin reportes proximos</p>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Red Flags */}
      {redFlags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 text-sm font-bold mt-px">!</span>
            <div className="space-y-0.5">
              {redFlags.map((flag, i) => (
                <p key={i} className="text-xs text-amber-800">{flag}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
