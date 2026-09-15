export interface Station {
  id: string
  name: string
  lat: number
  lng: number
  created_at: string
}

export interface Reading {
  id: number
  station_id: string
  temperature: number | null
  humidity: number | null
  mq135_raw: number | null
  dust_density: number | null
  recorded_at: string
}

export interface ProcessedReading {
  id: number
  reading_id: number
  station_id: string
  temperature: number | null
  humidity: number | null
  pm25_ug_m3: number | null
  pm10_ug_m3: number | null
  aqi: number | null
  source: string | null
  source_confidence: number | null
  thermal_comfort: string | null
  processed_at: string
}

export interface StationWithReading extends Station {
  latest_reading: ProcessedReading | null
}

export interface ForecastPoint {
  offset_min: number
  aqi?: number
  pm25?: number
  pm10?: number
  temp?: number
}

export interface ForecastResponse {
  station_id: string
  hours: number
  current: {
    temp: number
    humidity: number
    pm25: number
    pm10: number
    aqi: number
  }
  forecast: ForecastPoint[]
}

export interface PredictRequest {
  pm25: number
  gas_ppm: number
  temp: number
  humidity: number
  station_id?: string
  past_aqi?: number[]
}

export interface PredictResponse {
  source: string
  source_confidence: number
  current_aqi: number
  forecast_aqi: number | null
  model_version: string
}

export interface AskRequest {
  question: string
  station_id?: string
  language?: string
}

export interface AskResponse {
  answer: string
  language: string
  sources: string[]
  refused: boolean
}
