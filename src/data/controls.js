/**
 * Actuadores del simulador ESIM-PDS9B (Esimtech).
 *
 * Cada control se mapea 1 a 1 con un elemento fisico de las consolas
 * portatiles descriptas en la especificacion tecnica del fabricante:
 *
 *   Consola del perforador (azul) · figura 2
 *   Consola del top drive  (azul) · figura 3
 *   Consola del BOP        (roja) · figura 4
 *   Consola del choke   (amarilla) · figura 5
 *
 * El gateway traduce cada comando a:
 *   - una salida digital / analogica del PoKeys57U,
 *   - un motor Nema 17 que gira una perilla, o
 *   - el solenoide JF0530B que acciona un boton o una palanca.
 *
 * Mensaje que envia la web al gateway:
 *   { "type": "command", "control": "pump1_spm", "value": 60, "session": "<token>" }
 *
 * `actuator` es documentacion para la interfaz (se muestra en cada tarjeta) y
 * para que el mapeo quede a la vista del equipo de hardware.
 *
 * Tipos de control:
 *   switch  -> dos estados (ON/OFF, ABRIR/CERRAR)
 *   select  -> tres o mas posiciones (FWD/OFF/REV, DRILL/SPIN/TORQUE, …)
 *   slider  -> perilla continua
 *   action  -> macro puntual (cierre duro/suave, reset de emboladas)
 *
 * `dependsOn` deshabilita el control mientras otro no este activo;
 * `dependsOnValues` permite condicionar a posiciones concretas de un `select`.
 */

