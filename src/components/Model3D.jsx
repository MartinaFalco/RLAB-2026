import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Vista 3D interactiva del puesto del simulador (rotación y zoom con el mouse).
 *
 * Por ahora la escena es ESQUEMÁTICA: se genera por código a partir de la
 * descripción del equipo (4 consolas físicas + 1 consola táctil + PC central),
 * porque todavía no hay fotogrametría ni CAD del ESIM-PDS9B.
 *
 * Para reemplazarla por el modelo real cuando esté disponible:
 *   1. Exportar el modelo a glTF/GLB y dejarlo en `public/modelo/simulador.glb`.
 *   2. Descomentar el bloque marcado con "CARGA DEL MODELO REAL" más abajo.
 *   3. Borrar la llamada a `construirEscenaEsquematica(grupo)`.
 */
export default function Model3D() {
  const contenedorRef = useRef(null)

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return undefined

    const escena = new THREE.Scene()
    escena.background = new THREE.Color('#080d1a')
    escena.fog = new THREE.Fog('#080d1a', 12, 30)

    const camara = new THREE.PerspectiveCamera(
      45,
      contenedor.clientWidth / contenedor.clientHeight,
      0.1,
      100,
    )
    camara.position.set(4.6, 4.6, 8.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight)
    contenedor.appendChild(renderer.domElement)

    const controles = new OrbitControls(camara, renderer.domElement)
    controles.enableDamping = true
    controles.dampingFactor = 0.08
    controles.minDistance = 3.5
    controles.maxDistance = 20
    controles.maxPolarAngle = Math.PI / 2.05
    controles.target.set(0, 1.5, 0)

    escena.add(new THREE.AmbientLight('#8ea2c4', 0.9))
    const luzPrincipal = new THREE.DirectionalLight('#ffffff', 1.4)
    luzPrincipal.position.set(6, 10, 6)
    escena.add(luzPrincipal)
    const luzRelleno = new THREE.DirectionalLight('#3b82f6', 0.6)
    luzRelleno.position.set(-8, 4, -6)
    escena.add(luzRelleno)

    const piso = new THREE.Mesh(
      new THREE.CircleGeometry(14, 64),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.95 }),
    )
    piso.rotation.x = -Math.PI / 2
    escena.add(piso)
    escena.add(new THREE.GridHelper(28, 28, '#1e3a5f', '#122740'))

    const grupo = new THREE.Group()
    escena.add(grupo)

    // --- CARGA DEL MODELO REAL (cuando exista el .glb) ----------------------
    // import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
    // new GLTFLoader().load(`${import.meta.env.BASE_URL}modelo/simulador.glb`, (gltf) => {
    //   grupo.add(gltf.scene)
    // })
    construirEscenaEsquematica(grupo)

    let animId
    const animar = () => {
      animId = requestAnimationFrame(animar)
      controles.update()
      renderer.render(escena, camara)
    }
    animar()

    const onResize = () => {
      if (!contenedor.clientWidth) return
      camara.aspect = contenedor.clientWidth / contenedor.clientHeight
      camara.updateProjectionMatrix()
      renderer.setSize(contenedor.clientWidth, contenedor.clientHeight)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(contenedor)

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      controles.dispose()
      renderer.dispose()
      escena.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const materiales = Array.isArray(obj.material) ? obj.material : [obj.material]
          materiales.forEach((m) => m.dispose())
        }
      })
      contenedor.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <section className="section model-section">
      <aside className="model-aside">
        <h2>Modelo 3D Interactivo</h2>
        <p>
          Representación del puesto del simulador <strong>ESIM-PDS9B</strong> según la disposición de la
          especificación del fabricante: las cuatro consolas portátiles de aluminio —perforador y top
          drive en azul, BOP en rojo y estrangulador en amarillo—, la notebook central y el monitor de la vista gráfica.
        </p>
        <p>
          Se puede explorar con <strong>ROTACIÓN</strong> (arrastrar con el botón izquierdo),{' '}
          <strong>ZOOM</strong> (rueda del mouse) y <strong>DESPLAZAMIENTO</strong> (botón derecho).
        </p>
        <p className="muted">
          La escena es esquemática: se reemplazará por el modelo relevado del equipo real cuando esté
          disponible. Para el detalle técnico ver la sección <em>¿Cómo funciona?</em>
        </p>
        <ul className="legend">
          <li>
            <span className="swatch" style={{ background: '#dc2626' }} /> Consola del BOP
          </li>
          <li>
            <span className="swatch" style={{ background: '#f59e0b' }} /> Consola del estrangulador
          </li>
          <li>
            <span className="swatch" style={{ background: '#2563eb' }} /> Consola del perforador
          </li>
          <li>
            <span className="swatch" style={{ background: '#1d4ed8' }} /> Consola del top drive
          </li>
        </ul>
      </aside>

      <div className="model-canvas" ref={contenedorRef} />
    </section>
  )
}

/**
 * Consolas portátiles del ESIM-PDS9B, con los colores del equipo real:
 * perforador y top drive en azul, BOP en rojo y estrangulador en amarillo.
 */
