import { useState } from 'react'
import { CONSOLAS_INTERACTIVAS } from './consoles/Panels'
import { CHANNELS_BY_ID } from '../data/telemetry'

/**
 * Réplica interactiva de las consolas, al estilo de la aplicación
 * "Hardware Test" del fabricante: menú lateral con las cuatro consolas y el
 * panel seleccionado dibujado a escala, con sus instrumentos y mandos.
 *
 * Diferencias respecto de la app original, a propósito:
 *   · Los instrumentos muestran la telemetría en vivo del simulador.
 *   · Las maniobras de preventores piden confirmación antes de enviarse.
 *   · Forzar el valor de un instrumento solo se habilita en modo prueba.
 */

/** Controles que no se accionan sin confirmar. */
const CRITICOS = new Set(['annular', 'pipe_rams_upper', 'blind_rams', 'pipe_rams_lower', 'pipe_rams_bottom', 'ibop'])

export default function InteractiveConsoles({ link }) {
  const [activa, setActiva] = useState('bop')
  const [testMode, setTestMode] = useState(false)
  const [teclado, setTeclado] = useState(null)
  const [calibracion, setCalibracion] = useState(null)
  const [confirmar, setConfirmar] = useState(null)

  const esOperador = link.role === 'operador'
  const consola = CONSOLAS_INTERACTIVAS.find((c) => c.id === activa) || CONSOLAS_INTERACTIVAS[0]
  const Panel = consola.componente

  const onControl = (id, valor) => {
    if (!esOperador) return
    if (CRITICOS.has(id)) {
      setConfirmar({ id, valor })
      return
    }
    link.setControl(id, valor)
  }

  const onAction = (id) => {
    if (!esOperador) return
    link.runAction(id)
  }

  return (
    <div className="hw">
      <aside className="hw-lista">
        {CONSOLAS_INTERACTIVAS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`hw-item ${activa === c.id ? 'is-active' : ''}`}
            onClick={() => setActiva(c.id)}
          >
            <span className="hw-chip" style={{ background: c.color }} />
            {c.nombre}
          </button>
        ))}

        <label className="hw-test">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
          Modo prueba de hardware
        </label>
        <p className="hw-ayuda">
          Con el modo de prueba activado se puede hacer clic en un instrumento para forzar su lectura y
          verificar el cableado. Doble clic en una perilla abre su calibración.
        </p>
      </aside>

      <div className="hw-panel">
        <header className="hw-head">
          <h3>{consola.nombre}</h3>
          {testMode && <span className="hw-badge">PRUEBA DE HARDWARE</span>}
          {!esOperador && <span className="hw-badge hw-badge-muted">SOLO LECTURA</span>}
        </header>

        <div className="hw-lienzo">
          <Panel
            values={link.controls}
            t={link.last}
            onControl={onControl}
            onAction={onAction}
            onInstrument={setTeclado}
            onCalibrate={setCalibracion}
            testMode={testMode && esOperador}
          />
        </div>
      </div>

      {teclado && (
        <Teclado
          def={teclado}
          onCancel={() => setTeclado(null)}
          onOk={(valor) => {
            link.forceInstrument(teclado.id, valor)
            setTeclado(null)
          }}
        />
      )}

      {calibracion && (
        <Calibracion
          def={calibracion}
          actual={link.calibrations?.[calibracion.id]}
          onCancel={() => setCalibracion(null)}
          onSave={(datos) => {
            link.setCalibration(calibracion.id, datos)
            setCalibracion(null)
          }}
        />
      )}

      {confirmar && (
        <Modal titulo="Confirmar maniobra" onCancel={() => setConfirmar(null)}>
          <p className="hw-confirm">
            Vas a {confirmar.valor ? 'CERRAR' : 'ABRIR'} <strong>{etiqueta(confirmar.id)}</strong> en el
            simulador.
          </p>
          <div className="hw-botones">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                link.setControl(confirmar.id, confirmar.valor)
                setConfirmar(null)
              }}
            >
              Confirmar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const ETIQUETAS = {
  annular: 'el preventor anular',
  pipe_rams_upper: 'el ram de tubería superior',
  blind_rams: 'el ram ciego',
  pipe_rams_lower: 'el ram de tubería inferior',
  pipe_rams_bottom: 'el ram de tubería inferior (bajo las líneas)',
  ibop: 'el IBOP',
}
const etiqueta = (id) => ETIQUETAS[id] || id

/* ------------------------------------------------------------------ *
 * Diálogos
 * ------------------------------------------------------------------ */

function Modal({ titulo, children, onCancel }) {
  return (
    <div className="hw-modal-fondo" onClick={onCancel} role="presentation">
      <div className="hw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <header>{titulo}</header>
        <div className="hw-modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/** Teclado numérico, igual al de la aplicación del fabricante. */
function Teclado({ def, onOk, onCancel }) {
  const canal = CHANNELS_BY_ID[def.id]
  const max = canal?.max ?? 99999
  const min = canal?.min ?? 0
  const [texto, setTexto] = useState('')

  const escribir = (c) => setTexto((t) => (t.length < 9 ? t + c : t))
  const valor = Number(texto)
  const valido = texto !== '' && Number.isFinite(valor) && valor >= min && valor <= max

  return (
    <Modal titulo={def.label} onCancel={onCancel}>
      <div className="teclado-valor">
        <span>{def.label}</span>
        <input value={texto} readOnly className={valido || texto === '' ? '' : 'fuera'} />
        <span>{def.unit}</span>
      </div>
      <p className="teclado-rango">
        ({min} ~ {max})
      </p>
      <div className="teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((c) => (
          <button key={c} type="button" onClick={() => escribir(c)}>
            {c}
          </button>
        ))}
        <button type="button" onClick={() => setTexto((t) => t.slice(0, -1))}>
          Back
        </button>
        <button type="button" className="teclado-ok" disabled={!valido} onClick={() => onOk(valor)}>
          Ok
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

/** Calibración de una perilla: recorrido útil del actuador y margen. */
function Calibracion({ def, actual, onSave, onCancel }) {
  const [datos, setDatos] = useState({
    current: actual?.current ?? 0,
    max: actual?.max ?? 0,
    min: actual?.min ?? 0,
    margin: actual?.margin ?? 1,
  })
  const [error, setError] = useState('')

  const editar = (campo, v) => setDatos((d) => ({ ...d, [campo]: v }))

  const guardar = () => {
    if (Number(datos.max) - Number(datos.min) <= 0.1) {
      setError('La diferencia entre el valor máximo y el mínimo debe ser mayor que 0,1.')
      return
    }
    onSave({ ...datos, max: Number(datos.max), min: Number(datos.min), current: Number(datos.current) })
  }

  return (
    <Modal titulo={def.label} onCancel={onCancel}>
      {['current', 'max', 'min'].map((campo) => (
        <label key={campo} className="calib-fila">
          <span>
            {{ current: 'Valor actual', max: 'Valor máximo', min: 'Valor mínimo' }[campo]}
            {def.unit ? ` (${def.unit})` : ''}:
          </span>
          <input
            type="number"
            step="0.01"
            value={datos[campo]}
            onChange={(e) => editar(campo, e.target.value)}
          />
        </label>
      ))}
      <label className="calib-fila">
        <span>Margen (%):</span>
        <select value={datos.margin} onChange={(e) => editar('margin', Number(e.target.value))}>
          {[1, 2, 3, 5, 10].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="calib-error">⚠ {error}</p>}

      <div className="hw-botones">
        <button type="button" className="btn btn-primary" onClick={guardar}>
          Guardar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
