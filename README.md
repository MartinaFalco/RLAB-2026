# Laboratorio remoto · Simulador de control de pozos ESIM-PDS9B

Interfaz web de **monitoreo y control remoto** del simulador portátil de perforación
**ESIM-PDS9B** (certificado IADC/IWCF) de la **Universidad Nacional de Hurlingham**, en el marco del
programa **R-Lab** de remotización de equipamiento impulsado por **CONFEDI** e **YPF**.

La página replica —y adapta al simulador de control de pozos— las funcionalidades del laboratorio
remoto del banco de ventilador centrífugo del IdeI-UNGS: navegación por secciones, modelo 3D
interactivo, panel de control de actuadores con video en vivo, gráficos en tiempo real con descarga
de datos, documentación técnica y presentación del equipo.

Los controles, los instrumentos y las unidades están tomados de la **especificación técnica de
Esimtech** para el ESIM-PDS9B: las cuatro consolas portátiles (perforador, top drive, BOP y
estrangulador), la notebook con el software de simulación, la pantalla táctil del instructor y el
monitor de la vista gráfica 3D.

> **Estado actual:** la interfaz está completa y funciona en **modo demostración**, con un motor de
> simulación propio que corre en el navegador. Todavía no está conectada al hardware real: cuando el
> gateway esté montado sobre el simulador, se cambia una variable de entorno y la misma página pasa a
> operar el equipo físico. Las fotos del laboratorio, el modelo 3D relevado y los datos del equipo
> quedaron como marcadores señalados en el código.

---

## 1. El equipo que se remotiza

| # | Consola | Instrumentos | Mandos principales |
|---|---|---|---|
| 1 | **Perforador** (azul) | Presión de bomba, torque y velocidad de rotaria, SPM de cada bomba | Embragues de bomba, perillas de SPM, mesa rotaria FWD/OFF/REV, embrague del tambor, acelerador del malacate, freno del perforador y freno auxiliar |
| 2 | **Top drive** (azul) | Torque y velocidad | Operación DRILL/SPIN/TORQUE, dirección CCW/STOP/CW, acelerador, límite de torque, IBOP, perno de traba, links y clamp |
| 3 | **BOP** (roja) | Presión de acumulador, manifold, aire y anular, caudalímetro | Preventor anular, dos rams de tubería, ram ciego, líneas de matar y de estrangular, bypass, regulador de presión |
| 4 | **Estrangulador** (amarilla) | Presión de tubería, de casing y de línea de matar, SPM, emboladas totales, posición del choke | Palanca del choke (abrir/mantener/cerrar), selección choke 1/2, regulador hidráulico, reset de emboladas |

Se suman la **notebook** (i7 con placa dedicada) que corre el software de simulación, la **pantalla
táctil** desde la que el instructor carga escenarios y fallas, y el **monitor** de la vista gráfica.

En total la web expone **33 comandos** sobre las cuatro consolas y **28 canales de telemetría**
(definidos en [`src/data/controls.js`](src/data/controls.js) y
[`src/data/telemetry.js`](src/data/telemetry.js)).

---

## 2. Secciones de la página

| Sección | Qué hace |
|---|---|
| **Inicio** | Presentación del sistema, las dos líneas de remotización (asistida y autónoma) e instituciones participantes. |
| **Modelo 3D** | Vista interactiva del puesto (rotación, zoom y desplazamiento) construida con three.js. Hoy es esquemática y se reemplaza por un `.glb` cuando se releve el equipo. |
| **Controles del Simulador** | El corazón del sitio: indicadores en vivo, selección de variables, escenarios del instructor, las cuatro consolas con sus perillas/llaves/palancas, grilla de 5 cámaras, límites de alarma configurables, registro de eventos y gráficos con exportación a CSV. |
| **¿Cómo funciona?** | Sub-pestañas *El Simulador* (fichas de cada consola), *Resumen* (qué calcula el simulador, prácticas previstas y esquema de conexión), *Sensores y actuadores* (tablas de canales y mapeo de E/S) y *Galería*. |
| **El equipo** | Integrantes y roles. |

Funcionalidades transversales (barra superior, siempre visible): estado del enlace, modo de operación
(asistido/autónomo), rol del usuario (**operador** u **observador**), latencia, cronómetro de sesión,
toma y liberación del control, y **parada de emergencia** con confirmación.

Los comandos que mueven preventores o disparan cierres piden confirmación antes de enviarse, y los
controles dependientes quedan bloqueados mientras no corresponda (por ejemplo, la perilla de SPM
solo se habilita con el embrague de esa bomba activado).

---

## 3. Arquitectura

