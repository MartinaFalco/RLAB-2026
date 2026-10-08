/**
 * Piezas SVG reutilizables para dibujar las consolas del ESIM-PDS9B.
 *
 * Todas reciben el centro (cx, cy) en el sistema de coordenadas del viewBox de
 * su consola. El aspecto sigue a los paneles reales (fotos del laboratorio) y
 * la disposición, a la aplicación "Hardware Test" del fabricante.
 */

const RAD = Math.PI / 180

/** Punto sobre un círculo, con 0° a la derecha y ángulos crecientes horarios. */
function punto(cx, cy, r, grados) {
  return [cx + r * Math.cos(grados * RAD), cy + r * Math.sin(grados * RAD)]
}

/**
 * Captura el puntero para seguir el arrastre fuera del elemento. Puede fallar
 * (puntero ya liberado, elemento recién montado) y no debe cortar el comando:
 * por eso se llama después de aplicar el valor y con el error contenido.
 */
function capturar(e) {
  try {
    e.target.setPointerCapture?.(e.pointerId)
  } catch {
    /* el arrastre sigue funcionando mientras el puntero esté sobre la pieza */
  }
}

/* ------------------------------------------------------------------ *
 * Instrumento analógico (manómetro / tacómetro)
 * ------------------------------------------------------------------ */

/**
 * Aguja sobre escala de 270°, de 135° (abajo-izquierda) a 405°/45°.
 * `unit` y `unit2` replican las dobles escalas de los manómetros (bar / psi).
 */
export function Gauge({
  cx,
  cy,
  r = 48,
  value = 0,
  min = 0,
  max = 100,
  label,
  unit,
  unit2,
  ticks = 10,
  onClick,
  interactivo = false,
}) {
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  const anguloAguja = 135 + frac * 270
  const [ax, ay] = punto(cx, cy, r * 0.76, anguloAguja)

  const marcas = []
  for (let i = 0; i <= ticks; i += 1) {
    const g = 135 + (i / ticks) * 270
    const [x1, y1] = punto(cx, cy, r * 0.88, g)
    const [x2, y2] = punto(cx, cy, r * 0.74, g)
    const [tx, ty] = punto(cx, cy, r * 0.63, g)
    const valor = min + (i / ticks) * (max - min)
    marcas.push(
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f2937" strokeWidth={i % 2 === 0 ? 1.8 : 1} />
        {i % 2 === 0 && (
          <text x={tx} y={ty + 2.5} textAnchor="middle" fontSize={r * 0.145} fill="#334155">
            {formatearEscala(valor)}
          </text>
        )}
      </g>,
    )
  }

  return (
    <g
      className={interactivo ? 'pieza pieza-click' : 'pieza'}
      onClick={onClick}
      role={interactivo ? 'button' : undefined}
      tabIndex={interactivo ? 0 : undefined}
      onKeyDown={interactivo ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.(e) : undefined}
    >
      <circle cx={cx} cy={cy} r={r + 5} fill="#0f1115" />
      <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#0f1115" strokeWidth="3" />
      {marcas}
      {unit && (
        <text x={cx} y={cy + r * 0.45} textAnchor="middle" fontSize={r * 0.17} fill="#b91c1c" fontWeight="700">
          {unit}
        </text>
      )}
      {unit2 && (
        <text x={cx} y={cy + r * 0.64} textAnchor="middle" fontSize={r * 0.17} fill="#0f172a" fontWeight="700">
          {unit2}
        </text>
      )}
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.13} fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
      <Rotulo cx={cx} cy={cy + r + 20} texto={label} />
    </g>
  )
}

function formatearEscala(v) {
  const a = Math.abs(v)
  if (a >= 10000) return `${Math.round(v / 1000)}k`
  if (a >= 100) return String(Math.round(v))
  if (a >= 10) return String(Math.round(v))
  return String(Math.round(v * 10) / 10)
}

