@AGENTS.md

# Proyecto: Inversion — Dashboard de Finanzas

## Que es
Dashboard de trading que analiza acciones, ETFs, crypto y forex usando analisis tecnico de velas japonesas.
Muestra senales de COMPRAR/VENDER/ESPERAR basadas en patrones de velas, tendencia y volumen.

**URL produccion:** https://inversion.facundo.click
**Repo:** https://github.com/facundozupel/inversion
**Deploy:** Vercel (auto-deploy desde GitHub push a main)

## Stack
- Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- TradingView Lightweight Charts v5 (graficos de velas)
- Yahoo Finance API (datos OHLCV, indices, VIX, earnings)
- Vercel (hosting, serverless functions)
- Telegram Bot API (alertas — en desarrollo)

## Arquitectura (Domain-Driven)

### Dominio: Analisis Tecnico
- `src/lib/candle-patterns.ts` — Motor de analisis. Detecta patrones de velas (Doji, Martillo, Envolvente, Harami, Estrella, etc.), calcula tendencia (SMA 5 vs 20), score (-100 a +100), senal (compra fuerte/compra/mantener/venta/venta fuerte), accion (comprar/vender/esperar), target (+2%) y stop loss (-2%).
- `src/lib/market-context.ts` — Contexto macro. Tipos e interfaces para indices, VIX, earnings. Logica de red flags y "seguro para operar".

### Dominio: Datos de Mercado
- `src/app/api/candles/route.ts` — Proxy a Yahoo Finance v8 chart API. Devuelve OHLCV para cualquier ticker.
- `src/app/api/market-context/route.ts` — Fetch S&P 500, Nasdaq, VIX en paralelo.
- `src/app/api/earnings/route.ts` — Fetch calendario de earnings via Yahoo Finance v10 quoteSummary.

### Presentacion
- `src/components/Dashboard.tsx` — Componente principal. Grilla de 17 activos con senales, filtro "listos para operar", simulador de inversion en CLP, selector de rango, panel de analisis.
- `src/components/CandlestickChart.tsx` — Wrapper de Lightweight Charts v5. Velas + volumen.
- `src/components/MarketContext.tsx` — Panel de contexto: pulso del mercado, VIX, earnings, badge "seguro para operar", red flags.
- `src/app/page.tsx` — Carga Dashboard con `dynamic({ ssr: false })` para evitar hydration errors.

## Activos trackeados
SPY, QQQ, AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, AMD, JPM, V, DIS, BTC-USD, ETH-USD, EURUSD=X

## Regla de trading implementada
- **COMPRAR:** patron alcista + tendencia alcista + volumen alto
- **VENDER:** patron bajista + tendencia bajista (o reversa bajista en alcista)
- **ESPERAR:** senales mixtas o no confirmadas
- **NO OPERAR:** VIX >= 30, ambos indices rojos > 1.5%, o earnings en <= 3 dias

## Variables de entorno
- `TELEGRAM_BOT_TOKEN` — Token del bot de Telegram (@Facundo_inversion_bot). Guardado en `.env.local` (NO commitear).
- `TELEGRAM_CHAT_ID` — Chat ID del usuario para enviar alertas. Guardado en `.env.local`.

## Idioma
Todo el frontend esta en espanol (Chile). Patrones de velas, senales, labels, fechas en formato es-CL.

## Convenciones
- Sin emojis en codigo a menos que se pida explicitamente
- Diseño minimalista blanco
- Los API routes no requieren autenticacion (datos publicos de Yahoo Finance)
- `ssr: false` en page.tsx para evitar hydration mismatch (datos dinamicos)
