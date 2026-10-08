/**
 * Motor de simulacion "de demostracion" que corre en el browser.
 *
 * NO es un modelo de ingenieria: su unico objetivo es que la interfaz se pueda
 * probar, mostrar y desarrollar sin el hardware conectado. Reproduce de forma
 * cualitativa los fenomenos que el ESIM-PDS9B calcula de verdad segun su
 * especificacion: WOB durante la perforacion, presion de bomba, cierre duro y
 * suave con el BOP, migracion de gas y presion de fondo.
 *
 * Cuando el gateway real esta disponible (VITE_LINK_MODE=websocket) este modulo
 * queda sin uso: la telemetria llega desde el simulador fisico.
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const lerp = (a, b, k) => a + (b - a) * k
const noise = (amp) => (Math.random() - 0.5) * 2 * amp

/** Peso de la sarta colgando del gancho, en klbf. */
const PESO_SARTA = 280
/** Volumen de lodo en piletas al iniciar el ejercicio, en bbl. */
const PILETAS_INICIAL = 820

export function createMockEngine() {
  const state = {
    // Perforación
    wob: 0,
    hook_load: PESO_SARTA,
    rpm: 0,
    rt_torque: 0,
    td_speed: 0,
    td_torque: 0,
    rop: 0,
    bit_depth: 8420,
    hole_depth: 8420,
    // Circulación
    presion_bomba: 0,
    presion_tuberia: 0,
    spm1: 0,
    spm2: 0,
    total_strokes: 0,
    return_flow: 0,
    mud_volume: PILETAS_INICIAL,
    densidad_lodo: 11.2,
    // Control de pozo
    pit_gain: 0,
    presion_casing: 0,
    kill_line_pressure: 0,
    choke_position: 100,
    bhp: 0,
    casing_shoe_pressure: 0,
    // BOP y acumulador
    accumulator_pressure: 3000,
    manifold_pressure: 1500,
    annular_pressure: 0,
    air_supply_pressure: 120,
    flowmeter: 0,
    /** Presion aportada por el influjo acumulado, en psi (variable interna). */
    _presionInflujo: 0,
    /** Cantidad de funciones de BOP accionadas desde el ultimo paso. */
    _bopPrevio: 0,
  }

  /**
   * Avanza la simulacion.
   * @param {object} c  estado actual de los controles
   * @param {number} dt paso de tiempo en segundos
   * @returns {object}  muestra de telemetria
   */
  function step(c, dt) {
    const preventores = [c.annular, c.pipe_rams_upper, c.blind_rams, c.pipe_rams_lower, c.pipe_rams_bottom]
    const pozoCerrado = preventores.some(Boolean)

    // --- Bombas y circulación ---------------------------------------------
    const spm1Obj = c.pump1_clutch ? c.pump1_spm : 0
    const spm2Obj = c.pump2_clutch ? c.pump2_spm : 0
    state.spm1 = clamp(lerp(state.spm1, spm1Obj, 0.25) + noise(0.3), 0, 120)
    state.spm2 = clamp(lerp(state.spm2, spm2Obj, 0.25) + noise(0.3), 0, 120)

    const spmTotal = state.spm1 + state.spm2
    state.total_strokes += (spmTotal / 60) * dt
    // ~0,1 bbl por embolada
    const caudalEntrada = spmTotal * 0.1 // bbl/min

    // --- Mesa rotaria y top drive ------------------------------------------
    const rpmObj = c.rotary_table === 'OFF' ? 0 : c.rt_speed
    state.rpm = clamp(lerp(state.rpm, rpmObj, 0.2) + noise(1), 0, 220)

    const tdActivo = c.td_direction !== 'STOP'
    const tdObj = tdActivo ? c.td_throttle * 2.2 : 0
    state.td_speed = clamp(lerp(state.td_speed, tdObj, 0.2) + noise(1), 0, 250)

    // --- Malacate y peso sobre el trépano ----------------------------------
    const frenoLibre = c.driller_brake < 50 && !c.auxiliary_brake && c.drum_clutch !== 'OFF'
    const wobObj = frenoLibre ? c.drawworks_throttle * 0.45 : 0
    state.wob = clamp(lerp(state.wob, wobObj, 0.15) + noise(0.25), 0, 80)
    state.hook_load = clamp(PESO_SARTA - state.wob + noise(1.5), 0, 500)

    state.rt_torque = clamp(state.wob * state.rpm * 1.8 + noise(150), 0, 20000)
    const limiteTorque = c.td_drilling_torque * 400
    state.td_torque = clamp(
      Math.min(state.wob * state.td_speed * 3.4, limiteTorque) + noise(300),
      0,
      40000,
    )

    // --- Avance de la mecha -------------------------------------------------
    const girando = state.rpm > 20 || state.td_speed > 20
    const perforando = state.wob > 2 && girando && caudalEntrada > 2 && !pozoCerrado
    state.rop = clamp(perforando ? state.wob * 2.4 + state.rpm * 0.3 + noise(4) : 0, 0, 200)
    state.bit_depth += (state.rop / 3600) * dt
    state.hole_depth = Math.max(state.hole_depth, state.bit_depth)

    // --- Presión de bomba ---------------------------------------------------
    let presionBombaObj = Math.pow(caudalEntrada / 12, 1.86) * 3000
    if (c.escenario === 'falla_bomba') presionBombaObj *= 0.25
    state.presion_bomba = clamp(lerp(state.presion_bomba, presionBombaObj, 0.25) + noise(15), 0, 5000)

    // --- Influjo (kick) y migración de gas ----------------------------------
    const escenario = c.escenario || 'perforacion_normal'
    const aportaInflujo =
      (escenario === 'kick_perforando' && perforando) || (escenario === 'kick_sacando' && !pozoCerrado)

    if (aportaInflujo) {
      state.pit_gain += 1.6 * dt
      state._presionInflujo = clamp(state._presionInflujo + 9 * dt, 0, 1800)
    } else if (escenario === 'migracion_gas') {
      // Con el pozo cerrado la burbuja migra y presuriza todo el sistema.
      state._presionInflujo = clamp(state._presionInflujo + (pozoCerrado ? 14 : 5) * dt, 0, 2400)
      if (!pozoCerrado) state.pit_gain += 0.8 * dt
    } else if (escenario === 'perdida_circulacion') {
      state.pit_gain -= 1.2 * dt
      state._presionInflujo = clamp(state._presionInflujo - 20 * dt, 0, 2400)
    } else if (!pozoCerrado) {
      // Circulando con el pozo abierto se va aliviando la presión del influjo.
      state._presionInflujo = clamp(state._presionInflujo - 18 * dt, 0, 2400)
      state.pit_gain = lerp(state.pit_gain, 0, 0.02)
    }

    // --- Estrangulador ------------------------------------------------------
    // La palanca es de acción sostenida: abre o cierra ~10 % por segundo.
    if (c.choke_valve === 'ABRIR') state.choke_position += 10 * dt
    else if (c.choke_valve === 'CERRAR') state.choke_position -= 10 * dt
    state.choke_position = clamp(state.choke_position, 0, 100)

    const chokeAlineado = Boolean(c.choke_line)
    // Con el choke cerrado o la línea sin alinear no hay alivio de presión.
    const factorChoke = chokeAlineado ? 1 - Math.pow(state.choke_position / 100, 1.5) : 1

    // --- Presiones en superficie --------------------------------------------
    const casingObj = pozoCerrado
      ? state._presionInflujo * (0.35 + 0.65 * factorChoke)
      : state._presionInflujo * factorChoke * 0.6
    state.presion_casing = clamp(lerp(state.presion_casing, casingObj, 0.18) + noise(6), 0, 5000)

    const tuberiaObj = pozoCerrado
      ? state._presionInflujo * 0.8
      : state.presion_bomba + state.presion_casing * 0.25
    state.presion_tuberia = clamp(lerp(state.presion_tuberia, tuberiaObj, 0.2) + noise(8), 0, 5000)

    const killObj = c.kill_line ? state.presion_casing * 0.95 : 0
    state.kill_line_pressure = clamp(lerp(state.kill_line_pressure, killObj, 0.2), 0, 5000)

    // Presión hidrostática de la columna + lo que se lea en superficie.
    const hidrostatica = state.densidad_lodo * 0.052 * state.bit_depth
    state.bhp = clamp(hidrostatica + state.presion_casing * 0.9 + noise(10), 0, 12000)
    state.casing_shoe_pressure = clamp(state.bhp * 0.72, 0, 8000)

    // --- Retorno y piletas ---------------------------------------------------
    const retornoObj = pozoCerrado
      ? 0
      : caudalEntrada * (0.3 + 0.7 * (state.choke_position / 100)) + (aportaInflujo ? 1.5 : 0)
    state.return_flow = clamp(lerp(state.return_flow, retornoObj, 0.25) + noise(0.1), 0, 30)

    state.pit_gain = clamp(state.pit_gain, -50, 100)
    state.mud_volume = clamp(PILETAS_INICIAL + state.pit_gain, 0, 1500)
    state.densidad_lodo = clamp(11.2 - state._presionInflujo * 0.0004 + noise(0.02), 8, 18)

    // --- Unidad acumuladora ---------------------------------------------------
    // Cada función de BOP accionada consume fluido y baja la presión.
    const bopActivos = preventores.filter(Boolean).length
    const accionadas = Math.max(0, bopActivos - state._bopPrevio)
    state._bopPrevio = bopActivos
    if (accionadas > 0) {
      state.accumulator_pressure -= 220 * accionadas
      state.flowmeter += 12 * accionadas
    }
    // La bomba de la unidad recarga hasta la presión nominal.
    state.accumulator_pressure = clamp(lerp(state.accumulator_pressure, 3000, 0.02) + noise(5), 0, 3500)
    state.flowmeter = clamp(lerp(state.flowmeter, 0, 0.05), 0, 120)
    state.manifold_pressure = clamp(lerp(state.manifold_pressure, 1500, 0.1) + noise(8), 0, 3000)
    state.annular_pressure = clamp(
      lerp(state.annular_pressure, c.annular ? c.annular_regulator : 0, 0.15) + noise(6),
      0,
      3000,
    )
    state.air_supply_pressure = clamp(120 + noise(2), 0, 200)

    return sample()
  }

  /** Valores forzados desde el modo prueba de hardware. */
  const overrides = {}

  function sample() {
    const out = {}
    for (const [k, v] of Object.entries(state)) {
      if (k.startsWith('_')) continue
      out[k] = Number(v.toFixed(2))
    }
    return { ...out, ...overrides }
  }

  /** Fija (o libera, con null) la lectura de un instrumento. */
  function setOverride(canal, valor) {
    if (valor == null) delete overrides[canal]
    else overrides[canal] = valor
  }

  /** Ejecuta las macros (cierres de emergencia y reset de emboladas). */
  function applyAction(actionId, controls) {
    if (actionId === 'cierre_duro') {
      // Hard shut-in: bombas fuera, choke cerrado y recién ahí el preventor.
      state.choke_position = 0
      return {
        ...controls,
        pump1_clutch: false,
        pump2_clutch: false,
        choke_valve: 'MANTENER',
        annular: true,
      }
    }
    if (actionId === 'cierre_suave') {
      // Soft shut-in: el choke queda abierto y el operador lo cierra a mano.
      state.choke_position = 100
      return {
        ...controls,
        pump1_clutch: false,
        pump2_clutch: false,
        choke_line: true,
        choke_valve: 'MANTENER',
        annular: true,
      }
    }
    if (actionId === 'reset_strokes') {
      state.total_strokes = 0
      return controls
    }
    if (actionId === 'flowmeter_reset') {
      state.flowmeter = 0
      return controls
    }
    if (actionId === 'parada_emergencia') {
      state.choke_position = 0
      return {
        ...controls,
        pump1_clutch: false,
        pump1_spm: 0,
        pump2_clutch: false,
        pump2_spm: 0,
        rotary_table: 'OFF',
        rt_speed: 0,
        td_direction: 'STOP',
        td_throttle: 0,
        drum_clutch: 'OFF',
        drawworks_throttle: 0,
        driller_brake: 100,
        auxiliary_brake: true,
        annular: true,
        choke_valve: 'MANTENER',
      }
    }
    return controls
  }

  return { step, sample, applyAction, setOverride }
}
