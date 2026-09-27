import { useEffect, useRef, useState } from 'react'
import { ALARM_LIMITS, CHANNELS_BY_ID } from '../data/telemetry'

/**
 * Límites de alarma configurables por el alumno, como en la pantalla del
 * simulador (Pit Deviation Alarm y Return Flow Alarm).
 *
 * La evaluación se hace acá sobre la última muestra recibida: en cuanto un
 * canal sale de la banda se registra un evento, y no se vuelve a repetir hasta
 * que el valor regresa al rango (evita inundar el log con la misma alarma).
 */
export default function AlarmSettings({ last, onAlarm }) {
  const [limites, setLimites] = useState(() =>
    Object.fromEntries(ALARM_LIMITS.map((a) => [a.id, { low: a.low, high: a.high, activa: true }])),
  )
  const disparadas = useRef({})

  useEffect(() => {
    if (!last) return
    for (const def of ALARM_LIMITS) {
      const cfg = limites[def.id]
      const valor = last[def.id]
      if (!cfg?.activa || valor == null) continue

      const fuera = valor > cfg.high ? 'alta' : valor < cfg.low ? 'baja' : null
      if (fuera && disparadas.current[def.id] !== fuera) {
        disparadas.current[def.id] = fuera
        const ch = CHANNELS_BY_ID[def.id]
        onAlarm(
          'critical',
          `${def.label}: ${valor.toFixed(1)} ${def.unit} fuera del límite ${fuera} (${
            fuera === 'alta' ? cfg.high : cfg.low
          } ${def.unit})`,
        )
        void ch
      } else if (!fuera) {
        disparadas.current[def.id] = null
      }
    }
  }, [last, limites, onAlarm])

  const editar = (id, campo, valor) =>
    setLimites((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))

  return (
    <div className="alarms-config">
      <h2>Límites de alarma</h2>
      {ALARM_LIMITS.map((def) => {
        const cfg = limites[def.id]
        const valor = last?.[def.id]
        const fuera = cfg.activa && valor != null && (valor > cfg.high || valor < cfg.low)
        return (
          <div key={def.id} className={`alarm-row ${fuera ? 'is-triggered' : ''}`}>
            <label className="alarm-name">
              <input
                type="checkbox"
                checked={cfg.activa}
                onChange={(e) => editar(def.id, 'activa', e.target.checked)}
              />
              {def.label}
            </label>
            <span className="alarm-current">
              {valor != null ? valor.toFixed(1) : '—'} {def.unit}
            </span>
            <label className="alarm-limit">
              Bajo
              <input
                type="number"
                value={cfg.low}
                onChange={(e) => editar(def.id, 'low', Number(e.target.value))}
              />
            </label>
            <label className="alarm-limit">
              Alto
              <input
                type="number"
                value={cfg.high}
                onChange={(e) => editar(def.id, 'high', Number(e.target.value))}
              />
            </label>
          </div>
        )
      })}
    </div>
  )
}