export const CONSOLES = [
  {
    id: 'perforador',
    name: 'Consola 1 · Perforador',
    color: '#2563eb',
    description:
      'Malacate, mesa rotaria y las dos bombas de lodo. Muestra presión de bomba, torque y velocidad de rotaria y SPM de cada bomba.',
    controls: [
      {
        id: 'pump1_clutch',
        label: 'Embrague bomba 1',
        type: 'switch',
        actuator: 'Solenoide JF0530B sobre interruptor PUMP1 CLUTCH · PoKeys DO 1',
      },
      {
        id: 'pump1_spm',
        label: 'Régimen bomba 1 (PUMP1 SPM)',
        type: 'slider',
        min: 0,
        max: 120,
        step: 5,
        unit: 'spm',
        dependsOn: 'pump1_clutch',
        actuator: 'Motor Nema 17 sobre perilla PUMP1 SPM · PoKeys PoStep 1',
      },
      {
        id: 'pump2_clutch',
        label: 'Embrague bomba 2',
        type: 'switch',
        actuator: 'Solenoide JF0530B sobre interruptor PUMP2 CLUTCH · PoKeys DO 2',
      },
      {
        id: 'pump2_spm',
        label: 'Régimen bomba 2 (PUMP2 SPM)',
        type: 'slider',
        min: 0,
        max: 120,
        step: 5,
        unit: 'spm',
        dependsOn: 'pump2_clutch',
        actuator: 'Motor Nema 17 sobre perilla PUMP2 SPM · PoKeys PoStep 2',
      },
      {
        id: 'rotary_table',
        label: 'Mesa rotaria',
        type: 'select',
        options: ['FWD', 'OFF', 'REV'],
        actuator: 'Solenoide JF0530B sobre llave ROTARY TABLE · PoKeys DO 3 y DO 4',
      },
      {
        id: 'rt_speed',
        label: 'Velocidad de rotaria (RT SPEED)',
        type: 'slider',
        min: 0,
        max: 200,
        step: 5,
        unit: 'rpm',
        dependsOn: 'rotary_table',
        dependsOnValues: ['FWD', 'REV'],
        actuator: 'Motor Nema 17 sobre perilla RT SPEED · PoKeys PoStep 3',
      },
      {
        id: 'drum_clutch',
        label: 'Embrague del tambor',
        type: 'select',
        options: ['HIGH', 'OFF', 'LOW'],
        actuator: 'Solenoide JF0530B sobre llave DRUM CLUTCH · PoKeys DO 5 y DO 6',
      },
      {
        id: 'drawworks_throttle',
        label: 'Acelerador del malacate',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        actuator: 'Motor Nema 17 sobre perilla DRAWWORKS THROTTLE · PoKeys PoStep 4',
      },
      {
        id: 'driller_brake',
        label: 'Freno del perforador',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        unit: '% aplicado',
        actuator: 'Actuador lineal sobre palanca DRILLER BRAKE · PoKeys AO 1',
      },
      {
        id: 'auxiliary_brake',
        label: 'Freno auxiliar',
        type: 'switch',
        actuator: 'Solenoide JF0530B sobre botón AUXILIARY BRAKE · PoKeys DO 7',
      },
    ],
  },
  {
    id: 'top_drive',
    name: 'Consola 2 · Top drive',
    color: '#1d4ed8',
    description:
      'Operación y lógica del top drive: IBOP, traba de la torreta, links, clamp y sentido de giro. Muestra torque y velocidad en tiempo real.',
    controls: [
      {
        id: 'td_operation',
        label: 'Modo de operación',
        type: 'select',
        options: ['DRILL', 'SPIN', 'TORQUE'],
        actuator: 'Solenoide JF0530B sobre llave OPERATION · PoKeys DO 8 y DO 9',
      },
      {
        id: 'td_direction',
        label: 'Sentido de giro',
        type: 'select',
        options: ['CCW', 'STOP', 'CW'],
        actuator: 'Solenoide JF0530B sobre llave DIRECTION · PoKeys DO 10 y DO 11',
      },
      {
        id: 'td_throttle',
        label: 'Acelerador (THROTTLE)',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        dependsOn: 'td_direction',
        dependsOnValues: ['CCW', 'CW'],
        actuator: 'Motor Nema 17 sobre perilla THROTTLE · PoKeys PoStep 5',
      },
      {
        id: 'td_drilling_torque',
        label: 'Límite de torque de perforación',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        actuator: 'Motor Nema 17 sobre perilla DRILLING TORQUE · PoKeys PoStep 6',
      },
      {
        id: 'ibop',
        label: 'IBOP',
        type: 'switch',
        onLabel: 'CERRAR',
        offLabel: 'ABRIR',
        critical: true,
        actuator: 'Solenoide JF0530B sobre llave IBOP · PoKeys DO 12',
      },
      {
        id: 'locking_pin',
        label: 'Perno de traba (LOCKING PIN)',
        type: 'switch',
        onLabel: 'LOCK',
        offLabel: 'UN LOCK',
        actuator: 'Solenoide JF0530B sobre llave LOCKING PIN · PoKeys DO 13',
      },
      {
        id: 'link_rotation',
        label: 'Rotación de links',
        type: 'select',
        options: ['CCW', 'CENTRO', 'CW'],
        actuator: 'Solenoide JF0530B sobre llave LINK ROTATION · PoKeys DO 14 y DO 15',
      },
      {
        id: 'link_tilting',
        label: 'Inclinación de links',
        type: 'select',
        options: ['REAR', 'CENTRO', 'FRONT'],
        actuator: 'Solenoide JF0530B sobre llave LINK TILTING · PoKeys DO 16 y DO 17',
      },
      {
        id: 'clamp',
        label: 'Clamp',
        type: 'switch',
        onLabel: 'CLOSE',
        offLabel: 'JOG',
        actuator: 'Solenoide JF0530B sobre llave CLAMP · PoKeys DO 18',
      },
    ],
  },
  {
    id: 'bop',
    name: 'Consola 3 · BOP',
    color: '#dc2626',
    description:
      'Un preventor anular, dos rams de tubería y un ram ciego, más el alineamiento de las líneas de matar y de estrangular. Las maniobras piden confirmación.',
    controls: [
      {
        id: 'annular',
        label: 'Preventor anular',
        type: 'switch',
        critical: true,
        onLabel: 'CERRAR',
        offLabel: 'ABRIR',
        actuator: 'Solenoide JF0530B sobre válvula de 4 vías ANNULAR · PoKeys DO 20',
      },
      {
        id: 'pipe_rams_upper',
        label: 'Ram de tubería superior',
        type: 'switch',
        critical: true,
        onLabel: 'CERRAR',
        offLabel: 'ABRIR',
        actuator: 'Solenoide JF0530B sobre válvula PIPE RAMS (sup.) · PoKeys DO 21',
      },
      {
        id: 'blind_rams',
        label: 'Ram ciego',
        type: 'switch',
        critical: true,
        onLabel: 'CERRAR',
        offLabel: 'ABRIR',
        actuator: 'Solenoide JF0530B sobre válvula BLIND RAMS · PoKeys DO 22',
      },
      {
        id: 'pipe_rams_lower',
        label: 'Ram de tubería inferior',
        type: 'switch',
        critical: true,
        onLabel: 'CERRAR',
        offLabel: 'ABRIR',
        actuator: 'Solenoide JF0530B sobre válvula PIPE RAMS (inf.) · PoKeys DO 23',
      },
      {
        id: 'kill_line',
        label: 'Línea de matar (KILL LINE)',
        type: 'switch',
        onLabel: 'ABRIR',
        offLabel: 'CERRAR',
        actuator: 'Solenoide JF0530B sobre válvula KILL LINE · PoKeys DO 24',
      },
      {
        id: 'choke_line',
        label: 'Línea de estrangular (CHOKE LINE)',
        type: 'switch',
        onLabel: 'ABRIR',
        offLabel: 'CERRAR',
        actuator: 'Solenoide JF0530B sobre válvula CHOKE LINE · PoKeys DO 25',
      },
      {
        id: 'bypass',
        label: 'Bypass',
        type: 'switch',
        actuator: 'Solenoide JF0530B sobre válvula BYPASS · PoKeys DO 26',
      },
      {
        id: 'annular_regulator',
        label: 'Regulador de presión del anular',
        type: 'slider',
        min: 0,
        max: 3000,
        step: 50,
        unit: 'psi',
        actuator: 'Motor Nema 17 sobre perilla PRESSURE REGULATING · PoKeys PoStep 7',
      },
      {
        id: 'cierre_duro',
        label: 'Cierre duro',
        type: 'action',
        critical: true,
        hint: 'Hard shut-in: se cierra el preventor con el estrangulador cerrado.',
        actuator: 'Macro del gateway: bombas OFF → choke cerrado → anular cerrado',
      },
      {
        id: 'cierre_suave',
        label: 'Cierre suave',
        type: 'action',
        critical: true,
        hint: 'Soft shut-in: se abre el choke, se cierra el preventor y recién ahí se estrangula.',
        actuator: 'Macro del gateway: choke abierto → anular cerrado → choke cerrado',
      },
    ],
  },
  {
    id: 'choke',
    name: 'Consola 4 · Estrangulador',
    color: '#f59e0b',
    description:
      'Muestra presión de tubería, de casing y de la línea de matar, SPM, emboladas totales y posición del estrangulador. La palanca abre y cierra el choke.',
    controls: [
      {
        id: 'choke_valve',
        label: 'Palanca del estrangulador',
        type: 'select',
        options: ['ABRIR', 'MANTENER', 'CERRAR'],
        hint: 'Mientras se sostiene en ABRIR o CERRAR, la posición del choke cambia ~10 %/s.',
        actuator: 'Actuador lineal sobre palanca CHOKE VALVE · PoKeys DO 27 y DO 28',
      },
      {
        id: 'choke_select',
        label: 'Selección de estrangulador',
        type: 'switch',
        onLabel: 'CHOKE 2',
        offLabel: 'CHOKE 1',
        actuator: 'Solenoide JF0530B sobre llave CHOKE SELECT · PoKeys DO 29',
      },
      {
        id: 'hydraulic_regulator',
        label: 'Regulador hidráulico',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        actuator: 'Motor Nema 17 sobre perilla HYDRAULIC REGULATOR · PoKeys PoStep 8',
      },
      {
        id: 'reset_strokes',
        label: 'Reset de emboladas',
        type: 'action',
        hint: 'Pone en cero el contador TOTAL STROKES antes de empezar una maniobra.',
        actuator: 'Solenoide JF0530B sobre botón TOTAL STROKES RESET · PoKeys DO 30',
      },
    ],
  },
]

