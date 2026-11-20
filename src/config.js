/**
 * Configuracion leida de las variables de entorno de Vite (.env).
 * Ver .env.example para la descripcion de cada una.
 */

const env = import.meta.env

export const LINK_MODE = env.VITE_LINK_MODE === 'websocket' ? 'websocket' : 'mock'
export const WS_URL = env.VITE_WS_URL || 'ws://localhost:8000/ws'
export const SESSION_TOKEN = env.VITE_SESSION_TOKEN || ''
export const DEFAULT_MODE = env.VITE_DEFAULT_MODE === 'autonomo' ? 'autonomo' : 'asistido'

/** Periodo de muestreo de la telemetria simulada, en ms. */
export const MOCK_PERIOD_MS = 500

/** Cantidad maxima de muestras que se mantienen en memoria (~10 min a 2 Hz). */
export const MAX_SAMPLES = 1200

function envNumber(value, fallback) {
  if (value == null || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Camaras configuradas. Las que no tienen URL muestran un placeholder. */
export const CAMERAS = [
  {
    id: 1,
    name: 'Consola 1 · Perforación',
    url: env.VITE_CAM_1 || '',
    rotate: envNumber(env.VITE_CAM_1_ROTATE, 0),
    zoom: envNumber(env.VITE_CAM_1_ZOOM, 1),
  },
  {
    id: 2,
    name: 'Consola 2 · Bombas',
    url: env.VITE_CAM_2 || '',
    rotate: envNumber(env.VITE_CAM_2_ROTATE, 0),
    zoom: envNumber(env.VITE_CAM_2_ZOOM, 1),
  },
  {
    id: 3,
    name: 'Consola 3 · Estrangulador',
    url: env.VITE_CAM_3 || '',
    rotate: envNumber(env.VITE_CAM_3_ROTATE, 0),
    zoom: envNumber(env.VITE_CAM_3_ZOOM, 1),
  },
  {
    id: 4,
    name: 'Consola 4 · BOP',
    url: env.VITE_CAM_4 || '',
    rotate: envNumber(env.VITE_CAM_4_ROTATE, 0),
    zoom: envNumber(env.VITE_CAM_4_ZOOM, 1),
  },
]

/** Clasifica las URLs de cámara como MJPEG, dispositivo local, iframe o vacío. */
export function cameraKind(url) {
  if (!url) return 'empty'
  if (url.startsWith('local:')) return 'local'
  if (/mjpe?g|\.cgi|snapshot/i.test(url)) return 'mjpeg'
  return 'iframe'
}
