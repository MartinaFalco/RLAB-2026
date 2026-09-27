import { INSTITUTIONS } from '../data/team'

export default function Home({ onNavigate }) {
  return (
    <section className="section hero">
      <h1 className="hero-title">Bienvenido al Sistema de Monitoreo y Control Remoto</h1>
      <p className="hero-subtitle">
        Simulador de control de pozos ESIM-PDS9B · UNAHUR (Universidad Nacional de Hurlingham)
      </p>

      <p className="hero-text">
        Esta plataforma permite operar y monitorear a distancia el simulador portátil de perforación{' '}
        <strong>ESIM-PDS9B</strong>, certificado por <strong>IADC/IWCF</strong>. Desde el navegador se
        comandan las cuatro consolas físicas —bombas de lodo, mesa rotaria, estrangulador y preventores—
        mientras la telemetría del pozo (presiones, WOB, ganancia de pit y gas en el lodo) se grafica en
        tiempo real y puede descargarse para el análisis posterior de la práctica.
      </p>

      <p className="hero-text">
        El sistema forma parte del programa <strong>R-Lab</strong> de remotización de equipamiento,
        impulsado por <strong>CONFEDI</strong> y <strong>YPF</strong>, cuyo objetivo es democratizar el
        acceso a laboratorios de alto valor para estudiantes, docentes e investigadores.
      </p>

      <div className="hero-cards">
        <article className="card">
          <h3>Modo asistido</h3>
          <p>
            Cinco cámaras HD transmiten el estado de las consolas y del laboratorio. El usuario remoto
            indica las maniobras y un operador local las ejecuta, con audio y chat en simultáneo.
          </p>
        </article>
        <article className="card">
          <h3>Modo autónomo</h3>
          <p>
            Motores Nema 17 y actuadores solenoide comandados por un controlador PoKeys57U mueven
            perillas, botones y palancas: el control es 100 % remoto, sin operador presente.
          </p>
        </article>
        <article className="card">
          <h3>Registro de la práctica</h3>
          <p>
            Toda la telemetría se grafica con ventana de tiempo configurable y se exporta a CSV para
            evaluar la maniobra de control de pozo realizada por el estudiante.
          </p>
        </article>
      </div>

      <div className="hero-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => onNavigate('controles')}>
          Ir al panel de control
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => onNavigate('como-funciona')}>
          ¿Cómo funciona?
        </button>
      </div>

      <div className="tech-note">
        <span>Construido con</span>
        <strong className="tech-react">React</strong>
        <span>+</span>
        <strong className="tech-vite">Vite</strong>
        <span>·</span>
        <strong className="tech-ws">WebSocket</strong>
        <span>sobre un gateway</span>
        <strong className="tech-pi">Raspberry Pi 5</strong>
        <span>+</span>
        <strong className="tech-pokeys">PoKeys57U</strong>
      </div>

      <ul className="institutions">
        {INSTITUTIONS.map((i) => (
          <li key={i.name}>
            <strong>{i.name}</strong>
            <span>{i.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
