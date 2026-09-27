import { lazy, Suspense, useState } from 'react'
import NavBar from './components/NavBar'
import StatusBar from './components/StatusBar'
import Home from './components/Home'
import ControlPanel from './components/ControlPanel'
import HowItWorks from './components/HowItWorks'
import Team from './components/Team'
import { useSimulatorLink } from './hooks/useSimulatorLink'

// three.js pesa bastante: se carga solo cuando se entra a la sección del modelo.
const Model3D = lazy(() => import('./components/Model3D'))

const SECTIONS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'modelo', label: 'Modelo 3D' },
  { id: 'controles', label: 'Controles del Simulador' },
  { id: 'como-funciona', label: '¿Cómo funciona?' },
  { id: 'equipo', label: 'El equipo' },
]

export default function App() {
  const [section, setSection] = useState('inicio')
  const link = useSimulatorLink()

  return (
    <div className="app">
      <NavBar sections={SECTIONS} active={section} onChange={setSection} />
      <StatusBar link={link} />

      <main className="content">
        {section === 'inicio' && <Home onNavigate={setSection} />}
        {section === 'modelo' && (
          <Suspense fallback={<p className="muted">Cargando modelo 3D…</p>}>
            <Model3D />
          </Suspense>
        )}
        {section === 'controles' && <ControlPanel link={link} />}
        {section === 'como-funciona' && <HowItWorks />}
        {section === 'equipo' && <Team />}
      </main>

      <footer className="footer">
        <span>Laboratorio remoto · Simulador de control de pozos ESIM-PDS9B</span>
        <span>Universidad Nacional de Hurlingham · Proyecto R-Lab (CONFEDI · YPF)</span>
      </footer>
    </div>
  )
}
