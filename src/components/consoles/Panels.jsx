import { Defs, Display, Gauge, Grupo, Knob, Led, Lever, Mini, PushButton, Rotulo, SlideLever, Switch } from './ConsoleParts'

/**
 * Réplica interactiva de las cuatro consolas portátiles del ESIM-PDS9B.
 *
 * La disposición sigue a la aplicación "Hardware Test" del fabricante y a las
 * fotos del equipo instalado en el laboratorio. Los instrumentos muestran la
 * telemetría en vivo; las llaves, perillas y palancas comandan el simulador.
 *
 * Props comunes:
 *   values      estado de los controles
 *   t           última muestra de telemetría
 *   onControl   (id, valor) => void
 *   onAction    (id) => void
 *   onInstrument(def) abre el teclado numérico (modo prueba de hardware)
 *   onCalibrate(def)  abre el diálogo de calibración de una perilla
 *   testMode    true cuando se puede forzar el valor de un instrumento
 */

const COLORES = {
  bop: { cuerpo: '#c0392b', borde: '#7f1d1d' },
  choke: { cuerpo: '#e07b1a', borde: '#9a4a06' },
  driller: { cuerpo: '#3b4fb8', borde: '#1e2a6b' },
  topDrive: { cuerpo: '#3b4fb8', borde: '#1e2a6b' },
}

function Cuerpo({ w, h, color }) {
  return (
    <>
      <rect x="0" y="0" width={w} height={h} rx="14" fill={color.borde} />
      <rect x="7" y="7" width={w - 14} height={h - 14} rx="10" fill={color.cuerpo} />
      <rect x="7" y="7" width={w - 14} height={h - 14} rx="10" fill="url(#brilloPanel)" />
    </>
  )
}

function BrilloDefs() {
  return (
    <defs>
      <linearGradient id="brilloPanel" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.02" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
      </linearGradient>
    </defs>
  )
}

/** Convierte un control booleano en una llave de dos posiciones. */
function llaveBool(value, offLabel, onLabel) {
  return { options: [offLabel, onLabel], value: value ? onLabel : offLabel }
}

/* ================================================================== *
 * Consola del BOP
 * ================================================================== */

