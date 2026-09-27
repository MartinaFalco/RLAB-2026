import { INSTITUTIONS, TEAM } from '../data/team'

export default function Team() {
  const base = import.meta.env.BASE_URL
  return (
    <section className="section team">
      <h1>Los miembros del equipo</h1>
      <p className="team-intro">
        El proyecto de remotización del simulador ESIM-PDS9B es desarrollado por un equipo de docentes,
        técnicos y pasantes de la Universidad Nacional de Hurlingham, en el marco del programa R-Lab
        impulsado por CONFEDI e YPF.
      </p>

      <div className="team-grid">
        {TEAM.map((m) => (
          <figure key={m.name} className="member">
            {m.photo ? (
              <img src={`${base}${m.photo}`} alt={m.name} />
            ) : (
              <div className="member-avatar" aria-hidden="true">
                {m.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            <figcaption>
              <strong>{m.name}</strong>
              <span>{m.role}</span>
              <small>{m.area}</small>
            </figcaption>
          </figure>
        ))}
      </div>

      <h2>Instituciones participantes</h2>
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
