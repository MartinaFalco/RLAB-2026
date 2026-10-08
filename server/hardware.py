"""
Capa de abstraccion del hardware del ESIM-PDS9B.

`MockBackend`   -> simula el pozo en software. Sirve para levantar todo el
                   sistema (web + gateway) sin tocar el simulador real.
`PoKeysBackend` -> esqueleto de la implementacion real: traduce cada comando a
                   una salida del PoKeys57U (rele, paso de motor Nema 17 o
                   pulso del solenoide JF0530B) y lee la telemetria desde la
                   notebook central del simulador.

Los controles corresponden a las cuatro consolas portatiles descriptas en la
especificacion del fabricante: perforador, top drive, BOP y estrangulador.

Al agregar un control nuevo hay que tocar tres lugares:
  - src/data/controls.js         (la tarjeta en la web)
  - LIMITES                      (el rango valido, aca abajo)
  - PoKeysBackend._escribir_hardware (el mapeo fisico)
"""

from __future__ import annotations

import random

# Rango admitido por cada comando. Todo lo que no este aca se rechaza:
# es la ultima barrera antes de mover un actuador.
# Formato: (bool,) | (str, [opciones]) | (minimo, maximo)
LIMITES: dict[str, tuple] = {
    # Consola del perforador
    "pump1_clutch": (bool,),
    "pump1_spm": (0, 120),
    "pump2_clutch": (bool,),
    "pump2_spm": (0, 120),
    "rotary_table": (str, ["FWD", "OFF", "REV"]),
    "rt_speed": (0, 200),
    "drum_clutch": (str, ["HIGH", "OFF", "LOW"]),
    "drawworks_throttle": (0, 100),
    "driller_brake": (0, 100),
    "auxiliary_brake": (bool,),
    # Consola del top drive
    "td_operation": (str, ["DRILL", "SPIN", "TORQUE"]),
    "td_direction": (str, ["CCW", "STOP", "CW"]),
    "td_throttle": (0, 100),
    "td_drilling_torque": (0, 100),
    "ibop": (bool,),
    "locking_pin": (bool,),
    "link_rotation": (str, ["CCW", "CENTRO", "CW"]),
    "link_tilting": (str, ["REAR", "CENTRO", "FRONT"]),
    "clamp": (bool,),
    # Consola del BOP
    "rig_air": (bool,),
    "annular": (bool,),
    "pipe_rams_upper": (bool,),
    "blind_rams": (bool,),
    "pipe_rams_lower": (bool,),
    "pipe_rams_bottom": (bool,),
    "kill_line": (bool,),
    "choke_line": (bool,),
    "bypass": (bool,),
    "pressure_regulator_select": (str, ["RAMS", "ANNULAR"]),
    "annular_regulator": (0, 3000),
    # Consola del estrangulador
    "choke_valve": (str, ["ABRIR", "MANTENER", "CERRAR"]),
    "choke_select": (bool,),
    "hydraulic_regulator": (0, 100),
    # Escenario cargado por el instructor
    "escenario": (str, None),
}

ESTADO_INICIAL = {
    "pump1_clutch": False,
    "pump1_spm": 0,
    "pump2_clutch": False,
    "pump2_spm": 0,
    "rotary_table": "OFF",
    "rt_speed": 0,
    "drum_clutch": "OFF",
    "drawworks_throttle": 0,
    "driller_brake": 100,
    "auxiliary_brake": False,
    "td_operation": "DRILL",
    "td_direction": "STOP",
    "td_throttle": 0,
    "td_drilling_torque": 50,
    "ibop": False,
    "locking_pin": True,
    "link_rotation": "CENTRO",
    "link_tilting": "CENTRO",
    "clamp": False,
    "rig_air": True,
    "annular": False,
    "pipe_rams_upper": False,
    "blind_rams": False,
    "pipe_rams_lower": False,
    "pipe_rams_bottom": False,
    "kill_line": False,
    "choke_line": True,
    "bypass": False,
    "pressure_regulator_select": "ANNULAR",
    "annular_regulator": 1500,
    "choke_valve": "MANTENER",
    "choke_select": False,
    "hydraulic_regulator": 50,
    "escenario": "perforacion_normal",
}

PESO_SARTA = 280.0
PILETAS_INICIAL = 820.0


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


