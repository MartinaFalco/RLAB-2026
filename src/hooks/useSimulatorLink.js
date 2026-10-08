import { useCallback, useEffect, useRef, useState } from 'react'
import { LINK_MODE, MAX_SAMPLES, MOCK_PERIOD_MS, SESSION_TOKEN, WS_URL } from '../config'
import { INITIAL_CONTROL_STATE } from '../data/controls'
import { createMockEngine } from '../lib/mockEngine'

/**
 * Enlace unico entre la interfaz y el simulador.
 *
 * Expone siempre la misma API, funcione contra el gateway real (WebSocket) o
 * contra el motor de demostracion que corre en el browser. Los componentes de
 * la UI no saben cual de los dos esta activo.
 *
 * Protocolo con el gateway (JSON sobre WebSocket):
 *
 *   ← { type: "telemetry", t: 1730000000000, values: { presion_tuberia: 1240, ... } }
 *   ← { type: "state",     controls: { bomba1_power: true, ... } }
 *   ← { type: "session",   role: "operador" | "observador", queue: 2 }
 *   ← { type: "alarm",     level: "warning" | "critical", message: "..." }
 *   → { type: "command",   control: "bomba1_spm", value: 60 }
 *   → { type: "action",    action: "cierre_duro" }
 *   → { type: "request_control" } / { type: "release_control" }
 */
export function useSimulatorLink() {
  const [status, setStatus] = useState(LINK_MODE === 'mock' ? 'simulado' : 'conectando')
  const [controls, setControls] = useState(INITIAL_CONTROL_STATE)
  const [samples, setSamples] = useState([])
  const [role, setRole] = useState(LINK_MODE === 'mock' ? 'operador' : 'observador')
  const [queue, setQueue] = useState(0)
  const [alarms, setAlarms] = useState([])
  const [latency, setLatency] = useState(null)
  const [calibrations, setCalibrations] = useState({})

  const wsRef = useRef(null)
  const controlsRef = useRef(controls)
  const engineRef = useRef(null)
  const reconnectRef = useRef(null)

  controlsRef.current = controls

  const pushSample = useCallback((values, t = Date.now()) => {
    setSamples((prev) => {
      const next = prev.length >= MAX_SAMPLES ? prev.slice(prev.length - MAX_SAMPLES + 1) : prev.slice()
      next.push({ t, ...values })
      return next
    })
  }, [])

  const pushAlarm = useCallback((level, message) => {
    setAlarms((prev) => [{ id: Date.now() + Math.random(), level, message, t: Date.now() }, ...prev].slice(0, 20))
  }, [])

  // --- Modo simulado -------------------------------------------------------
  useEffect(() => {
    if (LINK_MODE !== 'mock') return undefined
    engineRef.current = createMockEngine()
    const dt = MOCK_PERIOD_MS / 1000
    const id = setInterval(() => {
      const values = engineRef.current.step(controlsRef.current, dt)
      pushSample(values)
    }, MOCK_PERIOD_MS)
    return () => clearInterval(id)
  }, [pushSample])

  // --- Modo WebSocket ------------------------------------------------------
  useEffect(() => {
    if (LINK_MODE !== 'websocket') return undefined
    let cerrado = false
    let intentos = 0

    const conectar = () => {
      if (cerrado) return
      setStatus('conectando')
      const url = SESSION_TOKEN ? `${WS_URL}?token=${encodeURIComponent(SESSION_TOKEN)}` : WS_URL
      let ws
      try {
        ws = new WebSocket(url)
      } catch {
        programarReconexion()
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        intentos = 0
        setStatus('conectado')
      }

      ws.onmessage = (ev) => {
        let msg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        switch (msg.type) {
          case 'telemetry':
            pushSample(msg.values || {}, msg.t || Date.now())
            if (msg.t) setLatency(Math.max(0, Date.now() - msg.t))
            break
          case 'state':
            setControls((prev) => ({ ...prev, ...(msg.controls || {}) }))
            break
          case 'session':
            if (msg.role) setRole(msg.role)
            if (typeof msg.queue === 'number') setQueue(msg.queue)
            break
          case 'alarm':
            pushAlarm(msg.level || 'warning', msg.message || '')
            break
          default:
            break
        }
      }

      ws.onerror = () => {
        // onclose se encarga de la reconexion.
      }

      ws.onclose = () => {
        // Solo limpiar la referencia si sigue apuntando a ESTE socket: en
        // desarrollo, StrictMode monta el efecto dos veces y el cierre del
        // primer socket llega cuando el segundo ya está activo.
        if (wsRef.current === ws) wsRef.current = null
        if (cerrado) return
        setStatus('desconectado')
        programarReconexion()
      }
    }

    const programarReconexion = () => {
      if (cerrado) return
      intentos += 1
      const espera = Math.min(15000, 1000 * 2 ** Math.min(intentos, 4))
      reconnectRef.current = setTimeout(conectar, espera)
    }

    conectar()
    return () => {
      cerrado = true
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [pushAlarm, pushSample])

  const enviar = useCallback((payload) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
      return true
    }
    return false
  }, [])

  /** Cambia el valor de un control (perilla, palanca o interruptor). */
  const setControl = useCallback(
    (id, value) => {
      setControls((prev) => ({ ...prev, [id]: value }))
      enviar({ type: 'command', control: id, value })
    },
    [enviar],
  )

  /** Dispara una accion o macro (cierre duro/suave, parada de emergencia). */
  const runAction = useCallback(
    (actionId) => {
      const enviado = enviar({ type: 'action', action: actionId })
      if (enviado) return // el gateway responde con el nuevo estado y la alarma
      if (engineRef.current) {
        setControls((prev) => engineRef.current.applyAction(actionId, prev))
      }
      pushAlarm(actionId === 'parada_emergencia' ? 'critical' : 'warning', `Acción ejecutada: ${actionId}`)
    },
    [enviar, pushAlarm],
  )

  // El rol lo asigna el gateway: solo se simula localmente en modo demostración.
  const requestControl = useCallback(() => {
    const enviado = enviar({ type: 'request_control' })
    if (!enviado && LINK_MODE === 'mock') setRole('operador')
  }, [enviar])

  const releaseControl = useCallback(() => {
    const enviado = enviar({ type: 'release_control' })
    if (!enviado && LINK_MODE === 'mock') setRole('observador')
  }, [enviar])

  const clearSamples = useCallback(() => setSamples([]), [])

  /**
   * Fuerza la lectura de un instrumento (modo prueba de hardware): con el
   * simulador conectado, el gateway escribe ese valor en el display físico.
   */
  const forceInstrument = useCallback(
    (canal, valor) => {
      const enviado = enviar({ type: 'display', channel: canal, value: valor })
      if (!enviado && engineRef.current) engineRef.current.setOverride(canal, valor)
      pushAlarm('warning', `Prueba de hardware: ${canal} forzado a ${valor}`)
    },
    [enviar, pushAlarm],
  )

  /** Guarda el recorrido útil de una perilla motorizada. */
  const setCalibration = useCallback(
    (control, datos) => {
      setCalibrations((prev) => ({ ...prev, [control]: datos }))
      enviar({ type: 'calibration', control, ...datos })
    },
    [enviar],
  )

  const last = samples.length ? samples[samples.length - 1] : null

  return {
    status,
    mode: LINK_MODE,
    role,
    queue,
    latency,
    alarms,
    controls,
    samples,
    last,
    setControl,
    runAction,
    pushAlarm,
    forceInstrument,
    setCalibration,
    calibrations,
    requestControl,
    releaseControl,
    clearSamples,
  }
}
