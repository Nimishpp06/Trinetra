#!/usr/bin/env python3
"""
Process raw CSV files from ESP32 sensors into a unified processed dataset.

Input: CSV files in data/raw/ with columns:
    timestamp, pm25, gas_ppm, temp, humidity, source_label

Output: data/processed/air_quality_data.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys


def process_raw_data(raw_dir: str = "data/raw", output_path: str = "data/processed/air_quality_data.csv"):
    """Process all CSV files in raw_dir and save unified processed CSV."""
    raw_path = Path(raw_dir)
    csv_files = list(raw_path.glob("*.csv"))
    
    if not csv_files:
        print(f"No CSV files found in {raw_dir}")
        print("Please place ESP32 CSV files in data/raw/")
        sys.exit(1)
    
    print(f"Found {len(csv_files)} CSV file(s) in {raw_dir}")
    
    dfs = []
    for f in csv_files:
        try:
            df = pd.read_csv(f)
            print(f"  Loaded {f.name}: {len(df)} rows")
            dfs.append(df)
        except Exception as e:
            print(f"  Error loading {f.name}: {e}")
    
    if not dfs:
        print("No valid data loaded")
        sys.exit(1)
    
    combined = pd.concat(dfs, ignore_index=True)
    print(f"Combined: {len(combined)} rows")
    
    # Map your actual column names to expected names
    column_mapping = {
        'Timestamp': 'timestamp',
        'Temperature (°C)': 'temp',
        'Humidity (%)': 'humidity',
        'Air Quality (MQ135)': 'gas_ppm',
        'Dust Density (µg/m³)': 'pm25',
        'Dust Density (ug/m3)': 'pm25',  # fallback for encoding issues
    }
    
    # Rename columns if they exist
    for old, new in column_mapping.items():
        if old in combined.columns:
            combined = combined.rename(columns={old: new})
    
    # Validate required columns
    required_cols = ['timestamp', 'pm25', 'gas_ppm', 'temp', 'humidity']
    missing = [c for c in required_cols if c not in combined.columns]
    if missing:
        print(f"Missing required columns: {missing}")
        print(f"Available columns: {list(combined.columns)}")
        sys.exit(1)
    
    # Add location_id if not present (extract from filename or default)
    if 'location_id' not in combined.columns:
        # Try to extract from filename
        combined['location_id'] = 'unknown'
        for f in csv_files:
            mask = combined.index.isin(pd.read_csv(f).index)
            # Use filename (without .csv) as location_id
            loc_name = f.stem
            combined.loc[mask, 'location_id'] = loc_name
        print(f"Added location_id from filenames: {combined['location_id'].unique()}")
    
    # Parse timestamps
    combined['timestamp'] = pd.to_datetime(combined['timestamp'], errors='coerce')
    combined = combined.dropna(subset=['timestamp'])
    
    # Sort by timestamp
    combined = combined.sort_values('timestamp').reset_index(drop=True)
    
    # Handle source_label - if missing, fill with 'unlabeled'
    if 'source_label' not in combined.columns:
        combined['source_label'] = 'unlabeled'
        print("Warning: 'source_label' column not found, filled with 'unlabeled'")
    else:
        # Fill missing labels
        combined['source_label'] = combined['source_label'].fillna('unlabeled')
    
    # Basic cleaning - remove rows with NaN sensor values
    before = len(combined)
    combined = combined.dropna(subset=['pm25', 'gas_ppm', 'temp', 'humidity'])
    after = len(combined)
    if before != after:
        print(f"Removed {before - after} rows with NaN sensor values")
    
    # Remove unrealistic values (basic sanity checks)
    combined = combined[
        (combined['pm25'] >= 0) & (combined['pm25'] <= 500) &
        (combined['gas_ppm'] >= 0) & (combined['gas_ppm'] <= 5000) &
        (combined['temp'] >= -10) & (combined['temp'] <= 60) &
        (combined['humidity'] >= 0) & (combined['humidity'] <= 100)
    ]
    
    # Save processed data
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(output_path, index=False)
    print(f"Saved processed data to {output_path}: {len(combined)} rows")
    
    # Print label distribution
    if 'source_label' in combined.columns:
        print("\nSource label distribution:")
        print(combined['source_label'].value_counts())
    
    return combined


def compute_aqi(pm25: float) -> float:
    """Compute AQI from PM2.5 using CPCB piecewise formula."""
    # CPCB AQI breakpoints for PM2.5
    breakpoints = [
        (0, 30, 0, 50),
        (31, 60, 51, 100),
        (61, 90, 101, 200),
        (91, 120, 201, 300),
        (121, 250, 301, 400),
        (251, 380, 401, 500),
    ]
    
    for pm_low, pm_high, aqi_low, aqi_high in breakpoints:
        if pm_low <= pm25 <= pm_high:
            aqi = aqi_low + (aqi_high - aqi_low) * (pm25 - pm_low) / (pm_high - pm_low)
            return round(aqi, 1)
    
    # Above 380
    if pm25 > 380:
        return 500.0
    return 0.0


if __name__ == "__main__":
    process_raw_data()