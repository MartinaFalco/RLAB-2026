export default function NavBar({ sections, active, onChange }) {
  return (
    <nav className="navbar" aria-label="Secciones">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`nav-tab ${active === s.id ? 'is-active' : ''}`}
          aria-current={active === s.id ? 'page' : undefined}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