class BaseBackend:
    def __init__(self) -> None:
        self._state = dict(ESTADO_INICIAL)
        # Lecturas forzadas desde el modo prueba y recorrido util de cada perilla.
        self._overrides: dict[str, float] = {}
        self._calibraciones: dict[str, dict] = {}

    def state(self) -> dict:
        return dict(self._state)

    def validar(self, control: str, valor) -> tuple[bool, str]:
        if control not in LIMITES:
            return False, f"Control desconocido: {control}"
        regla = LIMITES[control]
        if regla[0] is bool:
            if not isinstance(valor, bool):
                return False, f"{control} espera true/false"
            return True, ""
        if regla[0] is str:
            if not isinstance(valor, str):
                return False, f"{control} espera texto"
            opciones = regla[1]
            if opciones and valor not in opciones:
                return False, f"{control} admite {', '.join(opciones)}"
            return True, ""
        lo, hi = regla
        if not isinstance(valor, (int, float)) or isinstance(valor, bool):
            return False, f"{control} espera un número"
        if not lo <= valor <= hi:
            return False, f"{control} fuera de rango ({lo}–{hi})"
        return True, ""

    def apply_command(self, control: str, valor) -> tuple[bool, str]:
        ok, detalle = self.validar(control, valor)
        if not ok:
            return False, detalle
        self._state[control] = valor
        self._escribir_hardware(control, valor)
        return True, ""

    def apply_action(self, accion: str) -> None:
        if accion == "cierre_duro":
            cambios = {
                "pump1_clutch": False,
                "pump2_clutch": False,
                "choke_valve": "MANTENER",
                "annular": True,
            }
            self._cerrar_choke()
        elif accion == "cierre_suave":
            cambios = {
                "pump1_clutch": False,
                "pump2_clutch": False,
                "choke_line": True,
                "choke_valve": "MANTENER",
                "annular": True,
            }
            self._abrir_choke()
        elif accion == "reset_strokes":
            self._reset_strokes()
            return
        elif accion == "flowmeter_reset":
            self._reset_flowmeter()
            return
        elif accion == "parada_emergencia":
            cambios = {
                "pump1_clutch": False,
                "pump1_spm": 0,
                "pump2_clutch": False,
                "pump2_spm": 0,
                "rotary_table": "OFF",
                "rt_speed": 0,
                "td_direction": "STOP",
                "td_throttle": 0,
                "drum_clutch": "OFF",
                "drawworks_throttle": 0,
                "driller_brake": 100,
                "auxiliary_brake": True,
                "annular": True,
                "choke_valve": "MANTENER",
            }
            self._cerrar_choke()
        else:
            return
        for k, v in cambios.items():
            self._state[k] = v
            self._escribir_hardware(k, v)

    # --- a implementar / sobreescribir por cada backend --------------------
    def _escribir_hardware(self, control: str, valor) -> None:  # pragma: no cover
        pass

    def _cerrar_choke(self) -> None:
        pass

    def _abrir_choke(self) -> None:
        pass

    def _reset_strokes(self) -> None:
        pass

    def _reset_flowmeter(self) -> None:
        pass

    # --- modo prueba de hardware -------------------------------------------
    def set_display(self, canal: str, valor) -> tuple[bool, str]:
        """
        Fuerza la lectura de un instrumento. Con el hardware conectado esto
        escribe el valor en el display o en el indicador fisico de la consola;
        sirve para verificar el cableado sin correr un ejercicio.
        """
        if not isinstance(valor, (int, float)) or isinstance(valor, bool):
            return False, f"{canal} espera un número"
        self._overrides[canal] = round(float(valor), 2)
        return True, ""

    def clear_displays(self) -> None:
        self._overrides.clear()

    def set_calibration(self, control: str, datos: dict) -> tuple[bool, str]:
        """Guarda el recorrido util de una perilla motorizada (Nema 17)."""
        if control not in LIMITES:
            return False, f"Control desconocido: {control}"
        try:
            minimo, maximo = float(datos.get("min", 0)), float(datos.get("max", 0))
        except (TypeError, ValueError):
            return False, "Valores de calibración inválidos"
        if maximo - minimo <= 0.1:
            return False, "La diferencia entre máximo y mínimo debe ser mayor que 0,1"
        self._calibraciones[control] = {
            "min": minimo,
            "max": maximo,
            "current": float(datos.get("current", 0) or 0),
            "margin": float(datos.get("margin", 1) or 1),
        }
        return True, ""

    def calibrations(self) -> dict:
        return dict(self._calibraciones)

    def read_telemetry(self, dt: float) -> dict:  # pragma: no cover
        raise NotImplementedError


