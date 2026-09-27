import { CHANNELS_BY_ID } from '../data/telemetry'

/**
 * Exporta las muestras de telemetria a CSV y dispara la descarga.
 * @param {Array<object>} samples muestras {t, canal: valor, ...}
 * @param {Array<string>} channelIds canales a incluir (por defecto, todos los presentes)
 */
export function downloadCsv(samples, channelIds) {
  if (!samples.length) return

  const ids =
    channelIds && channelIds.length
      ? channelIds
      : Object.keys(samples[samples.length - 1]).filter((k) => k !== 't')

  const header = ['timestamp_iso', 'segundos', ...ids.map((id) => headerFor(id))]
  const t0 = samples[0].t

  const filas = samples.map((s) => [
    new Date(s.t).toISOString(),
    ((s.t - t0) / 1000).toFixed(2),
    ...ids.map((id) => (s[id] ?? '')),
  ])

  const csv = [header, ...filas].map((f) => f.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `esim-pds9b_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function headerFor(id) {
  const ch = CHANNELS_BY_ID[id]
  if (!ch) return id
  return `${id} [${ch.unit}]`
}
