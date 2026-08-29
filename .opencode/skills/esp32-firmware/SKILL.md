---
name: esp32-firmware
description: Write ESP32 Arduino sketch to read GP2Y1010AU0F, MQ-135, DHT11 sensors and output CSV matching the project schema
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: firmware
---
## What I do
- Read analog pin for GP2Y1010AU0F (PM2.5) and MQ-135 (gas PPM)
- Read DHT11 digital pin for temperature and humidity
- Output CSV lines matching schema: timestamp,pm25,gas_ppm,temp,humidity,source_label
- Write to Serial (for data logger) or SD card
- Source_label defaults to "real" for later classification
