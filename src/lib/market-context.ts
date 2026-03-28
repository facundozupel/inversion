export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface VixData {
  level: number;
  change: number;
  changePercent: number;
  status: "normal" | "elevated" | "danger";
}

export interface EarningsEvent {
  symbol: string;
  name: string;
  earningsDate: number;
  daysUntil: number;
  isRedFlag: boolean;
}

export interface MarketContextData {
  indices: MarketIndex[];
  vix: VixData;
  earnings: EarningsEvent[];
  safeToTrade: boolean;
  redFlags: string[];
}

export function computeVixStatus(level: number): "normal" | "elevated" | "danger" {
  if (level >= 30) return "danger";
  if (level >= 25) return "elevated";
  return "normal";
}

export function computeRedFlags(vix: VixData, earnings: EarningsEvent[]): string[] {
  const flags: string[] = [];

  if (vix.status === "danger") {
    flags.push("VIX en " + vix.level.toFixed(1) + " — miedo extremo, mercado muy volatil");
  } else if (vix.status === "elevated") {
    flags.push("VIX en " + vix.level.toFixed(1) + " — volatilidad elevada, operar con precaucion");
  }

  const earningsFlags = earnings.filter((e) => e.isRedFlag);
  for (const e of earningsFlags) {
    flags.push(e.symbol + " reporta ganancias en " + e.daysUntil + " dia" + (e.daysUntil !== 1 ? "s" : "") + " — evitar comprar antes del reporte");
  }

  return flags;
}

export function computeSafeToTrade(vix: VixData, indices: MarketIndex[]): boolean {
  if (vix.status === "danger") return false;
  const bothDeepRed = indices.length >= 2 && indices.every((i) => i.changePercent < -1.5);
  if (bothDeepRed) return false;
  return true;
}
