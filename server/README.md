# Trinetra API

FastAPI backend for ML processing, forecasts, and AI assistant.

## Local Development

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Environment variables auto-load from project root `.env` file.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Check if ML models loaded |
| POST | `/api/predict` | ML inference (source + AQI) |
| POST | `/api/process` | Process raw readings → processed_readings |
| GET | `/api/forecast?station_id=station_01&hours=1` | LSTM multi-step forecast |
| POST | `/api/ask` | Gemini AI chatbot |

## Structure

```
server/
├── main.py        # Local dev entry (combines all routes)
├── predict.py     # ML inference endpoint
├── process.py     # ML processing pipeline
├── forecast.py    # Multi-step LSTM forecast
├── ask.py         # Gemini AI assistant
└── requirements.txt
```