export function BopConsole({ values, t, onControl, onAction, onInstrument, onCalibrate, testMode }) {
  const inst = (id, label, unit, decimals = 2) => ({
    onClick: testMode ? () => onInstrument({ id, label, unit, decimals }) : undefined,
    interactivo: testMode,
  })

  /** Fila de un preventor: cuerpo negro, llave al medio y LEDs a los costados. */
  const Ram = ({ y, texto, id }) => {
    const cerrado = Boolean(values[id])
    return (
      <g>
        <rect x="118" y={y - 15} width="184" height="30" rx="13" fill="#15171c" />
        <rect x="150" y={y - 21} width="120" height="42" rx="8" fill="#15171c" />
        <text x="162" y={y + 4} fontSize="9" fill="#f8fafc" letterSpacing="0.8">
          {texto}
        </text>
        <text x="258" y={y + 4} textAnchor="end" fontSize="9" fill="#f8fafc" letterSpacing="0.8">
          RAMS
        </text>
        <Led cx={100} cy={y} on={!cerrado} color="#22c55e" label="OPEN" labelPos="left" />
        <Led cx={320} cy={y} on={cerrado} color="#ef4444" label="CLOSE" labelPos="right" />
        <Switch
          cx={210}
          cy={y}
          r={11}
          {...llaveBool(cerrado, 'OPEN', 'CLOSE')}
          labels={['', '']}
          onChange={(v) => onControl(id, v === 'CLOSE')}
        />
      </g>
    )
  }

  /** Brida entre dos cuerpos de la pila de preventores. */
  const Brida = ({ y }) => (
    <g stroke="#f8fafc" strokeWidth="1.4" opacity="0.9">
      <rect x="186" y={y - 7} width="48" height="14" fill="#15171c" stroke="none" />
      <line x1="186" y1={y - 5} x2="234" y2={y - 5} />
      <line x1="186" y1={y} x2="234" y2={y} />
      <line x1="186" y1={y + 5} x2="234" y2={y + 5} />
    </g>
  )

  return (
    <svg viewBox="0 0 420 660" className="consola-svg" role="img" aria-label="Consola del BOP">
      <Defs />
      <BrilloDefs />
      <Cuerpo w={420} h={660} color={COLORES.bop} />

      {/* Displays superiores */}
      <Display cx={85} cy={45} value={t?.accumulator_pressure} label="ACCUMULATOR PRESSURE" {...inst('accumulator_pressure', 'ACCUMULATOR PRESSURE', 'psi')} />
      <Display cx={210} cy={45} value={t?.flowmeter} label="FLOW METER" {...inst('flowmeter', 'FLOW METER', 'L')} />
      <Display cx={335} cy={45} value={t?.manifold_pressure} label="MANIFOLD PRESSURE" {...inst('manifold_pressure', 'MANIFOLD PRESSURE', 'psi')} />

      <Display cx={85} cy={118} value={t?.air_supply_pressure} label="AIR SUPPLY PRESSURE" {...inst('air_supply_pressure', 'AIR SUPPLY PRESSURE', 'psi')} />
      <Display cx={335} cy={118} value={t?.annular_pressure} label="ANNULAR PRESSURE" {...inst('annular_pressure', 'ANNULAR PRESSURE', 'psi')} />

      {/* Regulador de presión, selector RAMS/ANNULAR y reset del caudalímetro */}
      <Switch
        cx={158}
        cy={118}
        r={8}
        vertical
        options={['RAMS', 'ANNULAR']}
        value={values.pressure_regulator_select}
        onChange={(v) => onControl('pressure_regulator_select', v)}
      />
      <Knob
        cx={212}
        cy={115}
        r={19}
        value={values.annular_regulator}
        min={0}
        max={3000}
        label="PRESSURE REGULATOR"
        onChange={(v) => onControl('annular_regulator', Math.round(v / 50) * 50)}
        onCalibrate={() => onCalibrate({ id: 'annular_regulator', label: 'PRESSURE REGULATOR', unit: 'psi' })}
      />
      <Mini x={252} y={104} texto="FLOWMETER" anchor="start" />
      <PushButton cx={255} cy={120} r={8} color="#dc2626" label="RESET" onClick={() => onAction('flowmeter_reset')} />

      {/* Rig air y bypass */}
      <Switch
        cx={75}
        cy={205}
        r={12}
        {...llaveBool(values.rig_air, 'CLOSE', 'OPEN')}
        label="RIG AIR"
        onChange={(v) => onControl('rig_air', v === 'OPEN')}
      />
      <Switch
        cx={345}
        cy={205}
        r={12}
        {...llaveBool(values.bypass, 'OPEN', 'CLOSE')}
        label="BYPASS"
        onChange={(v) => onControl('bypass', v === 'CLOSE')}
      />

      {/* Pila de preventores */}
      <rect x="196" y="195" width="28" height="400" fill="#15171c" />
      <Brida y={243} />
      <Brida y={313} />
      <Brida y={383} />
      <Brida y={453} />
      <Brida y={548} />

      {/* Anular */}
      <g>
        <rect x="178" y="178" width="64" height="48" rx="10" fill="#15171c" />
        <text x="210" y="192" textAnchor="middle" fontSize="9" fill="#f8fafc" letterSpacing="0.8">
          ANNULAR
        </text>
        <Led cx={168} cy={212} on={!values.annular} color="#22c55e" label="OPEN" labelPos="left" />
        <Led cx={252} cy={212} on={values.annular} color="#ef4444" label="CLOSE" labelPos="right" />
        <Switch
          cx={210}
          cy={210}
          r={11}
          {...llaveBool(values.annular, 'OPEN', 'CLOSE')}
          labels={['', '']}
          onChange={(v) => onControl('annular', v === 'CLOSE')}
        />
      </g>

      <Ram y={278} texto="PIPE" id="pipe_rams_upper" />
      <Ram y={348} texto="BLIND" id="blind_rams" />
      <Ram y={418} texto="PIPE" id="pipe_rams_lower" />

      {/* Líneas de matar y de estrangular */}
      <g>
        <rect x="60" y="478" width="300" height="22" fill="#15171c" />
        <rect x="58" y="462" width="74" height="54" rx="10" fill="#15171c" />
        <rect x="288" y="462" width="74" height="54" rx="10" fill="#15171c" />
        <text x="95" y="476" textAnchor="middle" fontSize="9" fill="#f8fafc">
          KILL LINE
        </text>
        <text x="325" y="476" textAnchor="middle" fontSize="9" fill="#f8fafc">
          CHOKE LINE
        </text>
        <Led cx={38} cy={497} on={values.kill_line} color="#ef4444" label="OPEN" labelPos="left" />
        <Led cx={152} cy={497} on={!values.kill_line} color="#22c55e" label="CLOSE" labelPos="right" />
        <Led cx={268} cy={497} on={!values.choke_line} color="#22c55e" label="CLOSE" labelPos="left" />
        <Led cx={382} cy={497} on={values.choke_line} color="#ef4444" label="OPEN" labelPos="right" />
        <Switch
          cx={95}
          cy={497}
          r={11}
          {...llaveBool(values.kill_line, 'CLOSE', 'OPEN')}
          labels={['', '']}
          onChange={(v) => onControl('kill_line', v === 'OPEN')}
        />
        <Switch
          cx={325}
          cy={497}
          r={11}
          {...llaveBool(values.choke_line, 'CLOSE', 'OPEN')}
          labels={['', '']}
          onChange={(v) => onControl('choke_line', v === 'OPEN')}
        />
      </g>

      <Ram y={588} texto="PIPE" id="pipe_rams_bottom" />

      <text x="36" y="634" fontSize="8" fill="#0f172a" letterSpacing="1">
        ETECH SIMULATION
      </text>
    </svg>
  )
}

