#!/usr/bin/env python3
"""
Helper script to label source_label column in processed data.

Run this after processing raw data to manually label samples.
It opens an interactive session to label each unique sensor pattern.

Usage:
    python label_data.py
"""

import pandas as pd
import numpy as np
from pathlib import Path


def label_interactive(data_path=None):
    """Interactive labeling tool."""
    if data_path is None:
        base_dir = Path(__file__).parent.parent
        data_path = str(base_dir / "data/processed/air_quality_data.csv")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows")
    
    if 'source_label' not in df.columns:
        df['source_label'] = 'unlabeled'
    
    unlabeled = df[df['source_label'] == 'unlabeled']
    print(f"Unlabeled rows: {len(unlabeled)}")
    
    if len(unlabeled) == 0:
        print("All data already labeled!")
        return
    
    # Show unique sensor patterns (binned) to help labeling
    unlabeled = unlabeled.copy()
    unlabeled['pm25_bin'] = pd.cut(unlabeled['pm25'], bins=[0, 40, 120, 250, 500], 
                                     labels=['low', 'med', 'high', 'very_high'])
    unlabeled['gas_bin'] = pd.cut(unlabeled['gas_ppm'], bins=[0, 200, 500, 1000, 5000], 
                                    labels=['low', 'med', 'high', 'very_high'])
    
    patterns = unlabeled.groupby(['pm25_bin', 'gas_bin']).size().reset_index(name='count')
    patterns = patterns.sort_values('count', ascending=False)
    
    print("\nTop sensor patterns (unlabeled):")
    for _, row in patterns.head(20).iterrows():
        subset = unlabeled[
            (unlabeled['pm25_bin'] == row['pm25_bin']) & 
            (unlabeled['gas_bin'] == row['gas_bin'])
        ]
        pm_range = f"{subset['pm25'].min():.0f}-{subset['pm25'].max():.0f}"
        gas_range = f"{subset['gas_ppm'].min():.0f}-{subset['gas_ppm'].max():.0f}"
        temp_range = f"{subset['temp'].min():.1f}-{subset['temp'].max():.1f}"
        hum_range = f"{subset['humidity'].min():.1f}-{subset['humidity'].max():.1f}"
        print(f"  PM2.5: {pm_range}, Gas: {gas_range}, Temp: {temp_range}°C, Hum: {hum_range}% -> {row['count']} samples")
    
    print("\nLabeling guide:")
    print("  ambient:    PM2.5 10-40,  Gas 50-200,   Temp 25-35, Hum 40-70")
    print("  traffic:    PM2.5 80-250, Gas 300-800,  Temp 30-45, Hum 30-50")
    print("  industrial: PM2.5 40-120, Gas 500-2000, Temp 35-50, Hum 20-40")
    print("\nEnter label for each pattern (ambient/traffic/industrial/skip):")
    
    for _, row in patterns.iterrows():
        subset_idx = unlabeled[
            (unlabeled['pm25_bin'] == row['pm25_bin']) & 
            (unlabeled['gas_bin'] == row['gas_bin'])
        ].index
        
        label = input(f"\nPattern PM2.5={row['pm25_bin']}, Gas={row['gas_bin']} ({row['count']} samples): ").strip().lower()
        
        if label in ['ambient', 'traffic', 'industrial']:
            df.loc[subset_idx, 'source_label'] = label
            print(f"  Labeled {len(subset_idx)} rows as '{label}'")
        elif label == 'skip':
            continue
        elif label == 'quit':
            break
        else:
            print("  Invalid label, skipping")
    
    # Save
    df.to_csv(data_path, index=False)
    print(f"\nSaved labels to {data_path}")
    print("\nLabel distribution:")
    print(df['source_label'].value_counts())


def label_by_rules(data_path=None):
    """Auto-label using heuristic rules based on sensor ranges."""
    if data_path is None:
        base_dir = Path(__file__).parent.parent
        data_path = str(base_dir / "data/processed/air_quality_data.csv")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows")
    
    def classify(row):
        pm, gas, temp, hum = row['pm25'], row['gas_ppm'], row['temp'], row['humidity']
        
        # Traffic: high PM2.5 + high gas + higher temp + lower humidity (rush hour)
        if pm >= 80 and gas >= 300 and temp >= 30 and hum <= 50:
            return 'traffic'
        
        # Industrial: moderate PM2.5 + very high gas + high temp + low humidity
        if pm >= 40 and gas >= 500 and temp >= 35 and hum <= 40:
            return 'industrial'
        
        # Ambient: low PM2.5 + low gas
        if pm <= 40 and gas <= 200:
            return 'ambient'
        
        return 'unlabeled'
    
    df['source_label'] = df.apply(classify, axis=1)
    df.to_csv(data_path, index=False)
    print(f"Auto-labeled and saved to {data_path}")
    print("\nLabel distribution:")
    print(df['source_label'].value_counts())
    
    if 'location_id' in df.columns:
        print("\nLabel distribution by location:")
        print(df.groupby(['location_id', 'source_label']).size().unstack(fill_value=0))


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--auto':
        label_by_rules()
    else:
        label_interactive()