class MockBackend(BaseBackend):
    """Modelo cualitativo del pozo, equivalente al que corre en el browser."""

    def __init__(self) -> None:
        super().__init__()
        self.t = {
            "wob": 0.0,
            "hook_load": PESO_SARTA,
            "rpm": 0.0,
            "rt_torque": 0.0,
            "td_speed": 0.0,
            "td_torque": 0.0,
            "rop": 0.0,
            "bit_depth": 8420.0,
            "hole_depth": 8420.0,
            "presion_bomba": 0.0,
            "presion_tuberia": 0.0,
            "spm1": 0.0,
            "spm2": 0.0,
            "total_strokes": 0.0,
            "return_flow": 0.0,
            "mud_volume": PILETAS_INICIAL,
            "densidad_lodo": 11.2,
            "pit_gain": 0.0,
            "presion_casing": 0.0,
            "kill_line_pressure": 0.0,
            "choke_position": 100.0,
            "bhp": 0.0,
            "casing_shoe_pressure": 0.0,
            "accumulator_pressure": 3000.0,
            "manifold_pressure": 1500.0,
            "annular_pressure": 0.0,
            "air_supply_pressure": 120.0,
            "flowmeter": 0.0,
        }
        self.presion_influjo = 0.0
        self.bop_previo = 0

    def _cerrar_choke(self) -> None:
        self.t["choke_position"] = 0.0

    def _abrir_choke(self) -> None:
        self.t["choke_position"] = 100.0

    def _reset_strokes(self) -> None:
        self.t["total_strokes"] = 0.0

    def _reset_flowmeter(self) -> None:
        self.t["flowmeter"] = 0.0

    def read_telemetry(self, dt: float) -> dict:
        c, t = self._state, self.t
        ruido = lambda a: random.uniform(-a, a)  # noqa: E731
        lerp = lambda a, b, k: a + (b - a) * k  # noqa: E731

        preventores = [
            c["annular"],
            c["pipe_rams_upper"],
            c["blind_rams"],
            c["pipe_rams_lower"],
            c["pipe_rams_bottom"],
        ]
        pozo_cerrado = any(preventores)

        # --- Bombas y circulación -----------------------------------------
        spm1_obj = c["pump1_spm"] if c["pump1_clutch"] else 0
        spm2_obj = c["pump2_spm"] if c["pump2_clutch"] else 0
        t["spm1"] = clamp(lerp(t["spm1"], spm1_obj, 0.25), 0, 120)
        t["spm2"] = clamp(lerp(t["spm2"], spm2_obj, 0.25), 0, 120)
        spm_total = t["spm1"] + t["spm2"]
        t["total_strokes"] += spm_total / 60 * dt
        caudal_entrada = spm_total * 0.1  # bbl/min

        # --- Rotaria y top drive -------------------------------------------
        rpm_obj = 0 if c["rotary_table"] == "OFF" else c["rt_speed"]
        t["rpm"] = clamp(lerp(t["rpm"], rpm_obj, 0.2), 0, 220)
        td_obj = c["td_throttle"] * 2.2 if c["td_direction"] != "STOP" else 0
        t["td_speed"] = clamp(lerp(t["td_speed"], td_obj, 0.2), 0, 250)

        # --- Malacate y WOB --------------------------------------------------
        freno_libre = c["driller_brake"] < 50 and not c["auxiliary_brake"] and c["drum_clutch"] != "OFF"
        wob_obj = c["drawworks_throttle"] * 0.45 if freno_libre else 0
        t["wob"] = clamp(lerp(t["wob"], wob_obj, 0.15), 0, 80)
        t["hook_load"] = clamp(PESO_SARTA - t["wob"], 0, 500)
        t["rt_torque"] = clamp(t["wob"] * t["rpm"] * 1.8 + ruido(150), 0, 20000)
        t["td_torque"] = clamp(
            min(t["wob"] * t["td_speed"] * 3.4, c["td_drilling_torque"] * 400) + ruido(300), 0, 40000
        )

        girando = t["rpm"] > 20 or t["td_speed"] > 20
        perforando = t["wob"] > 2 and girando and caudal_entrada > 2 and not pozo_cerrado
        t["rop"] = clamp(t["wob"] * 2.4 + t["rpm"] * 0.3 if perforando else 0, 0, 200)
        t["bit_depth"] += t["rop"] / 3600 * dt
        t["hole_depth"] = max(t["hole_depth"], t["bit_depth"])

        presion_bomba_obj = (caudal_entrada / 12) ** 1.86 * 3000
        if c["escenario"] == "falla_bomba":
            presion_bomba_obj *= 0.25
        t["presion_bomba"] = clamp(lerp(t["presion_bomba"], presion_bomba_obj, 0.25) + ruido(15), 0, 5000)

        # --- Influjo y migración de gas --------------------------------------
        esc = c["escenario"]
        aporta_influjo = (esc == "kick_perforando" and perforando) or (
            esc == "kick_sacando" and not pozo_cerrado
        )
        if aporta_influjo:
            t["pit_gain"] += 1.6 * dt
            self.presion_influjo = clamp(self.presion_influjo + 9 * dt, 0, 1800)
        elif esc == "migracion_gas":
            self.presion_influjo = clamp(self.presion_influjo + (14 if pozo_cerrado else 5) * dt, 0, 2400)
            if not pozo_cerrado:
                t["pit_gain"] += 0.8 * dt
        elif esc == "perdida_circulacion":
            t["pit_gain"] -= 1.2 * dt
            self.presion_influjo = clamp(self.presion_influjo - 20 * dt, 0, 2400)
        elif not pozo_cerrado:
            self.presion_influjo = clamp(self.presion_influjo - 18 * dt, 0, 2400)
            t["pit_gain"] = lerp(t["pit_gain"], 0, 0.02)

        # --- Estrangulador ----------------------------------------------------
        if c["choke_valve"] == "ABRIR":
            t["choke_position"] += 10 * dt
        elif c["choke_valve"] == "CERRAR":
            t["choke_position"] -= 10 * dt
        t["choke_position"] = clamp(t["choke_position"], 0, 100)

        factor_choke = 1 - (t["choke_position"] / 100) ** 1.5 if c["choke_line"] else 1.0

        casing_obj = self.presion_influjo * (
            (0.35 + 0.65 * factor_choke) if pozo_cerrado else factor_choke * 0.6
        )
        t["presion_casing"] = clamp(lerp(t["presion_casing"], casing_obj, 0.18) + ruido(6), 0, 5000)

        tuberia_obj = (
            self.presion_influjo * 0.8
            if pozo_cerrado
            else t["presion_bomba"] + t["presion_casing"] * 0.25
        )
        t["presion_tuberia"] = clamp(lerp(t["presion_tuberia"], tuberia_obj, 0.2) + ruido(8), 0, 5000)
        kill_obj = t["presion_casing"] * 0.95 if c["kill_line"] else 0
        t["kill_line_pressure"] = clamp(lerp(t["kill_line_pressure"], kill_obj, 0.2), 0, 5000)

        hidrostatica = t["densidad_lodo"] * 0.052 * t["bit_depth"]
        t["bhp"] = clamp(hidrostatica + t["presion_casing"] * 0.9, 0, 12000)
        t["casing_shoe_pressure"] = clamp(t["bhp"] * 0.72, 0, 8000)

        # --- Retorno y piletas -------------------------------------------------
        retorno_obj = (
            0
            if pozo_cerrado
            else caudal_entrada * (0.3 + 0.7 * t["choke_position"] / 100) + (1.5 if aporta_influjo else 0)
        )
        t["return_flow"] = clamp(lerp(t["return_flow"], retorno_obj, 0.25), 0, 30)
        t["pit_gain"] = clamp(t["pit_gain"], -50, 100)
        t["mud_volume"] = clamp(PILETAS_INICIAL + t["pit_gain"], 0, 1500)
        t["densidad_lodo"] = clamp(11.2 - self.presion_influjo * 0.0004, 8, 18)

        # --- Unidad acumuladora --------------------------------------------------
        bop_activos = sum(1 for p in preventores if p)
        accionadas = max(0, bop_activos - self.bop_previo)
        self.bop_previo = bop_activos
        if accionadas:
            t["accumulator_pressure"] -= 220 * accionadas
            t["flowmeter"] += 12 * accionadas
        t["accumulator_pressure"] = clamp(lerp(t["accumulator_pressure"], 3000, 0.02), 0, 3500)
        t["flowmeter"] = clamp(lerp(t["flowmeter"], 0, 0.05), 0, 120)
        t["manifold_pressure"] = clamp(lerp(t["manifold_pressure"], 1500, 0.1) + ruido(8), 0, 3000)
        t["annular_pressure"] = clamp(
            lerp(t["annular_pressure"], c["annular_regulator"] if c["annular"] else 0, 0.15), 0, 3000
        )
        t["air_supply_pressure"] = clamp(120 + ruido(2), 0, 200)

        salida = {k: round(v, 2) for k, v in t.items()}
        salida.update(self._overrides)  # lecturas forzadas en modo prueba
        return salida


