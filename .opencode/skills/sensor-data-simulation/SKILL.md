---
name: sensor-data-simulation
description: Generate synthetic air quality sensor readings (GP2Y1010AU0F, MQ-135, DHT11) with realistic noise for 3 pollution source classes
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: data-generation
---
## What I do
- Generate CSV with columns: timestamp, pm25, gas_ppm, temp, humidity, source_label
- Simulate 3 source classes with distinct sensor signatures calibrated to Indian CPCB AQI bands
  - ambient: PM2.5 10-40, gas 50-200 PPM, temp 25-35°C, humidity 40-70%
  - traffic: PM2.5 80-250, gas 300-800 PPM, temp 30-45°C, humidity 30-50% (rush hour peaks 7-10AM, 5-8PM)
  - industrial: PM2.5 40-120, gas 500-2000 PPM, temp 35-50°C, humidity 20-40%
- Add Gaussian noise (±5-15%) to simulate real sensor jitter
- Generate ~5000 rows at 10-min intervals over 7 simulated days
- Ensure column schema matches what ESP32 firmware will later produce
