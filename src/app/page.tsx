"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Finance</h1>
      <p className="text-sm text-neutral-400 mt-1">Loading...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Dashboard />
      </div>
    </div>
  );
}
