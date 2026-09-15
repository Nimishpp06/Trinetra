import { useState, useEffect } from 'react'
import type { ProcessedReading, ForecastResponse } from '../services/types'
import { getStationHistory, getForecast } from '../services/api'

export function useStationHistory(stationId: string | null, hours: number = 24) {
  const [readings, setReadings] = useState<ProcessedReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!stationId) { setLoading(false); return }
    let active = true
    async function load() {
      try {
        setLoading(true)
        const data = await getStationHistory(stationId, hours)
        if (active) setReadings(data)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [stationId, hours])

  return { readings, loading, error }
}

export function useForecast(stationId: string, hours: number) {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getForecast(stationId, hours)
      .then(d => { if (active) setData(d) })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Failed') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [stationId, hours])

  return { data, loading, error }
}
