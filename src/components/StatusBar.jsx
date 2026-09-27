import { useEffect, useState } from 'react'
import { DEFAULT_MODE } from '../config'

const ESTADOS = {
  conectado: { texto: 'Conectado al simulador', clase: 'ok' },
  conectando: { texto: 'Conectando…', clase: 'warn' },
  desconectado: { texto: 'Sin conexión con el gateway', clase: 'bad' },
  simulado: { texto: 'Modo demostración (telemetría simulada)', clase: 'demo' },
}

/**
 * Barra fija con el estado del enlace, el rol del usuario, el cronometro de la
 * sesion y la parada de emergencia. Se mantiene visible en todas las secciones.
 */
export default function StatusBar({ link }) {
  const [segundos, setSegundos] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const estado = ESTADOS[link.status] || ESTADOS.desconectado

  useEffect(() => {
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const hhmmss = new Date(segundos * 1000).toISOString().slice(11, 19)

  return (
    <div className="statusbar">
      <span className={`pill pill-${estado.clase}`}>
        <span className="dot" /> {estado.texto}
      </span>

      <span className="pill pill-muted">
        Modo de operación: <strong>{DEFAULT_MODE === 'autonomo' ? 'Autónomo' : 'Asistido'}</strong>
      </span>

      <span className="pill pill-muted">
        Rol: <strong>{link.role === 'operador' ? 'Operador' : 'Observador'}</strong>
        {link.queue > 0 && <em> · {link.queue} en espera</em>}
      </span>

      {link.latency != null && <span className="pill pill-muted">Latencia: {link.latency} ms</span>}

      <span className="pill pill-muted">Sesión: {hhmmss}</span>

      <div className="statusbar-actions">
        {link.role === 'operador' ? (
          <button type="button" className="btn btn-ghost" onClick={link.releaseControl}>
            Liberar control
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={link.requestControl}>
            Solicitar control
          </button>
        )}

        {confirmando ? (
          <span className="confirm-inline">
            ¿Confirmar parada?
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                link.runAction('parada_emergencia')
                setConfirmando(false)
              }}
            >
              Sí, detener
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-emergency" onClick={() => setConfirmando(true)}>
            PARADA DE EMERGENCIA
          </button>
        )}
      </div>
    </div>
  )
}