/* ------------------------------------------------------------------ *
 * Display digital
 * ------------------------------------------------------------------ */

export function Display({ cx, cy, w = 104, h = 30, value = 0, decimals = 2, label, onClick, interactivo = false }) {
  const texto = Number.isFinite(value) ? value.toFixed(decimals) : '----'
  return (
    <g
      className={interactivo ? 'pieza pieza-click' : 'pieza'}
      onClick={onClick}
      role={interactivo ? 'button' : undefined}
      tabIndex={interactivo ? 0 : undefined}
      onKeyDown={interactivo ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.(e) : undefined}
    >
      <rect x={cx - w / 2 - 3} y={cy - h / 2 - 3} width={w + 6} height={h + 6} rx="4" fill="#0f1115" />
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="2" fill="#1b1d26" />
      <text
        x={cx + w / 2 - 8}
        y={cy + h * 0.3}
        textAnchor="end"
        fontSize={h * 0.72}
        fill="#f87171"
        fontFamily="'Courier New', monospace"
        fontWeight="700"
      >
        {texto}
      </text>
      <Rotulo cx={cx} cy={cy + h / 2 + 14} texto={label} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Llave rotativa de 2 o 3 posiciones
 * ------------------------------------------------------------------ */

/**
 * `options` lista las posiciones en orden. Para una llave horizontal el primer
 * rótulo va a la izquierda y el último a la derecha; la del medio, arriba.
 * `vertical` las ubica arriba / medio / abajo (ej. DRUM CLUTCH).
 */
export function Switch({ cx, cy, r = 13, options, value, labels, vertical = false, label, onChange }) {
  const i = Math.max(0, options.indexOf(value))
  const n = options.length
  // 2 posiciones: -45° y 45°. 3 posiciones: -55°, 0°, 55° (medido desde arriba).
  const angulo = n === 2 ? (i === 0 ? -45 : 45) : [-55, 0, 55][i]
  const [px, py] = punto(cx, cy, r * 0.78, angulo - 90)
  const texto = labels || options

  return (
    <g className="pieza pieza-click" onClick={() => onChange?.(options[(i + 1) % n])}>
      <circle cx={cx} cy={cy} r={r + 2} fill="#0b0d12" opacity="0.45" />
      <circle cx={cx} cy={cy} r={r} fill="url(#perillaGrad)" stroke="#0f1115" strokeWidth="1.5" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx={px} cy={py} r="1.8" fill="#f8fafc" />

      {vertical ? (
        <>
          <Mini x={cx} y={cy - r - 8} texto={texto[0]} anchor="middle" />
          {n === 3 && <Mini x={cx - r - 6} y={cy + 3} texto={texto[1]} anchor="end" />}
          <Mini x={cx} y={cy + r + 14} texto={texto[n - 1]} anchor="middle" />
        </>
      ) : (
        <>
          <Mini x={cx - r - 6} y={cy + 3} texto={texto[0]} anchor="end" />
          {n === 3 && <Mini x={cx} y={cy - r - 8} texto={texto[1]} anchor="middle" />}
          <Mini x={cx + r + 6} y={cy + 3} texto={texto[n - 1]} anchor="start" />
        </>
      )}

      {label && <Rotulo cx={cx} cy={cy + r + (vertical ? 28 : 22)} texto={label} />}
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Perilla continua (potenciómetro)
 * ------------------------------------------------------------------ */

/**
 * Se arrastra con el mouse para fijar el valor (0 a 100 % del recorrido).
 * Doble clic abre el diálogo de calibración, como en la app del fabricante.
 */
export function Knob({ cx, cy, r = 17, value = 0, min = 0, max = 100, label, onChange, onCalibrate }) {
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  const angulo = 135 + frac * 270
  const [px, py] = punto(cx, cy, r * 0.62, angulo)

  const desdeEvento = (e) => {
    const svg = e.target.ownerSVGElement || e.target
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const local = pt.matrixTransform(svg.getScreenCTM().inverse())
    let g = (Math.atan2(local.y - cy, local.x - cx) / RAD + 360) % 360
    // El recorrido útil va de 135° a 405°; fuera de eso se satura.
    if (g < 135) g += 360
    const f = Math.max(0, Math.min(1, (g - 135) / 270))
    return min + f * (max - min)
  }

  const mover = (e) => {
    if (e.buttons !== 1) return
    onChange?.(desdeEvento(e))
  }

  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const g = 135 + f * 270
    const [x1, y1] = punto(cx, cy, r + 4, g)
    const [x2, y2] = punto(cx, cy, r + 9, g)
    return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1.5" />
  })

  return (
    <g
      className="pieza pieza-knob"
      onPointerDown={(e) => {
        onChange?.(desdeEvento(e))
        capturar(e)
      }}
      onPointerMove={mover}
      onDoubleClick={() => onCalibrate?.()}
    >
      {marcas}
      <circle cx={cx} cy={cy} r={r + 2} fill="#0b0d12" opacity="0.4" />
      <circle cx={cx} cy={cy} r={r} fill="url(#perillaGrad)" stroke="#0f1115" strokeWidth="1.5" />
      <polygon
        points={`${px},${py} ${cx + (px - cx) * 0.2 - (py - cy) * 0.18},${cy + (py - cy) * 0.2 + (px - cx) * 0.18} ${
          cx + (px - cx) * 0.2 + (py - cy) * 0.18
        },${cy + (py - cy) * 0.2 - (px - cx) * 0.18}`}
        fill="#f8fafc"
      />
      <Mini x={cx - r - 4} y={cy + r + 4} texto="MIN" anchor="middle" />
      <Rotulo cx={cx} cy={cy + r + 20} texto={label} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Palanca (choke valve / driller brake)
 * ------------------------------------------------------------------ */

/**
 * Palanca de tres posiciones con bola, como la del estrangulador.
 * `options` = [izquierda, centro, derecha].
 */
export function Lever({ cx, cy, alto = 62, options, value, onChange, label, labelIzq, labelDer, labelCentro }) {
  const i = Math.max(0, options.indexOf(value))
  const inclinacion = [-28, 0, 28][i]
  const rad = inclinacion * RAD
  const topX = cx + Math.sin(rad) * alto
  const topY = cy - Math.cos(rad) * alto

  const siguiente = () => onChange?.(options[(i + 1) % options.length])

  return (
    <g className="pieza pieza-click" onClick={siguiente}>
      <path
        d={`M ${cx - 46} ${cy - 26} A 46 46 0 0 1 ${cx - 14} ${cy - 44}`}
        fill="none"
        stroke="#64748b"
        strokeWidth="1.5"
        markerEnd="url(#flechaIzq)"
      />
      <path
        d={`M ${cx + 14} ${cy - 44} A 46 46 0 0 1 ${cx + 46} ${cy - 26}`}
        fill="none"
        stroke="#64748b"
        strokeWidth="1.5"
        markerEnd="url(#flechaDer)"
      />
      <ellipse cx={cx} cy={cy} rx="15" ry="9" fill="#94a3b8" stroke="#475569" />
      <line x1={cx} y1={cy} x2={topX} y2={topY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <circle cx={topX} cy={topY} r="11" fill="#1f2937" stroke="#0f1115" />
      {labelCentro && <Mini x={cx} y={cy - alto - 22} texto={labelCentro} anchor="middle" />}
      {labelIzq && <Mini x={cx - 52} y={cy - 18} texto={labelIzq} anchor="end" />}
      {labelDer && <Mini x={cx + 52} y={cy - 18} texto={labelDer} anchor="start" />}
      <Rotulo cx={cx} cy={cy + 24} texto={label} />
    </g>
  )
}

/** Palanca vertical deslizante (freno del perforador). */
export function SlideLever({ cx, cy, alto = 80, value = 0, label, onChange }) {
  const frac = Math.max(0, Math.min(100, value)) / 100
  const y = cy - alto / 2 + frac * alto

  const desdeEvento = (e) => {
    const svg = e.target.ownerSVGElement || e.target
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const local = pt.matrixTransform(svg.getScreenCTM().inverse())
    return Math.max(0, Math.min(100, ((local.y - (cy - alto / 2)) / alto) * 100))
  }

  return (
    <g
      className="pieza pieza-knob"
      onPointerDown={(e) => {
        onChange?.(desdeEvento(e))
        capturar(e)
      }}
      onPointerMove={(e) => e.buttons === 1 && onChange?.(desdeEvento(e))}
    >
      <rect x={cx - 4} y={cy - alto / 2} width="8" height={alto} rx="4" fill="#334155" />
      <Mini x={cx + 12} y={cy - alto / 2 + 4} texto="+" anchor="start" />
      <Mini x={cx + 12} y={cy + alto / 2} texto="−" anchor="start" />
      <circle cx={cx} cy={y} r="8" fill="#94a3b8" stroke="#0f1115" strokeWidth="1.5" />
      <Rotulo cx={cx} cy={cy + alto / 2 + 18} texto={label} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Indicadores y botones
 * ------------------------------------------------------------------ */

export function Led({ cx, cy, r = 7, on = false, color = '#22c55e', label, labelPos = 'left' }) {
  return (
    <g className="pieza">
      <circle cx={cx} cy={cy} r={r + 2} fill="#0f1115" />
      <circle cx={cx} cy={cy} r={r} fill={on ? color : oscurecer(color)} />
      {on && <circle cx={cx} cy={cy} r={r + 3} fill={color} opacity="0.3" />}
      {label && (
        <Mini
          x={labelPos === 'left' ? cx - r - 5 : cx + r + 5}
          y={cy + 3}
          texto={label}
          anchor={labelPos === 'left' ? 'end' : 'start'}
        />
      )}
    </g>
  )
}

function oscurecer(hex) {
  const map = { '#22c55e': '#14532d', '#ef4444': '#4c1d1d', '#38bdf8': '#0c4a6e' }
  return map[hex] || '#334155'
}

export function PushButton({ cx, cy, r = 10, color = '#2563eb', label, onClick }) {
  return (
    <g className="pieza pieza-click" onClick={onClick}>
      <circle cx={cx} cy={cy} r={r + 2.5} fill="#0f1115" />
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.3} fill="#ffffff" opacity="0.35" />
      <Rotulo cx={cx} cy={cy + r + 14} texto={label} />
    </g>
  )
}

/* ------------------------------------------------------------------ *
 * Texto
 * ------------------------------------------------------------------ */

/** Rótulo serigrafiado debajo de un instrumento. */
export function Rotulo({ cx, cy, texto, size = 8.5 }) {
  if (!texto) return null
  return (
    <text x={cx} y={cy} textAnchor="middle" fontSize={size} fill="#f8fafc" letterSpacing="0.6">
      {texto}
    </text>
  )
}

/** Texto chico junto a una llave (posiciones). */
export function Mini({ x, y, texto, anchor = 'middle', size = 7.5 }) {
  if (!texto) return null
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fill="#e2e8f0" letterSpacing="0.4">
      {texto}
    </text>
  )
}

/** Recuadro agrupador serigrafiado (como los del top drive). */
export function Grupo({ x, y, w, h }) {
  return <rect x={x} y={y} width={w} height={h} rx="8" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.6" />
}

/** Definiciones compartidas (degradé de las perillas y flechas de la palanca). */
export function Defs() {
  return (
    <defs>
      <radialGradient id="perillaGrad" cx="35%" cy="30%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="60%" stopColor="#1f2937" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <marker id="flechaIzq" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="#64748b" />
      </marker>
      <marker id="flechaDer" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 z" fill="#64748b" />
      </marker>
    </defs>
  )
}
