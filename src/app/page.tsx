"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Finanzas</h1>
      <p className="text-sm text-neutral-400 mt-1">Cargando...</p>
    </div>
  ),
});

const HowItWorks = dynamic(() => import("@/components/HowItWorks"), { ssr: false });
const MyTrades = dynamic(() => import("@/components/MyTrades"), { ssr: false });

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "trades", label: "Mis Trades" },
  { id: "how", label: "Como funciona" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-1 mb-8 border-b border-neutral-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <Dashboard />}
        {tab === "trades" && <MyTrades />}
        {tab === "how" && <HowItWorks />}
      </div>
    </div>
  );
}
