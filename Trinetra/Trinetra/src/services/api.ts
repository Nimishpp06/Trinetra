import { supabase } from './supabase'
import type { Station, ProcessedReading, StationWithReading, ForecastResponse, AskRequest, AskResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// ── Supabase queries ──

export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .order('id')
  if (error) throw error
  return data || []
}

export async function getLatestReadings(): Promise<StationWithReading[]> {
  const { data: stations, error: sErr } = await supabase
    .from('stations')
    .select('*')
    .order('id')
  if (sErr) throw sErr
  if (!stations) return []

  const results: StationWithReading[] = []
  for (const station of stations) {
    const { data: readings } = await supabase
      .from('processed_readings')
      .select('*')
      .eq('station_id', station.id)
      .order('processed_at', { ascending: false })
      .limit(1)

    results.push({
      ...station,
      latest_reading: readings?.[0] || null,
    })
  }
  return results
}

export async function getStationHistory(stationId: string, hours: number = 24): Promise<ProcessedReading[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('processed_readings')
    .select('*')
    .eq('station_id', stationId)
    .gte('processed_at', since)
    .order('processed_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getAllRecentReadings(hours: number = 24): Promise<ProcessedReading[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('processed_readings')
    .select('*')
    .gte('processed_at', since)
    .order('processed_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── API endpoints ──

export async function processReadings(stationId?: string): Promise<{ processed: number }> {
  const params = new URLSearchParams()
  if (stationId) params.set('station_id', stationId)
  const res = await fetch(`${API_BASE}/process?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Process failed: ${res.status}`)
  return res.json()
}

export async function getForecast(stationId: string, hours: number = 1): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE}/forecast?station_id=${stationId}&hours=${hours}`)
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`)
  return res.json()
}

export async function postQuestion(req: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  return res.json()
}
