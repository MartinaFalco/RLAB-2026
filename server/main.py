"""
Gateway del laboratorio remoto ESIM-PDS9B.

Corre en la Raspberry Pi 5 (o en la notebook central) y es el UNICO proceso que
toca el hardware. La interfaz web nunca habla directo con el PoKeys57U.

Responsabilidades:
  1. Aceptar conexiones WebSocket autenticadas por token de sesion.
  2. Entregar el rol de operador a un solo usuario por vez (el resto observa).
  3. Validar cada comando y traducirlo a una salida del PoKeys57U.
  4. Publicar telemetria a 2 Hz a todos los conectados.
  5. Registrar la sesion en disco para auditoria y evaluacion.

Ejecutar:
    uvicorn main:app --host 0.0.0.0 --port 8000

Variables de entorno:
    RLAB_TOKENS      tokens validos separados por coma (vacio = sin auth, solo laboratorio)
    RLAB_BACKEND     mock | pokeys     (default: mock)
    RLAB_LOG_DIR     carpeta donde se guardan los CSV de sesion (default: ./sesiones)
"""

from __future__ import annotations

import asyncio
import contextlib
import csv
import json
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from hardware import build_backend

PERIODO_S = 0.5  # 2 Hz
TOKENS = {t.strip() for t in os.getenv("RLAB_TOKENS", "").split(",") if t.strip()}
LOG_DIR = Path(os.getenv("RLAB_LOG_DIR", "sesiones"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    sala.backend = build_backend(os.getenv("RLAB_BACKEND", "mock"))
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    tarea = asyncio.create_task(bucle_telemetria())
    yield
    tarea.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await tarea


app = FastAPI(title="Gateway ESIM-PDS9B", lifespan=lifespan)

# En produccion conviene restringir allow_origins al dominio del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class Cliente:
    ws: WebSocket
    token: str
    rol: str = "observador"


@dataclass
class Sala:
    """Estado compartido: quien opera, que clientes miran y el ultimo estado."""

    clientes: list[Cliente] = field(default_factory=list)
    operador: Cliente | None = None
    backend = None

    def resumen_sesion(self) -> dict:
        return {"type": "session", "role": "observador", "queue": max(0, len(self.clientes) - 1)}


sala = Sala()


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "backend": type(sala.backend).__name__,
        "clientes": len(sala.clientes),
        "operador": bool(sala.operador),
    }


async def bucle_telemetria() -> None:
    """Lee el simulador y publica la telemetria a todos los clientes."""
    archivo = LOG_DIR / f"sesion_{datetime.now():%Y%m%d_%H%M%S}.csv"
    escritor = None
    handle = None

    try:
        while True:
            inicio = time.perf_counter()
            valores = sala.backend.read_telemetry(PERIODO_S)
            mensaje = json.dumps({"type": "telemetry", "t": int(time.time() * 1000), "values": valores})

            if handle is None:
                handle = archivo.open("w", newline="", encoding="utf-8")
                escritor = csv.DictWriter(handle, fieldnames=["timestamp", *valores.keys()])
                escritor.writeheader()
            escritor.writerow({"timestamp": datetime.now().isoformat(), **valores})
            handle.flush()

            await difundir(mensaje)
            await asyncio.sleep(max(0.0, PERIODO_S - (time.perf_counter() - inicio)))
    finally:
        if handle:
            handle.close()


async def difundir(mensaje: str) -> None:
    muertos: list[Cliente] = []
    for c in sala.clientes:
        try:
            await c.ws.send_text(mensaje)
        except Exception:
            muertos.append(c)
    for c in muertos:
        await desconectar(c)


async def desconectar(cliente: Cliente) -> None:
    if cliente in sala.clientes:
        sala.clientes.remove(cliente)
    if sala.operador is cliente:
        sala.operador = None
        # Politica de seguridad: si el operador se cae, el simulador va a reposo.
        sala.backend.apply_action("parada_emergencia")
        await difundir(json.dumps({"type": "alarm", "level": "critical", "message": "El operador perdió la conexión: parada de emergencia automática."}))


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    token = ws.query_params.get("token", "")
    if TOKENS and token not in TOKENS:
        await ws.close(code=4401)  # no autorizado
        return

    await ws.accept()
    cliente = Cliente(ws=ws, token=token)
    sala.clientes.append(cliente)

    await ws.send_text(json.dumps({"type": "state", "controls": sala.backend.state()}))
    await ws.send_text(json.dumps({"type": "session", "role": cliente.rol, "queue": max(0, len(sala.clientes) - 1)}))

    try:
        while True:
            crudo = await ws.receive_text()
            try:
                msg = json.loads(crudo)
            except json.JSONDecodeError:
                continue
            await manejar_mensaje(cliente, msg)
    except WebSocketDisconnect:
        pass
    finally:
        await desconectar(cliente)


async def manejar_mensaje(cliente: Cliente, msg: dict) -> None:
    tipo = msg.get("type")

    if tipo == "request_control":
        if sala.operador is None:
            sala.operador = cliente
            cliente.rol = "operador"
            await cliente.ws.send_text(json.dumps({"type": "session", "role": "operador", "queue": 0}))
            await difundir(json.dumps({"type": "alarm", "level": "warning", "message": "Un usuario tomó el control del simulador."}))
        else:
            await cliente.ws.send_text(
                json.dumps({"type": "session", "role": "observador", "queue": max(0, len(sala.clientes) - 1)})
            )
        return

    if tipo == "release_control":
        if sala.operador is cliente:
            sala.operador = None
            cliente.rol = "observador"
        await cliente.ws.send_text(json.dumps({"type": "session", "role": "observador", "queue": 0}))
        return

    # A partir de aca hacen falta permisos de operador.
    if sala.operador is not cliente:
        await cliente.ws.send_text(
            json.dumps({"type": "alarm", "level": "warning", "message": "Comando ignorado: no tenés el control."})
        )
        # Devolver el estado real para que la interfaz vuelva a sincronizarse.
        await cliente.ws.send_text(json.dumps({"type": "state", "controls": sala.backend.state()}))
        return

    if tipo == "command":
        ok, detalle = sala.backend.apply_command(msg.get("control"), msg.get("value"))
        if not ok:
            await cliente.ws.send_text(json.dumps({"type": "alarm", "level": "warning", "message": detalle}))
        await difundir(json.dumps({"type": "state", "controls": sala.backend.state()}))

    elif tipo == "action":
        sala.backend.apply_action(msg.get("action"))
        await difundir(json.dumps({"type": "state", "controls": sala.backend.state()}))
        await difundir(
            json.dumps(
                {
                    "type": "alarm",
                    "level": "critical" if msg.get("action") == "parada_emergencia" else "warning",
                    "message": f"Acción ejecutada: {msg.get('action')}",
                }
            )
        )