/* ================================================================== *
 * Consola del estrangulador
 * ================================================================== */

export function ChokeConsole({ values, t, onControl, onAction, onInstrument, onCalibrate, testMode }) {
  const inst = (id, label, unit, decimals = 2) => ({
    onClick: testMode ? () => onInstrument({ id, label, unit, decimals }) : undefined,
    interactivo: testMode,
  })
  const spmTotal = (t?.spm1 || 0) + (t?.spm2 || 0)

  return (
    <svg viewBox="0 0 420 600" className="consola-svg" role="img" aria-label="Consola del estrangulador">
      <Defs />
      <BrilloDefs />
      <Cuerpo w={420} h={600} color={COLORES.choke} />

      <Display cx={210} cy={45} value={t?.kill_line_pressure} label="KILL LINE PRESSURE" {...inst('kill_line_pressure', 'KILL LINE', 'psi')} />

      <Gauge
        cx={125}
        cy={160}
        r={68}
        value={t?.presion_tuberia}
        max={5000}
        label="DRILLPIPE PRESSURE"
        unit="bar"
        unit2="psi"
        {...inst('presion_tuberia', 'DRILLPIPE PRESSURE', 'psi')}
      />
      <Gauge
        cx={295}
        cy={160}
        r={68}
        value={t?.presion_casing}
        max={5000}
        label="CASING PRESSURE"
        unit="bar"
        unit2="psi"
        {...inst('presion_casing', 'CASING PRESSURE', 'psi')}
      />

      <Display cx={120} cy={285} w={96} h={26} value={spmTotal} decimals={0} label="SPM" {...inst('spm_total', 'SPM', 'spm', 0)} />
      <PushButton cx={210} cy={285} r={9} color="#2563eb" label="TOTAL STROKES RESET" onClick={() => onAction('reset_strokes')} />
      <Display cx={300} cy={285} w={96} h={26} value={t?.total_strokes} decimals={0} label="TOTAL STROKES" {...inst('total_strokes', 'TOTAL STROKES', 'stk', 0)} />

      {/* Palanca del estrangulador */}
      <Lever
        cx={175}
        cy={450}
        alto={66}
        options={['ABRIR', 'MANTENER', 'CERRAR']}
        value={values.choke_valve}
        labelCentro="HOLD"
        labelIzq="OPEN"
        labelDer="CLOSE"
        label="CHOKE VALVE"
        onChange={(v) => onControl('choke_valve', v)}
      />

      {/* Indicador de posición, graduado en octavos como el real */}
      <PositionIndicator cx={330} cy={400} r={46} value={t?.choke_position ?? 100} />

      <Switch
        cx={85}
        cy={520}
        r={11}
        {...llaveBool(values.choke_select, 'CHOKE1', 'CHOKE2')}
        label="CHOKE SELECT"
        onChange={(v) => onControl('choke_select', v === 'CHOKE2')}
      />
      <Knob
        cx={330}
        cy={515}
        r={17}
        value={values.hydraulic_regulator}
        label="HYDRAULIC REGULATOR"
        onChange={(v) => onControl('hydraulic_regulator', Math.round(v))}
        onCalibrate={() => onCalibrate({ id: 'hydraulic_regulator', label: 'HYDRAULIC REGULATOR', unit: '%' })}
      />

      <text x="200" y="578" fontSize="8" fill="#0f172a" letterSpacing="1">
        ETECH SIMULATION
      </text>
    </svg>
  )
}

