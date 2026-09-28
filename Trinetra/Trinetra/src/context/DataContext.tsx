import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getStations, getLatestReadings, getAllRecentReadings, processReadings } from '../services/api'
import type { Station, ProcessedReading, StationWithReading } from '../services/types'

interface DataContextValue {
  stations: Station[]
  stationReadings: StationWithReading[]
  recentReadings: ProcessedReading[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const REFRESH_INTERVAL = 30_000

export function DataProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>([])
  const [stationReadings, setStationReadings] = useState<StationWithReading[]>([])
  const [recentReadings, setRecentReadings] = useState<ProcessedReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    try {
      setError(null)

      // Push raw readings through the ML models first, so the queries below
      // see fresh processed_readings. Previously this only happened when the
      // Forecast page was opened, which left the dashboard blank.
      // Failure is non-fatal (API offline / demo mode) and must never block
      // the dashboard from rendering.
      await Promise.race([
        processReadings().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ])

      const [s, sr, rr] = await Promise.all([
        getStations(),
        getLatestReadings(),
        getAllRecentReadings(24),
      ])
      setStations(s)
      setStationReadings(sr)
      setRecentReadings(rr)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
    const timer = setInterval(refreshData, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [refreshData])

  return (
    <DataContext.Provider value={{ stations, stationReadings, recentReadings, loading, error, refreshData }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