```
┌──────────────┐  HTTPS   ┌─────────────────┐
│  Navegador   │◄────────►│  Hosting del    │  archivos estáticos (build de Vite)
│  (React)     │          │  frontend       │
└──────┬───────┘          └─────────────────┘
       │  WSS (WebSocket, JSON)
       ▼
┌────────────────────────────┐   USB    ┌──────────────────────────────┐
│  Gateway (FastAPI)         │─────────►│  PoKeys57U                   │
│  Raspberry Pi 5 + SSD      │          │  55 E/S digitales + 7 analóg.│
│  · autenticación por token │          │  · motores Nema 17 (perillas)│
│  · un operador por vez     │          │  · solenoide JF0530B (botones)│
│  · validación de rangos    │          └──────────────┬───────────────┘
│  · telemetría a 2 Hz       │                         ▼
│  · log CSV de cada sesión  │             consolas físicas del ESIM-PDS9B
└────────────────────────────┘
       ▲
       │ streams de video
┌──────┴─────────────────────┐
│ 5 cámaras Logitech Brio 100 + capturadora Elgato HD60 X │
└─────────────────────────────────────────────────────────┘
```

**Regla de oro:** el navegador nunca habla directo con el hardware. Todo comando pasa por el gateway,
que valida el rango, verifica que quien lo manda tenga el control y recién ahí mueve un actuador.

### Protocolo (JSON sobre WebSocket)

| Dirección | Mensaje |
|---|---|
| gateway → web | `{"type":"telemetry","t":<ms>,"values":{"presion_tuberia":1240,...}}` |
| gateway → web | `{"type":"state","controls":{"pump1_clutch":true,"rotary_table":"FWD",...}}` |
| gateway → web | `{"type":"session","role":"operador","queue":2}` |
| gateway → web | `{"type":"alarm","level":"critical","message":"..."}` |
| web → gateway | `{"type":"command","control":"pump1_spm","value":60}` |
| web → gateway | `{"type":"action","action":"cierre_duro"}` |
| web → gateway | `{"type":"request_control"}` / `{"type":"release_control"}` |

---

## 4. Estructura del repositorio

```
.
├── index.html
├── package.json
├── vite.config.js
├── .env.example              # plantilla de configuración del frontend
├── src/
│   ├── App.jsx               # navegación entre secciones
│   ├── config.js             # lectura de variables de entorno
│   ├── styles.css            # tema oscuro de sala de control
│   ├── components/           # NavBar, StatusBar, Home, Model3D, ControlPanel,
│   │                         # ControlCard, CameraGrid, Charts, AlarmSettings,
│   │                         # HowItWorks, Team
│   ├── data/
│   │   ├── telemetry.js      # canales de telemetría (unidades, rangos, colores)
│   │   ├── controls.js       # consolas, controles y mapeo a actuadores
│   │   └── team.js           # integrantes (marcador a completar)
│   ├── hooks/useSimulatorLink.js   # enlace único: WebSocket o modo demostración
│   └── lib/
│       ├── mockEngine.js     # motor de simulación del navegador
│       └── csv.js            # exportación de la sesión
└── server/                   # gateway de referencia (corre en la Raspberry Pi)
    ├── main.py               # WebSocket, sesiones, telemetría, log CSV
    ├── hardware.py           # MockBackend + PoKeysBackend (esqueleto)
    └── requirements.txt
```

---

## 5. Desarrollo local

Requisitos: **Node.js 18+** (probado con 24) y, opcionalmente, **Python 3.11+** para el gateway.

```bash
npm install
cp .env.example .env
npm run dev
```

La página queda en <http://localhost:5173> con `VITE_LINK_MODE=mock`: telemetría simulada, sin
hardware ni backend. Sirve para trabajar en la interfaz y para mostrar el proyecto.

Para levantar además el gateway de referencia:

```bash
cd server
python -m venv .venv
source .venv/bin/activate        # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

y en `.env` del frontend:

```
VITE_LINK_MODE=websocket
VITE_WS_URL=ws://localhost:8000/ws
```

Verificación rápida del gateway: `curl http://localhost:8000/health`.

---

## 6. Deploy

Hay **dos piezas** que se despliegan por separado: el **frontend** (archivos estáticos) y el
**gateway** (proceso con acceso al hardware, dentro del laboratorio).

### 6.1 Frontend

```bash
npm run build       # genera dist/
npm run preview     # opcional: revisar el build antes de publicar
```

`dist/` es HTML+JS+CSS estático: se publica en cualquier hosting.

**Opción A · Servidor de la universidad (Nginx).** Es la que deja todo bajo un mismo dominio y
evita problemas de certificados mixtos:

