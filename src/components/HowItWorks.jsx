import { useState } from 'react'
import { ALL_CONTROLS, CONSOLES } from '../data/controls'
import { TELEMETRY_CHANNELS } from '../data/telemetry'

const SUBTABS = [
  { id: 'simulador', label: 'El Simulador' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'sensores', label: 'Sensores y actuadores' },
  { id: 'galeria', label: 'Galería' },
]

export default function HowItWorks() {
  const [tab, setTab] = useState('simulador')

  return (
    <section className="section how">
      <nav className="subtabs">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`subtab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'simulador' && <Simulador />}
      {tab === 'resumen' && <Resumen />}
      {tab === 'sensores' && <Sensores />}
      {tab === 'galeria' && <Galeria />}
    </section>
  )
}

/**
 * Las cuatro consolas portátiles, con los instrumentos y mandos que trae cada
 * una según la especificación técnica del ESIM-PDS9B.
 */
const PANELES = [
  {
    n: 1,
    nombre: 'Consola del perforador',
    color: '#2563eb',
    instrumentos: ['Presión de bomba', 'Torque de rotaria', 'Velocidad de rotaria', 'SPM bomba 1', 'SPM bomba 2'],
    mandos: [
      'Embragues de bomba 1 y 2 (ON/OFF)',
      'Perillas de SPM de cada bomba',
      'Mesa rotaria: FWD / OFF / REV y perilla de velocidad',
      'Embrague del tambor: HIGH / OFF / LOW',
      'Acelerador del malacate y freno auxiliar',
      'Palanca de freno del perforador',
    ],
  },
  {
    n: 2,
    nombre: 'Consola del top drive',
    color: '#1d4ed8',
    instrumentos: ['Torque', 'Velocidad'],
    mandos: [
      'Operación: DRILL / SPIN / TORQUE',
      'Dirección: CCW / STOP / CW',
      'Acelerador y límite de torque de perforación',
      'IBOP (abrir/cerrar) y perno de traba',
      'Rotación e inclinación de links, clamp',
    ],
  },
  {
    n: 3,
    nombre: 'Consola del BOP',
    color: '#dc2626',
    instrumentos: [
      'Presión del acumulador',
      'Presión del manifold',
      'Presión de aire de alimentación',
      'Presión del anular',
      'Caudalímetro',
    ],
    mandos: [
      'Preventor anular',
      'Dos rams de tubería y un ram ciego',
      'Líneas de matar y de estrangular',
      'Bypass y regulador de presión del anular',
    ],
  },
  {
    n: 4,
    nombre: 'Consola del estrangulador',
    color: '#f59e0b',
    instrumentos: [
      'Presión de tubería',
      'Presión de casing',
      'Presión de la línea de matar',
      'SPM y emboladas totales',
      'Indicador de posición del choke',
    ],
    mandos: [
      'Palanca del estrangulador (abrir / mantener / cerrar)',
      'Selección de choke 1 o choke 2',
      'Regulador hidráulico',
      'Reset del contador de emboladas',
    ],
  },
]

function Simulador() {
  return (
    <div className="doc">
      <h2>Componentes del simulador ESIM-PDS9B</h2>
      <p>
        El ESIM-PDS9B es un simulador portátil de control de pozos fabricado por Chengdu Esimtech, que
        cumple con las normas <strong>IADC</strong> e <strong>IWCF</strong>. El puesto se compone de
        cuatro consolas de aluminio —perforador, top drive, BOP y estrangulador—, una notebook con el
        software de simulación, una pantalla táctil y un monitor para la vista gráfica 3D. La
        adquisición de datos y el control se resuelven con controladores industriales embebidos.
      </p>

      <figure className="diagram">
        <svg viewBox="0 0 900 380" role="img" aria-label="Disposición de las consolas del simulador">
          <rect x="0" y="0" width="900" height="380" fill="#0b1220" rx="12" />

          {/* mesa */}
          <rect x="50" y="300" width="800" height="16" fill="#1f2937" rx="4" />
          <rect x="70" y="316" width="14" height="50" fill="#1f2937" />
          <rect x="816" y="316" width="14" height="50" fill="#1f2937" />

          {/* consolas de pie */}
          {PANELES.map((p, i) => {
            const x = [70, 210, 560, 700][i]
            return (
              <g key={p.n} transform={`translate(${x} 120)`}>
                <rect width="130" height="180" rx="10" fill={p.color} opacity="0.9" />
                <circle cx="42" cy="42" r="20" fill="#e2e8f0" />
                <circle cx="90" cy="42" r="20" fill="#e2e8f0" />
                <rect x="26" y="82" width="78" height="20" rx="3" fill="#0b1220" stroke="#38bdf8" />
                <circle cx="40" cy="130" r="11" fill="#f59e0b" />
                <circle cx="66" cy="130" r="11" fill="#f59e0b" />
                <circle cx="92" cy="130" r="11" fill="#ef4444" />
                <circle cx="-6" cy="-6" r="16" fill="#ef4444" />
                <text x="-6" y="-1" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">
                  {p.n}
                </text>
              </g>
            )
          })}

          {/* notebook, táctil y monitor */}
          <g transform="translate(355 170)">
            <rect width="80" height="70" rx="6" fill="#1f2937" stroke="#475569" />
            <rect x="8" y="8" width="64" height="40" rx="3" fill="#0b1220" stroke="#38bdf8" />
            <rect y="74" width="80" height="8" rx="3" fill="#334155" />
            <circle cx="-6" cy="-6" r="16" fill="#ef4444" />
            <text x="-6" y="-1" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">
              5
            </text>
          </g>

          <g transform="translate(450 180)">
            <rect width="70" height="60" rx="6" fill="#22d3ee" opacity="0.85" />
            <rect x="7" y="7" width="56" height="46" rx="3" fill="#0b1220" stroke="#22d3ee" />
            <circle cx="76" cy="-6" r="16" fill="#ef4444" />
            <text x="76" y="-1" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">
              6
            </text>
          </g>

          <g transform="translate(360 70)">
            <rect width="160" height="90" rx="6" fill="#1f2937" stroke="#475569" />
            <rect x="8" y="8" width="144" height="74" rx="3" fill="#0b1220" stroke="#38bdf8" />
            <circle cx="-6" cy="-6" r="16" fill="#ef4444" />
            <text x="-6" y="-1" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">
              7
            </text>
          </g>
        </svg>
        <figcaption>
          Esquema de referencia según la figura 1 de la especificación. Reemplazar por la foto anotada
          del equipo instalado en el laboratorio cuando se releve (<code>public/galeria/</code>).
        </figcaption>
      </figure>

      <div className="panel-specs">
        {PANELES.map((p) => (
          <article key={p.n} className="panel-spec" style={{ borderColor: p.color }}>
            <h3 style={{ color: p.color }}>
              <span className="badge">{p.n}</span> {p.nombre}
            </h3>
            <h4>Instrumentos</h4>
            <ul>
              {p.instrumentos.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <h4>Mandos</h4>
            <ul>
              {p.mandos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <ol className="parts-list">
        <li>
          <span className="badge">5</span>
          <div>
            <strong>Notebook (i7, placa de video dedicada)</strong>
            <span>Ejecuta el software de simulación y la estación del instructor.</span>
          </div>
        </li>
        <li>
          <span className="badge">6</span>
          <div>
            <strong>Pantalla táctil</strong>
            <span>Carga de escenarios, parámetros del pozo y fallas durante el ejercicio.</span>
          </div>
        </li>
        <li>
          <span className="badge">7</span>
          <div>
            <strong>Monitor de vista gráfica</strong>
            <span>Animación 3D de la torre, el fondo de pozo y las curvas de parámetros.</span>
          </div>
        </li>
      </ol>
    </div>
  )
}

function Resumen() {
  return (
    <div className="doc">
      <h2>Esquema de funcionamiento del sistema remoto</h2>

      <h3>Qué calcula el simulador</h3>
      <ul>
        <li>WOB durante la perforación y presión de bomba una vez arrancada la circulación.</li>
        <li>Presiones fluctuantes durante las maniobras de sacar y bajar la sarta.</li>
        <li>Cierre duro (hard shut-in) y cierre suave (soft shut-in) con el conjunto de preventores.</li>
        <li>Presión de tubería cerrada con válvula de contrapresión en la sarta.</li>
        <li>Cambio de presión por migración de gas y fricción al pasar la tubería por el anular cerrado.</li>
      </ul>

      <h3>Prácticas previstas</h3>
      <ul>
        <li>Cierre del pozo ante surgencia perforando, sacando tubería o con el pozo vacío.</li>
        <li>Control de pozo por el método del perforador, el método del ingeniero y el método volumétrico.</li>
        <li>Fallas inducidas por el instructor: fuga en la sarta, tobera tapada o erosionada, erosión del choke, falla de bomba o de BOP.</li>
      </ul>

      <h3>Las dos líneas de remotización</h3>
      <p>
        <strong>Línea A · Remotización asistida.</strong> Cinco cámaras HD transmiten el estado de las
        consolas; la notebook y la pantalla táctil se operan con software de escritorio remoto y un
        operador local ejecuta las acciones físicas indicadas por audio o chat. Es la vía de menor costo
        y la que permite un piloto en pocas semanas.
      </p>
      <p>
        <strong>Línea B · Remotización autónoma.</strong> Actuadores electromecánicos mueven perillas,
        botones y palancas. Un controlador <strong>PoKeys57U</strong> (55 E/S digitales + 7 analógicas)
        traduce los comandos de esta interfaz web en movimientos reales, eliminando la dependencia del
        operador presencial.
      </p>

      <h3>Esquema de conexión</h3>
      <figure className="diagram">
        <svg viewBox="0 0 960 300" role="img" aria-label="Arquitectura de conexión del laboratorio remoto">
          <rect x="0" y="0" width="960" height="300" fill="#0b1220" rx="12" />

          <Box x={20} y={100} w={160} h={80} color="#38bdf8" title="Navegador" sub="Interfaz web React" />
          <Arrow x1={180} y1={140} x2={250} y2={140} label="HTTPS / WSS" />

          <Box x={250} y={100} w={160} h={80} color="#a78bfa" title="Plataforma R-Lab" sub="Turnos y autenticación" />
          <Arrow x1={410} y1={140} x2={480} y2={140} label="Token de sesión" />

          <Box x={480} y={40} w={180} h={80} color="#4ade80" title="Gateway" sub="Raspberry Pi 5 + FastAPI" />
          <Box x={480} y={170} w={180} h={80} color="#fbbf24" title="Video" sub="Elgato HD60 X + notebook" />

          <Arrow x1={660} y1={80} x2={740} y2={80} label="USB" />
          <Arrow x1={660} y1={210} x2={740} y2={210} label="Streams" />

          <Box x={740} y={40} w={190} h={80} color="#f97316" title="PoKeys57U" sub="Nema 17 · solenoide JF0530B" />
          <Box x={740} y={170} w={190} h={80} color="#22d3ee" title="5 cámaras Brio 100" sub="Consolas y vista general" />

          <text x="835" y="140" textAnchor="middle" fill="#94a3b8" fontSize="12">
            ▼ consolas portátiles del ESIM-PDS9B ▼
          </text>
        </svg>
        <figcaption>
          El navegador nunca habla directo con el hardware: todo pasa por el gateway, que valida la
          sesión, aplica los límites de seguridad y publica la telemetría por WebSocket.
        </figcaption>
      </figure>

      <h3>Flujo de una maniobra</h3>
      <ol className="steps">
        <li>El estudiante reserva un turno en R-Lab y recibe un token de sesión.</li>
        <li>La web abre el WebSocket contra el gateway y pasa a rol observador.</li>
        <li>Al solicitar el control, el gateway le asigna el rol de operador (uno por vez).</li>
        <li>Cada comando viaja como JSON, se valida y se traduce a una salida del PoKeys57U.</li>
        <li>El gateway publica la telemetría a 2 Hz y la interfaz la grafica y la guarda.</li>
        <li>Al terminar, la práctica se descarga en CSV para su evaluación.</li>
      </ol>
    </div>
  )
}

function Box({ x, y, w, h, color, title, sub }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#111a2e" stroke={color} strokeWidth="2" />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fill={color} fontSize="15" fontWeight="700">
        {title}
      </text>
      <text x={x + w / 2} y={y + h / 2 + 18} textAnchor="middle" fill="#94a3b8" fontSize="12">
        {sub}
      </text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, label }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - 8} y2={y2} stroke="#475569" strokeWidth="2" />
      <polygon points={`${x2},${y2} ${x2 - 10},${y2 - 5} ${x2 - 10},${y2 + 5}`} fill="#475569" />
      <text x={(x1 + x2) / 2} y={y1 - 10} textAnchor="middle" fill="#64748b" fontSize="11">
        {label}
      </text>
    </g>
  )
}

const HARDWARE = [
  ['Cámaras Logitech Brio 100 Full HD (×5)', 'Video en vivo de las cuatro consolas y del laboratorio'],
  ['Capturadora Elgato HD60 X', 'Captura y compone la señal de video'],
  ['Raspberry Pi 5 + SSD 512 GB', 'Gateway de control y registro de telemetría'],
  ['Hub USB 3.0 Vention 7 puertos', 'Conexión de cámaras y periféricos'],
  ['Controlador PoKeys57U', '55 E/S digitales + 7 analógicas hacia las consolas'],
  ['Motores Nema 17', 'Giro de las perillas de SPM, RT SPEED, throttle y reguladores'],
  ['Actuador solenoide JF0530B', 'Accionamiento de llaves, botones y válvulas de 4 vías'],
]

function Sensores() {
  return (
    <div className="doc">
      <h2>Sensores, canales y actuadores</h2>

      <h3>Canales de telemetría publicados por el gateway</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Variable</th>
            <th>Unidad</th>
            <th>Rango</th>
          </tr>
        </thead>
        <tbody>
          {TELEMETRY_CHANNELS.map((c) => (
            <tr key={c.id}>
              <td>
                <code>{c.id}</code>
              </td>
              <td>{c.label}</td>
              <td>{c.unit}</td>
              <td>
                {c.min} – {c.max}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Mapeo de actuadores</h3>
      {CONSOLES.map((consola) => (
        <div key={consola.id}>
          <h4 style={{ color: consola.color, marginTop: '1rem' }}>{consola.name}</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Comando</th>
                <th>Control físico</th>
                <th>Actuador / salida</th>
              </tr>
            </thead>
            <tbody>
              {consola.controls.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code>{c.id}</code>
                  </td>
                  <td>{c.label}</td>
                  <td>{c.actuator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="muted">
        Total: {ALL_CONTROLS.length} comandos mapeados sobre las cuatro consolas.
      </p>

      <h3>Equipamiento de la instalación</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Función</th>
          </tr>
        </thead>
        <tbody>
          {HARDWARE.map(([equipo, funcion]) => (
            <tr key={equipo}>
              <td>{equipo}</td>
              <td>{funcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Galería del proyecto.
 * Para cargar las fotos reales: dejar los archivos en `public/galeria/` y
 * listarlos en el array GALERIA (la ruta se resuelve con import.meta.env.BASE_URL).
 */
const GALERIA = [
  // { src: 'galeria/consola-perforador.jpg', caption: 'Consola del perforador instrumentada' },
]

function Galeria() {
  const [i, setI] = useState(0)

  if (GALERIA.length === 0) {
    return (
      <div className="doc">
        <h2>Galería del proyecto</h2>
        <p>
          Esta sección va a reunir las fotos del proceso de montaje: instalación de las cámaras, soportes
          de los motores sobre las perillas, cableado del PoKeys57U y puesta a punto del gateway.
        </p>
        <div className="gallery-empty">
          <span aria-hidden="true">🖼️</span>
          <p>
            Todavía no hay imágenes cargadas. Copiá las fotos en <code>public/galeria/</code> y agregá una
            entrada por foto en el array <code>GALERIA</code> de{' '}
            <code>src/components/HowItWorks.jsx</code>.
          </p>
        </div>
      </div>
    )
  }

  const foto = GALERIA[i]
  const base = import.meta.env.BASE_URL
  return (
    <div className="doc">
      <h2>Galería del proyecto</h2>
      <div className="gallery">
        <button type="button" className="btn btn-ghost" onClick={() => setI((i - 1 + GALERIA.length) % GALERIA.length)}>
          ‹
        </button>
        <figure>
          <img src={`${base}${foto.src}`} alt={foto.caption} />
          <figcaption>{foto.caption}</figcaption>
        </figure>
        <button type="button" className="btn btn-ghost" onClick={() => setI((i + 1) % GALERIA.length)}>
          ›
        </button>
      </div>
      <p className="muted">
        Imagen {i + 1} de {GALERIA.length}
      </p>
    </div>
  )
}
