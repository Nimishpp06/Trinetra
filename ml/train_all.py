#!/usr/bin/env python3
"""
ML Pipeline Orchestrator - All 6 models.
Raw data only. 80-10-10 split.
"""

import sys, time
from pathlib import Path


def run_script(script, args=None):
    import subprocess
    cmd = [sys.executable, str(Path(__file__).parent / script)]
    if args: cmd.extend(args)
    print(f"\n{'='*60}\n  Running: {script}\n{'='*60}")
    return subprocess.run(cmd).returncode == 0


def main():
    t0 = time.time()
    print("="*60)
    print("  AIR QUALITY ML PIPELINE — M1 through M6 (Raw Data)")
    print("="*60)

    print("\n[1/3] Processing raw data with pollution source labels...")
    if not run_script("../data/process_raw.py"):
        sys.exit(1)

    print("\n[2/3] Training RF models (M1=Pollution Source, M2=Thermal Comfort)...")
    if not run_script("train_rf.py"):
        sys.exit(1)

    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    print(f"\n[3/3] Training LSTM models (M3-M6, {epochs} epochs)...")
    if not run_script("train_lstm.py", [str(epochs)]):
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  COMPLETE ({time.time()-t0:.1f}s)")
    print(f"{'='*60}")
    print("\nFolder structure:")
    print("  models/")
    print("    trained/")
    print("      M1_rf_pollution_source/  (model.joblib, encoder.joblib)")
    print("      M2_rf_thermal_comfort/   (model.joblib, encoder.joblib)")
    print("      M3_lstm_temperature/     (forecaster.h5, scaler.pkl, training_history.csv)")
    print("      M4_lstm_aqi/             (forecaster.h5, scaler.pkl, training_history.csv)")
    print("      M5_lstm_pm25/            (forecaster.h5, scaler.pkl, training_history.csv)")
    print("      M6_lstm_pm10/            (forecaster.h5, scaler.pkl, training_history.csv)")
    print("    visualizations/")
    print("      M1/ M2/ M3/ M4/ M5/ M6/  (PNG plots)")
    print("    metrics/")
    print("      M1-M6_metrics.json")


if __name__ == "__main__":
    main()
