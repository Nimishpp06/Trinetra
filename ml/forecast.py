#!/usr/bin/env python3
"""
Forecast script — takes recent raw readings and predicts future values.

Usage:
  python forecast.py --temp 31.7 --hum 66.9 --aq 144 --dust 54.7 --hours 1
"""

import argparse
import numpy as np
import joblib
from pathlib import Path


def compute_pm10(dust):
    return dust * 1.75

MODELS = {
    "M3": {"name": "lstm_temp", "target": "Temperature_C",
           "features": ["Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"]},
    "M4": {"name": "lstm_aq", "target": "Air_Quality_MQ135",
           "features": ["Temperature_C", "Humidity_Pct", "Dust_Density_ug_m3"]},
    "M5": {"name": "lstm_pm25", "target": "Dust_Density_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135"]},
    "M6": {"name": "lstm_pm10", "target": "PM10_ug_m3",
           "features": ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"]},
}

WINDOW = 12
STEPS_PER_HOUR = 600  # 6s intervals


def load_models(model_dir):
    import os
    os.environ["KERAS_BACKEND"] = "torch"
    from keras.models import load_model

    loaded = {}
    for mk, cfg in MODELS.items():
        try:
            model = load_model(Path(model_dir) / "trained" / cfg["name"] / "forecaster.h5")
            scaler = joblib.load(Path(model_dir) / "trained" / cfg["name"] / "scaler.pkl")
            loaded[mk] = {"model": model, "scaler": scaler, "cfg": cfg}
        except Exception as e:
            print(f"Warning: Could not load {mk}: {e}")
    return loaded


def forecast_one(model, scaler, features, last_window, n_steps):
    preds = []
    window = last_window.copy()
    for _ in range(n_steps):
        pred_scaled = model.predict(window.reshape(1, WINDOW, -1), verbose=0)[0, 0]
        pred = scaler.inverse_transform([[pred_scaled]])[0, 0]
        preds.append(float(pred))
        new_row = window[-1].copy()
        new_row[0] = pred_scaled
        window = np.vstack([window[1:], new_row.reshape(1, -1)])
    return preds


def main():
    parser = argparse.ArgumentParser(description="Forecast from raw sensor readings")
    parser.add_argument("--temp", type=float, required=True, help="Temperature (C)")
    parser.add_argument("--hum", type=float, required=True, help="Humidity (%)")
    parser.add_argument("--aq", type=float, required=True, help="Air Quality (MQ135)")
    parser.add_argument("--dust", type=float, required=True, help="Dust Density (ug/m3)")
    parser.add_argument("--hours", type=float, default=1, help="Forecast hours (default: 1)")
    parser.add_argument("--model-dir", default=str(Path(__file__).parent.parent / "models"))
    args = parser.parse_args()

    readings = {"Temperature_C": args.temp, "Humidity_Pct": args.hum,
                "Air_Quality_MQ135": args.aq, "Dust_Density_ug_m3": args.dust}

    print(f"\nInput: Temp={args.temp}C  Hum={args.hum}%  AQ={args.aq}  Dust={args.dust} ug/m3")
    print(f"Forecast: {args.hours} hour(s) = {int(args.hours * STEPS_PER_HOUR)} steps\n")

    models = load_models(args.model_dir)
    n_steps = int(args.hours * STEPS_PER_HOUR)

    for mk, m in models.items():
        cfg = m["cfg"]
        feature_cols = cfg["features"]
        last_window = np.tile([readings[f] for f in feature_cols], (WINDOW, 1))
        preds = forecast_one(m["model"], m["scaler"], feature_cols, last_window, n_steps)

        print(f"--- {mk}: {cfg['target']} ---")
        print(f"  Current: {readings.get(cfg['target'], 'N/A')}")
        print(f"  1h forecast: {preds[STEPS_PER_HOUR-1]:.2f}")
        if args.hours >= 6:
            print(f"  6h forecast: {preds[min(STEPS_PER_HOUR*6-1, len(preds)-1)]:.2f}")
        if args.hours >= 24:
            print(f"  24h forecast: {preds[min(STEPS_PER_HOUR*24-1, len(preds)-1)]:.2f}")
        print()


if __name__ == "__main__":
    main()
