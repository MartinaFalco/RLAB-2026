import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearCameraAssignments,
  enumerateVideoInputs,
  readCameraAssignments,
  writeCameraAssignments,
} from '../lib/cameraDevices'

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function isHiddenDevice(device) {
  return /obs virtual camera|integrated|built[\s-]?in|internal|webcam integrada|cámara integrada|camera integrada|facetime/i.test(
    device.label
  )
}

export default function CameraSetup({ cameras, onAssignmentsChange, onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [devices, setDevices] = useState([])
  const [assignments, setAssignments] = useState({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showAllDevices, setShowAllDevices] = useState(false)
  const [previews, setPreviews] = useState({})
  const [error, setError] = useState(null)
  const devicesRef = useRef(devices)
  const captureEpoch = useRef(0)
  const busyRef = useRef(false)
  const busyEpoch = useRef(null)
  const activeStream = useRef(null)
  devicesRef.current = devices

  useEffect(() => {
    try {
      setAssignments(readCameraAssignments())
    } catch (e) {
      setError({ name: e.name, message: e.message })
    }
  }, [])

  const captureDevice = useCallback(async (device, index, epoch) => {
    if (captureEpoch.current !== epoch) return

    setPreviews((current) => ({
      ...current,
      [device.deviceId]: { status: 'loading' },
    }))

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: device.deviceId },
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
      })
      if (captureEpoch.current !== epoch) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      activeStream.current = stream

      const video = document.createElement('video')
      video.autoplay = true
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      await video.play()
      await wait(500)
      if (captureEpoch.current !== epoch) return
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('No se pudo obtener un fotograma de la cámara.')
      }

      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = canvas.toDataURL('image/jpeg', 0.8)
      setPreviews((current) => ({
        ...current,
        [device.deviceId]: { status: 'ready', image, index },
      }))
    } catch (e) {
      if (captureEpoch.current === epoch) {
        setPreviews((current) => ({
          ...current,
          [device.deviceId]: {
            status: 'error',
            name: e.name || 'Error',
            message: e.message || String(e),
          },
        }))
      }
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
      if (activeStream.current === stream) activeStream.current = null
    }
  }, [])

  const captureDevices = useCallback(
    async (devicesToCapture, epoch) => {
      if (busyRef.current || captureEpoch.current !== epoch) return
      busyRef.current = true
      busyEpoch.current = epoch
      setBusy(true)
      try {
        for (const device of devicesToCapture) {
          if (captureEpoch.current !== epoch) break
          const index = devicesRef.current.findIndex((item) => item.deviceId === device.deviceId)
          await captureDevice(device, index, epoch)
        }
      } finally {
        if (busyEpoch.current === epoch) {
          busyRef.current = false
          busyEpoch.current = null
          if (captureEpoch.current === epoch) setBusy(false)
        }
      }
    },
    [captureDevice]
  )

  useEffect(() => {
    if (!isOpen) return undefined

    const epoch = ++captureEpoch.current
    let cancelled = false
    setLoading(true)
    setError(null)
    setDevices([])
    setPreviews({})

    const loadDevices = async () => {
      try {
        const foundDevices = await enumerateVideoInputs()
        if (cancelled || captureEpoch.current !== epoch) return
        devicesRef.current = foundDevices
        setDevices(foundDevices)
        setLoading(false)
        await captureDevices(foundDevices, epoch)
      } catch (e) {
        if (!cancelled && captureEpoch.current === epoch) {
          setError({ name: e.name || 'Error', message: e.message || String(e) })
          setLoading(false)
        }
      }
    }

    loadDevices()
    return () => {
      cancelled = true
      captureEpoch.current += 1
      activeStream.current?.getTracks().forEach((track) => track.stop())
      activeStream.current = null
      if (busyEpoch.current === epoch) {
        busyRef.current = false
        busyEpoch.current = null
        setBusy(false)
      }
    }
  }, [captureDevices, isOpen])

  const toggleSetup = () => {
    const nextIsOpen = !isOpen
    setIsOpen(nextIsOpen)
    onOpenChange(nextIsOpen)
  }

  const updateAssignment = (cameraId, deviceId) => {
    const next = { ...assignments }
    if (deviceId) next[String(cameraId)] = deviceId
    else delete next[String(cameraId)]

    try {
      writeCameraAssignments(next)
      setAssignments(next)
      onAssignmentsChange()
      setError(null)
    } catch (e) {
      setError({ name: e.name || 'Error', message: e.message || String(e) })
    }
  }

  const resetAssignments = () => {
    try {
      clearCameraAssignments()
      setAssignments({})
      onAssignmentsChange()
      setError(null)
    } catch (e) {
      setError({ name: e.name || 'Error', message: e.message || String(e) })
    }
  }

  const visibleDevices = showAllDevices ? devices : devices.filter((device) => !isHiddenDevice(device))

  return (
    <div className="camera-setup">
      <button type="button" className="btn btn-ghost" onClick={toggleSetup} aria-expanded={isOpen}>
        {isOpen ? 'Cerrar asignación' : 'Asignar cámaras'}
      </button>

      {isOpen && (
        <div className="camera-setup-panel">
          <div className="camera-setup-heading">
            <h3>Asignación de cámaras</h3>
            <button type="button" className="btn btn-ghost" onClick={resetAssignments}>
              Restablecer asignación
            </button>
          </div>
          {loading && <p className="muted">Solicitando permiso y buscando dispositivos…</p>}
          {error && (
            <p className="camera-setup-error">
              {error.name}: {error.message}
            </p>
          )}

          <div className="camera-setup-assignments">
            {cameras.map((camera) => (
              <label key={camera.id}>
                <span>Cámara {camera.id} · {camera.name}</span>
                <select
                  value={assignments[String(camera.id)] || ''}
                  onChange={(event) => updateAssignment(camera.id, event.target.value)}
                  disabled={loading}
                >
                  <option value="">Usar selector de .env</option>
                  {visibleDevices.map((device) => {
                    const index = devices.findIndex((item) => item.deviceId === device.deviceId)
                    return (
                      <option key={device.deviceId} value={device.deviceId}>
                        Cámara {index + 1} · {device.label || 'Dispositivo sin nombre'}
                      </option>
                    )
                  })}
                </select>
              </label>
            ))}
          </div>

          <label>
            <input
              type="checkbox"
              checked={showAllDevices}
              onChange={(event) => setShowAllDevices(event.target.checked)}
            />{' '}
            Mostrar todos los dispositivos
          </label>
          <div className="camera-setup-heading">
            <span>Capturas de dispositivos</span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => captureDevices(devices, captureEpoch.current)}
              disabled={loading || busy || devices.length === 0}
            >
              Actualizar todas
            </button>
          </div>
          <div className="camera-setup-previews">
            {devices.map((device, index) => {
              const preview = previews[device.deviceId]
              return (
                <div className="camera-setup-device" key={device.deviceId}>
                  {preview?.status === 'ready' ? (
                    <img src={preview.image} alt={`Captura de cámara ${index + 1}`} />
                  ) : preview?.status === 'error' ? (
                    <div className="camera-setup-preview-error">
                      {preview.name}: {preview.message}
                    </div>
                  ) : (
                    <div className="camera-setup-preview-error">
                      {preview?.status === 'loading' ? 'Capturando…' : 'Sin captura'}
                    </div>
                  )}
                  <small>
                    Cámara {index + 1} · {device.label || 'Dispositivo sin nombre'}
                  </small>
                  {preview?.status === 'error' ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => captureDevices([device], captureEpoch.current)}
                      disabled={busy}
                    >
                      Reintentar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => captureDevices([device], captureEpoch.current)}
                      disabled={busy}
                    >
                      Actualizar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {!loading && devices.length === 0 && !error && (
            <p className="muted">No se encontraron cámaras conectadas.</p>
          )}
        </div>
      )}
    </div>
  )
}
