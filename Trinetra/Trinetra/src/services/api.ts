import { supabase } from './supabase'
import type { Station, ProcessedReading, StationWithReading, ForecastResponse, AskRequest, AskResponse } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Vercel rewrites /api/* to the FastAPI function (vercel.json), so '/api' IS the
// correct production value there. A plain static host has no rewrite and would
// 404 every call — so warn only when the variable is genuinely unset, never when
// it is deliberately '/api'. (Testing `API_BASE === '/api'` fired the warning on
// every Vercel deploy and read as a fault where there was none.)
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE) {
  console.warn(
    '[api] VITE_API_BASE is not set — defaulting to "/api", which only resolves ' +
      'behind a rewrite (Vercel) or the dev proxy. Set it to your API origin, ' +
      'e.g. https://<host>/api',
  )
}

// A sleeping Hugging Face Space can take ~30s to wake. Bound the wait so the
// UI fails with a readable message instead of spinning until the browser's
// ~300s default timeout while the jury watches.
const API_TIMEOUT_MS = 30_000

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error('The ML API is taking longer than usual — it may be waking up. Try again in ~30 seconds.')
    }
    throw new Error('Could not reach the ML API. Check your connection and try again.')
  }
}

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

// Static hosts answer missing API routes with an HTML page (status 200),
// which would otherwise blow up inside res.json() with "Unexpected token '<'".
function parseJson<T>(res: Response, unavailableMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(unavailableMessage)
  }
  return res.json() as Promise<T>
}

export async function processReadings(stationId?: string): Promise<{ processed: number }> {
  const params = new URLSearchParams()
  if (stationId) params.set('station_id', stationId)
  const res = await apiFetch(`/process?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Process failed: ${res.status}`)
  return parseJson<{ processed: number }>(res, 'Processing unavailable in this build')
}

export async function getForecast(stationId: string, hours: number = 1): Promise<ForecastResponse> {
  const res = await apiFetch(`/forecast?station_id=${stationId}&hours=${hours}`)
  if (!res.ok) throw new Error(`Forecast failed: ${res.status}`)
  return parseJson<ForecastResponse>(res, 'Forecast unavailable in this build')
}

export async function postQuestion(req: AskRequest): Promise<AskResponse> {
  const res = await apiFetch('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  return parseJson<AskResponse>(res, 'AI assistant unavailable in this build')
}
