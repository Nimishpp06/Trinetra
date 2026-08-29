# Trinetra — Air Quality Monitoring System
## Comprehensive Project Plan (LLM Council Synthesis)

---

## Executive Summary

**Project**: Trinetra — Low-cost air quality monitoring network for college campus
**Scope**: 2 ESP32 devices (prototype), extensible to N devices
**Core Features**: Real-time dashboard, pollution source classification, AQI forecasting, multilingual AI health assistant
**Stack**: ESP32 → Supabase → Python ML → Vercel Frontend

---

## LLM Council Debate & Synthesis

### Perspective 1: The Contrarian
> "Don't over-engineer. Two devices means tiny data. Random Forest on 4 features with 5 locations? You'll overfit. LSTM needs sequences — you have 6-second intervals, that's 1440 readings/day/device. But 5 locations × 7 days = 35k rows max. Is that enough for LSTM? No. Use simpler forecasting (ARIMA, Prophet) or just show trends. Also — 'all Indian languages' with Gemini? That's prompt engineering, not a model. Don't build a language model, build a prompt template."

**Valid Points**: 
- Data volume is small for deep learning
- LSTM may overfit; simpler forecasting works
- Multilingual = prompt templates, not model training
- Free tier constraints matter

### Perspective 2: The First Principles Thinker
> "What's the minimum viable system?
> 1. **Sensors** → raw readings → Supabase (source of truth)
> 2. **ML** needs labeled data → export CSV → train → save models
> 3. **Frontend** reads Supabase + calls ML predictions
> 4. **AI Assistant** = RAG: retrieve relevant readings → inject into Gemini prompt → constrain to domain
> 5. **Extensibility** = station_id + coordinates in Supabase stations table + device config

> Everything else is noise. Don't build APIs if Supabase + Vercel Functions work. Don't train if heuristic rules work."

**Valid Points**:
- Supabase IS the database + API + auth + realtime
- Vercel Functions = free Python hosting for ML inference
- RAG pattern for AI Assistant (not fine-tuning)
- Station onboarding = 1 SQL insert + device config

### Perspective 3: The Pragmatist
> "Ship in 3 phases:
> **Phase 1** (Week 1): Data pipeline working. ESP32 → Supabase → CSV export → RF + LSTM trained → models saved → predict.py works.
> **Phase 2** (Week 2): Frontend integration. Vercel Functions serve predictions. Dashboard shows live data + ML predictions. Map works.
> **Phase 3** (Week 3): AI Assistant. Gemini with context injection + language detection. Device onboarding doc.

> Free hosting: Supabase (DB + API), Vercel (frontend + serverless), GitHub Actions (CI/CD). No custom servers."

**Valid Points**:
- Phased approach reduces risk
- Free tier services cover everything
- Vercel Python functions for ML inference
- GitHub Actions for automated retraining

---

## Synthesis: Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TRINETRA ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    HTTPS/JSON     ┌──────────────┐    SQL/REST      ┌──────┐ │
│  │ ESP32 #1 │ ────────────────► │  Supabase    │ ◄──────────────► │ ML   │ │
│  │ STATION_01                │  (PostgreSQL   │    CSV Export    │Models│ │
│  └──────────┘   6 sec         │   + Auth +    │                  │(.joblib│ │
│                             │   Realtime)    │                  │ .h5) │ │
│  ┌──────────┐                │                │                  └──────┘ │
│  │ ESP32 #2 │ ────────────────►  Tables:      │                       ▲   │
│  │ STATION_02               │  - stations    │                  Python   │   │
│  └──────────┘                │  - readings    │   Train Scripts         │   │
│                              │                │   (train_rf.py,         │   │
│                              │  RLS Policies  │    train_lstm.py)       │   │
│                              └───────┬────────┘           │             │   │
│                                      │                    ▼             │   │
│                                      │            ┌───────────────┐     │   │
│                                      │            │  Vercel       │     │   │
│                                      └───────────►│  Frontend     │     │   │
│                                                   │  (Next.js/    │     │   │
│                                                   │   Static HTML)│     │   │
│                                                   │  + Serverless │     │   │
│                                                   │  Functions    │     │   │
│                                                   │  /api/predict │     │   │
│                                                   │  /api/ask     │     │   │
│                                                   └───────────────┘     │   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Pipeline & ML Training (Core)