/** Indicador de posición del choke: 0 (OPEN) a 100 % (CLOSE), en octavos. */
function PositionIndicator({ cx, cy, r, value }) {
  const frac = Math.max(0, Math.min(1, value / 100))
  // La aguja va de la izquierda (OPEN) a la derecha (CLOSE) por arriba.
  const ang = 180 + (1 - frac) * 180
  const ax = cx + r * 0.74 * Math.cos(ang * (Math.PI / 180))
  const ay = cy + r * 0.74 * Math.sin(ang * (Math.PI / 180))
  const octavos = ['1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8']

  return (
    <g className="pieza">
      <circle cx={cx} cy={cy} r={r + 5} fill="#0f1115" />
      <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" stroke="#0f1115" strokeWidth="3" />
      {octavos.map((o, i) => {
        const g = 180 + ((i + 1) / 8) * 180
        const tx = cx + r * 0.72 * Math.cos(g * (Math.PI / 180))
        const ty = cy + r * 0.72 * Math.sin(g * (Math.PI / 180))
        return (
          <text key={o} x={tx} y={ty + 3} textAnchor="middle" fontSize="6.5" fill="#334155">
            {o}
          </text>
        )
      })}
      <text x={cx - r * 0.82} y={cy + 4} textAnchor="middle" fontSize="7" fill="#334155">
        Open
      </text>
      <text x={cx + r * 0.82} y={cy + 4} textAnchor="middle" fontSize="7" fill="#334155">
        Close
      </text>
      <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.12} fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
      <Rotulo cx={cx} cy={cy + r + 20} texto="CHOKE POSITION" />
    </g>
  )
}

/* ================================================================== *
 * Consola del perforador
 * ================================================================== */

