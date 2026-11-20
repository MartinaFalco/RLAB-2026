export const CAMERA_ASSIGNMENTS_KEY = 'rlab-camera-assignments'

let videoInputsCache = null
let videoInputsRequest = null
let permissionRequest = null
let permissionGranted = false
let deviceListVersion = 0
let deviceChangeListenerAdded = false
const videoInputListeners = new Set()

function assertMediaDevicesAvailable() {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
    throw new Error('Este navegador no permite acceder a cámaras.')
  }
}

function onlyVideoInputs(devices) {
  return devices.filter((device) => device.kind === 'videoinput')
}

function haveUnnamedVideoInputs(devices) {
  return onlyVideoInputs(devices).some((device) => !device.label?.trim())
}

function handleDeviceChange() {
  deviceListVersion += 1
  videoInputsCache = null
  videoInputsRequest = null
  videoInputListeners.forEach((listener) => listener())
}

function listenForDeviceChanges() {
  if (deviceChangeListenerAdded) return
  navigator.mediaDevices.addEventListener?.('devicechange', handleDeviceChange)
  deviceChangeListenerAdded = true
}

export function subscribeToVideoInputs(listener) {
  if (navigator.mediaDevices) listenForDeviceChanges()
  videoInputListeners.add(listener)
  return () => videoInputListeners.delete(listener)
}

export function ensureCameraPermission(devices) {
  assertMediaDevicesAvailable()
  if (permissionGranted) return Promise.resolve()
  if (permissionRequest) return permissionRequest

  const requestVersion = deviceListVersion
  const availableDevices = devices
    ? Promise.resolve(devices)
    : navigator.mediaDevices.enumerateDevices()
  permissionRequest = availableDevices
    .then(async (foundDevices) => {
      if (!haveUnnamedVideoInputs(foundDevices)) return

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      permissionGranted = true

      const refreshedDevices = await navigator.mediaDevices.enumerateDevices()
      if (requestVersion === deviceListVersion) {
        videoInputsCache = onlyVideoInputs(refreshedDevices)
      }
    })
    .catch((error) => {
      permissionRequest = null
      throw error
    })

  return permissionRequest
}

export function enumerateVideoInputs() {
  assertMediaDevicesAvailable()
  listenForDeviceChanges()
  if (videoInputsCache) return Promise.resolve(videoInputsCache)
  if (videoInputsRequest) return videoInputsRequest

  const requestVersion = deviceListVersion
  const request = (async () => {
    let devices = await navigator.mediaDevices.enumerateDevices()
    if (requestVersion !== deviceListVersion) return enumerateVideoInputs()

    if (haveUnnamedVideoInputs(devices)) {
      await ensureCameraPermission(devices)
      if (requestVersion !== deviceListVersion) return enumerateVideoInputs()
      if (videoInputsCache) return videoInputsCache
      devices = await navigator.mediaDevices.enumerateDevices()
      if (requestVersion !== deviceListVersion) return enumerateVideoInputs()
    }

    videoInputsCache = onlyVideoInputs(devices)
    return videoInputsCache
  })()

  videoInputsRequest = request
  request.catch(() => {
    if (videoInputsRequest === request) videoInputsRequest = null
  })
  return request
}

export function readCameraAssignments() {
  const serialized = window.localStorage.getItem(CAMERA_ASSIGNMENTS_KEY)
  if (!serialized) return {}

  const stored = JSON.parse(serialized)
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    throw new Error('La asignación guardada de cámaras no tiene un formato válido.')
  }

  return Object.fromEntries(
    [1, 2, 3, 4]
      .map((cameraId) => [cameraId, stored[String(cameraId)]])
      .filter(([, deviceId]) => typeof deviceId === 'string' && deviceId.length > 0)
  )
}

export function writeCameraAssignments(assignments) {
  window.localStorage.setItem(CAMERA_ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

export function clearCameraAssignments() {
  window.localStorage.removeItem(CAMERA_ASSIGNMENTS_KEY)
}
