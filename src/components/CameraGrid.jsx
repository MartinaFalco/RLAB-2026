import { memo, useState } from 'react'
import { CAMERAS, cameraKind } from '../config'
import CameraSetup from './CameraSetup'
import LocalCamera from './LocalCamera'

/**
 * Grilla de las cuatro cámaras HD montadas sobre las consolas.
 * Las URLs se configuran por .env (VITE_CAM_1 … VITE_CAM_4); mientras no estén
 * cargadas se muestra un placeholder para no romper la maqueta.
 */
function CameraGrid() {
  const [assignmentRevision, setAssignmentRevision] = useState(0)
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)

  return (
    <>
      <CameraSetup
        cameras={CAMERAS}
        onAssignmentsChange={() => setAssignmentRevision((revision) => revision + 1)}
        onOpenChange={setIsAssignmentOpen}
      />
      <div className="camera-grid">
        {CAMERAS.map((cam) => {
          const kind = cameraKind(cam.url)
          return (
            <figure key={cam.id} className="camera">
              <div className={`camera-frame ${kind === 'local' ? 'camera-frame-local' : ''}`}>
                {kind === 'mjpeg' && <img src={cam.url} alt={`Vista en vivo: ${cam.name}`} />}
                {kind === 'iframe' && (
                  <iframe
                    src={cam.url}
                    title={cam.name}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {kind === 'local' && (
                  <LocalCamera
                    cameraId={cam.id}
                    selector={cam.url.slice(6)}
                    rotate={cam.rotate}
                    zoom={cam.zoom}
                    assignmentRevision={assignmentRevision}
                    paused={isAssignmentOpen}
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
    </>
  )
}

export default memo(CameraGrid)
