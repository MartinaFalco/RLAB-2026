import { useState } from 'react'
import ControlPanel from './ControlPanel'
import InteractiveConsoles from './InteractiveConsoles'

/**
 * Sección "Controles del Simulador", con dos vistas sobre el mismo estado:
 *
 *   · Panel de control      — tarjetas con todos los comandos, gráficos y CSV.
 *   · Consolas interactivas — réplica de las cuatro consolas físicas.
 *
 * Las dos comparten el mismo enlace con el simulador, así que lo que se acciona
 * en una se ve inmediatamente reflejado en la otra.
 */
const VISTAS = [
  { id: 'panel', label: 'Panel de control' },
  { id: 'consolas', label: 'Consolas interactivas' },
]

export default function ControlsSection({ link }) {
  const [vista, setVista] = useState('panel')

  return (
    <section className="section">
      <nav className="subtabs">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`subtab ${vista === v.id ? 'is-active' : ''}`}
            onClick={() => setVista(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {vista === 'panel' ? <ControlPanel link={link} /> : <InteractiveConsoles link={link} />}
    </section>
  )
}