const CONSOLAS_3D = [
  { x: -3.3, color: '#dc2626', perillas: 1, botones: 5 },
  { x: -1.6, color: '#f59e0b', perillas: 2, botones: 2 },
  { x: 1.6, color: '#2563eb', perillas: 4, botones: 2 },
  { x: 3.3, color: '#1d4ed8', perillas: 2, botones: 3 },
  
  
]

/** Construye un puesto de trabajo esquemático con cajas y cilindros. */
function construirEscenaEsquematica(grupo) {
  const matMesa = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.7, metalness: 0.2 })
  const matPerilla = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, metalness: 0.6 })
  const matBoton = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 })
  const matPantalla = new THREE.MeshStandardMaterial({
    color: '#0b1220',
    emissive: '#1d4ed8',
    emissiveIntensity: 0.55,
    roughness: 0.2,
  })

  // Mesa
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.16, 3), matMesa)
  tapa.position.set(0, 0.9, 0)
  grupo.add(tapa)

  const posicionesPatas = [
    [-3.9, -1.2],
    [3.9, -1.2],
    [-3.9, 1.2],
    [3.9, 1.2],
  ]
  posicionesPatas.forEach(([x, z]) => {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.16), matMesa)
    pata.position.set(x, 0.45, z)
    grupo.add(pata)
  })

  // Las cuatro consolas portátiles, apoyadas de pie sobre la mesa como en la
  // figura 1 de la especificación: paneles verticales con soporte trasero.
  const INCLINACION = -Math.PI / 14 // los paneles se recuestan apenas hacia atrás

  CONSOLAS_3D.forEach(({ x, color, perillas, botones }) => {
    const consola = new THREE.Group()
    consola.position.set(x, 0.98, -0.2)
    consola.rotation.x = INCLINACION

    const matPanel = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.45 })

    // Cuerpo del panel (aluminio, formato maletín)
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.55, 0.14), matPanel)
    cuerpo.position.y = 0.78
    consola.add(cuerpo)

    // Instrumentos: dos indicadores circulares arriba
    for (let k = 0; k < 2; k += 1) {
      const instrumento = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.05, 24),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25 }),
      )
      instrumento.rotation.x = Math.PI / 2
      instrumento.position.set(-0.3 + k * 0.6, 1.3, 0.09)
      consola.add(instrumento)
    }

    // Perillas motorizadas (Nema 17)
    for (let k = 0; k < perillas; k += 1) {
      const perilla = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.11, 20), matPerilla)
      perilla.rotation.x = Math.PI / 2
      perilla.position.set(-0.42 + (k * 0.84) / Math.max(1, perillas - 1 || 1), 0.42, 0.11)
      consola.add(perilla)
    }

    // Botones y llaves accionados por solenoide
    for (let k = 0; k < botones; k += 1) {
      const boton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 14), matBoton)
      boton.rotation.x = Math.PI / 2
      boton.position.set(-0.45 + (k * 0.9) / Math.max(1, botones - 1 || 1), 0.7, 0.1)
      consola.add(boton)
    }

    // Soporte trasero abatible
    const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), matPanel)
    soporte.position.set(0.5, 0.6, -0.34)
    soporte.rotation.x = Math.PI / 9
    consola.add(soporte)

    grupo.add(consola)
  })

  // Notebook central (i7) con la consola táctil al lado
  const baseNotebook = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.75), matMesa)
  baseNotebook.position.set(-0.35, 1.01, 0.75)
  grupo.add(baseNotebook)

  const tapaNotebook = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.05), matMesa)
  tapaNotebook.position.set(-0.35, 1.32, 0.42)
  tapaNotebook.rotation.x = -Math.PI / 9
  grupo.add(tapaNotebook)

  const pantallaNotebook = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), matPantalla)
  pantallaNotebook.position.set(-0.35, 1.32, 0.46)
  pantallaNotebook.rotation.x = -Math.PI / 9
  grupo.add(pantallaNotebook)

 

  // Monitor de la vista gráfica 3D
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.07), matMesa)
  monitor.position.set(0, 1.55, -0.55)
  grupo.add(monitor)

  const monitorPantalla = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), matPantalla)
  monitorPantalla.position.set(0, 1.55, -0.5)
  grupo.add(monitorPantalla)

  const pieMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.25), matMesa)
  pieMonitor.position.set(0, 1.09, -0.55)
  grupo.add(pieMonitor)

  // Trípodes de las cámaras: uno delante de cada consola
  const matCamara = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.6, metalness: 0.4 })
  const posicionesCamara = CONSOLAS_3D.map(({ x }) => [x, 2.4])
  posicionesCamara.forEach(([x, z]) => {
    const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 10), matCamara)
    mastil.position.set(x, 1.1, z)
    grupo.add(mastil)

    const cuerpoCam = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.16), matCamara)
    cuerpoCam.position.set(x, 2.25, z)
    cuerpoCam.lookAt(0, 1.2, 0)
    grupo.add(cuerpoCam)
  })
}