### 1.1 Data Export Script (Supabase → CSV)
**File**: `data/export_supabase.py`
- Queries Supabase `readings` + `stations` tables
- Joins on `station_id` → adds `location_id`, `zone`, `lat`, `lng`
- Exports to `data/raw/{station_id}.csv` (one per station)
- Handles your 5 known stations + future ones

```python
# Run: python data/export_supabase.py
# Output: data/raw/station_01.csv, station_02.csv, ...
```

### 1.2 Process Raw Data (Already Exists - Enhance)
**File**: `data/process_raw.py`
- Reads all CSVs from `data/raw/`
- **Column mapping** for your actual CSV format (Timestamp, Temperature (°C), etc.)
- Adds `location_id` from filename
- Computes AQI from PM2.5 (CPCB formula)
- Saves unified `data/processed/air_quality_data.csv`

### 1.3 Auto-Labeling (Already Exists - Enhance)
**File**: `label_data.py`
- Heuristic rules based on sensor signatures:
  - `ambient`: PM2.5 < 40, Gas < 200
  - `traffic`: PM2.5 80-250, Gas 300-800, Humidity < 50
  - `industrial`: PM2.5 40-120, Gas 500-2000, Temp > 35
- Run: `python label_data.py --auto`
- Output: labeled CSV ready for training

### 1.4 Random Forest Training (Already Exists - Enhance)
**File**: `train_rf.py`
- Features: `[pm25, gas_ppm, temp, humidity]`
- Target: `source_label` (ambient/traffic/industrial)
- **Global model** (all stations combined) — primary
- **Per-station models** (optional, if data permits)
- Metrics: Accuracy, F1-weighted, F1-macro, Confusion Matrix
- Saves: `models/rf_source_classifier_global.joblib`, `rf_label_encoder_global.joblib`

### 1.5 LSTM Training (Already Exists - Enhance)
**File**: `train_lstm.py`
- Input: 12-timestep rolling window (2 hours at 10-min intervals)
- Target: Next AQI value
- Architecture: LSTM(64) → Dropout(0.2) → LSTM(32) → Dense(1)
- Keras 3 + PyTorch backend
- Metrics: RMSE, MAE (AQI units + scaled)
- Saves: `models/lstm_aqi_forecaster.h5`, `models/lstm_scaler.pkl`

### 1.6 Training Orchestrator (Already Exists)
**File**: `train_all.py`
- Runs: export → process → label → train_rf → train_lstm
- Single command: `python train_all.py`

### 1.7 Inference Script (Already Exists)
**File**: `predict.py`
- Loads models, runs predictions
- CLI: `python predict.py --pm25 35 --gas 600 --temp 28 --humidity 85`

---

## Phase 2: Frontend Integration (Vercel Serverless Functions)

### 2.1 ML Inference API (Vercel Python Functions)
**Files**: 
- `api/predict.py` — POST `/api/predict` → returns source + AQI forecast
- `api/health.py` — GET `/api/health` → model status

```python
# api/predict.py
from predict import predict_source, predict_aqi
# Load models on cold start, cache in global
# Input: {pm25, gas_ppm, temp, humidity, station_id?, past_aqi[]}
# Output: {source, source_confidence, current_aqi, forecast_aqi}
```

### 2.2 Frontend Updates
**Files to modify**:
- `frontend/assets/app.js` — Add ML prediction calls
- `frontend/dashboard.html` — Show "Pollution Source" + "AQI Forecast"
- `frontend/analytics.html` — Connect "Forecast · next 24h" chart
- `frontend/map.html` — Color stations by predicted source

### 2.3 Real-time Data Flow
```
ESP32 (6s) → Supabase → Frontend (Supabase Realtime / 60s poll)
                    ↓
              ML Models (on-demand via /api/predict)
                    ↓
              Frontend displays: Live + Predicted
```

---

## Phase 3: Multilingual AI Health Assistant