export function DrillerConsole({ values, t, onControl, onInstrument, onCalibrate, testMode }) {
  const inst = (id, label, unit, decimals = 2) => ({
    onClick: testMode ? () => onInstrument({ id, label, unit, decimals }) : undefined,
    interactivo: testMode,
  })

  return (
    <svg viewBox="0 0 420 600" className="consola-svg" role="img" aria-label="Consola del perforador">
      <Defs />
      <BrilloDefs />
      <Cuerpo w={420} h={600} color={COLORES.driller} />

      <Gauge cx={90} cy={78} r={46} value={t?.presion_bomba} max={5000} label="PUMP PRESSURE" unit="bar" unit2="psi" {...inst('presion_bomba', 'PUMP PRESSURE', 'psi')} />
      <Gauge cx={205} cy={78} r={46} value={(t?.rt_torque || 0) / 1000} max={50} label="TD/RT TORQUE" unit="klb.ft" unit2="kN.m" {...inst('rt_torque', 'TD/RT TORQUE', 'ft·lb')} />
      <Gauge cx={320} cy={78} r={46} value={t?.rpm} max={300} label="TD/RT RPM" unit2="RPM" {...inst('rpm', 'TD/RT RPM', 'rpm')} />

      <Gauge cx={95} cy={210} r={52} value={t?.spm1} max={200} label="PUMP1 SPEED" unit2="SPM" {...inst('spm1', 'PUMP1 SPEED', 'spm')} />
      <Gauge cx={215} cy={210} r={52} value={t?.spm2} max={200} label="PUMP2 SPEED" unit2="SPM" {...inst('spm2', 'PUMP2 SPEED', 'spm')} />

      <Switch
        cx={330}
        cy={178}
        r={13}
        options={['FWD', 'OFF', 'REV']}
        value={values.rotary_table}
        label="TD/RT DIRECTION"
        onChange={(v) => onControl('rotary_table', v)}
      />
      <Knob
        cx={330}
        cy={262}
        r={19}
        value={values.rt_speed}
        min={0}
        max={200}
        label="TD/RT RPM"
        onChange={(v) => onControl('rt_speed', Math.round(v / 5) * 5)}
        onCalibrate={() => onCalibrate({ id: 'rt_speed', label: 'TD/RT RPM', unit: 'rpm' })}
      />

      <Switch
        cx={72}
        cy={350}
        r={12}
        {...llaveBool(values.pump1_clutch, 'OFF', 'ON')}
        label="PUMP1 CLUTCH"
        onChange={(v) => onControl('pump1_clutch', v === 'ON')}
      />
      <Switch
        cx={162}
        cy={350}
        r={12}
        {...llaveBool(values.pump2_clutch, 'OFF', 'ON')}
        label="PUMP2 CLUTCH"
        onChange={(v) => onControl('pump2_clutch', v === 'ON')}
      />
      <Switch
        cx={252}
        cy={350}
        r={12}
        vertical
        options={['HIGH', 'OFF', 'LOW']}
        value={values.drum_clutch}
        label="DRUM CLUTCH"
        onChange={(v) => onControl('drum_clutch', v)}
      />
      <PushButton
        cx={340}
        cy={350}
        r={12}
        color={values.auxiliary_brake ? '#38bdf8' : '#1d4ed8'}
        label="AUXILIARY BRAKE"
        onClick={() => onControl('auxiliary_brake', !values.auxiliary_brake)}
      />

      <Knob
        cx={72}
        cy={490}
        value={values.pump1_spm}
        max={120}
        label="PUMP1 SPM"
        onChange={(v) => onControl('pump1_spm', Math.round(v / 5) * 5)}
        onCalibrate={() => onCalibrate({ id: 'pump1_spm', label: 'PUMP1 SPM', unit: 'spm' })}
      />
      <Knob
        cx={162}
        cy={490}
        value={values.pump2_spm}
        max={120}
        label="PUMP2 SPM"
        onChange={(v) => onControl('pump2_spm', Math.round(v / 5) * 5)}
        onCalibrate={() => onCalibrate({ id: 'pump2_spm', label: 'PUMP2 SPM', unit: 'spm' })}
      />
      <Knob
        cx={252}
        cy={490}
        value={values.drawworks_throttle}
        label="DRAWWORKS THROTTLE"
        onChange={(v) => onControl('drawworks_throttle', Math.round(v))}
        onCalibrate={() => onCalibrate({ id: 'drawworks_throttle', label: 'DRAWWORKS THROTTLE', unit: '%' })}
      />
      <SlideLever
        cx={345}
        cy={480}
        alto={78}
        value={values.driller_brake}
        label="DRILLER BRAKE"
        onChange={(v) => onControl('driller_brake', Math.round(v / 5) * 5)}
      />

      <text x="36" y="568" fontSize="8" fill="#0f172a" letterSpacing="1">
        ETECH SIMULATION
      </text>
    </svg>
  )
}

/* ================================================================== *
 * Consola del top drive
 * ================================================================== */

