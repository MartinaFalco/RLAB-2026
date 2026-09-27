import { CAMERAS, cameraKind } from '../config'

/**
 * Grilla de las cinco cámaras HD montadas sobre las consolas y el laboratorio.
 * Las URLs se configuran por .env (VITE_CAM_1 … VITE_CAM_5); mientras no estén
 * cargadas se muestra un placeholder para no romper la maqueta.
 */
export default function CameraGrid() {
  return (
    <div className="camera-grid">
      {CAMERAS.map((cam) => {
        const kind = cameraKind(cam.url)
        return (
          <figure key={cam.id} className="camera">
            <div className="camera-frame">
              {kind === 'mjpeg' && <img src={cam.url} alt={`Vista en vivo: ${cam.name}`} />}
              {kind === 'iframe' && (
                <iframe
                  src={cam.url}
                  title={cam.name}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
              {kind === 'empty' && (
                <div className="camera-empty">
                  <span className="camera-icon" aria-hidden="true">
                    📷
                  </span>
                  <span>Sin señal</span>
                  <small>Configurar VITE_CAM_{cam.id} en el archivo .env</small>
                </div>
              )}
            </div>
            <figcaption>
              <span className={`rec ${kind === 'empty' ? 'off' : ''}`} aria-hidden="true" />
              Cámara {cam.id} · {cam.name}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
