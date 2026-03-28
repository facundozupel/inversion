"use client";

import { useState, useEffect } from "react";

interface Trade {
  id: string;
  symbol: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  amount: number;
  entryDate: string;
  status: "open" | "win" | "loss";
  exitPrice: number | null;
  exitDate: string | null;
  notes: string;
}

const STORAGE_KEY = "inversion_trades";

function loadTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTrades(trades: Trade[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export default function MyTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    entryPrice: "",
    targetPrice: "",
    stopLoss: "",
    amount: "10000",
    notes: "",
  });

  useEffect(() => {
    setTrades(loadTrades());
  }, []);

  const update = (newTrades: Trade[]) => {
    setTrades(newTrades);
    saveTrades(newTrades);
  };

  const addTrade = () => {
    if (!form.symbol || !form.entryPrice || !form.targetPrice || !form.stopLoss) return;
    const trade: Trade = {
      id: Date.now().toString(),
      symbol: form.symbol.toUpperCase(),
      entryPrice: parseFloat(form.entryPrice),
      targetPrice: parseFloat(form.targetPrice),
      stopLoss: parseFloat(form.stopLoss),
      amount: parseFloat(form.amount) || 10000,
      entryDate: new Date().toISOString().split("T")[0],
      status: "open",
      exitPrice: null,
      exitDate: null,
      notes: form.notes,
    };
    update([trade, ...trades]);
    setForm({ symbol: "", entryPrice: "", targetPrice: "", stopLoss: "", amount: "10000", notes: "" });
    setShowForm(false);
  };

  const closeTrade = (id: string, status: "win" | "loss", exitPrice: number) => {
    update(
      trades.map((t) =>
        t.id === id
          ? { ...t, status, exitPrice, exitDate: new Date().toISOString().split("T")[0] }
          : t
      )
    );
  };

  const deleteTrade = (id: string) => {
    update(trades.filter((t) => t.id !== id));
  };

  // Stats
  const closed = trades.filter((t) => t.status !== "open");
  const wins = closed.filter((t) => t.status === "win");
  const losses = closed.filter((t) => t.status === "loss");
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

  const totalPnl = closed.reduce((sum, t) => {
    if (!t.exitPrice) return sum;
    const pct = (t.exitPrice - t.entryPrice) / t.entryPrice;
    return sum + t.amount * pct;
  }, 0);

  const openTrades = trades.filter((t) => t.status === "open");
  const goal = 5;
  const remaining = Math.max(0, goal - closed.length);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight mb-2">Mis Trades</h2>
        <p className="text-sm text-neutral-400">Registro de los 5 trades de prueba para validar el sistema</p>
      </div>

      {/* Progress */}
      <div className="border border-neutral-100 rounded-lg p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Progreso de validacion</h3>
          <span className="text-xs text-neutral-400">{closed.length} de {goal} trades completados</span>
        </div>
        <div className="w-full h-3 bg-neutral-100 rounded-full mb-4">
          <div
            className="h-3 rounded-full bg-neutral-900 transition-all"
            style={{ width: Math.min(100, (closed.length / goal) * 100) + "%" }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-light text-neutral-900">{closed.length}</p>
            <p className="text-[10px] text-neutral-400 uppercase">Cerrados</p>
          </div>
          <div>
            <p className={`text-2xl font-light ${winRate >= 60 ? "text-green-600" : winRate > 0 ? "text-amber-500" : "text-neutral-300"}`}>
              {closed.length > 0 ? winRate.toFixed(0) + "%" : "-"}
            </p>
            <p className="text-[10px] text-neutral-400 uppercase">Win Rate</p>
          </div>
          <div>
            <p className={`text-2xl font-light ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
              {closed.length > 0 ? (totalPnl >= 0 ? "+" : "") + Math.round(totalPnl).toLocaleString() : "-"}
            </p>
            <p className="text-[10px] text-neutral-400 uppercase">P&L Total (CLP)</p>
          </div>
          <div>
            <p className="text-2xl font-light text-neutral-900">{remaining}</p>
            <p className="text-[10px] text-neutral-400 uppercase">Restantes</p>
          </div>
        </div>

        {closed.length >= goal && (
          <div className={`mt-4 p-3 rounded-lg text-xs ${
            winRate >= 60 && totalPnl > 0
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}>
            {winRate >= 60 && totalPnl > 0
              ? "El sistema funciona: " + winRate.toFixed(0) + "% win rate con ganancia de $" + Math.round(totalPnl).toLocaleString() + " CLP. Podes considerar subir el monto."
              : "Resultados mixtos: " + winRate.toFixed(0) + "% win rate, P&L $" + Math.round(totalPnl).toLocaleString() + " CLP. Revisar si se respetaron TP/SL al pie de la letra antes de decidir."
            }
          </div>
        )}
      </div>

      {/* Reglas */}
      <div className="border border-neutral-100 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Reglas del test</h3>
        <div className="space-y-1 text-xs text-neutral-500">
          <p>1. Solo compra cuando el sistema dice COMPRAR y el mercado es SEGURO</p>
          <p>2. Usa el TP y SL que te da el sistema — no los cambies</p>
          <p>3. No te salgas antes del TP por miedo</p>
          <p>4. No aguantes pasado el SL por esperanza</p>
          <p>5. Si ganas 3 de 5 con ratio 1:2, quedas en ganancia neta</p>
        </div>
      </div>

      {/* Add trade button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 text-sm font-medium border border-dashed border-neutral-300 rounded-lg text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors mb-6"
        >
          + Registrar nuevo trade
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="border border-neutral-200 rounded-lg p-5 mb-6">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Nuevo Trade</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Simbolo</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                placeholder="BTC-USD, AAPL..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Monto (CLP)</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Precio de entrada</label>
              <input
                type="text"
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Take Profit (TP)</label>
              <input
                type="text"
                value={form.targetPrice}
                onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Stop Loss (SL)</label>
              <input
                type="text"
                value={form.stopLoss}
                onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Razon de entrada..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>
          {form.entryPrice && form.targetPrice && form.stopLoss && (
            <div className="flex gap-4 text-xs text-neutral-400 mb-3">
              <span>{"Ratio: 1:" + (Math.abs(parseFloat(form.targetPrice) - parseFloat(form.entryPrice)) / Math.abs(parseFloat(form.entryPrice) - parseFloat(form.stopLoss))).toFixed(1)}</span>
              <span className="text-green-600">{"TP: +" + Math.round(parseFloat(form.amount || "10000") * ((parseFloat(form.targetPrice) - parseFloat(form.entryPrice)) / parseFloat(form.entryPrice))).toLocaleString() + " CLP"}</span>
              <span className="text-red-500">{"SL: " + Math.round(parseFloat(form.amount || "10000") * ((parseFloat(form.stopLoss) - parseFloat(form.entryPrice)) / parseFloat(form.entryPrice))).toLocaleString() + " CLP"}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={addTrade}
              className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Registrar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Open trades */}
      {openTrades.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Trades abiertos</h3>
          <div className="space-y-3">
            {openTrades.map((t) => (
              <div key={t.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold text-neutral-900">{t.symbol}</span>
                    <span className="text-xs text-neutral-400 ml-2">{t.entryDate}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-bold uppercase">
                    Abierto
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-neutral-400">Entrada</p>
                    <p className="font-medium text-neutral-900">${t.entryPrice}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">TP</p>
                    <p className="font-medium text-green-600">${t.targetPrice}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">SL</p>
                    <p className="font-medium text-red-500">${t.stopLoss}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400">Monto</p>
                    <p className="font-medium text-neutral-900">${t.amount.toLocaleString()}</p>
                  </div>
                </div>
                {t.notes && <p className="text-[11px] text-neutral-400 mb-3">{t.notes}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const price = prompt("Precio de salida (TP alcanzado):");
                      if (price) closeTrade(t.id, "win", parseFloat(price));
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Cerrar en ganancia
                  </button>
                  <button
                    onClick={() => {
                      const price = prompt("Precio de salida (SL tocado):");
                      if (price) closeTrade(t.id, "loss", parseFloat(price));
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cerrar en perdida
                  </button>
                  <button
                    onClick={() => deleteTrade(t.id)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors ml-auto"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed trades */}
      {closed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Historial</h3>
          <div className="space-y-2">
            {closed.map((t) => {
              const pct = t.exitPrice ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100 : 0;
              const pnl = t.exitPrice ? t.amount * ((t.exitPrice - t.entryPrice) / t.entryPrice) : 0;
              return (
                <div key={t.id} className={`border rounded-lg p-4 ${
                  t.status === "win" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-neutral-900">{t.symbol}</span>
                      <span className="text-xs text-neutral-400 ml-2">{t.entryDate} → {t.exitDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{Math.round(pnl).toLocaleString()} CLP ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        t.status === "win"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {t.status === "win" ? "Ganancia" : "Perdida"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-400">
                    <span>Entrada: ${t.entryPrice}</span>
                    <span>Salida: ${t.exitPrice}</span>
                    <span>Monto: ${t.amount.toLocaleString()}</span>
                  </div>
                  {t.notes && <p className="text-[11px] text-neutral-400 mt-1">{t.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <div className="text-center py-16 text-neutral-300 text-sm">
          Aun no hay trades registrados. Cuando el sistema diga COMPRAR y el mercado sea seguro, registra tu primer trade.
        </div>
      )}
    </div>
  );
}
