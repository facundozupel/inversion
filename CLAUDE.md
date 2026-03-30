@AGENTS.md

# Proyecto: Inversion — Dashboard de Finanzas

## Que es
Sistema de analisis tecnico para trading diario que combina dos estrategias independientes
(trend following + mean reversion) para dar un veredicto unificado sin contradicciones.
Incluye registro de trades para validar el sistema con 5 operaciones reales.
Envia alertas diarias por Telegram a las 9:30 AM Chile.

**URL produccion:** https://inversion.facundo.click
**Repo:** https://github.com/facundozupel/inversion
**Deploy:** Vercel (auto-deploy desde GitHub push a main)
**Bot Telegram:** @Facundo_inversion_bot
**Timeframe:** Diario (1D)

## Stack
- Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- TradingView Lightweight Charts v5 (graficos de velas)
- Yahoo Finance API (datos OHLCV, indices, VIX, earnings)
- CBOE API (put/call ratio SPX, ~27K opciones)
- Vercel (hosting, serverless functions, cron jobs)
- Telegram Bot API (alertas diarias automaticas)
- localStorage (registro de trades del usuario)

## Arquitectura (Domain-Driven)

### Dominio: Analisis Tecnico (`src/lib/`)
- `candle-patterns.ts` — Motor de analisis:
  - **Estrategia conservadora (trend following):** patrones de velas + tendencia (SMA 5 vs 20) + volumen
  - **Estrategia agresiva (mean reversion):** RSI 14 periodos para detectar sobreventa/sobrecompra y rebotes
  - **Veredicto final:** combina ambas. Si coinciden = senal fuerte. Si se contradicen = ESPERAR (nunca dice comprar y vender al mismo tiempo)
  - **RSI 14:** < 30 sobrevendido (oportunidad de rebote), > 70 sobrecomprado (correccion probable)
  - **ATR 14:** SL = precio - 1.5*ATR, TP = precio + 3*ATR. Ratio riesgo/beneficio 1:2
  - **Soporte/Resistencia:** min/max de ultimos 20 periodos
  - Score: -100 a +100. Trend (±40) + velas (±30) + RSI (±25) + volumen (±15) + momentum (±15)
- `market-context.ts` — Contexto macro. VIX, indices, put/call ratio SPX, earnings, red flags, "seguro para operar"

### Dominio: Datos de Mercado (`src/app/api/`)
- `candles/route.ts` — Proxy a Yahoo Finance v8 chart API. OHLCV para cualquier ticker
- `market-context/route.ts` — S&P 500, Nasdaq, VIX + Put/Call SPX desde CBOE (~27K opciones) en paralelo. Cache 2 min (Yahoo) / 5 min (CBOE)
- `earnings/route.ts` — Calendario de earnings via Yahoo Finance v10 quoteSummary. Cache 1 hora
- `telegram-alert/route.ts` — Analiza todos los activos y envia reporte por Telegram. Ejecutado por cron

### Presentacion (`src/components/`)
- `Dashboard.tsx` — Componente principal:
  - Grilla de 17 activos con badges COMPRAR/VENDER/ESPERAR
  - Filtro "listos para operar" (solo muestra activos con senal de compra)
  - Simulador de inversion en CLP (ganancia/perdida calculada con ATR real)
  - Panel de analisis: veredicto, dos estrategias lado a lado, soporte/resistencia, TP/SL con ratio, RSI con barra visual, patrones, tendencia, volumen
- `CandlestickChart.tsx` — Lightweight Charts v5. Velas + volumen como histograma
- `MarketContext.tsx` — Pulso del mercado (4 columnas): indices, VIX, put/call SPX, earnings. Badge "seguro para operar", red flags
- `MyTrades.tsx` — Registro de trades de validacion:
  - Formulario: simbolo, precio entrada, TP, SL, monto CLP, notas
  - Progreso: barra 0/5 trades con meta de validacion
  - Stats en vivo: win rate, P&L total CLP, trades restantes
  - Trades abiertos con botones cerrar ganancia/perdida
  - Historial con P&L por trade y porcentaje
  - Evaluacion final al completar 5 trades
  - Persistencia en localStorage (clave: inversion_trades)
- `HowItWorks.tsx` — Documentacion completa: flujo 7 pasos, indicadores, estrategias, limitaciones, disclaimer
- `page.tsx` — 3 tabs (Dashboard / Mis Trades / Como funciona) con `dynamic({ ssr: false })`

