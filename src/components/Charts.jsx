import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHANNELS_BY_ID } from '../data/telemetry'
import { downloadCsv } from '../lib/csv'

const VENTANAS = [10, 30, 60, 120, 300]

/**
 * Gráficos en tiempo real de los canales seleccionados, con ventana de tiempo
 * ajustable, borrado del buffer y exportación a CSV.
 */
export default function Charts({ samples, selected, onClear }) {
  const [ventana, setVentana] = useState(30)

  const datos = useMemo(() => {
    if (!samples.length) return []
    const tFin = samples[samples.length - 1].t
    const desde = tFin - ventana * 1000
    return samples
      .filter((s) => s.t >= desde)
      .map((s) => ({ ...s, s: Number(((s.t - tFin) / 1000).toFixed(1)) }))
  }, [samples, ventana])

  return (
    <section className="charts">
      <div className="charts-header">
        <h2>Gráficos</h2>
        <div className="charts-tools">
          <label className="window-picker">
            Segundos a mostrar: <strong>{ventana} s</strong>
            <input
              type="range"
              min={0}
              max={VENTANAS.length - 1}
              step={1}
              value={VENTANAS.indexOf(ventana)}
              onChange={(e) => setVentana(VENTANAS[Number(e.target.value)])}
            />
          </label>
          <span className="samples-count">{samples.length} muestras en memoria</span>
        </div>
      </div>

      {selected.length === 0 && (
        <p className="empty-note">
          Seleccioná al menos una variable en el listado de arriba para ver su evolución.
        </p>
      )}

      <div className="chart-grid">
        {selected.map((id) => {
          const ch = CHANNELS_BY_ID[id]
          if (!ch) return null
          return (
            <div key={id} className="chart-card">
              <div className="chart-title" style={{ color: ch.color }}>
                {ch.label} <span className="chart-unit">[{ch.unit}]</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={datos} margin={{ top: 6, right: 12, bottom: 4, left: -12 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="s"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      stroke="#334155"
                      type="number"
                      domain={[-ventana, 0]}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      stroke="#334155"
                      width={56}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0b1220',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        color: '#e2e8f0',
                      }}
                      labelFormatter={(v) => `${v} s`}
                      formatter={(v) => [`${v} ${ch.unit}`, ch.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey={id}
                      stroke={ch.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>

      <div className="charts-footer">
        <button type="button" className="btn btn-danger" onClick={onClear}>
          Borrar todos los datos
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={() => downloadCsv(samples, selected)}
          disabled={!samples.length}
        >
          Descargar CSV
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => downloadCsv(samples, null)}
          disabled={!samples.length}
        >
          Descargar CSV (todas las variables)
        </button>
      </div>
    </section>
  )
}
