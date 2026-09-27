import { useState } from 'react'
import { isEnabled } from '../data/controls'

/**
 * Tarjeta de una consola física con sus controles.
 * Los controles marcados como `critical` piden confirmación antes de enviar el
 * comando, porque mueven preventores o disparan cierres de emergencia.
 */
export default function ControlCard({ consola, values, onChange, onAction, disabled }) {
  return (
    <article className={`control-card ${disabled ? 'is-disabled' : ''}`} style={{ borderColor: consola.color }}>
      <header>
        <h3 style={{ color: consola.color }}>{consola.name}</h3>
        <p>{consola.description}</p>
      </header>

      <div className="control-list">
        {consola.controls.map((ctrl) => (
          <Control
            key={ctrl.id}
            ctrl={ctrl}
            value={values[ctrl.id]}
            bloqueado={disabled || !isEnabled(ctrl, values)}
            onChange={onChange}
            onAction={onAction}
          />
        ))}
      </div>
    </article>
  )
}

function Control({ ctrl, value, bloqueado, onChange, onAction }) {
  const [confirmando, setConfirmando] = useState(null)

  /** Los controles críticos pasan primero por la confirmación. */
  const pedir = (aplicar, texto) => {
    if (ctrl.critical) setConfirmando({ aplicar, texto })
    else aplicar()
  }

  const confirmacion = confirmando && (
    <Confirmacion
      texto={confirmando.texto}
      onCancel={() => setConfirmando(null)}
      onOk={() => {
        const { aplicar } = confirmando
        setConfirmando(null)
        aplicar()
      }}
    />
  )

  if (ctrl.type === 'switch') {
    const encendido = Boolean(value)
    return (
      <div className="control" title={ctrl.actuator}>
        <div className="control-head">
          <span className="control-label">{ctrl.label}</span>
          <span className={`state-led ${encendido ? 'on' : 'off'}`} aria-hidden="true" />
        </div>
        {ctrl.hint && <p className="control-hint">{ctrl.hint}</p>}
        <div className="control-row">
          <button
            type="button"
            className={`btn btn-on ${encendido ? 'is-active' : ''}`}
            disabled={bloqueado}
            onClick={() => pedir(() => onChange(ctrl.id, true), `${ctrl.label}: ${ctrl.onLabel || 'ON'}`)}
          >
            {ctrl.onLabel || 'ON'}
          </button>
          <button
            type="button"
            className={`btn btn-off ${!encendido ? 'is-active' : ''}`}
            disabled={bloqueado}
            onClick={() => pedir(() => onChange(ctrl.id, false), `${ctrl.label}: ${ctrl.offLabel || 'OFF'}`)}
          >
            {ctrl.offLabel || 'OFF'}
          </button>
        </div>
        {confirmacion}
        <p className="control-actuator">{ctrl.actuator}</p>
      </div>
    )
  }

  if (ctrl.type === 'select') {
    return (
      <div className="control" title={ctrl.actuator}>
        <div className="control-head">
          <span className="control-label">{ctrl.label}</span>
          <span className="control-value">{value}</span>
        </div>
        {ctrl.hint && <p className="control-hint">{ctrl.hint}</p>}
        <div className="control-row">
          {ctrl.options.map((op) => (
            <button
              key={op}
              type="button"
              className={`btn btn-pos ${value === op ? 'is-active' : ''}`}
              disabled={bloqueado}
              onClick={() => pedir(() => onChange(ctrl.id, op), `${ctrl.label}: ${op}`)}
            >
              {op}
            </button>
          ))}
        </div>
        {confirmacion}
        <p className="control-actuator">{ctrl.actuator}</p>
      </div>
    )
  }

  if (ctrl.type === 'slider') {
    return (
      <div className="control" title={ctrl.actuator}>
        <div className="control-head">
          <span className="control-label">{ctrl.label}</span>
          <span className="control-value">
            {Number(value ?? 0)} {ctrl.unit}
          </span>
        </div>
        {ctrl.hint && <p className="control-hint">{ctrl.hint}</p>}
        <input
          type="range"
          min={ctrl.min}
          max={ctrl.max}
          step={ctrl.step}
          value={Number(value ?? 0)}
          disabled={bloqueado}
          onChange={(e) => onChange(ctrl.id, Number(e.target.value))}
        />
        <div className="control-scale">
          <span>
            {ctrl.min} {ctrl.unit}
          </span>
          <span>
            {ctrl.max} {ctrl.unit}
          </span>
        </div>
        <p className="control-actuator">{ctrl.actuator}</p>
      </div>
    )
  }

  // type === 'action'
  return (
    <div className="control" title={ctrl.actuator}>
      <div className="control-head">
        <span className="control-label">{ctrl.label}</span>
      </div>
      {ctrl.hint && <p className="control-hint">{ctrl.hint}</p>}
      <button
        type="button"
        className={`btn btn-block ${ctrl.critical ? 'btn-danger' : 'btn-ghost'}`}
        disabled={bloqueado}
        onClick={() => pedir(() => onAction(ctrl.id), `Ejecutar ${ctrl.label.toLowerCase()}`)}
      >
        Ejecutar {ctrl.label.toLowerCase()}
      </button>
      {confirmacion}
      <p className="control-actuator">{ctrl.actuator}</p>
    </div>
  )
}

function Confirmacion({ texto, onOk, onCancel }) {
  return (
    <div className="confirm-box" role="alertdialog">
      <span>¿Confirmar? {texto}</span>
      <div>
        <button type="button" className="btn btn-danger" onClick={onOk}>
          Confirmar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
