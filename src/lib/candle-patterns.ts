interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternResult {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  description: string;
}

export interface RsiData {
  value: number;
  status: "sobrevendido" | "neutral" | "sobrecomprado";
  description: string;
}

export interface StrategySignal {
  action: "buy" | "sell" | "wait";
  reason: string;
}

export interface CandleAnalysis {
  trend: { direction: string; description: string };
  lastCandle: PatternResult;
  recentPatterns: PatternResult[];
  volumeSignal: string;
  rsi: RsiData;
  summary: string;
  score: number;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  conservative: StrategySignal;
  aggressive: StrategySignal;
  action: "buy" | "sell" | "wait";
  actionReason: string;
  target: number;
  stopLoss: number;
  atr: number;
  support: number;
  resistance: number;
  timeframe: string;
  riskReward: string;
}

function bodySize(c: Candle) {
  return Math.abs(c.close - c.open);
}

function fullRange(c: Candle) {
  return c.high - c.low;
}

function upperWick(c: Candle) {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle) {
  return Math.min(c.open, c.close) - c.low;
}

function isBullish(c: Candle) {
  return c.close > c.open;
}

function calculateRSI(candles: Candle[], period = 14): RsiData {
  if (candles.length < period + 1) {
    return { value: 50, status: "neutral", description: "Datos insuficientes para calcular RSI." };
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Primer promedio
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Suavizado exponencial
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  const value = Math.round(rsi * 10) / 10;

  if (value <= 30) {
    return {
      value,
      status: "sobrevendido",
      description: "RSI en " + value + " — sobrevendido. El activo cayo demasiado y es probable un rebote. Oportunidad de compra.",
    };
  }
  if (value >= 70) {
    return {
      value,
      status: "sobrecomprado",
      description: "RSI en " + value + " — sobrecomprado. El activo subio demasiado rapido y es probable una correccion. Considerar venta.",
    };
  }
  return {
    value,
    status: "neutral",
    description: "RSI en " + value + " — zona neutral. No hay senal de sobreventa ni sobrecompra.",
  };
}

function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  let atrSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    atrSum += tr;
  }
  return atrSum / period;
}

function detectSinglePattern(c: Candle): PatternResult {
  const body = bodySize(c);
  const range = fullRange(c);
  const upper = upperWick(c);
  const lower = lowerWick(c);

  if (range === 0) {
    return { name: "Doji", type: "neutral", description: "Indecision en el mercado. Compradores y vendedores estan en equilibrio." };
  }

  const bodyRatio = body / range;
  const upperRatio = upper / range;
  const lowerRatio = lower / range;

  if (bodyRatio < 0.1) {
    if (lowerRatio > 0.6) {
      return { name: "Dragonfly Doji", type: "bullish", description: "Los vendedores empujaron el precio abajo pero los compradores recuperaron. Posible reversa al alza." };
    }
    if (upperRatio > 0.6) {
      return { name: "Gravestone Doji", type: "bearish", description: "Los compradores empujaron arriba pero los vendedores lo tiraron de vuelta. Posible reversa a la baja." };
    }
    return { name: "Doji", type: "neutral", description: "Indecision del mercado. Ni compradores ni vendedores tienen control. Esperar confirmacion." };
  }

  if (bodyRatio > 0.9) {
    if (isBullish(c)) {
      return { name: "Marubozu Alcista", type: "bullish", description: "Presion compradora fuerte sin rechazo. Los compradores dominaron toda la sesion." };
    }
    return { name: "Marubozu Bajista", type: "bearish", description: "Presion vendedora fuerte sin recuperacion. Los vendedores dominaron toda la sesion." };
  }

  if (lowerRatio > 0.6 && upperRatio < 0.1 && bodyRatio < 0.35) {
    if (isBullish(c)) {
      return { name: "Martillo", type: "bullish", description: "Los vendedores bajaron el precio pero los compradores recuperaron con fuerza. Senal clasica de reversa alcista." };
    }
    return { name: "Hombre Colgado", type: "bearish", description: "Sombra inferior larga tras tendencia alcista. La presion vendedora podria estar creciendo." };
  }

  if (upperRatio > 0.6 && lowerRatio < 0.1 && bodyRatio < 0.35) {
    if (isBullish(c)) {
      return { name: "Martillo Invertido", type: "bullish", description: "Los compradores intentaron subir. Posible reversa si se confirma en la siguiente sesion." };
    }
    return { name: "Estrella Fugaz", type: "bearish", description: "Los compradores subieron el precio pero los vendedores lo rechazaron. Senal bajista tras tendencia alcista." };
  }

  if (bodyRatio < 0.3 && upperRatio > 0.25 && lowerRatio > 0.25) {
    return { name: "Trompo", type: "neutral", description: "Cuerpo pequeno con mechas largas en ambos lados. El mercado esta indeciso sobre la direccion." };
  }

  if (isBullish(c)) {
    if (bodyRatio > 0.6) {
      return { name: "Vela Alcista Fuerte", type: "bullish", description: "Presion compradora solida. Los compradores tienen el control con un cuerpo grande y mechas minimas." };
    }
    return { name: "Vela Alcista", type: "bullish", description: "Los compradores superaron a los vendedores. Movimiento moderado al alza." };
  }

  if (bodyRatio > 0.6) {
    return { name: "Vela Bajista Fuerte", type: "bearish", description: "Presion vendedora solida. Los vendedores tienen el control con un cuerpo grande y mechas minimas." };
  }
  return { name: "Vela Bajista", type: "bearish", description: "Los vendedores superaron a los compradores. Movimiento moderado a la baja." };
}