```nginx
server {
    listen 443 ssl;
    server_name simulador.unahur.edu.ar;

    ssl_certificate     /etc/letsencrypt/live/simulador.unahur.edu.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/simulador.unahur.edu.ar/privkey.pem;

    root /var/www/simulador;      # acá se copia el contenido de dist/
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;    # SPA: todo cae en index.html
    }

    # WebSocket del gateway (mismo origen -> sin CORS y con TLS heredado)
    location /ws {
        proxy_pass http://10.0.0.50:8000;    # IP de la Raspberry Pi en la red del laboratorio
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;            # sesiones largas sin cortes
    }

    # Streams MJPEG de las cámaras
    location /cam/ {
        proxy_pass http://10.0.0.50:8080/;
        proxy_buffering off;
    }
}
```

Con ese esquema, el `.env` de producción queda:

```
VITE_LINK_MODE=websocket
VITE_WS_URL=wss://simulador.unahur.edu.ar/ws
VITE_CAM_1=https://simulador.unahur.edu.ar/cam/1/stream.mjpg
...
```

Publicación:

```bash
npm run build
rsync -avz --delete dist/ usuario@servidor:/var/www/simulador/
```

**Opción B · Hosting estático gratuito (Netlify, Vercel o Cloudflare Pages).** Útil para la etapa
de demostración. Build command `npm run build`, publish directory `dist`, y las variables `VITE_*`
cargadas en el panel del proveedor. Requiere que el gateway sea accesible por `wss://` desde
internet (ver 5.2).

**Opción C · GitHub Pages.**

```bash
VITE_BASE_PATH=/pasantia-simulador-web/ npm run build
npx gh-pages -d dist
```

`vite.config.js` ya toma `VITE_BASE_PATH` para resolver las rutas de los assets.

> Las variables `VITE_*` se **incrustan en el bundle** durante el build: son públicas. Nunca poner
> ahí una contraseña o un token permanente; el token de sesión lo emite R-Lab por usuario y turno.

### 6.2 Gateway en la Raspberry Pi 5

1. **Sistema.** Raspberry Pi OS de 64 bits en el SSD de 512 GB, IP fija en la red del laboratorio,
   `ssh` habilitado y usuario en el grupo `dialout`/`plugdev` para acceder al PoKeys por USB.

2. **Instalación.**

   ```bash
   sudo apt update && sudo apt install -y python3-venv git nginx
   git clone <url-del-repo> /opt/simulador && cd /opt/simulador/server
   python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```

3. **Servicio systemd** (`/etc/systemd/system/rlab-gateway.service`):

   ```ini
   [Unit]
   Description=Gateway ESIM-PDS9B
   After=network-online.target

   [Service]
   User=rlab
   WorkingDirectory=/opt/simulador/server
   Environment=RLAB_BACKEND=pokeys
   Environment=RLAB_TOKENS=token-de-prueba-1,token-de-prueba-2
   Environment=RLAB_LOG_DIR=/var/lib/rlab/sesiones
   ExecStart=/opt/simulador/server/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable --now rlab-gateway
   sudo journalctl -u rlab-gateway -f      # ver los logs en vivo
   ```

4. **Exponer el gateway a internet.** Tres alternativas, de menor a mayor fricción con la red de la
   universidad:

   - **Cloudflare Tunnel** (recomendado para empezar): `cloudflared tunnel --url http://localhost:8000`.
     No requiere abrir puertos ni IP pública; da una URL `https://…` con WebSocket incluido.
   - **Reverse proxy en un servidor de la universidad** con la Pi accesible por VPN o red interna
     (es el bloque Nginx de 6.1).
   - **Port forwarding + Let's Encrypt** en el router del laboratorio. Es la opción más frágil y la
     que más permisos de red necesita.

5. **Video.** El streaming NO pasa por el WebSocket. Opciones probadas en proyectos similares:

   | Método | Latencia | Cómo |
   |---|---|---|
   | MJPEG | ~0,3–1 s | `mjpg-streamer` o `ustreamer` por cámara, un puerto cada una, proxy en `/cam/N/`. Lo más simple. |
   | WebRTC | ~0,2 s | `mediamtx` (ex rtsp-simple-server) publicando las cámaras; se embebe su player en un `<iframe>`. |
   | HLS | 5–15 s | `ffmpeg` + Nginx. Solo si la latencia no importa. |
   | YouTube en vivo (no listado) | 10–30 s | OBS Studio con la Elgato HD60 X; se pega la URL de embed en `VITE_CAM_n`. Es lo que usa el laboratorio del IdeI-UNGS. |

   Cualquiera sea el método, la URL se carga en `VITE_CAM_1…VITE_CAM_5`. El componente detecta solo
   si es MJPEG (`<img>`) o un player embebible (`<iframe>`).