### 3.1 Architecture: RAG + Gemini (Not Fine-Tuning)
```
User Query (any Indian language)
        │
        ▼
Language Detection (langdetect / fasttext)
        │
        ▼
Retrieve Relevant Context from Supabase:
  - Latest readings for user's station/zone
  - AQI trends (24h, 7d)
  - Source classification history
  - Forecast data
        │
        ▼
Inject into Structured Prompt:
  SYSTEM: "You are Trinetra, an air quality health assistant for Somaiya Vidyavihar.
           Answer ONLY using provided sensor data. Refuse coding, general knowledge,
           or off-topic questions. Respond in USER'S LANGUAGE."
  CONTEXT: {readings, trends, forecasts, station_info}
  QUERY: {user_question}
        │
        ▼
Gemini API (gemini-1.5-flash — free tier: 1500 req/day)
        │
        ▼
Response in detected language
```

### 3.2 Supported Languages (Gemini 1.5 Flash Native)
| Language | Code | Native Support |
|----------|------|----------------|
| Hindi | hi | ✅ |
| Marathi | mr | ✅ |
| Gujarati | gu | ✅ |
| Tamil | ta | ✅ |
| Telugu | te | ✅ |
| Bengali | bn | ✅ |
| Kannada | kn | ✅ |
| Malayalam | ml | ✅ |
| Punjabi | pa | ✅ |
| Odia | or | ✅ |
| English | en | ✅ |

### 3.3 API Endpoint
**File**: `api/ask.py` — POST `/api/ask`
```python
# Input: {question: "हवा कैसी है?", station_id: "station_01", language: "hi"}
# Output: {answer: "वर्तमान AQI 57 है...", language: "hi", sources: [...]}
```

### 3.4 Guardrails (Critical)
- **Domain constraint**: System prompt forbids non-air-quality answers
- **Context-only**: Model must cite sensor data for every claim
- **Refusal template**: "I can only answer questions about air quality at Trinetra stations."
- **Rate limiting**: 10 req/min per IP (Vercel default)

---

## Phase 4: Extensible Device Onboarding

### 4.1 Station Registration (One-Time)
```sql
-- Run in Supabase SQL Editor
INSERT INTO public.stations (id, name, zone, lat, lng, description) VALUES
  ('station_03', 'Library Building', 'Vidyavihar', 19.0755, 72.8860, 'Near main library'),
  ('station_04', 'Hostel Block', 'Vidyavihar', 19.0720, 72.8890, 'Student housing area')
ON CONFLICT (id) DO NOTHING;
```

### 4.2 Device Configuration (ESP32)
```cpp
// In trinetra_esp32.ino - only these 3 lines change per device:
const char* STATION_ID = "station_03";  // Match Supabase stations.id
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// Supabase URL + Key same for all devices
```

### 4.3 Auto-Discovery (Future)
- Frontend reads `stations` table → auto-populates map, dashboard, filters
- No code changes needed for new stations

---

## File Structure (Final)

```
trinetra/
├── firmware/
│   └── trinetra_esp32/
│       └── trinetra_esp32.ino          # ESP32 code (update STATION_ID per device)
├── supabase/
│   └── setup.sql                       # Run once to create tables + RLS
├── data/
│   ├── raw/                            # CSV exports (gitignored)
│   ├── processed/                      # Processed CSV (gitignored)
│   ├── export_supabase.py              # NEW: Supabase → CSV
│   ├── process_raw.py                  # EXISTING: CSV → unified + AQI
│   └── label_data.py                   # EXISTING: Auto-label sources
├── models/                             # Trained models (gitignored)
│   ├── rf_source_classifier_global.joblib
│   ├── rf_label_encoder_global.joblib
│   ├── lstm_aqi_forecaster.h5
│   └── lstm_scaler.pkl
├── train_rf.py                         # EXISTING: RF training + metrics
├── train_lstm.py                       # EXISTING: LSTM training + metrics
├── train_all.py                        # EXISTING: Full pipeline
├── predict.py                          # EXISTING: CLI inference
├── api/                                # NEW: Vercel Serverless Functions
│   ├── predict.py                      # POST /api/predict
│   ├── ask.py                          # POST /api/ask (AI Assistant)
│   └── health.py                       # GET /api/health
├── frontend/                           # Deployed to Vercel
│   ├── index.html                      # Redirects to dashboard
│   ├── dashboard.html                  # Live KPIs + ML predictions
│   ├── map.html                        # Leaflet map with zones
│   ├── analytics.html                  # Charts + forecast overlay
│   ├── assistant.html                  # Multilingual chat
│   └── assets/
│       ├── config.js                   # Supabase + Gemini keys
│       ├── supabase.js                 # Supabase client
│       ├── app.js                      # Main logic (needs ML integration)
│       └── style.css
├── requirements.txt                    # Python deps
├── vercel.json                         # Vercel config (rewrites + Python)
└── PROJECT_PLAN.md                     # This file
```