function detectMultiPatterns(candles: Candle[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  if (candles.length < 2) return patterns;

  const len = candles.length;
  const prev = candles[len - 2];
  const curr = candles[len - 1];

  if (!isBullish(prev) && isBullish(curr) && curr.open <= prev.close && curr.close >= prev.open && bodySize(curr) > bodySize(prev)) {
    patterns.push({ name: "Envolvente Alcista", type: "bullish", description: "La vela alcista de hoy envuelve completamente la vela bajista de ayer. Senal fuerte de reversa — los compradores tomaron el control." });
  }

  if (isBullish(prev) && !isBullish(curr) && curr.open >= prev.close && curr.close <= prev.open && bodySize(curr) > bodySize(prev)) {
    patterns.push({ name: "Envolvente Bajista", type: "bearish", description: "La vela bajista de hoy envuelve completamente la vela alcista de ayer. Senal fuerte de reversa — los vendedores tomaron el control." });
  }

  if (!isBullish(prev) && isBullish(curr) && bodySize(curr) < bodySize(prev) * 0.5 && curr.open >= prev.close && curr.close <= prev.open) {
    patterns.push({ name: "Harami Alcista", type: "bullish", description: "Vela alcista pequena dentro del cuerpo bajista anterior. El impulso vendedor se esta debilitando." });
  }
  if (isBullish(prev) && !isBullish(curr) && bodySize(curr) < bodySize(prev) * 0.5 && curr.open <= prev.close && curr.close >= prev.open) {
    patterns.push({ name: "Harami Bajista", type: "bearish", description: "Vela bajista pequena dentro del cuerpo alcista anterior. El impulso comprador se esta debilitando." });
  }

  const topTolerance = fullRange(curr) * 0.02;
  if (Math.abs(prev.high - curr.high) < topTolerance && isBullish(prev) && !isBullish(curr)) {
    patterns.push({ name: "Pinza Superior", type: "bearish", description: "Dos velas tocaron el mismo maximo. Nivel de resistencia confirmado — posible techo." });
  }
  if (Math.abs(prev.low - curr.low) < topTolerance && !isBullish(prev) && isBullish(curr)) {
    patterns.push({ name: "Pinza Inferior", type: "bullish", description: "Dos velas tocaron el mismo minimo. Nivel de soporte confirmado — posible piso." });
  }

  if (candles.length >= 3) {
    const first = candles[len - 3];
    const middle = candles[len - 2];
    const last = candles[len - 1];
    const midBody = bodySize(middle);
    const midRange = fullRange(middle);

    if (!isBullish(first) && midBody / (midRange || 1) < 0.3 && isBullish(last) && last.close > (first.open + first.close) / 2) {
      patterns.push({ name: "Estrella de la Manana", type: "bullish", description: "Reversa de tres velas: bajista, indecision, luego alcista. Senal clasica de piso." });
    }
    if (isBullish(first) && midBody / (midRange || 1) < 0.3 && !isBullish(last) && last.close < (first.open + first.close) / 2) {
      patterns.push({ name: "Estrella Vespertina", type: "bearish", description: "Reversa de tres velas: alcista, indecision, luego bajista. Senal clasica de techo." });
    }
  }

  return patterns;
}

export function analyzeCandles(candles: Candle[]): CandleAnalysis | null {
  if (candles.length < 5) return null;

  const last = candles[candles.length - 1];
  const recent = candles.slice(-20);

  const smaShort = recent.slice(-5).reduce((s, c) => s + c.close, 0) / 5;
  const smaLong = recent.reduce((s, c) => s + c.close, 0) / recent.length;
  const trendPct = ((smaShort - smaLong) / smaLong) * 100;

  let trend: { direction: string; description: string };
  if (trendPct > 2) {
    trend = { direction: "alcista", description: "Tendencia alcista — el promedio de corto plazo esta " + trendPct.toFixed(1) + "% arriba del promedio de 20 periodos. Los compradores tienen impulso." };
  } else if (trendPct < -2) {
    trend = { direction: "bajista", description: "Tendencia bajista — el promedio de corto plazo esta " + Math.abs(trendPct).toFixed(1) + "% debajo del promedio de 20 periodos. Los vendedores tienen impulso." };
  } else {
    trend = { direction: "lateral", description: "Lateral — los promedios de corto y largo plazo estan cerca (" + (trendPct > 0 ? "+" : "") + trendPct.toFixed(1) + "%). Sin direccion clara." };
  }

  const lastCandle = detectSinglePattern(last);
  const recentPatterns = detectMultiPatterns(candles.slice(-3));
  const rsi = calculateRSI(candles);

  const avgVolume = recent.slice(0, -1).reduce((s, c) => s + c.volume, 0) / (recent.length - 1);
  const volRatio = last.volume / avgVolume;
  let volumeSignal: string;
  if (volRatio > 1.5) {
    volumeSignal = "Volumen alto (" + volRatio.toFixed(1) + "x promedio). Fuerte conviccion detras del movimiento — la accion del precio esta respaldada por participacion.";
  } else if (volRatio < 0.5) {
    volumeSignal = "Volumen bajo (" + volRatio.toFixed(1) + "x promedio). Participacion debil — el movimiento podria no tener continuidad.";
  } else {
    volumeSignal = "Volumen normal (" + volRatio.toFixed(1) + "x promedio). Actividad estandar del mercado.";
  }

  const signals = [lastCandle, ...recentPatterns];
  const bullCount = signals.filter((s) => s.type === "bullish").length;
  const bearCount = signals.filter((s) => s.type === "bearish").length;

  let summary: string;
  if (bullCount > bearCount && trend.direction === "alcista") {
    summary = "Multiples senales alcistas alineadas con una tendencia alcista. Las condiciones favorecen mas subas.";
  } else if (bearCount > bullCount && trend.direction === "bajista") {
    summary = "Multiples senales bajistas alineadas con una tendencia bajista. Las condiciones favorecen mas bajas.";
  } else if (bullCount > bearCount && trend.direction === "bajista") {
    summary = "Senales alcistas apareciendo en tendencia bajista. Posible reversa formandose — esperar confirmacion.";
  } else if (bearCount > bullCount && trend.direction === "alcista") {
    summary = "Senales bajistas apareciendo en tendencia alcista. Posible correccion — observar seguimiento.";
  } else {
    summary = "Senales mixtas. El mercado esta en fase de transicion — esperar un patron mas claro antes de actuar.";
  }

  // Score de tendencia (sin RSI — puro trend following)
  let trendScore = 0;
  if (trend.direction === "alcista") trendScore += 20 + Math.min(trendPct * 4, 20);
  else if (trend.direction === "bajista") trendScore -= 20 + Math.min(Math.abs(trendPct) * 4, 20);
  trendScore += (bullCount - bearCount) * 15;
  if (volRatio > 1.5 && bullCount > bearCount) trendScore += 15;
  else if (volRatio > 1.5 && bearCount > bullCount) trendScore -= 15;
  const last5 = candles.slice(-5);
  const upCandles = last5.filter((c) => c.close > c.open).length;
  trendScore += (upCandles - 2.5) * 6;
  trendScore = Math.max(-100, Math.min(100, Math.round(trendScore)));

  // Score combinado (incluye RSI)
  let score = trendScore;
  if (rsi.status === "sobrevendido") score += 25;
  else if (rsi.status === "sobrecomprado") score -= 25;
  score = Math.max(-100, Math.min(100, Math.round(score)));

  let signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  if (score >= 50) signal = "strong_buy";
  else if (score >= 20) signal = "buy";
  else if (score > -20) signal = "hold";
  else if (score > -50) signal = "sell";
  else signal = "strong_sell";

  const isBullishSignal = bullCount > bearCount;
  const isBearishSignal = bearCount > bullCount;
  const isUptrend = trend.direction === "alcista";
  const isDowntrend = trend.direction === "bajista";
  const isHighVol = volRatio > 1.2;
  const isOversold = rsi.status === "sobrevendido";
  const isOverbought = rsi.status === "sobrecomprado";

  // ESTRATEGIA CONSERVADORA — sigue la tendencia
  let conservative: StrategySignal;
  if (isBullishSignal && isUptrend && isHighVol) {
    conservative = { action: "buy", reason: "Tendencia alcista + patron alcista + volumen alto. Entrada segura a favor de la tendencia." };
  } else if (isBullishSignal && isUptrend) {
    conservative = { action: "buy", reason: "Tendencia alcista confirmada. Entrada valida con volumen promedio." };
  } else if (isBearishSignal && isDowntrend) {
    conservative = { action: "sell", reason: "Tendencia bajista + patron bajista. Si tenes posicion, considerar salir." };
  } else if (isBearishSignal && isUptrend) {
    conservative = { action: "sell", reason: "Senal bajista en tendencia alcista. Posible giro — proteger ganancias." };
  } else {
    conservative = { action: "wait", reason: "Sin alineacion clara entre tendencia y velas. Esperar confirmacion." };
  }

  // ESTRATEGIA AGRESIVA — busca rebotes por sobreventa
  let aggressive: StrategySignal;
  if (isOversold && isDowntrend && volRatio > 1.0) {
    aggressive = { action: "buy", reason: "RSI " + rsi.value + " sobrevendido + volumen en caida. Posible capitulacion — oportunidad de rebote tecnico." };
  } else if (isOversold) {
    aggressive = { action: "buy", reason: "RSI " + rsi.value + " sobrevendido. El activo cayo demasiado — probable rebote de corto plazo." };
  } else if (isOverbought && isBearishSignal) {
    aggressive = { action: "sell", reason: "RSI " + rsi.value + " sobrecomprado + senal bajista. Correccion probable." };
  } else if (isOverbought) {
    aggressive = { action: "wait", reason: "RSI " + rsi.value + " sobrecomprado pero sin senal bajista. Podria seguir subiendo — esperar confirmacion." };
  } else {
    aggressive = { action: "wait", reason: "RSI " + rsi.value + " en zona neutral. Sin oportunidad de rebote." };
  }

  // ACCION FINAL — prioriza conservadora, pero si ambas dicen lo mismo es mas fuerte
  let action: "buy" | "sell" | "wait";
  let actionReason: string;

  if (conservative.action === "buy" && aggressive.action === "buy") {
    action = "buy";
    actionReason = "Ambas estrategias coinciden en COMPRAR. Tendencia + RSI alineados — senal fuerte de entrada.";
  } else if (conservative.action === "buy") {
    action = "buy";
    actionReason = conservative.reason;
  } else if (aggressive.action === "buy" && conservative.action === "wait") {
    action = "buy";
    actionReason = "Compra especulativa por rebote (RSI " + rsi.value + "). La tendencia no acompana — usar stop loss ajustado.";
  } else if (aggressive.action === "buy" && conservative.action === "sell") {
    action = "wait";
    actionReason = "Conflicto: la tendencia dice VENDER pero el RSI (" + rsi.value + ") sugiere rebote. Esperar — no hay consenso.";
  } else if (conservative.action === "sell") {
    action = "sell";
    actionReason = conservative.reason;
  } else {
    action = "wait";
    actionReason = "Sin senal clara en ninguna estrategia. Paciencia — esperar un setup definido.";
  }

  // ATR para SL/TP dinamico (ratio 1:2)
  const atr = calculateATR(candles);
  const currentPrice = last.close;
  const target = atr > 0 ? currentPrice + atr * 3 : currentPrice * 1.03;
  const stopLoss = atr > 0 ? currentPrice - atr * 1.5 : currentPrice * 0.985;

  // Ratio riesgo/beneficio
  const risk = currentPrice - stopLoss;
  const reward = target - currentPrice;
  const riskReward = risk > 0 ? "1:" + (reward / risk).toFixed(1) : "1:2";

  // Soporte y resistencia (min/max ultimos 20 periodos)
  const support = Math.min(...recent.map((c) => c.low));
  const resistance = Math.max(...recent.map((c) => c.high));

  const timeframe = "Diario (1D)";

  return { trend, lastCandle, recentPatterns, volumeSignal, rsi, summary, score, signal, conservative, aggressive, action, actionReason, target, stopLoss, atr, support, resistance, timeframe, riskReward };
}
