import { useState, useEffect } from 'react';
import { Clock, TrendingUp, ArrowUp, ArrowDown, Minus, Zap, AlertTriangle } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, AreaChart, Area
} from 'recharts';
import { useForecast } from '../hooks/useSupabase';
import { getStations, processReadings } from '../services/api';
import type { Station } from '../services/types';

function getAqiColor(aqi: number): string {
    if (aqi <= 50) return '#16a34a';
    if (aqi <= 100) return '#d97706';
    if (aqi <= 200) return '#ea580c';
    return '#dc2626';
}

function getAqiStatus(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    if (aqi <= 300) return 'Unhealthy';
    return 'Severe';
}

const AQI_TOOLTIP = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '10px 14px', fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ color: getAqiColor(payload[0].value) }}>
                    AQI: <b>{payload[0].value}</b>
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                        ({getAqiStatus(payload[0].value)})
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default function ForecastPage() {
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState('station_01');
    const [horizon, setHorizon] = useState(1);
    const { data, loading, error } = useForecast(selectedStation, horizon);

    useEffect(() => {
        getStations().then(setStations).catch(() => {});
    }, []);

    useEffect(() => {
        processReadings(selectedStation).catch(() => {});
    }, [selectedStation]);

    const horizons = [
        { label: '1 Hour', value: 1 },
        { label: '6 Hours', value: 6 },
        { label: '12 Hours', value: 12 },
        { label: '24 Hours', value: 24 },
    ];

    const chartData = data?.forecast?.map(p => ({
        name: `+${p.offset_min}m`,
        aqi: p.aqi ?? null,
        pm25: p.pm25 ?? null,
        pm10: p.pm10 ?? null,
        temp: p.temp ?? null,
    })) || [];

    const getDelta = (current: number | undefined, predicted: number | undefined) => {
        if (!current || !predicted) return null;
        const diff = predicted - current;
        const pct = ((diff / current) * 100).toFixed(0);
        return {
            value: diff.toFixed(1),
            pct: `${Math.abs(Number(pct))}%`,
            direction: diff > 0.5 ? 'up' as const : diff < -0.5 ? 'down' as const : 'flat' as const,
        };
    };

    const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const current = data?.current;

    return (
        <div className="page-content">
            <div className="analytics-header">
                <h1>Forecast</h1>
                <p>Predict air quality using trained LSTM models. Forecasts run at 5-minute intervals.</p>
            </div>

            {/* Controls */}
            <div className="analytics-filters">
                <div>
                    <select
                        className="filter-select"
                        value={selectedStation}
                        onChange={e => setSelectedStation(e.target.value)}
                    >
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-divider" />

                <div className="filter-pills">
                    {horizons.map(h => (
                        <button
                            key={h.value}
                            className={`filter-pill${horizon === h.value ? ' active' : ''}`}
                            onClick={() => setHorizon(h.value)}
                        >
                            {h.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="chart-card" style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>🧠</div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        Running LSTM models...
                    </p>
                </div>
            )}

            {error && (
                <div className="chart-card" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
                    <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Current vs Predicted Cards */}
                    <div className="historical-stats-grid">
                        <ForecastCard
                            label="AQI"
                            current={current?.aqi}
                            predicted={lastPoint?.aqi}
                            unit=""
                            getStatus={getAqiStatus}
                            getColor={getAqiColor}
                            delta={current?.aqi != null && lastPoint?.aqi != null ? getDelta(current.aqi, lastPoint.aqi) : null}
                        />
                        <ForecastCard
                            label="PM2.5"
                            current={current?.pm25}
                            predicted={lastPoint?.pm25}
                            unit="μg/m³"
                            getStatus={(v) => v > 35 ? 'Above Limit' : 'Normal'}
                            getColor={(v) => v > 35 ? '#dc2626' : '#16a34a'}
                            delta={current?.pm25 != null && lastPoint?.pm25 != null ? getDelta(current.pm25, lastPoint.pm25) : null}
                        />
                        <ForecastCard
                            label="PM10"
                            current={current?.pm10}
                            predicted={lastPoint?.pm10}
                            unit="μg/m³"
                            getStatus={(v) => v > 50 ? 'Above Limit' : 'Normal'}
                            getColor={(v) => v > 50 ? '#dc2626' : '#16a34a'}
                            delta={current?.pm10 != null && lastPoint?.pm10 != null ? getDelta(current.pm10, lastPoint.pm10) : null}
                        />
                        <ForecastCard
                            label="Temperature"
                            current={current?.temp}
                            predicted={lastPoint?.temp}
                            unit="°C"
                            getStatus={() => ''}
                            getColor={() => '#3b82f6'}
                            delta={current?.temp != null && lastPoint?.temp != null ? getDelta(current.temp, lastPoint.temp) : null}
                        />
                    </div>

                    {/* AQI Forecast Chart */}
                    <div className="chart-card chart-card--wide">
                        <div className="chart-card__header">
                            <div>
                                <div className="chart-card__title">AQI Forecast</div>
                                <div className="chart-card__subtitle">
                                    {horizon}H horizon — {chartData.length} prediction points at 5-min intervals
                                </div>
                            </div>
                        </div>
                        {chartData.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                                No forecast data available. Make sure the API server is running.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9b1c1c" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#9b1c1c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                                    <Tooltip content={<AQI_TOOLTIP />} />
                                    <ReferenceLine y={50} stroke="#16a34a" strokeDasharray="3 3" label={{ value: 'Good', fill: '#16a34a', fontSize: 10 }} />
                                    <ReferenceLine y={100} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Moderate', fill: '#d97706', fontSize: 10 }} />
                                    <ReferenceLine y={200} stroke="#ea580c" strokeDasharray="3 3" label={{ value: 'Poor', fill: '#ea580c', fontSize: 10 }} />
                                    <Area type="monotone" dataKey="aqi" stroke="#9b1c1c" fill="url(#aqiGrad)" strokeWidth={2}
                                        dot={{ r: 3, fill: '#9b1c1c', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 5, fill: '#9b1c1c' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* PM2.5 + PM10 side by side */}
                    <div className="historical-content-grid">
                        <div className="chart-card">
                            <div className="chart-card__header">
                                <div>
                                    <div className="chart-card__title">PM2.5 Forecast</div>
                                    <div className="chart-card__subtitle">Fine particulate matter</div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                        formatter={(val: number) => [`${val} μg/m³`, 'PM2.5']}
                                    />
                                    <Line type="monotone" dataKey="pm25" stroke="#ea580c" strokeWidth={2}
                                        dot={{ r: 3, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }} name="PM2.5" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="chart-card__header">
                                <div>
                                    <div className="chart-card__title">PM10 Forecast</div>
                                    <div className="chart-card__subtitle">Coarse particulate matter</div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                        formatter={(val: number) => [`${val} μg/m³`, 'PM10']}
                                    />
                                    <Line type="monotone" dataKey="pm10" stroke="#d97706" strokeWidth={2}
                                        dot={{ r: 3, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} name="PM10" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Temperature Forecast */}
                    <div className="chart-card chart-card--wide">
                        <div className="chart-card__header">
                            <div>
                                <div className="chart-card__title">Temperature Forecast</div>
                                <div className="chart-card__subtitle">Predicted temperature over time</div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                    formatter={(val: number) => [`${val}°C`, 'Temperature']}
                                />
                                <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2}
                                    dot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} name="Temp" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Disclaimer */}
                    <div className="chart-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 22px' }}>
                        <AlertTriangle size={16} style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: 12.5, color: 'var(--color-text-body)', lineHeight: 1.6 }}>
                                Forecast accuracy decreases beyond 30 minutes. LSTM models use recursive prediction
                                which compounds error over longer horizons. Use for trend guidance, not exact values.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function ForecastCard({ label, current, predicted, unit, getStatus, getColor, delta }: {
    label: string;
    current: number | undefined;
    predicted: number | undefined;
    unit: string;
    getStatus: (v: number) => string;
    getColor: (v: number) => string;
    delta: { value: string; pct: string; direction: 'up' | 'down' | 'flat' } | null;
}) {
    const color = predicted != null ? getColor(predicted) : 'var(--color-text-muted)';
    const status = predicted != null ? getStatus(predicted) : '';

    return (
        <div className="historical-stat-card">
            <div className="historical-stat-card__label">{label}</div>
            <div className="historical-stat-card__value" style={{ color }}>
                {predicted != null ? predicted.toFixed(1) : '--'}
                {unit && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 4 }}>{unit}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Now: {current != null ? current.toFixed(1) : '--'}
                </span>
                {delta && (
                    <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: delta.direction === 'up' ? '#dc2626' : delta.direction === 'down' ? '#16a34a' : 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                        {delta.direction === 'up' ? <ArrowUp size={12} /> : delta.direction === 'down' ? <ArrowDown size={12} /> : <Minus size={12} />}
                        {delta.direction === 'up' ? '+' : ''}{delta.value} ({delta.pct})
                    </span>
                )}
            </div>
            {status && (
                <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 6 }}>
                    Predicted: {status}
                </div>
            )}
        </div>
    );
}
