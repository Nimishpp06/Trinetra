# Trinetra - Air Quality Monitoring System

A college project monitoring air quality using ESP32 sensors, machine learning, and real-time analytics.

## Project Structure

### Hardware (ESP32)
- 2 ESP32 devices with DHT11 (temp/humidity), MQ135 (gas), and Sharp GP2Y1010AU0F (dust/PM2.5) sensors
- Reads sensor data every 6 seconds
- Posts to Supabase PostgREST over HTTPS
- Station identity via `config.h` (WiFi, Supabase keys, Station ID)

### Software & ML
- **Random Forest**: Classifies pollution source (ambient/traffic/industrial) from PM2.5, gas, temp, humidity
- **LSTM**: Forecasts next AQI value using 12-timestep rolling window (2 hours at 10-min intervals)
- Models saved as `models/` (joblib/.h5 format)
- Training pipeline: `data/process_raw.py` → `label_data.py` → `train_all.py`

### Frontend
- **React + TypeScript + Vite** based dashboard
- 6 pages: Dashboard, Live Map, AI Assistant, Historical Data, Analytics, Profile
- Real-time data from Supabase via Realtime subscriptions
- ML predictions from Vercel serverless functions
- charts: AQI trend, pollutant composition, location comparison, temp vs humidity scatter

### Data Flow
```
ESP32 (6s interval) → Supabase (readings table) → Frontend (real-time) + ML Functions (on-demand)
```

### Key Features
- Pollution source classification (RF: ambient/traffic/industrial)
- AQI forecasting (LSTM: next 10-min interval)
- Multilingual AI Assistant (English + 11 Indian languages via Gemini)
- Real-time dashboard with KPIs and live map
- Historical data analysis with charts and tables
- Easy device onboarding: 1 SQL insert + config change
- Privacy-first: `config.h` gitignored, no secrets in code

### Quick Start
```bash
# 1. Hardware: Flash firmware with config.h filled in
# 2. Backend: Supabase project + SQL setup
# 3. ML: python train_all.py (or --per-location)
# 4. Frontend: npm install + .env.local setup
# 5. Run: npm run dev (http://localhost:5174)
```

### Repository Structure
```
Trinetra/
├── firmware/           # ESP32 code (config.h gitignored)
├── supabase/           # SQL setup (setup.sql)
├── ml/               # Training scripts
├── api/              # Vercel serverless functions
├── frontend/           # React + Vite + TypeScript
├── data/              # CSV files (gitignored)
├── models/            # Trained models (gitignored)
├── .gitignore         # Excludes secrets, models, data
├── requirements.txt   # Python deps
└── README.md          # This file
```
