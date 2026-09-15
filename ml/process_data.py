#!/usr/bin/env python3
"""Wrapper to call data processing from ml/ folder."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "data"))
from process_raw import process_somaiya_data

if __name__ == "__main__":
    process_somaiya_data()
