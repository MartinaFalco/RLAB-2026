import { memo, useEffect, useRef, useState } from 'react'
import {
  enumerateVideoInputs,
  readCameraAssignments,
  subscribeToVideoInputs,
} from '../lib/cameraDevices'

function positiveDimension(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const cameraWidth = positiveDimension(import.meta.env.VITE_CAM_WIDTH, 320)
const cameraHeight = positiveDimension(import.meta.env.VITE_CAM_HEIGHT, 240)

const cameraQueue = []
let drainingCameraQueue = false
let cameraQueueScheduled = false
let cameraQueueOrder = 0

function scheduleCameraQueue() {
  if (drainingCameraQueue || cameraQueueScheduled || cameraQueue.length === 0) return
  cameraQueueScheduled = true
  Promise.resolve().then(() => {
    cameraQueueScheduled = false
    void drainCameraQueue()
  })
}

async function drainCameraQueue() {
  if (drainingCameraQueue) return
  drainingCameraQueue = true
  try {
    while (cameraQueue.length > 0) {
      const task = cameraQueue.shift()
      if (task.cancelled || task.token.cancelled) continue

      try {
        await task.open()
      } catch (error) {
        console.warn(
          `Cámara ${task.cameraId}: error durante la apertura`,
          error,
          `intento ${task.attempt}`
        )
      }

      if (!task.cancelled && !task.token.cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  } finally {
    drainingCameraQueue = false
    if (cameraQueue.length > 0) scheduleCameraQueue()
  }
}

function enqueueCamera(cameraId, attempt, token, open) {
  const task = { cameraId, attempt, token, open, order: cameraQueueOrder++, cancelled: false }
  cameraQueue.push(task)
  if (!drainingCameraQueue) {
    cameraQueue.sort((first, second) => first.cameraId - second.cameraId || first.order - second.order)
  }
  scheduleCameraQueue()

  return () => {
    task.cancelled = true
    const index = cameraQueue.indexOf(task)
    if (index >= 0) cameraQueue.splice(index, 1)
  }
}

function pickCamera(cameras, selector) {
  if (!selector) return undefined
  if (/^\d+$/.test(selector)) return cameras[Number(selector)]
  const [name, n] = selector.split('#')
  const matches = cameras.filter((device) =>
    device.label.toLowerCase().includes(name.toLowerCase())
  )
  return matches[n ? Number(n) : 0]
}

function useVideoLayout(videoRef, rotate, zoom) {
  const [layout, setLayout] = useState(null)

  useEffect(() => {
    const frame = videoRef.current?.parentElement
    if (!frame) return undefined

    const updateLayout = () => {
      const { width, height } = frame.getBoundingClientRect()
      if (!width || !height) return

      const normalizedRotation = ((rotate % 360) + 360) % 360
      const quarterTurn = normalizedRotation === 90 || normalizedRotation === 270
      const radians = (Math.abs(rotate % 360) * Math.PI) / 180
      const ratio = Math.max(width, height) / Math.min(width, height)
      const rotationScale = quarterTurn
        ? 1
        : Math.abs(Math.cos(radians)) + ratio * Math.abs(Math.sin(radians))

      setLayout({
        width: quarterTurn ? height : width,
        height: quarterTurn ? width : height,
        scale: rotationScale * zoom,
      })
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [rotate, videoRef, zoom])

  return layout
}

function LocalCamera({
  cameraId,
  selector,
  rotate = 270,
  zoom = 1,
  assignmentRevision,
  paused = false,
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const queueCancelRef = useRef(null)
  const retryTimerRef = useRef(null)
  const playingWaitRef = useRef(null)
  const retryRef = useRef(null)
  const resolveDeviceRef = useRef(null)
  const cameraIdRef = useRef(cameraId)
  const [deviceId, setDeviceId] = useState(null)
  const [resolutionError, setResolutionError] = useState({ name: '', message: '' })
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const resolutionErrorRef = useRef(resolutionError)
  cameraIdRef.current = cameraId
  resolutionErrorRef.current = resolutionError
  const layout = useVideoLayout(videoRef, rotate, zoom)

  useEffect(() => {
    let cancelled = false
    let requestId = 0

    const resolveDevice = async () => {
      const currentRequest = ++requestId
      setDeviceId(null)
      setResolutionError({ name: '', message: '' })

      try {
        const cameras = await enumerateVideoInputs()
        if (cancelled || currentRequest !== requestId) return

        const assignments = readCameraAssignments()
        const assignedDeviceId = assignments[String(cameraId)]
        const camera =
          cameras.find((device) => device.deviceId === assignedDeviceId) ||
          pickCamera(cameras, selector)

        if (!camera) {
          setResolutionError({
            name: 'NotFoundError',
            message: `No se encontró "${selector}".`,
          })
          setDeviceId('')
          return
        }

        setDeviceId(camera.deviceId)
      } catch (failure) {
        if (cancelled || currentRequest !== requestId) return
        setResolutionError({
          name: failure.name || 'Error',
          message: failure.message || String(failure),
        })
        setDeviceId('')
      }
    }

    resolveDeviceRef.current = resolveDevice
    const unsubscribe = subscribeToVideoInputs(() => {
      void resolveDevice()
    })
    void resolveDevice()

    return () => {
      cancelled = true
      requestId += 1
      unsubscribe()
      if (resolveDeviceRef.current === resolveDevice) resolveDeviceRef.current = null
    }
  }, [assignmentRevision, cameraId, selector])

  useEffect(() => {
    const activeCameraId = cameraIdRef.current
    const token = {
      cancelled: false,
      cancelWait: null,
      cancelledPromise: null,
    }
    token.cancelledPromise = new Promise((resolve) => {
      token.cancelWait = resolve
    })

    const releaseStream = () => {
      const stream = streamRef.current
      streamRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
    }

    const cleanup = () => {
      token.cancelled = true
      token.cancelWait()
      clearTimeout(retryTimerRef.current)
      playingWaitRef.current?.cancel()
      queueCancelRef.current?.()
      releaseStream()
      if (retryRef.current) retryRef.current = null
    }

    setError(null)
    if (paused || deviceId === null) {
      setStatus('connecting')
      return cleanup
    }
    if (!deviceId) {
      const currentResolutionError = resolutionErrorRef.current
      setError({
        name: currentResolutionError.name || 'NotFoundError',
        message: currentResolutionError.message || 'No se encontró el dispositivo de video.',
      })
      setStatus('error')
      return cleanup
    }

    const reportFailure = (failure, attempt) => {
      if (token.cancelled) return
      console.warn(`Cámara ${activeCameraId}: error de apertura`, failure, `intento ${attempt}`)
      setError({ name: failure.name || 'Error', message: failure.message || String(failure) })
      setStatus('error')
      releaseStream()
    }

    const enqueueAttempt = (attempt) => {
      if (token.cancelled) return
      setError(null)
      setStatus('connecting')
      queueCancelRef.current = enqueueCamera(activeCameraId, attempt, token, async () => {
        if (token.cancelled) return

        // TEMP: quitar este contador después del diagnóstico.
        console.count(`TEMP apertura cámara ${activeCameraId}`)
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: cameraWidth },
              height: { ideal: cameraHeight },
              frameRate: { ideal: 15, max: 15 },
            },
          })
        } catch (failure) {
          console.warn(`Cámara ${activeCameraId}: error de apertura`, failure, `intento ${attempt}`)
          if (token.cancelled) return
          if (failure.name === 'NotReadableError' && attempt <= 3) {
            retryTimerRef.current = setTimeout(
              () => enqueueAttempt(attempt + 1),
              attempt * 1000
            )
          } else {
            setError({ name: failure.name || 'Error', message: failure.message || String(failure) })
            setStatus('error')
          }
          return
        }

        if (token.cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        // TEMP: diagnóstico de lo que Chrome negoció realmente
        console.log(
          `TEMP cámara ${activeCameraId} settings:`,
          stream.getVideoTracks()[0].getSettings()
        )

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          reportFailure(new Error('No se encontró el elemento de video.'), attempt)
          return
        }

        const playing = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            playingWaitRef.current = null
            reject({
              name: 'TimeoutError',
              message: 'La cámara no emitió el evento playing.',
            })
          }, 10000)
          playingWaitRef.current = {
            cancel: () => {
              clearTimeout(timeout)
              playingWaitRef.current = null
              resolve(false)
            },
            resolve: () => {
              clearTimeout(timeout)
              playingWaitRef.current = null
              resolve(true)
            },
          }
        })

        try {
          video.srcObject = stream
          await video.play()
          await Promise.race([
            playing,
            token.cancelledPromise.then(() => false),
          ])
        } catch (failure) {
          playingWaitRef.current?.cancel()
          reportFailure(failure, attempt)
        }
      })
    }

    retryRef.current = () => enqueueAttempt(1)
    enqueueAttempt(1)

    return cleanup
  }, [
    deviceId,
    paused,
    cameraWidth,
    cameraHeight,
  ])

  const handlePlaying = () => {
    setStatus('playing')
    playingWaitRef.current?.resolve()
  }

  const handleRetry = () => {
    if (deviceId) retryRef.current?.()
    else resolveDeviceRef.current?.()
  }

  return (
    <>
      <video
        ref={videoRef}
        className="local-camera-video"
        style={{
          height: layout ? `${layout.height}px` : '100%',
          transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${layout?.scale ?? zoom})`,
          visibility: status === 'playing' ? 'visible' : 'hidden',
          width: layout ? `${layout.width}px` : '100%',
        }}
        onPlaying={handlePlaying}
        autoPlay
        playsInline
        muted
      />
      {status !== 'playing' && (
        <div className="camera-empty local-camera-state">
          <span>{status === 'error' ? 'Sin señal' : 'Conectando...'}</span>
          {error && (
            <small>
              {error.name}: {error.message}
            </small>
          )}
          {status === 'error' && (
            <button type="button" className="btn btn-ghost" onClick={handleRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
    </>
  )
}

export default memo(LocalCamera)
