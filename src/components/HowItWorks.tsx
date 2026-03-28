"use client";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-neutral-100 rounded-lg p-5 mb-4">
      <h3 className="text-sm font-semibold text-neutral-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 tracking-tight mb-2">Como funciona</h2>
        <p className="text-sm text-neutral-400">La logica detras de cada senal y decision del sistema</p>
      </div>

      {/* Flujo general */}
      <Section title="Flujo de datos (paso a paso)">
        <Step number={1} title="Obtencion de datos (Yahoo Finance)" description="Se consultan precios historicos OHLCV (Open, High, Low, Close, Volume) de 17 activos en timeframe diario (1D). Tambien S&P 500, Nasdaq y VIX para contexto macro. Datos gratuitos, sin API key." />
        <Step number={2} title="Contexto macro" description="Se verifica VIX (indice de miedo), Put/Call ratio SPX (sentimiento institucional desde ~27K opciones del CBOE), estado de indices y calendario de earnings. Si VIX >= 30, put/call > 1.0 (miedo) o ambos indices rojos > 1.5%, se marca como NO SEGURO PARA OPERAR." />
        <Step number={3} title="Analisis tecnico por activo" description="Cada activo se analiza con 6 indicadores: patrones de velas, tendencia (SMA 5 vs 20), RSI (14 periodos), ATR (volatilidad), volumen relativo, y soporte/resistencia (min/max 20 periodos)." />
        <Step number={4} title="Dos estrategias independientes" description="Conservadora: sigue la tendencia (compra si alcista + patron alcista + volumen). Agresiva: busca rebotes (compra si RSI < 30, sobrevendido)." />
        <Step number={5} title="Veredicto unificado" description="Se combinan ambas estrategias. Si coinciden = senal fuerte. Si se contradicen = ESPERAR. Nunca da senales contradictorias (ej: comprar y vender al mismo tiempo)." />
        <Step number={6} title="Gestion de riesgo" description="Se calcula TP (3x ATR) y SL (1.5x ATR) para ratio minimo 1:2. Soporte y resistencia como referencia de niveles clave." />
        <Step number={7} title="Alerta Telegram" description="Lunes a viernes a las 9:30 AM Chile, se envia automaticamente el reporte con oportunidades, targets y contexto." />
      </Section>

      {/* Patrones de velas */}
      <Section title="Patrones de velas japonesas">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Cada vela tiene 4 precios: apertura, maximo, minimo y cierre. De ahi se calculan tres proporciones: cuerpo/rango, mecha superior/rango y mecha inferior/rango. Con estos ratios se clasifican los patrones.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-xs">
            <p className="font-medium text-neutral-700 mb-1">Patrones alcistas</p>
            <ul className="text-neutral-500 space-y-0.5">
              <li>Martillo — mecha larga abajo, compradores recuperaron</li>
              <li>Envolvente Alcista — vela verde envuelve la roja anterior</li>
              <li>Estrella de la Manana — 3 velas: baja, indecision, sube</li>
              <li>Marubozu Alcista — cuerpo completo sin mechas</li>
              <li>Harami Alcista — vela chica dentro de la anterior</li>
            </ul>
          </div>
          <div className="text-xs">
            <p className="font-medium text-neutral-700 mb-1">Patrones bajistas</p>
            <ul className="text-neutral-500 space-y-0.5">
              <li>Estrella Fugaz — mecha larga arriba, vendedores rechazaron</li>
              <li>Envolvente Bajista — vela roja envuelve la verde anterior</li>
              <li>Estrella Vespertina — 3 velas: sube, indecision, baja</li>
              <li>Marubozu Bajista — cuerpo completo sin mechas</li>
              <li>Hombre Colgado — mecha larga abajo en tendencia alcista</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Tendencia */}
      <Section title="Tendencia (SMA 5 vs SMA 20)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Se calcula el promedio movil simple de los ultimos 5 periodos (corto plazo) y 20 periodos (largo plazo). La diferencia porcentual entre ambos determina la tendencia.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-neutral-700">SMA 5 esta mas de 2% arriba de SMA 20</span>
            <span className="text-neutral-400 ml-auto">Tendencia alcista</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-neutral-700">SMA 5 esta mas de 2% abajo de SMA 20</span>
            <span className="text-neutral-400 ml-auto">Tendencia bajista</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-neutral-700">Diferencia menor a 2%</span>
            <span className="text-neutral-400 ml-auto">Lateral</span>
          </div>
        </div>
      </Section>

      {/* RSI */}
      <Section title="RSI — Relative Strength Index (14 periodos)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Mide la velocidad y magnitud de los cambios de precio. Va de 0 a 100. Cuando un activo cae mucho (RSI bajo), es probable que rebote. Cuando sube mucho (RSI alto), es probable que corrija.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-neutral-700">RSI menor a 30</span>
            <span className="text-neutral-400 ml-auto">Sobrevendido — oportunidad de compra por rebote</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-neutral-700">RSI entre 30 y 70</span>
            <span className="text-neutral-400 ml-auto">Zona neutral — sin senal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-neutral-700">RSI mayor a 70</span>
            <span className="text-neutral-400 ml-auto">Sobrecomprado — posible correccion</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Calculo: se promedian las ganancias y perdidas de los ultimos 14 periodos con suavizado exponencial. RSI = 100 - (100 / (1 + promedio_ganancias / promedio_perdidas)).
        </p>
      </Section>

      {/* Dos estrategias */}
      <Section title="Dos estrategias independientes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          <div className="border border-neutral-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-neutral-700 mb-2">Conservadora (Trend Following)</p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Sigue la tendencia del mercado. Compra cuando hay patron alcista + tendencia alcista + volumen alto. Vende cuando la tendencia es bajista. Es la estrategia mas segura — operas a favor del flujo.
            </p>
          </div>
          <div className="border border-neutral-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-neutral-700 mb-2">Agresiva (Mean Reversion)</p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Busca rebotes en activos sobrevendidos. Cuando el RSI baja de 30, el activo cayo demasiado y es probable un rebote tecnico. Es mas riesgosa pero puede encontrar oportunidades cuando todo cae.
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          El veredicto final combina ambas. Si las dos dicen COMPRAR, la senal es fuerte. Si la conservadora dice VENDER pero la agresiva dice COMPRAR (RSI sobrevendido en tendencia bajista), el sistema dice ESPERAR — hay conflicto y no hay consenso.
        </p>
      </Section>

      {/* Score */}
      <Section title="Score (-100 a +100)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Cada activo recibe un puntaje combinando multiples factores. El score determina la senal general.
        </p>
        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-neutral-700">Tendencia (SMA)</span>
            <span className="text-neutral-400">hasta ±40 puntos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-700">Patrones de velas</span>
            <span className="text-neutral-400">hasta ±30 puntos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-700">RSI (sobreventa/sobrecompra)</span>
            <span className="text-neutral-400">±25 puntos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-700">Confirmacion de volumen</span>
            <span className="text-neutral-400">±15 puntos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-700">Momentum (ultimas 5 velas)</span>
            <span className="text-neutral-400">±15 puntos</span>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 font-medium">Compra Fuerte</span>
            <span className="text-neutral-400">Score 50 a 100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-green-50/50 text-green-600 border border-green-100 font-medium">Compra</span>
            <span className="text-neutral-400">Score 20 a 49</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-neutral-50 text-neutral-500 border border-neutral-200 font-medium">Mantener</span>
            <span className="text-neutral-400">Score -19 a 19</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-50/50 text-red-500 border border-red-100 font-medium">Venta</span>
            <span className="text-neutral-400">Score -49 a -20</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 font-medium">Venta Fuerte</span>
            <span className="text-neutral-400">Score -100 a -50</span>
          </div>
        </div>
      </Section>

      {/* ATR */}
      <Section title="ATR — Stop Loss y Take Profit dinamico">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          El Average True Range mide la volatilidad real de un activo en los ultimos 14 periodos. Se usa para calcular SL y TP proporcionales al movimiento normal del activo.
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-green-600">Take Profit (TP)</span>
            <span className="text-neutral-400">Precio actual + 3 x ATR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-500">Stop Loss (SL)</span>
            <span className="text-neutral-400">Precio actual - 1.5 x ATR</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-neutral-700">Ratio riesgo/beneficio</span>
            <span className="text-neutral-400">1:2 (por cada $1 arriesgado, buscas ganar $2)</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Ejemplo: si TSLA tiene ATR de $15 y el precio es $360, el TP seria $405 (+$45) y el SL $337.50 (-$22.50). Ratio 1:2 — arriesgas $22.50 para ganar $45.
        </p>
      </Section>

      {/* Soporte y Resistencia */}
      <Section title="Soporte y Resistencia">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Se calculan como el minimo y maximo de los ultimos 20 periodos. Son niveles donde el precio historicamente reboto o fue rechazado.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 mt-1" />
            <div>
              <p className="font-medium text-neutral-700">Soporte (minimo de 20 periodos)</p>
              <p className="text-neutral-400">Nivel donde los compradores tienden a entrar. Si el precio se acerca al soporte y rebota, es senal alcista.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />
            <div>
              <p className="font-medium text-neutral-700">Resistencia (maximo de 20 periodos)</p>
              <p className="text-neutral-400">Nivel donde los vendedores tienden a vender. Si el precio se acerca a la resistencia y es rechazado, es senal bajista.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Put/Call */}
      <Section title="Put/Call Ratio SPX (sentimiento institucional)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Se calcula en tiempo real desde las opciones del S&P 500 (SPX) en el CBOE. Mide cuantas opciones de venta (puts) se operan vs opciones de compra (calls). Es un proxy del sentimiento de los grandes jugadores del mercado.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-neutral-700">Ratio mayor a 1.0</span>
            <span className="text-neutral-400 ml-auto">Miedo — institucionales cubriendose con puts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-neutral-700">Ratio entre 0.7 y 1.0</span>
            <span className="text-neutral-400 ml-auto">Neutral — equilibrio</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-neutral-700">Ratio menor a 0.7</span>
            <span className="text-neutral-400 ml-auto">Codicia — exceso de apuestas alcistas (precaucion)</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Fuente: CBOE (Chicago Board Options Exchange) con datos delayed. Se calculan ~27,000 contratos de opciones SPX para obtener el ratio agregado por volumen.
        </p>
      </Section>

      {/* Contexto macro */}
      <Section title="Contexto del mercado (red flags)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Antes de cualquier operacion, el sistema verifica el estado general del mercado. Si hay red flags, se recomienda no operar independientemente de las senales individuales.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold mt-px">!</span>
            <div>
              <p className="font-medium text-neutral-700">VIX mayor a 30</p>
              <p className="text-neutral-400">Miedo extremo. El mercado esta muy volatil e impredecible. No operar.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold mt-px">!</span>
            <div>
              <p className="font-medium text-neutral-700">S&P 500 y Nasdaq ambos rojos mas de 1.5%</p>
              <p className="text-neutral-400">Venta generalizada. El mercado entero cae — no es momento de comprar.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold mt-px">!</span>
            <div>
              <p className="font-medium text-neutral-700">Earnings en los proximos 3 dias</p>
              <p className="text-neutral-400">El reporte de ganancias puede mover el precio bruscamente en cualquier direccion. Evitar comprar antes.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Validacion */}
      <Section title="Validacion del sistema (Mis Trades)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Antes de confiar en el sistema o subir el monto, se recomienda hacer 5 trades reales con monto chico ($10.000 CLP) siguiendo las senales al pie de la letra.
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">1.</span>
            <p className="text-neutral-500">Solo compra cuando el sistema dice COMPRAR y el mercado es SEGURO PARA OPERAR</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">2.</span>
            <p className="text-neutral-500">Usa el TP y SL que te da el sistema — no los cambies</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">3.</span>
            <p className="text-neutral-500">No te salgas antes del TP por miedo ni aguantes pasado el SL por esperanza</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">4.</span>
            <p className="text-neutral-500">Registra cada trade en la pestana "Mis Trades" con precio de entrada, TP, SL y monto</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">5.</span>
            <p className="text-neutral-500">Si ganas 3 de 5 con ratio 1:2 quedas en ganancia neta — el sistema funciona</p>
          </div>
        </div>
        <div className="border border-neutral-100 rounded-lg p-3 mt-3">
          <p className="text-xs font-semibold text-neutral-700 mb-1">Matematica del ratio 1:2</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Si arriesgas $100 por trade (SL) y buscas ganar $200 (TP), con 3 ganados y 2 perdidos el resultado es: (3 x $200) - (2 x $100) = $600 - $200 = +$400 de ganancia neta. Por eso el win rate no necesita ser alto — con ganar 3 de 5 (60%) ya es rentable.
          </p>
        </div>
      </Section>

      {/* Telegram */}
      <Section title="Alertas por Telegram">
        <p className="text-xs text-neutral-500 leading-relaxed">
          Cada dia de lunes a viernes a las 9:30 AM (hora Chile), el sistema analiza automaticamente todos los activos y envia un reporte por Telegram con: contexto del mercado (indices, VIX, put/call SPX), activos para comprar con RSI, target y stop loss, activos para vender, y activos en espera. Si ningun activo cumple las condiciones, el mensaje indica que no hay oportunidades y recomienda no operar.
        </p>
      </Section>

      {/* Roadmap */}
      <Section title="Proximos pasos">
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-100 text-green-700`}>Hecho</span>
            <p className="text-neutral-500">Senales de compra/venta con dos estrategias + RSI + ATR</p>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-100 text-green-700`}>Hecho</span>
            <p className="text-neutral-500">Contexto macro: VIX, indices, put/call SPX, earnings</p>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-green-100 text-green-700`}>Hecho</span>
            <p className="text-neutral-500">Alertas diarias por Telegram</p>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700`}>En curso</span>
            <p className="text-neutral-500">Validacion con 5 trades reales (pestana Mis Trades)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-neutral-100 text-neutral-500`}>Pendiente</span>
            <p className="text-neutral-500">Automatizacion de compra/venta via API de Binance (Fase 2, solo si los 5 trades validan el sistema)</p>
          </div>
        </div>
      </Section>

      {/* Limitaciones */}
      <Section title="Limitaciones del sistema (transparencia)">
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          Este sistema tiene limitaciones que debes conocer antes de operar:
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">1.</span>
            <div>
              <p className="font-medium text-neutral-700">Sin backtesting ni win rate</p>
              <p className="text-neutral-400">No hay registro historico de cuantas senales fueron correctas. Las senales se basan en patrones estadisticos pero no hay evidencia de rendimiento pasado.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">2.</span>
            <div>
              <p className="font-medium text-neutral-700">Timeframe unico (diario)</p>
              <p className="text-neutral-400">Solo analiza velas diarias. Un patron en diario puede contradecir lo que pasa en 4 horas o semanal. No hay analisis multi-timeframe.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">3.</span>
            <div>
              <p className="font-medium text-neutral-700">Sin analisis fundamental</p>
              <p className="text-neutral-400">No considera revenue, P/E ratio, deuda, ni noticias de la empresa. Solo mira el precio y volumen.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">4.</span>
            <div>
              <p className="font-medium text-neutral-700">Flujo institucional limitado</p>
              <p className="text-neutral-400">Usa el ratio put/call del SPX (CBOE) como proxy del sentimiento institucional. No tiene datos de dark pools, gamma exposure ni posicionamiento de fondos individuales.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">5.</span>
            <div>
              <p className="font-medium text-neutral-700">Soporte/resistencia basicos</p>
              <p className="text-neutral-400">Usa min/max de 20 periodos. No calcula pivots, fibonacci ni zonas de liquidez.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neutral-400 mt-0.5">6.</span>
            <div>
              <p className="font-medium text-neutral-700">Datos de Yahoo Finance</p>
              <p className="text-neutral-400">Yahoo Finance no es un feed oficial. Puede tener retrasos de hasta 15 minutos y ocasionalmente datos incorrectos.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Para que sirve y para que no */}
      <Section title="Para que sirve y para que no">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-green-100 rounded-lg p-3 bg-green-50/30">
            <p className="text-xs font-semibold text-green-700 mb-2">Sirve para</p>
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>Filtro rapido de oportunidades diarias</li>
              <li>Detectar activos sobrevendidos (rebotes)</li>
              <li>Tener TP/SL calculados antes de operar</li>
              <li>Saber si hoy es buen dia para operar (VIX)</li>
              <li>Aprender analisis tecnico visual</li>
            </ul>
          </div>
          <div className="border border-red-100 rounded-lg p-3 bg-red-50/30">
            <p className="text-xs font-semibold text-red-700 mb-2">NO sirve para</p>
            <ul className="text-xs text-neutral-500 space-y-1">
              <li>Reemplazar analisis profesional</li>
              <li>Operar a ciegas sin otra fuente</li>
              <li>Trading intradía (timeframe diario)</li>
              <li>Evaluar la salud financiera de una empresa</li>
              <li>Garantizar ganancias</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Disclaimer */}
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mt-6">
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Importante:</span> Este sistema es una herramienta de analisis tecnico, no asesoramiento financiero. Las senales se basan en datos historicos y patrones estadisticos — no garantizan resultados futuros. Opera bajo tu propio criterio y riesgo. Nunca inviertas dinero que no puedas perder.
        </p>
      </div>
    </div>
  );
}
