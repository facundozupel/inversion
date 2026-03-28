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

export interface CandleAnalysis {
  trend: { direction: string; description: string };
  lastCandle: PatternResult;
  recentPatterns: PatternResult[];
  volumeSignal: string;
  summary: string;
  score: number;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  action: "buy" | "sell" | "wait";
  actionReason: string;
  target: number;
  stopLoss: number;
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

  let score = 0;
  if (trend.direction === "alcista") score += 20 + Math.min(trendPct * 4, 20);
  else if (trend.direction === "bajista") score -= 20 + Math.min(Math.abs(trendPct) * 4, 20);
  score += (bullCount - bearCount) * 15;
  if (volRatio > 1.5 && bullCount > bearCount) score += 15;
  else if (volRatio > 1.5 && bearCount > bullCount) score -= 15;
  const last5 = candles.slice(-5);
  const upCandles = last5.filter((c) => c.close > c.open).length;
  score += (upCandles - 2.5) * 6;
  score = Math.max(-100, Math.min(100, Math.round(score)));

  let signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  if (score >= 50) signal = "strong_buy";
  else if (score >= 20) signal = "buy";
  else if (score > -20) signal = "hold";
  else if (score > -50) signal = "sell";
  else signal = "strong_sell";

  let action: "buy" | "sell" | "wait";
  let actionReason: string;

  const isBullishSignal = bullCount > bearCount;
  const isBearishSignal = bearCount > bullCount;
  const isUptrend = trend.direction === "alcista";
  const isDowntrend = trend.direction === "bajista";
  const isHighVol = volRatio > 1.2;

  if (isBullishSignal && isUptrend && isHighVol) {
    action = "buy";
    actionReason = "Patron alcista + tendencia alcista + volumen alto (" + volRatio.toFixed(1) + "x). Las tres condiciones se cumplen — senal de entrada.";
  } else if (isBullishSignal && isUptrend) {
    action = "buy";
    actionReason = "Patron alcista + tendencia alcista confirmada, pero volumen promedio (" + volRatio.toFixed(1) + "x). Senal valida pero con menos conviccion.";
  } else if (isBearishSignal && isDowntrend) {
    action = "sell";
    actionReason = "Patron bajista + tendencia bajista. Si tenes esta posicion, considera vender — el impulso esta en contra.";
  } else if (isBearishSignal && isUptrend) {
    action = "sell";
    actionReason = "Senal de reversa bajista en tendencia alcista. La tendencia podria estar girando — protege tus ganancias.";
  } else if (isBullishSignal && isDowntrend) {
    action = "wait";
    actionReason = "Vela alcista en tendencia bajista — posible reversa pero no confirmada. Espera a que la tendencia gire a alcista antes de entrar.";
  } else {
    action = "wait";
    actionReason = "Sin alineacion clara entre senales de velas, tendencia y volumen. Paciencia — espera un setup mas limpio.";
  }

  // Target (+2%) y Stop Loss (-2%) desde el precio actual
  const currentPrice = last.close;
  const target = currentPrice * 1.02;
  const stopLoss = currentPrice * 0.98;

  return { trend, lastCandle, recentPatterns, volumeSignal, summary, score, signal, action, actionReason, target, stopLoss };
}
