"""
POST /api/process
Process raw readings through ML models and store in processed_readings.

Query params:
  station_id (optional) — process only this station's readings
  limit (optional) — max readings to process (default 50)

Response:
{
  "processed": 5,
  "station_id": "station_01"
}
"""

from fastapi import FastAPI, Query
from typing import Optional
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))

import numpy as np
import joblib

app = FastAPI(title="Trinetra ML Processor", version="1.0.0")

# ── Model cache ──────────────────────────────────────────────
_models = {}


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


def get_rf():
    if "rf" not in _models:
        base = Path(__file__).parent.parent
        mp = _find_model(base, "rf_pollution_source", "model.joblib")
        ep = _find_model(base, "rf_pollution_source", "encoder.joblib")
        if mp and ep:
            _models["rf"] = joblib.load(mp)
            _models["rf_encoder"] = joblib.load(ep)
    return _models.get("rf"), _models.get("rf_encoder")


def compute_pm25(dust_density: float) -> float:
    return dust_density * 0.524 + 0.0004


def compute_pm10(dust_density: float) -> float:
    return dust_density * 1.75


def compute_aqi(pm25: float) -> int:
    breakpoints = [
        (0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
        (91, 120, 201, 300), (121, 250, 301, 400), (251, 380, 401, 500),
    ]
    for pm_low, pm_high, aqi_low, aqi_high in breakpoints:
        if pm_low <= pm25 <= pm_high:
            return int(aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low))
    return 500 if pm25 > 380 else 0


def compute_thermal_comfort(temp: float, humidity: float) -> str:
    t_f = temp * 1.8 + 32
    hi_f = 0.5 * (t_f + 61 + (t_f - 68) * 1.2 + humidity * 0.094)
    if hi_f >= 80:
        hi_f = (-42.379 + 2.049 * t_f + 10.143 * humidity - 0.225 * t_f * humidity
                - 0.007 * t_f ** 2 - 0.055 * humidity ** 2
                + 0.001 * t_f ** 2 * humidity + 0.001 * t_f * humidity ** 2)
    hi_c = (hi_f - 32) / 1.8
    if hi_c > 32:
        return "Hot & Humid"
    elif hi_c > 27:
        return "Warm"
    return "Comfortable"


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


@app.post("/api/process")
async def process_readings(
    station_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    sb = get_supabase()
    if not sb:
        return {"error": "Supabase not configured", "processed": 0}

    rf, le = get_rf()

    # Find unprocessed reading IDs
    query = sb.table("readings").select("id").order("recorded_at", desc=True)
    if station_id:
        query = query.eq("station_id", station_id)

    # Get IDs already processed
    processed_ids_resp = sb.table("processed_readings").select("reading_id").execute()
    processed_ids = {r["reading_id"] for r in (processed_ids_resp.data or [])}

    readings_resp = query.limit(limit * 3).execute()
    readings = [r for r in (readings_resp.data or []) if r["id"] not in processed_ids][:limit]

    if not readings:
        return {"processed": 0, "message": "No new readings to process"}

    batch = []
    for reading in readings:
        rid = reading["id"]
        # Fetch full reading data
        full = sb.table("readings").select("*").eq("id", rid).execute()
        if not full.data:
            continue
        r = full.data[0]

        temp = r.get("temperature") or 0
        humidity = r.get("humidity") or 0
        dust = r.get("dust_density") or 0
        gas = r.get("mq135_raw") or 0

        pm25 = compute_pm25(dust)
        pm10 = compute_pm10(dust)
        aqi = compute_aqi(pm25)

        # M1: source classification
        source = None
        source_confidence = None
        if rf and le:
            try:
                X = np.array([[pm25, gas, temp, humidity]])
                pred_enc = rf.predict(X)[0]
                proba = rf.predict_proba(X)[0]
                source = le.inverse_transform([pred_enc])[0]
                source_confidence = float(max(proba))
            except Exception:
                pass

        # M2: thermal comfort
        thermal_comfort = compute_thermal_comfort(temp, humidity)

        batch.append({
            "reading_id": rid,
            "station_id": r.get("station_id"),
            "temperature": round(temp, 1),
            "humidity": round(humidity, 1),
            "pm25_ug_m3": round(pm25, 2),
            "pm10_ug_m3": round(pm10, 2),
            "aqi": aqi,
            "source": source,
            "source_confidence": round(source_confidence, 3) if source_confidence else None,
            "thermal_comfort": thermal_comfort,
        })

    if batch:
        sb.table("processed_readings").insert(batch).execute()

    return {"processed": len(batch), "station_id": station_id}


handler = app