/**
 * Escenarios precargados ("well condition snapshots") que el instructor carga
 * desde la consola tactil. Se corresponden con los items de entrenamiento de
 * la especificacion: cierres con surgencia perforando o sacando, migracion de
 * gas y fallas de equipo.
 */
export const SCENARIOS = [
  { id: 'perforacion_normal', label: 'Perforación normal', hint: 'Condición estable de referencia.' },
  { id: 'kick_perforando', label: 'Surgencia perforando', hint: 'Influjo mientras se perfora, con ganancia de pit.' },
  { id: 'kick_sacando', label: 'Surgencia sacando la sarta', hint: 'Influjo durante la maniobra de sacar tubería.' },
  { id: 'migracion_gas', label: 'Migración de gas', hint: 'Burbuja que migra con el pozo cerrado.' },
  { id: 'perdida_circulacion', label: 'Pérdida de circulación', hint: 'Caída de nivel en las piletas.' },
  { id: 'falla_bomba', label: 'Falla de bomba', hint: 'Pérdida de presión de circulación.' },
]

/** Estado inicial de todos los controles (el gateway lo sobreescribe al conectar). */
export const INITIAL_CONTROL_STATE = {
  // Consola del perforador
  pump1_clutch: false,
  pump1_spm: 0,
  pump2_clutch: false,
  pump2_spm: 0,
  rotary_table: 'OFF',
  rt_speed: 0,
  drum_clutch: 'OFF',
  drawworks_throttle: 0,
  driller_brake: 100,
  auxiliary_brake: false,
  // Consola del top drive
  td_operation: 'DRILL',
  td_direction: 'STOP',
  td_throttle: 0,
  td_drilling_torque: 50,
  ibop: false,
  locking_pin: true,
  link_rotation: 'CENTRO',
  link_tilting: 'CENTRO',
  clamp: false,
  // Consola del BOP
  annular: false,
  pipe_rams_upper: false,
  blind_rams: false,
  pipe_rams_lower: false,
  kill_line: false,
  choke_line: true,
  bypass: false,
  annular_regulator: 1500,
  // Consola del estrangulador
  choke_valve: 'MANTENER',
  choke_select: false,
  hydraulic_regulator: 50,
  // Escenario cargado por el instructor
  escenario: 'perforacion_normal',
}

export const ALL_CONTROLS = CONSOLES.flatMap((c) => c.controls)

/** Devuelve true si el control esta habilitado segun el estado actual. */
export function isEnabled(ctrl, values) {
  if (!ctrl.dependsOn) return true
  const valor = values[ctrl.dependsOn]
  if (ctrl.dependsOnValues) return ctrl.dependsOnValues.includes(valor)
  return Boolean(valor)
}