### 6.3 Conexión con el hardware (pasar de demo a real)

En `server/hardware.py` está `PoKeysBackend`, el esqueleto de la implementación real, con el mapeo
comando → salida ya escrito:

```python
SALIDAS_DIGITALES   = {"pump1_clutch": 1, "annular": 20, "choke_valve": 27, ...}  # solenoides
SALIDAS_ANALOGICAS  = {"driller_brake": 1}                                        # 0–10 V
MOTORES_PASO_A_PASO = {"pump1_spm": 1, "rt_speed": 3, "td_throttle": 5, ...}      # Nema 17
PULSADORES          = {"reset_strokes": 30}                                       # pulso corto
```

Pasos para completarlo:

1. Abrir la conexión con el PoKeys57U (librería oficial `PoKeysLib` vía `ctypes`, o el dispositivo
   expuesto por Modbus TCP) e implementar `_escribir_hardware`.
2. Resolver las llaves de **tres posiciones** (FWD/OFF/REV, DRILL/SPIN/TORQUE, CCW/STOP/CW,
   HIGH/OFF/LOW): cada una usa un par de salidas digitales consecutivas.
3. Resolver la **palanca del estrangulador**, que es de acción sostenida: hay que mantener la salida
   activa hasta que el indicador de posición llegue al valor pedido.
4. Hacer el *homing* de cada Nema 17 contra el tope mecánico de su perilla al arrancar el servicio.
5. Implementar `read_telemetry`: si el software de Esimtech expone los datos (archivo, serie u
   OPC-UA) se leen de ahí; si no, se instrumentan los indicadores de las consolas y se leen por las
   entradas analógicas del PoKeys.
6. Cambiar `RLAB_BACKEND=mock` por `RLAB_BACKEND=pokeys` y reiniciar el servicio.

Checklist de seguridad antes de la primera operación remota sin operador presente:

- [ ] Parada de emergencia física en el laboratorio, independiente del software.
- [ ] Límites de rango en `LIMITES` (`hardware.py`) revisados contra los topes mecánicos reales.
- [ ] Caída del operador ⇒ parada de emergencia automática (ya implementado en `desconectar()`).
- [ ] Watchdog: si el gateway deja de recibir *pings*, lleva los actuadores a reposo.
- [ ] Una cámara siempre encuadrando el conjunto, para poder ver qué pasó.
- [ ] Log de sesión activado (`RLAB_LOG_DIR`) para auditar cada maniobra.

### 6.4 Integración con la plataforma R-Lab

La web espera un **token de sesión** por usuario y turno:

1. El estudiante reserva el turno en R-Lab.
2. R-Lab abre la página con el token (`VITE_SESSION_TOKEN` para pruebas; en producción conviene
   leerlo del *query string* o de un endpoint de sesión y pasarlo al WebSocket).
3. El gateway valida el token contra `RLAB_TOKENS` (o, mejor, contra la API de R-Lab) y asigna el
   rol. Un solo operador por vez; el resto entra como observador.

---

## 7. Qué falta para que quede 100 % operativa

| Pendiente | Dónde se completa |
|---|---|
| Fotos del laboratorio y del montaje | `public/galeria/` + array `GALERIA` en `src/components/HowItWorks.jsx` |
| Modelo 3D relevado del simulador | `public/modelo/simulador.glb` + bloque *CARGA DEL MODELO REAL* en `src/components/Model3D.jsx` |
| Integrantes reales del equipo | `src/data/team.js` (+ fotos en `public/equipo/`) |
| Rangos y unidades definitivos de cada canal | `src/data/telemetry.js` y `LIMITES` en `server/hardware.py` |
| Verificar el mapeo contra el equipo recibido (puede diferir de la especificación) | `src/data/controls.js` y `LIMITES` en `server/hardware.py` |
| Mapeo real de E/S del PoKeys57U | `PoKeysBackend` en `server/hardware.py` y campo `actuator` en `src/data/controls.js` |
| Lectura de telemetría del ESIM-PDS9B | `PoKeysBackend.read_telemetry` |
| URLs de las cámaras | `.env` (`VITE_CAM_1` … `VITE_CAM_5`) |
| Autenticación real contra R-Lab | `ws_endpoint` en `server/main.py` |

---

## 8. Comandos útiles

```bash
npm run dev        # desarrollo con recarga en caliente
npm run build      # build de producción en dist/
npm run preview    # servir el build localmente
```

```bash
# gateway
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
curl http://localhost:8000/health
sudo journalctl -u rlab-gateway -f
```
