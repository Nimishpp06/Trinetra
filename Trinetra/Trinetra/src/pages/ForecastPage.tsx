import { useState, useEffect } from 'react'
import { Activity, Clock, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts'
import { useForecast } from '../hooks/useSupabase'
import { getStations, processReadings } from '../services/api'
import type { Station } from '../services/types'

export default function ForecastPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState('station_01')
  const [horizon, setHorizon] = useState(1)
  const { data, loading, error } = useForecast(selectedStation, horizon)

  useEffect(() => {
    getStations().then(setStations).catch(() => {})
  }, [])

  useEffect(() => {
    processReadings(selectedStation).catch(() => {})
  }, [selectedStation])

  const horizons = [
    { label: '1H', value: 1 },
    { label: '6H', value: 6 },
    { label: '12H', value: 12 },
    { label: '24H', value: 24 },
  ]

  const chartData = data?.forecast?.map(p => ({
    name: `+${p.offset_min}m`,
    aqi: p.aqi ?? null,
    pm25: p.pm25 ?? null,
    pm10: p.pm10 ?? null,
    temp: p.temp ?? null,
  })) || []

  const getAqiColor = (aqi: number | null) => {
    if (!aqi) return '#94a3b8'
    if (aqi <= 50) return '#22c55e'
    if (aqi <= 100) return '#eab308'
    if (aqi <= 200) return '#f97316'
    return '#ef4444'
  }

  const getAqiLabel = (aqi: number | null) => {
    if (!aqi) return '--'
    if (aqi <= 50) return 'Good'
    if (aqi <= 100) return 'Moderate'
    if (aqi <= 200) return 'Poor'
    return 'Hazardous'
  }

  const getDelta = (current: number | undefined, predicted: number | undefined) => {
    if (!current || !predicted) return null
    const diff = predicted - current
    const pct = ((diff / current) * 100).toFixed(0)
    return { value: diff.toFixed(1), pct: `${Math.abs(Number(pct))}%`, direction: diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat' }
  }

  const getEndValue = (key: string) => {
    if (!chartData.length) return undefined
    const last = chartData[chartData.length - 1]
    return last[key as keyof typeof last] as number | undefined
  }

  const aqiEnd = getEndValue('aqi')
  const pm25End = getEndValue('pm25')
  const pm10End = getEndValue('pm10')
  const tempEnd = getEndValue('temp')

  const aqiDelta = data?.current ? getDelta(data.current.aqi, aqiEnd) : null
  const pm25Delta = data?.current ? getDelta(data.current.pm25, pm25End) : null
  const pm10Delta = data?.current ? getDelta(data.current.pm10, pm10End) : null
  const tempDelta = data?.current ? getDelta(data.current.temp, tempEnd) : null

  const DeltaIcon = ({ dir }: { dir: string }) => {
    if (dir === 'up') return <ArrowUp className="w-4 h-4 text-red-400" />
    if (dir === 'down') return <ArrowDown className="w-4 h-4 text-green-400" />
    return <Minus className="w-4 h-4 text-slate-400" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Forecast</h1>
          <p className="text-slate-400 mt-1">Predict air quality using ML models</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Station</label>
          <select
            value={selectedStation}
            onChange={e => setSelectedStation(e.target.value)}
            className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Horizon</label>
          <div className="flex gap-1">
            {horizons.map(h => (
              <button
                key={h.value}
                onClick={() => setHorizon(h.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  horizon === h.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-blue-400 animate-pulse" />
          <p className="text-slate-400">Running LSTM models...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 rounded-2xl p-6 border border-red-800">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Current vs Predicted */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ForecastMetric label="AQI" current={data.current.aqi} predicted={aqiEnd} unit="" color={getAqiColor(aqiEnd || 0)} delta={aqiDelta} />
            <ForecastMetric label="PM2.5" current={data.current.pm25} predicted={pm25End} unit="μg/m³" color="#f97316" delta={pm25Delta} />
            <ForecastMetric label="PM10" current={data.current.pm10} predicted={pm10End} unit="μg/m³" color="#eab308" delta={pm10Delta} />
            <ForecastMetric label="Temp" current={data.current.temp} predicted={tempEnd} unit="°C" color="#3b82f6" delta={tempDelta} />
          </div>

          {/* AQI Chart */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              AQI Forecast
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 10 }} />
                <ReferenceLine y={100} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#eab308', fontSize: 10 }} />
                <ReferenceLine y={200} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Poor', fill: '#f97316', fontSize: 10 }} />
                <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fill="url(#aqiGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* PM2.5 Chart */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">PM2.5 Forecast</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="pm25" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} name="PM2.5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* PM10 + Temp charts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">PM10 Forecast</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="pm10" stroke="#eab308" strokeWidth={2} dot={{ fill: '#eab308', r: 3 }} name="PM10" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Temperature Forecast</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Temp (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-slate-300">
                Forecast accuracy decreases beyond 30 minutes. LSTM models are trained on limited historical data and use recursive prediction which compounds error over longer horizons.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                1H = {horizon * 100} prediction steps | 6H = {horizon * 600} steps | 24H = {horizon * 2400} steps
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ForecastMetric({ label, current, predicted, unit, color, delta }: {
  label: string
  current: number | undefined
  predicted: number | undefined
  unit: string
  color: string
  delta: { value: string; pct: string; direction: string } | null
}) {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{predicted?.toFixed(1) || '--'}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-slate-500">Now: {current?.toFixed(1) || '--'}</span>
        {delta && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            delta.direction === 'up' ? 'text-red-400' : delta.direction === 'down' ? 'text-green-400' : 'text-slate-400'
          }`}>
            {delta.direction === 'up' ? '+' : delta.direction === 'down' ? '' : ''}{delta.value} ({delta.pct})
            <svg width="0" height="0"><line x1="0" y1="0" x2="0" y2="0" /></svg>
          </span>
        )}
      </div>
      {unit && <p className="text-xs text-slate-500 mt-0.5">{unit}</p>}
    </div>
  )
}
