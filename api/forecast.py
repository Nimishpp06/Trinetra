"""
GET /api/forecast
Multi-step forecast using LSTM models.

Query params:
  station_id — which station (default: station_01)
  hours — forecast horizon in hours (default: 1, max: 24)

Response:
{
  "station_id": "station_01",
  "hours": 1,
  "current": { "aqi": 83, "pm25": 28.5, "pm10": 42.1, "temp": 32, "humidity": 85 },
  "forecast": [
    { "offset_min": 5, "aqi": 85, "pm25": 29.1, "pm10": 43.0, "temp": 32.1 },
    ...
  ]
}
"""

import os
os.environ["KERAS_BACKEND"] = "torch"  # Must be set before any keras import

from fastapi import FastAPI, Query, HTTPException
from typing import Optional, List
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

import numpy as np
import joblib

app = FastAPI(title="Trinetra Forecast API", version="1.0.0")

WINDOW = 12
STEPS_PER_HOUR = 100  # 6s intervals → 100 steps/hour

_lstm_models = {}


def _find_model(base_dir: Path, subdir: str, filename: str) -> Optional[Path]:
    trained = base_dir / "models" / "trained"
    target = trained / subdir / filename
    if target.exists():
        return target
    for d in trained.iterdir():
        if d.is_dir():
            f = d / filename
            if f.exists():
                return f
    return None


def load_lstm_models():
    if _lstm_models:
        return _lstm_models

    from keras.models import load_model

    base = Path(__file__).parent.parent

    configs = {
        "temp": {"subdir": "lstm_temp", "features": ["humidity", "mq135_raw", "dust_density"]},
        "aqi": {"subdir": "lstm_aq", "features": ["temperature", "humidity", "dust_density"]},
        "pm25": {"subdir": "lstm_pm25", "features": ["temperature", "humidity", "mq135_raw"]},
        "pm10": {"subdir": "lstm_pm10", "features": ["temperature", "humidity", "mq135_raw", "dust_density"]},
    }

    for key, cfg in configs.items():
        try:
            model_path = _find_model(base, cfg["subdir"], "forecaster.h5")
            scaler_path = _find_model(base, cfg["subdir"], "scaler.pkl")
            if model_path and scaler_path:
                model = load_model(str(model_path), compile=False)
                scaler = joblib.load(scaler_path)
                _lstm_models[key] = {"model": model, "scaler": scaler, "cfg": cfg}
        except Exception:
            pass

    return _lstm_models


# Preload models at module level so they're ready when the first request arrives
load_lstm_models()


def forecast_multi(model, scaler, last_window: np.ndarray, n_steps: int) -> List[float]:
    """Recursive multi-step forecast."""
    preds = []
    window = last_window.copy()
    for _ in range(n_steps):
        try:
            pred_scaled = model.predict(window.reshape(1, WINDOW, -1), verbose=0)[0, 0]
            pred = scaler.inverse_transform([[pred_scaled]])[0, 0]
            preds.append(float(pred))
            new_row = window[-1].copy()
            new_row[0] = pred_scaled
            window = np.vstack([window[1:], new_row.reshape(1, -1)])
        except Exception:
            preds.append(preds[-1] if preds else 0)
    return preds


def compute_aqi(pm25: float) -> int:
    breakpoints = [
        (0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
        (91, 120, 201, 300), (121, 250, 301, 400), (251, 380, 401, 500),
    ]
    for pm_low, pm_high, aqi_low, aqi_high in breakpoints:
        if pm_low <= pm25 <= pm_high:
            return int(aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low))
    return 500 if pm25 > 380 else 0


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


@app.get("/forecast")
async def forecast(
    station_id: str = Query("station_01"),
    hours: float = Query(1, ge=0.25, le=24),
):
    models = load_lstm_models()
    if not models:
        raise HTTPException(status_code=503, detail="LSTM models not loaded")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    # Fetch last 12 readings
    resp = sb.table("readings") \
        .select("*") \
        .eq("station_id", station_id) \
        .order("recorded_at", desc=True) \
        .limit(WINDOW) \
        .execute()

    readings = resp.data or []
    if len(readings) < WINDOW:
        raise HTTPException(status_code=400, detail=f"Need {WINDOW} readings, have {len(readings)}")

    readings = list(reversed(readings))  # oldest first

    # Build current values
    latest = readings[-1]
    current = {
        "temp": latest.get("temperature") or 0,
        "humidity": latest.get("humidity") or 0,
        "mq135": latest.get("mq135_raw") or 0,
        "dust": latest.get("dust_density") or 0,
    }

    # Compute current pm25/pm10/aqi
    pm25_now = current["dust"] * 0.524 + 0.0004
    pm10_now = current["dust"] * 1.75
    aqi_now = compute_aqi(pm25_now)

    n_steps = int(hours * STEPS_PER_HOUR)
    step_interval = max(1, n_steps // 12)  # ~12 points on the chart

    forecast_points = []

    for key, m in models.items():
        cfg = m["cfg"]
        feature_map = {
            "temperature": "temperature",
            "humidity": "humidity",
            "mq135_raw": "mq135_raw",
            "dust_density": "dust_density",
        }
        feature_cols = [feature_map.get(f, f) for f in cfg["features"]]

        window_data = np.array([[r.get(c, 0) or 0 for c in feature_cols] for r in readings])
        preds = forecast_multi(m["model"], m["scaler"], window_data, n_steps)

        # Sample at intervals
        for i in range(0, n_steps, step_interval):
            offset_min = int((i + 1) * 6 / 60)  # 6s steps → minutes
            if i < len(preds):
                val = preds[i]
            else:
                val = preds[-1] if preds else 0

            # Find or create point at this offset
            existing = next((p for p in forecast_points if p["offset_min"] == offset_min), None)
            if not existing:
                existing = {"offset_min": offset_min}
                forecast_points.append(existing)

            if key == "temp":
                existing["temp"] = round(val, 1)
            elif key == "pm25":
                existing["pm25"] = round(val, 1)
                existing["aqi"] = compute_aqi(val)
            elif key == "pm10":
                existing["pm10"] = round(val, 1)
            elif key == "aqi":
                if "aqi" not in existing:
                    existing["aqi"] = round(val)

    forecast_points.sort(key=lambda p: p["offset_min"])

    # Fill missing aqi from pm25 if available
    for p in forecast_points:
        if "aqi" not in p and "pm25" in p:
            p["aqi"] = compute_aqi(p["pm25"])

    return {
        "station_id": station_id,
        "hours": hours,
        "current": {
            "temp": current["temp"],
            "humidity": current["humidity"],
            "pm25": round(pm25_now, 1),
            "pm10": round(pm10_now, 1),
            "aqi": aqi_now,
        },
        "forecast": forecast_points,
    }


handler = app