export function TopDriveConsole({ values, t, onControl, onInstrument, onCalibrate, testMode }) {
  const inst = (id, label, unit, decimals = 2) => ({
    onClick: testMode ? () => onInstrument({ id, label, unit, decimals }) : undefined,
    interactivo: testMode,
  })

  return (
    <svg viewBox="0 0 420 600" className="consola-svg" role="img" aria-label="Consola del top drive">
      <Defs />
      <BrilloDefs />
      <Cuerpo w={420} h={600} color={COLORES.topDrive} />

      <Gauge cx={120} cy={95} r={58} value={(t?.td_torque || 0) / 1000} max={75} label="TORQUE" unit="klb.ft" unit2="kN.m" {...inst('td_torque', 'TORQUE', 'ft·lb')} />
      <Gauge cx={300} cy={95} r={58} value={t?.td_speed} max={300} label="SPEED" unit2="RPM" {...inst('td_speed', 'SPEED', 'rpm')} />

      {/* IBOP */}
      <Grupo x={35} y={185} w={160} h={120} />
      <Led cx={115} cy={212} r={8} on={values.ibop} color="#ef4444" />
      <Rotulo cx={115} cy={232} texto="IBOP" />
      <Switch
        cx={115}
        cy={272}
        r={12}
        {...llaveBool(values.ibop, 'OPEN', 'CLOSE')}
        onChange={(v) => onControl('ibop', v === 'CLOSE')}
      />

      {/* Traba de la torreta */}
      <Grupo x={225} y={185} w={160} h={120} />
      <Led cx={305} cy={212} r={8} on={values.locking_pin} color="#ef4444" />
      <Rotulo cx={305} cy={232} texto="LOCKING" />
      <Rotulo cx={305} cy={250} texto="LOCKING PIN" />
      <Switch
        cx={305}
        cy={272}
        r={12}
        {...llaveBool(values.locking_pin, 'UNLOCK', 'LOCK')}
        onChange={(v) => onControl('locking_pin', v === 'LOCK')}
      />

      {/* Links y clamp */}
      <Grupo x={30} y={335} w={225} h={140} />
      <Switch
        cx={80}
        cy={370}
        r={12}
        options={['CCW', 'CENTRO', 'CW']}
        labels={['CCW', '', 'CW']}
        value={values.link_rotation}
        label="LINK ROTATION"
        onChange={(v) => onControl('link_rotation', v)}
      />
      <Led cx={195} cy={370} r={9} on={values.link_rotation === 'CENTRO'} color="#ef4444" />
      <Rotulo cx={195} cy={392} texto="LINK CENTER" />
      <Rotulo cx={80} cy={420} texto="CLAMP" />
      <Switch
        cx={80}
        cy={445}
        r={12}
        {...llaveBool(values.clamp, 'OPEN', 'CLOSE')}
        onChange={(v) => onControl('clamp', v === 'CLOSE')}
      />
      <Rotulo cx={195} cy={420} texto="LINK TILTING" />
      <Switch
        cx={195}
        cy={445}
        r={12}
        options={['REAR', 'CENTRO', 'FRONT']}
        labels={['REAR', '', 'FRONT']}
        value={values.link_tilting}
        onChange={(v) => onControl('link_tilting', v)}
      />

      {/* Operación y dirección */}
      <Switch
        cx={330}
        cy={370}
        r={13}
        options={['DRILL', 'SPIN', 'TORQUE']}
        value={values.td_operation}
        label="OPERATION"
        onChange={(v) => onControl('td_operation', v)}
      />
      <Switch
        cx={330}
        cy={448}
        r={13}
        options={['CCW', 'STOP', 'CW']}
        value={values.td_direction}
        label="DIRECTION"
        onChange={(v) => onControl('td_direction', v)}
      />

      <Knob
        cx={105}
        cy={525}
        r={19}
        value={values.td_drilling_torque}
        label="DRILLING TORQUE"
        onChange={(v) => onControl('td_drilling_torque', Math.round(v))}
        onCalibrate={() => onCalibrate({ id: 'td_drilling_torque', label: 'DRILLING TORQUE', unit: '%' })}
      />
      <Knob
        cx={320}
        cy={525}
        r={19}
        value={values.td_throttle}
        label="THROTTLE"
        onChange={(v) => onControl('td_throttle', Math.round(v))}
        onCalibrate={() => onCalibrate({ id: 'td_throttle', label: 'THROTTLE', unit: '%' })}
      />

      <text x="150" y="570" fontSize="8" fill="#0f172a" letterSpacing="1">
        ETECH SIMULATION
      </text>
    </svg>
  )
}

/** Catálogo de consolas para el menú lateral. */
export const CONSOLAS_INTERACTIVAS = [
  { id: 'bop', nombre: 'BOP', componente: BopConsole, color: COLORES.bop.cuerpo },
  { id: 'choke', nombre: 'Consola del estrangulador', componente: ChokeConsole, color: COLORES.choke.cuerpo },
  { id: 'driller', nombre: 'Consola del perforador', componente: DrillerConsole, color: COLORES.driller.cuerpo },
  { id: 'topDrive', nombre: 'Consola del top drive', componente: TopDriveConsole, color: COLORES.topDrive.cuerpo },
]
