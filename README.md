# Trinetra

Real-time air quality monitoring system for Somaiya Vidyavihar campus using ESP32 sensors, ML models, and a React dashboard.

## Features

- **Live Dashboard** — AQI ring, PM2.5, temperature, humidity cards with 30s auto-refresh
- **Analytics** — AQI trend, pollutant composition, location comparison, temp vs humidity charts
- **Live Map** — Leaflet map with AQI-colored markers and station popups
- **Forecast** — LSTM-based 1H/6H/12H/24H predictions for AQI, PM2.5, PM10, temperature
- **AI Assistant** — Gemini-powered chatbot with 11 Indian language support
- **Historical Data** — Browse, filter, and export CSV from any station
- **ML Pipeline** — RF classifier for pollution source, BiLSTM for time-series forecasting
- **Two-table architecture** — Raw ESP32 data → ML processing → Enriched readings

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Recharts, Leaflet
- **Backend:** FastAPI (Python)
- **ML:** Scikit-learn (RF), Keras/PyTorch (LSTM)
- **Database:** Supabase (PostgreSQL + Realtime)
- **AI:** Google Gemini API

## Setup

1. Run `supabase/migrate.sql` in Supabase SQL Editor
2. Add Supabase URL + anon key to `Trinetra/Trinetra/.env`
3. `cd Trinetra/Trinetra && npm install && npm run dev`
4. `cd server && pip install -r requirements.txt && uvicorn predict:app --reload`
