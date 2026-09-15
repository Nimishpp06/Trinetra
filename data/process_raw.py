#!/usr/bin/env python3
"""
Process Somaiya dataset to raw-only format with pollution source labels.

Input: Miniproject (Somaiya AQI Datasets)/Somaiya_Campus_All_19_Locations_Combined_Updated.csv
Output: data/processed/raw_only.csv
"""

import pandas as pd
from pathlib import Path

# Real-world pollution source labels for each location
LOCATION_TO_SOURCE = {
    "Location 01: Somaiya Statue": "ambient",
    "Location 02: Gargi Plaza": "traffic",
    "Location 03: A Building Quadrangle": "ambient",
    "Location 04: Polytechnic Quadrangle": "ambient",
    "Location 05: KJ Arts Commerce": "industrial",
    "Location 06: Outside Engg Canteen": "industrial",
    "Location 07: Ganpati Murti VH Gate": "traffic",
    "Location 08: Near Basketball Court": "ambient",
    "Location 09: Vidyavihar Side Gate": "traffic",
    "Location 10: SIMSR Canteen Indoor": "indoor",
    "Location 11: Somaiya School Entry": "traffic",
    "Location 12: Cricket Ground": "ambient",
    "Location 13: Faculty Parking": "traffic",
    "Location 14: Inside Aurobindo Bldg": "indoor",
    "Location 15: Tilaknagar Gate": "traffic",
    "Location 16: Relay Ground Centre": "ambient",
    "Location 17: Engg Canteen Indoor": "indoor",
    "Location 18: Classroom Indoor": "indoor",
    "Location 19: Shamshan Ghat": "industrial",
}


def process_raw(input_path=None, output_path=None):
    base_dir = Path(__file__).parent.parent
    if input_path is None:
        input_path = str(base_dir / "Miniproject (Somaiya AQI Datasets)" / "Somaiya_Campus_All_19_Locations_Combined_Updated.csv")
    if output_path is None:
        output_path = str(base_dir / "data" / "processed" / "raw_only.csv")

    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} rows")

    # Keep only raw sensor columns
    raw_cols = ["Timestamp", "Location", "Temperature_C", "Humidity_Pct",
                "Air_Quality_MQ135", "Dust_Density_ug_m3"]
    df = df[[c for c in raw_cols if c in df.columns]].copy()

    # Rename for consistency
    df = df.rename(columns={"Timestamp": "timestamp", "Location": "location_id"})
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values(["location_id", "timestamp"]).reset_index(drop=True)

    # Add pollution source labels
    df["pollution_source"] = df["location_id"].map(LOCATION_TO_SOURCE)
    unmapped = df[df["pollution_source"].isna()]["location_id"].unique()
    if len(unmapped) > 0:
        print(f"WARNING: Unmapped locations: {unmapped}")
    df = df.dropna(subset=["pollution_source"])

    # Drop rows with NaN in sensor columns
    sensor_cols = ["Temperature_C", "Humidity_Pct", "Air_Quality_MQ135", "Dust_Density_ug_m3"]
    before = len(df)
    df = df.dropna(subset=sensor_cols)
    print(f"Removed {before - len(df)} rows with NaN")

    # Save
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} rows to {output_path}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nPollution source distribution:")
    print(df["pollution_source"].value_counts().to_string())
    print(f"\nLocations per source:")
    for source in sorted(df["pollution_source"].unique()):
        locs = df[df["pollution_source"]==source]["location_id"].nunique()
        print(f"  {source}: {locs} locations")
    return df


if __name__ == "__main__":
    import sys
    process_raw(sys.argv[1] if len(sys.argv) > 1 else None)
