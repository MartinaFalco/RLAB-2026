/**
 * Canales de telemetria del simulador ESIM-PDS9B (Esimtech).
 *
 * Los nombres, unidades y rangos salen de la especificacion tecnica del
 * fabricante: los instrumentos de las cuatro consolas portatiles y la pantalla
 * del alumno (figura 7), que muestra Hook Load, Mud Volume, Return Flow,
 * Pit Gain/Loss, Hole Depth, Drillpipe Pressure, WOB, RPM, SPM, ROP, Bit Depth
 * y Casing Pressure.
 *
 * El `id` es la clave que viaja en el mensaje JSON de telemetria:
 *
 *   { "type": "telemetry", "t": 1730000000000, "values": { "presion_tuberia": 1240, ... } }
 *
 * Si se agrega un sensor nuevo alcanza con sumar una entrada aca (y publicar
 * la clave desde el backend) para que aparezca en los selectores y graficos.
 */

export const TELEMETRY_CHANNELS = [
  // --- Perforacion (consola del perforador y del top drive) ----------------
  {
    id: 'wob',
    label: 'WOB (peso sobre el trépano)',
    unit: 'klbf',
    group: 'Perforación',
    color: '#4ade80',
    min: 0,
    max: 80,
  },
  {
    id: 'hook_load',
    label: 'Peso en el gancho',
    unit: 'klbf',
    group: 'Perforación',
    color: '#86efac',
    min: 0,
    max: 500,
  },
  {
    id: 'rpm',
    label: 'RPM de la mesa rotaria',
    unit: 'rpm',
    group: 'Perforación',
    color: '#22d3ee',
    min: 0,
    max: 200,
  },
  {
    id: 'rt_torque',
    label: 'Torque de la mesa rotaria',
    unit: 'ft·lb',
    group: 'Perforación',
    color: '#facc15',
    min: 0,
    max: 20000,
  },
  {
    id: 'td_speed',
    label: 'Velocidad del top drive',
    unit: 'rpm',
    group: 'Perforación',
    color: '#38bdf8',
    min: 0,
    max: 250,
  },
  {
    id: 'td_torque',
    label: 'Torque del top drive',
    unit: 'ft·lb',
    group: 'Perforación',
    color: '#fb923c',
    min: 0,
    max: 40000,
  },
  {
    id: 'rop',
    label: 'ROP (velocidad de penetración)',
    unit: 'ft/h',
    group: 'Perforación',
    color: '#c084fc',
    min: 0,
    max: 200,
  },
  {
    id: 'bit_depth',
    label: 'Profundidad de la mecha',
    unit: 'ft',
    group: 'Perforación',
    color: '#94a3b8',
    min: 0,
    max: 20000,
  },
  {
    id: 'hole_depth',
    label: 'Profundidad del pozo',
    unit: 'ft',
    group: 'Perforación',
    color: '#64748b',
    min: 0,
    max: 20000,
  },

  // --- Circulacion ---------------------------------------------------------
  {
    id: 'presion_bomba',
    label: 'Presión de bomba',
    unit: 'psi',
    group: 'Circulación',
    color: '#a78bfa',
    min: 0,
    max: 5000,
  },
  {
    id: 'presion_tuberia',
    label: 'Presión de tubería (drill pipe)',
    unit: 'psi',
    group: 'Circulación',
    color: '#38bdf8',
    min: 0,
    max: 5000,
  },
  {
    id: 'spm1',
    label: 'SPM bomba 1',
    unit: 'spm',
    group: 'Circulación',
    color: '#60a5fa',
    min: 0,
    max: 120,
  },
  {
    id: 'spm2',
    label: 'SPM bomba 2',
    unit: 'spm',
    group: 'Circulación',
    color: '#818cf8',
    min: 0,
    max: 120,
  },
  {
    id: 'total_strokes',
    label: 'Emboladas totales',
    unit: 'stk',
    group: 'Circulación',
    color: '#cbd5e1',
    min: 0,
    max: 99999,
  },
  {
    id: 'return_flow',
    label: 'Caudal de retorno',
    unit: 'bbl/min',
    group: 'Circulación',
    color: '#2dd4bf',
    min: 0,
    max: 30,
  },
  {
    id: 'mud_volume',
    label: 'Volumen de lodo en piletas',
    unit: 'bbl',
    group: 'Circulación',
    color: '#f97316',
    min: 0,
    max: 1500,
  },
  {
    id: 'densidad_lodo',
    label: 'Densidad del lodo',
    unit: 'ppg',
    group: 'Circulación',
    color: '#fbbf24',
    min: 8,
    max: 18,
  },

  // --- Control de pozo -----------------------------------------------------
  {
    id: 'pit_gain',
    label: 'Ganancia / pérdida de pit',
    unit: 'bbl',
    group: 'Control de pozo',
    color: '#ef4444',
    min: -50,
    max: 100,
  },
  {
    id: 'presion_casing',
    label: 'Presión de casing',
    unit: 'psi',
    group: 'Control de pozo',
    color: '#f472b6',
    min: 0,
    max: 5000,
  },
  {
    id: 'kill_line_pressure',
    label: 'Presión de la línea de matar',
    unit: 'psi',
    group: 'Control de pozo',
    color: '#e879f9',
    min: 0,
    max: 5000,
  },
  {
    id: 'choke_position',
    label: 'Posición del estrangulador',
    unit: '%',
    group: 'Control de pozo',
    color: '#fb7185',
    min: 0,
    max: 100,
  },
  {
    id: 'bhp',
    label: 'Presión de fondo (BHP)',
    unit: 'psi',
    group: 'Control de pozo',
    color: '#fdba74',
    min: 0,
    max: 12000,
  },
  {
    id: 'casing_shoe_pressure',
    label: 'Presión en la zapata',
    unit: 'psi',
    group: 'Control de pozo',
    color: '#fca5a5',
    min: 0,
    max: 8000,
  },

  // --- BOP y unidad acumuladora --------------------------------------------
  {
    id: 'accumulator_pressure',
    label: 'Presión del acumulador',
    unit: 'psi',
    group: 'BOP y acumulador',
    color: '#4ade80',
    min: 0,
    max: 3500,
  },
  {
    id: 'manifold_pressure',
    label: 'Presión del manifold',
    unit: 'psi',
    group: 'BOP y acumulador',
    color: '#34d399',
    min: 0,
    max: 3000,
  },
  {
    id: 'annular_pressure',
    label: 'Presión del preventor anular',
    unit: 'psi',
    group: 'BOP y acumulador',
    color: '#22d3ee',
    min: 0,
    max: 3000,
  },
  {
    id: 'air_supply_pressure',
    label: 'Presión de aire de alimentación',
    unit: 'psi',
    group: 'BOP y acumulador',
    color: '#93c5fd',
    min: 0,
    max: 200,
  },
  {
    id: 'flowmeter',
    label: 'Caudalímetro del acumulador',
    unit: 'gal',
    group: 'BOP y acumulador',
    color: '#a5b4fc',
    min: 0,
    max: 120,
  },
]

/** Canales que se muestran seleccionados la primera vez que se abre el panel. */
export const DEFAULT_SELECTED = ['presion_tuberia', 'presion_casing', 'pit_gain', 'choke_position']

/** Tarjetas numericas grandes que se muestran siempre arriba del panel. */
export const KPI_CHANNELS = ['presion_tuberia', 'presion_casing', 'wob', 'pit_gain', 'choke_position']

export const CHANNELS_BY_ID = Object.fromEntries(TELEMETRY_CHANNELS.map((c) => [c.id, c]))

export const CHANNEL_GROUPS = [...new Set(TELEMETRY_CHANNELS.map((c) => c.group))]

/**
 * Alarmas configurables por el alumno, como en la pantalla del simulador
 * (Pit Deviation Alarm y Return Flow Alarm de la figura 7).
 */
export const ALARM_LIMITS = [
  { id: 'pit_gain', label: 'Desviación de pit', unit: 'bbl', low: -10, high: 10 },
  { id: 'return_flow', label: 'Caudal de retorno', unit: 'bbl/min', low: 0, high: 15 },
]
