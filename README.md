# Trinetra

Real-time air quality monitoring for the Somaiya Vidyavihar campus — ESP32 sensor
nodes streaming into Supabase, machine learning running server-side, and a React
dashboard on top.

### 🔴 Live: **https://trinetra-rouge.vercel.app**
### 📦 Repository: **https://github.com/Nimishpp06/Trinetra**

---

## Features

| | |
|---|---|
| **Live Dashboard** | AQI ring, PM2.5 / PM10 / temperature / humidity cards, 30s auto-refresh |
| **Analytics** | AQI trend, pollutant composition, location comparison, temp-vs-humidity |
| **Live Map** | Leaflet map with AQI-coloured markers and per-station popups |
| **Forecast** | LSTM predictions for AQI, PM2.5, PM10 and temperature |
| **AI Assistant** | Gemini chatbot scoped to AQI topics, answers in 11 Indian languages |
| **Historical Data** | Browse, filter and export any station's readings as CSV |
| **Pollution Source** | Random Forest classifier naming the likely pollution source + confidence |
| **Auth** | Google sign-in and email/password — the whole app sits behind login |

Everything above runs on **real, trained models** — no mock data in the frontend.

---

## How it works

```
   ESP32 (×2)          Supabase              FastAPI              React
 ┌─────────────┐     ┌─────────────┐      ┌──────────────┐     ┌──────────┐
 │ DHT11       │     │  readings   │ POST │  /api/process│     │          │
 │ MQ135       │ ──► │   (raw)     │ ───► │  RF + LSTM   │ ──► │ Dashboard│
 │ Sharp dust  │     └──────┬──────┘      └──────┬───────┘     │ Forecast │
 └─────────────┘            │                    │             │ AI       │
                            │             ┌──────▼───────┐     └──────────┘
                            │             │ processed_   │
                            └────────────►│ readings     │
                                (forecast │  (enriched)  │
                                 reads    └──────────────┘
                                 raw)
```

Two tables, deliberately:

- **`readings`** — exactly what the sensor posted, untouched.
- **`processed_readings`** — the same rows enriched by the models (predicted
  AQI, pollution source, comfort band). Charts and analytics read this.

Because `/api/forecast` reads the **raw** table, a station only needs its own
sensor history to forecast — the ML pipeline can lag without breaking it.

**Stations:** `station_01` and `station_02`, each an ESP32 reporting every
**6 seconds**. That interval is load-bearing: the forecast model's window is
derived from it, so `INTERVAL_MS` must stay at `6000`.

---

## Tech stack

- **Frontend** — React 19, TypeScript, Vite, Recharts, Leaflet, Supabase JS
- **Backend** — FastAPI (Python), deployed as a single Vercel serverless function
- **ML** — scikit-learn (Random Forest), LSTM forecaster exported to **ONNX**
- **Database** — Supabase (PostgreSQL + Auth + Realtime)
- **AI** — Google Gemini
- **Firmware** — Arduino ESP32

---

## Getting started (local development)

### 1. Database

Run `supabase/setup.sql`, then `supabase/migrate.sql` in the Supabase SQL Editor.
(`supabase/auth.sql` configures auth providers.)

### 2. Environment

**Root `.env`** (used by the API):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon key>
GEMINI_API_KEY=<gemini key>
```

**`Trinetra/Trinetra/.env`** (used by the frontend — all `VITE_` prefixed):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_BASE=/api
```

Both `.env` files are gitignored.

### 3. Run it

```bash
# Terminal 1 — API on :8000
cd server
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — frontend on :5173
cd Trinetra/Trinetra
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` → `localhost:8000`, so the
frontend needs no extra configuration.

Other useful commands:

```bash
cd Trinetra/Trinetra && npm run build   # type-check + production build
cd Trinetra/Trinetra && npm run lint    # oxlint
```

---

## How to operate

### The app

1. Go to https://trinetra-rouge.vercel.app
2. Sign in with **Google**, or an email/password account
   (email signup requires *Confirm email* to be off in Supabase, since no SMTP
   is configured — Google sign-in needs no such setup)
3. You land on **Dashboard**; the sidebar moves you to Analytics, Map, Forecast,
   AI Assistant and Historical Data

### The ESP32 nodes

`config.h` is gitignored because it carries Wi-Fi credentials. Start from the
tracked template:

```bash
cd firmware/trinetra_esp32
cp config.h.example config.h
```

Then edit `config.h`:

| Field | Device 1 | Device 2 |
|---|---|---|
| `WIFI_SSID` / `WIFI_PASSWORD` | your network | your network |
| `STATION_ID` | `station_01` | `station_02` |
| Pins | leave as-is | leave as-is |

Pins (from `V2MP.ino`): **DHT11 → 4**, **MQ135 → 34**, **dust IR LED → 25**,
**dust analog out → 33**. `INTERVAL_MS` is `6000` — do not change it.

Flash it:

1. Arduino IDE → install **ESP32 board support** (Boards Manager)
2. Install libraries: **Adafruit DHT Sensor Library** + **Adafruit Unified Sensor**
3. Open `trinetra_esp32.ino`, select your board and port, **Upload**
4. Open Serial Monitor at **115200** — you should see:

```
POST https://<project>.supabase.co/rest/v1/readings
{"station_id":"station_01",...}
Supabase response: 201
Reading stored ✔
```

A `201` every 6 seconds means the pipeline is live. The dashboard picks it up
within 30 seconds. Flash device 2 second, after changing `STATION_ID`.

### The ML pipeline

```bash
# Push raw readings through the models into processed_readings
curl -X POST http://localhost:8000/api/process
# → {"processed":12,"station_id":null}

# Forecast for one station (needs ≥12 raw readings)
curl "http://localhost:8000/api/forecast?station_id=station_01"

# Pollution source from a single sample
curl -X POST http://localhost:8000/api/predict \
  -H 'Content-Type: application/json' \
  -d '{"pm25":35,"gas_ppm":400,"temp":30,"humidity":60}'

# AQI question for the chatbot
curl -X POST http://localhost:8000/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"what is aqi"}'
```

`/api/health` reports which models loaded: `{"random_forest_loaded":true,"lstm_loaded":true}`.

### Retraining

```bash
python ml/train_all.py      # fits RF + LSTM into models/trained/
python ml/export_onnx.py    # converts LSTMs to ONNX + parity gate
```

Six model directories ship in `models/trained/`: `rf_pollution_source`,
`rf_thermal_comfort`, `lstm_aq`, `lstm_pm25`, `lstm_pm10`, `lstm_temp`.

---

## Deploying

Hosted on **Vercel** (Hobby / free tier, no credit card).

- `vercel.json` rewrites `/api/*` → the Python function at `api/index.py`
- **Root `requirements.txt` must be a literal dependency list** — Vercel's parser
  rejects `-r` includes. `server/requirements.txt` is a separate copy for local
  dev and Docker; keep them in sync by hand.
- The build strips `Trinetra/Trinetra/node_modules` afterwards so the Python
  function bundle stays under Vercel's size cap.
- Required project env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`.

```bash
npx vercel deploy --prod
```

---

## Project structure

```
├── api/index.py              # Vercel entry shim → server/main.py
├── server/                   # FastAPI + ML inference
│   ├── main.py               # app assembly, CORS, sub-app mounting
│   ├── process.py            # /api/process  (raw → processed)
│   ├── forecast.py           # /api/forecast (LSTM window)
│   ├── predict.py            # /api/predict  (RF source classification)
│   ├── ask.py                # /api/ask      (Gemini chatbot)
│   └── onnx_model.py         # ONNX Runtime loader, Keras fallback
├── ml/                       # training + ONNX export
├── models/trained/           # committed model artifacts
├── firmware/trinetra_esp32/  # .ino + config.h.example
├── supabase/                 # schema, migrations, auth SQL
└── Trinetra/Trinetra/        # React frontend (Vite)
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Forecast: *"Need 12 readings, have N"* | That station has under 12 raw rows — it needs its own sensor history |
| Charts empty but forecast works | Run `/api/process`; charts read `processed_readings`, forecast reads `readings` |
| Email signup says "check your inbox" | No SMTP configured — turn **Confirm email** off in Supabase, or use Google |
| Google sign-in rejected on a new domain | Add it to Supabase → Auth → URL Configuration → Redirect URLs |
| ESP32 `POST failed` | Check `config.h` Wi-Fi, and that `STATION_ID` exists in the `stations` table |
| Forecast looks wrong after a timing change | Keep `INTERVAL_MS` at `6000` — the window maths assumes 6-second samples |