---

## Key Decisions & Trade-offs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **ML Serving** | Vercel Python Functions | Free tier, auto-scales, co-located with frontend |
| **CSV Source** | Manual export + 5 known stations | User has data; no complex Supabase sync needed yet |
| **LSTM** | Keep but monitor overfit | Small data → may switch to ARIMA/Prophet later |
| **AI Assistant** | RAG + Gemini Flash | Free, multilingual native, no training needed |
| **Languages** | 11 Indian languages via Gemini | Covers 95%+ of campus population |
| **Device Onboarding** | SQL insert + config change | Zero code, zero deploy |
| **Forecast Horizon** | 1 step (10 min) → extend to 24h via recursive | LSTM predicts 1 step; loop for 24h |

---

## Implementation Order

### Week 1: Data & Models
- [ ] Create `data/export_supabase.py` (Supabase → CSV per station)
- [ ] Test `process_raw.py` with your 5 CSV files
- [ ] Run `label_data.py --auto` → verify labels
- [ ] Run `train_all.py` → verify models save to `models/`
- [ ] Test `predict.py` with sample data

### Week 2: Frontend + API
- [ ] Create `api/predict.py` (Vercel function)
- [ ] Create `api/health.py`
- [ ] Update `frontend/assets/app.js` to call `/api/predict`
- [ ] Add "Pollution Source" + "AQI Forecast" to dashboard.html
- [ ] Connect analytics.html forecast chart
- [ ] Deploy to Vercel → test end-to-end

### Week 3: AI Assistant + Polish
- [ ] Create `api/ask.py` (Gemini + RAG)
- [ ] Update `frontend/assistant.html` + `app.js` for chat
- [ ] Add language detection + 11 language support
- [ ] Test guardrails (refuse coding questions)
- [ ] Document device onboarding process

---

## Free Tier Limits (Design Within These)

| Service | Free Limit | Trinetra Usage |
|---------|------------|----------------|
| Supabase | 500MB DB, 2GB bandwidth | ~10MB/month (2 devices × 6s) |
| Vercel | 100GB bandwidth, 1000 serverless invocations/day | ~500/day (dashboard polls + predictions) |
| Gemini API | 1500 req/day (Flash) | ~200/day (assistant queries) |
| GitHub Actions | 2000 min/month | Weekly retraining ~10 min |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LSTM overfits on small data | High | Medium | Start with global RF only; add LSTM later; use ARIMA as fallback |
| Gemini API quota exceeded | Low | Medium | Cache responses; rate limit; fallback to template responses |
| ESP32 WiFi drops | Medium | Low | Firmware has reconnect logic; Supabase accepts late inserts |
| MQ135 raw ADC → ppm conversion | Medium | Medium | Document as known limitation; calibrate later if needed |
| Model drift over time | Low | High | Schedule weekly retraining via GitHub Actions |

---

## Next Steps

1. **You provide**: 5 CSV files in `data/raw/` (or Supabase access for export script)
2. **I implement**: Phase 1 (export → process → label → train → predict)
3. **We test**: `python train_all.py` → `python predict.py --pm25 35 --gas 600 --temp 28 --humidity 85`
4. **Then**: Phase 2 (Vercel deployment + frontend integration)

---

**Ready to start Phase 1?** I'll create the Supabase export script and test the full pipeline with your data.