class PoKeysBackend(BaseBackend):
    """
    Implementacion real (esqueleto).

    Dos caminos posibles para hablar con el PoKeys57U:
      a) libreria oficial PoKeysLib (C) via ctypes, o
      b) el PoKeys expuesto como dispositivo Modbus TCP / ethernet.

    Y dos caminos para leer la telemetria del ESIM-PDS9B:
      a) si el software de Esimtech expone datos (archivo, serie u OPC-UA),
         leerlos desde aca;
      b) si no los expone, instrumentar los indicadores de las consolas y leer
         por las entradas analogicas del PoKeys.
    """

    # Llaves y botones accionados por solenoide JF0530B.
    SALIDAS_DIGITALES = {
        "pump1_clutch": 1,
        "pump2_clutch": 2,
        "rotary_table": 3,  # usa DO 3 (FWD) y DO 4 (REV)
        "drum_clutch": 5,  # usa DO 5 (HIGH) y DO 6 (LOW)
        "auxiliary_brake": 7,
        "td_operation": 8,  # DO 8 y DO 9
        "td_direction": 10,  # DO 10 y DO 11
        "ibop": 12,
        "locking_pin": 13,
        "link_rotation": 14,  # DO 14 y DO 15
        "link_tilting": 16,  # DO 16 y DO 17
        "clamp": 18,
        "rig_air": 19,
        "annular": 20,
        "pipe_rams_upper": 21,
        "blind_rams": 22,
        "pipe_rams_lower": 23,
        "pipe_rams_bottom": 31,
        "kill_line": 24,
        "choke_line": 25,
        "bypass": 26,
        "choke_valve": 27,  # DO 27 (abrir) y DO 28 (cerrar)
        "choke_select": 29,
    }
    # Salidas analogicas 0-10 V (posicionadores y palancas proporcionales).
    SALIDAS_ANALOGICAS = {"driller_brake": 1}
    # Perillas giradas por motor paso a paso Nema 17.
    MOTORES_PASO_A_PASO = {
        "pump1_spm": 1,
        "pump2_spm": 2,
        "rt_speed": 3,
        "drawworks_throttle": 4,
        "td_throttle": 5,
        "td_drilling_torque": 6,
        "annular_regulator": 7,
        "hydraulic_regulator": 8,
    }
    # Botones momentaneos: se pulsan y se sueltan.
    PULSADORES = {"reset_strokes": 30, "flowmeter_reset": 33}

    def __init__(self) -> None:
        super().__init__()
        # TODO: abrir la conexion con el PoKeys57U y hacer el homing de los
        # motores Nema 17 contra el tope mecanico de cada perilla.
        self.device = None

    def _escribir_hardware(self, control: str, valor) -> None:
        if self.device is None:
            return  # sin hardware conectado no se hace nada
        if control in self.SALIDAS_DIGITALES:
            pin = self.SALIDAS_DIGITALES[control]
            # TODO: para los `select` de tres posiciones hay que accionar el par
            # de salidas (pin, pin + 1) segun la posicion elegida.
            _ = pin
        elif control in self.SALIDAS_ANALOGICAS:
            canal = self.SALIDAS_ANALOGICAS[control]
            # TODO: self.device.set_analog_output(canal, valor / 100 * 10.0)
            _ = canal
        elif control in self.MOTORES_PASO_A_PASO:
            eje = self.MOTORES_PASO_A_PASO[control]
            # TODO: convertir el valor de ingenieria a pasos y mover el Nema 17.
            _ = eje

    def _cerrar_choke(self) -> None:
        pass  # TODO: sostener DO 28 hasta que el indicador marque 0 %

    def _abrir_choke(self) -> None:
        pass  # TODO: sostener DO 27 hasta que el indicador marque 100 %

    def _reset_strokes(self) -> None:
        pass  # TODO: pulsar DO 30 durante ~300 ms

    def _reset_flowmeter(self) -> None:
        pass  # TODO: pulsar DO 33 durante ~300 ms

    def read_telemetry(self, dt: float) -> dict:
        # TODO: leer del software del ESIM-PDS9B o de las entradas analogicas.
        raise NotImplementedError("Conectar la lectura real del simulador")


def build_backend(nombre: str) -> BaseBackend:
    if nombre.lower() == "pokeys":
        return PoKeysBackend()
    return MockBackend()
