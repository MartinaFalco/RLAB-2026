import { useState } from 'react'
import ControlCard from './ControlCard'
import CameraGrid from './CameraGrid'
import Charts from './Charts'
import AlarmSettings from './AlarmSettings'
import { CONSOLES, SCENARIOS } from '../data/controls'
import {
  CHANNELS_BY_ID,
  CHANNEL_GROUPS,
  DEFAULT_SELECTED,
  KPI_CHANNELS,
  TELEMETRY_CHANNELS,
} from '../data/telemetry'

export default function ControlPanel({ link }) {
  const [selected, setSelected] = useState(DEFAULT_SELECTED)
  const esOperador = link.role === 'operador'

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <section className="section panel">
      {!esOperador && (
        <div className="banner banner-info">
          Estás en modo <strong>observador</strong>: podés ver la telemetría y las cámaras, pero los
          comandos están bloqueados. Usá <strong>Solicitar control</strong> en la barra superior para
          tomar el mando del simulador.
        </div>
      )}

      {/* ---- Indicadores principales ---- */}
      <div className="kpi-row">
        {KPI_CHANNELS.map((id) => {
          const ch = CHANNELS_BY_ID[id]
          const valor = link.last?.[id]
          return (
            <div key={id} className="kpi" style={{ borderColor: ch.color }}>
              <span className="kpi-label">{ch.label}</span>
              <span className="kpi-value" style={{ color: ch.color }}>
                {valor != null ? valor.toFixed(1) : '—'}
                <small>{ch.unit}</small>
              </span>
            </div>
          )
        })}
      </div>

      {/* ---- Selección de variables a graficar ---- */}
      <div className="selector">
        <h2>Seleccionar gráficos a mostrar</h2>
        <div className="selector-groups">
          {CHANNEL_GROUPS.map((grupo) => (
            <div key={grupo} className="selector-group">
              <h4>{grupo}</h4>
              {TELEMETRY_CHANNELS.filter((c) => c.group === grupo).map((c) => (
                <label key={c.id} className="check">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span style={{ borderColor: c.color }} className="check-box" />
                  {c.label}
                </label>
              ))}
            </div>
          ))}
        </div>
        <p className="units-note">
          Presiones en psi · WOB en klb · Torque en ft·lb · Rotaria en RPM · Caudales en gpm ·
          Volúmenes en bbl · Densidad en ppg · Profundidad y ROP en ft y ft/h · Gas y aperturas en %
        </p>
        <div className="selector-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setSelected(TELEMETRY_CHANNELS.map((c) => c.id))}>
            Seleccionar todo
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setSelected([])}>
            Limpiar selección
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setSelected(DEFAULT_SELECTED)}>
            Selección por defecto
          </button>
        </div>
      </div>

      {/* ---- Escenario del instructor ---- */}
      <div className="scenario">
        <h2>Escenario cargado en la consola táctil</h2>
        <div className="scenario-list">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              title={sc.hint}
              disabled={!esOperador}
              className={`scenario-btn ${link.controls.escenario === sc.id ? 'is-active' : ''}`}
              onClick={() => link.setControl('escenario', sc.id)}
            >
              <strong>{sc.label}</strong>
              <span>{sc.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Controles + cámaras ---- */}
      <div className="panel-body">
        <div className="consoles">
          {CONSOLES.map((c) => (
            <ControlCard
              key={c.id}
              consola={c}
              values={link.controls}
              onChange={link.setControl}
              onAction={link.runAction}
              disabled={!esOperador}
            />
          ))}
        </div>

        <div className="panel-side">
          <h2>Cámaras del laboratorio</h2>
          <CameraGrid />

          <AlarmSettings last={link.last} onAlarm={link.pushAlarm} />

          <h2>Eventos y alarmas</h2>
          <ul className="alarm-list">
            {link.alarms.length === 0 && <li className="muted">Sin eventos registrados en esta sesión.</li>}
            {link.alarms.map((a) => (
              <li key={a.id} className={`alarm alarm-${a.level}`}>
                <time>{new Date(a.t).toLocaleTimeString('es-AR')}</time>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Charts samples={link.samples} selected={selected} onClear={link.clearSamples} />
    </section>
  )
}
