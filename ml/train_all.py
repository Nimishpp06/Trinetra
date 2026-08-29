#!/usr/bin/env python3
"""
Main training orchestrator - runs full ML pipeline.

Pipeline:
1. Process raw CSV data -> data/processed/air_quality_data.csv
2. Train Random Forest classifier (source detection) -> accuracy, F1, confusion matrix
3. Train LSTM forecaster (AQI prediction) -> RMSE, MAE

Run: python train_all.py
"""

import sys
import subprocess
from pathlib import Path


def run_script(script_name: str, args: list = None) -> bool:
    """Run a Python script and return success status."""
    # Get the directory of this script to resolve relative paths
    base_dir = Path(__file__).parent
    cmd = [sys.executable, str(base_dir / script_name)]
    if args:
        cmd.extend(args)
    
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'='*60}\n")
    
    result = subprocess.run(cmd, capture_output=False)
    return result.returncode == 0


def main():
    print("="*60)
    print("AIR QUALITY ML TRAINING PIPELINE")
    print("="*60)
    
    # Step 1: Process raw data (in data/ folder)
    print("\n[1/3] Processing raw sensor data...")
    if not run_script("../data/process_raw.py"):
        print("ERROR: Data processing failed")
        sys.exit(1)
    
    # Step 2: Train Random Forest
    print("\n[2/3] Training Random Forest classifier...")
    rf_args = ["train_rf.py"]
    if '--per-location' in sys.argv:
        rf_args.append('--per-location')
    if not run_script(*rf_args):
        print("ERROR: Random Forest training failed")
        sys.exit(1)
    
    # Step 3: Train LSTM
    print("\n[3/3] Training LSTM forecaster...")
    lstm_args = ["train_lstm.py"]
    if '--per-location' in sys.argv:
        lstm_args.append('--per-location')
    if not run_script(*lstm_args):
        print("ERROR: LSTM training failed")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print("\nModels saved to models/:")
    print("  - rf_source_classifier_global.joblib (Random Forest - global)")
    print("  - rf_label_encoder_global.joblib (Label encoder - global)")
    print("  - rf_confusion_matrix_global.png (Confusion matrix plot)")
    print("  - rf_source_classifier_<location>.joblib (Per-location, if --per-location)")
    print("  - lstm_aqi_forecaster.h5 (LSTM - global)")
    print("  - lstm_scaler.pkl (MinMaxScaler - global)")
    print("  - lstm_training_history.csv (Training curves)")
    print("  - lstm_test_predictions.csv (Test set predictions)")
    print("  - lstm_aqi_forecaster_<location>.h5 (Per-location, if --per-location)")


if __name__ == "__main__":
    main()