## Cron (Telegram)
- `vercel.json` — Cron: `30 12 * * 1-5` (9:30 AM Chile, lunes a viernes)
- Ejecuta `/api/telegram-alert` que analiza los 32 activos y manda reporte al chat del usuario
- Incluye: contexto macro, VIX, put/call SPX, senales COMPRAR/VENDER/ESPERAR con RSI y targets
- Plan gratuito de Vercel: 1 ejecucion/dia (suficiente para alerta matutina)

## Activos trackeados (32 activos en 7 categorias)
- **Indices/ETFs:** SPY, QQQ
- **Big Tech:** AAPL, MSFT, GOOGL, AMZN, META, TSLA, NFLX
- **Semiconductores:** NVDA, AMD, AVGO, TSM, ARM, INTC, QCOM, MU, MRVL, SMCI
- **Tech/Software:** CRM, PLTR
- **Salud/Pharma:** LLY, UNH, PFE, ABBV, MRNA
- **Finanzas/Otros:** JPM, V, DIS
- **Crypto/Forex:** BTC-USD, ETH-USD, EURUSD=X

## Indicadores tecnicos implementados
- **Patrones de velas:** Doji, Martillo, Estrella Fugaz, Envolvente, Harami, Marubozu, Trompo, Pinza, Estrella de la Manana/Vespertina
- **Tendencia:** SMA 5 vs SMA 20 (>2% = alcista, <-2% = bajista)
- **RSI:** 14 periodos con suavizado exponencial
- **ATR:** 14 periodos para SL/TP dinamico (ratio 1:2, TP 3x ATR, SL 1.5x ATR)
- **Volumen:** ratio vs promedio 20 periodos
- **Soporte/Resistencia:** min/max 20 periodos
- **Put/Call Ratio SPX:** calculado en tiempo real desde ~27K opciones del CBOE. >1.0 = miedo, <0.7 = codicia

## Logica de decisiones

### Cuando COMPRAR
- Ambas estrategias dicen comprar (senal fuerte — tendencia + RSI alineados)
- Conservadora dice comprar (tendencia a favor)
- Agresiva dice comprar + conservadora dice esperar (compra especulativa por rebote, SL ajustado)

### Cuando ESPERAR
- Las estrategias se contradicen (tendencia baja pero RSI sobrevendido — conflicto)
- Sin senal clara en ninguna estrategia

### Cuando VENDER
- Conservadora dice vender (tendencia en contra)

### Cuando NO OPERAR (contexto macro)
- VIX >= 30 (peligro, volatilidad extrema)
- S&P 500 y Nasdaq ambos rojos > 1.5%
- Earnings del activo en <= 3 dias

## Gestion de riesgo
- TP = precio + 3 x ATR (take profit dinamico)
- SL = precio - 1.5 x ATR (stop loss dinamico)
- Ratio riesgo/beneficio minimo 1:2
- Soporte y resistencia como referencia de niveles clave

## Validacion del sistema
- Meta: 5 trades reales siguiendo senales al pie de la letra
- Criterio de exito: 3 de 5 ganados con ratio 1:2 = ganancia neta
- Registro en pestana "Mis Trades" con localStorage
- Broker recomendado: Binance (comision 0.1%, sin minimo, crypto 24/7)
- Fase 2 (pendiente): automatizar compra/venta via API de Binance si los 5 trades son exitosos

## Limitaciones conocidas
- Flujo institucional limitado: tiene put/call SPX pero no dark pools, gamma exposure ni posicionamiento individual
- No tiene backtesting historico (el registro de trades manual es el primer paso)
- Soporte/resistencia basicos (min/max, no pivots ni fibonacci)
- No considera fundamentales (earnings, revenue, P/E)
- Timeframe unico (diario) — no hay analisis multi-timeframe

## Variables de entorno (en .env.local y Vercel)
- `TELEGRAM_BOT_TOKEN` — Token del bot (@Facundo_inversion_bot). NO commitear
- `TELEGRAM_CHAT_ID` — Chat ID del usuario (5570695337)

## Idioma
Todo en espanol (Chile). Fechas en formato es-CL. Patrones de velas traducidos.

## Convenciones
- Sin emojis en codigo a menos que se pida explicitamente (excepto favicon)
- Diseno minimalista blanco
- API routes sin autenticacion (datos publicos de Yahoo Finance y CBOE)
- `ssr: false` en page.tsx para evitar hydration mismatch
- Commit messages en espanol con Co-Authored-By de Claude
- Datos de trades en localStorage, no en servidor
