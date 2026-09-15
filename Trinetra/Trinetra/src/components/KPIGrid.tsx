import { RefreshCw, Wind, Thermometer, Droplets, TrendingUp, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';

// ─── AQI RING ───
interface AQIRingProps {
    value: number;
    status: string;
    max?: number;
}

const AQI_RING_RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * AQI_RING_RADIUS;
const SWEEP_DEGREES = 270;
const SWEEP_FRACTION = SWEEP_DEGREES / 360;

function getAQIColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'good': return '#16a34a';
        case 'moderate': return '#d97706';
        case 'poor': return '#ea580c';
        case 'unhealthy': return '#dc2626';
        case 'severe': return '#7f1d1d';
        default: return '#d97706';
    }
}

function aqiToStatus(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    if (aqi <= 300) return 'Unhealthy';
    return 'Severe';
}

const AQIRing = ({ value, status, max = 300 }: AQIRingProps) => {
    const color = getAQIColor(status);
    const progress = Math.min(value / max, 1);
    const dashArray = CIRCUMFERENCE * SWEEP_FRACTION;
    const dashOffset = dashArray * (1 - progress);

    return (
        <div className="aqi-ring">
            <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                <circle
                    cx="80" cy="80" r={AQI_RING_RADIUS}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE * SWEEP_FRACTION} ${CIRCUMFERENCE}`}
                />
                <circle
                    cx="80" cy="80" r={AQI_RING_RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${dashArray - dashOffset} ${CIRCUMFERENCE}`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
            </svg>
            <div className="aqi-ring__center">
                <span className="aqi-ring__value" style={{ color }}>{value}</span>
                <span className="aqi-ring__badge" style={{ background: color }}>{status}</span>
            </div>
        </div>
    );
};

// ─── CARDS ───
const AQICard = ({ aqi, status, high, low }: { aqi: number; status: string; high: number; low: number }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Overall Campus AQI</span>
        </div>
        <div className="aqi-card__ring-container">
            <AQIRing value={aqi} status={status} />
        </div>
        <div className="aqi-card__divider" />
        <div className="aqi-card__stats">
            <div className="aqi-stat">
                <div className="aqi-stat__label">24H High</div>
                <div className="aqi-stat__value">{high}</div>
            </div>
            <div className="aqi-stat">
                <div className="aqi-stat__label">24H Low</div>
                <div className="aqi-stat__value">{low}</div>
            </div>
        </div>
    </div>
);

const PM25Card = ({ value }: { value: number }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">PM2.5</span>
            <Wind className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{value}</span>
            <span className="simple-kpi__unit">ug/m3</span>
        </div>
        <div className="simple-kpi__change change--up">
            <TrendingUp size={13} />
            <span>live</span>
        </div>
    </div>
);

const TemperatureCard = ({ value }: { value: number }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Temperature</span>
            <Thermometer className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{value}</span>
            <span className="simple-kpi__unit">deg C</span>
        </div>
        <div className="simple-kpi__change change--steady">
            <span>Real Feel {value}deg C</span>
        </div>
    </div>
);

const HumidityCard = ({ value }: { value: number }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Humidity</span>
            <Droplets className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{value}</span>
            <span className="simple-kpi__unit">%</span>
        </div>
        <div className="simple-kpi__change change--down">
            <span>live reading</span>
        </div>
    </div>
);

// ─── MAIN KPI GRID ───
export const KPIGrid = () => {
    const { stationReadings, recentReadings, loading, refreshData } = useData();
    const [lastUpdated, setLastUpdated] = useState('Just now');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const kpis = useMemo(() => {
        const withReadings = stationReadings.filter(sr => sr.latest_reading);
        if (withReadings.length === 0) {
            return { aqi: 0, status: 'No Data', pm25: 0, temp: 0, humidity: 0, high: 0, low: 0 };
        }

        const aqiValues = withReadings.map(sr => sr.latest_reading!.aqi ?? 0).filter(v => v > 0);
        const pm25Values = withReadings.map(sr => sr.latest_reading!.pm25_ug_m3 ?? 0).filter(v => v > 0);
        const tempValues = withReadings.map(sr => sr.latest_reading!.temperature ?? 0).filter(v => v > 0);
        const humValues = withReadings.map(sr => sr.latest_reading!.humidity ?? 0).filter(v => v > 0);

        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

        // 24h high/low from recent readings
        const recentAqi = recentReadings.map(r => r.aqi ?? 0).filter(v => v > 0);

        return {
            aqi: avg(aqiValues),
            status: aqiToStatus(avg(aqiValues)),
            pm25: avg(pm25Values),
            temp: avg(tempValues),
            humidity: avg(humValues),
            high: recentAqi.length ? Math.max(...recentAqi) : avg(aqiValues),
            low: recentAqi.length ? Math.min(...recentAqi) : avg(aqiValues),
        };
    }, [stationReadings, recentReadings]);

    const handleRefresh = () => {
        refreshData();
        setLastUpdated('Just now');
    };

    return (
        <>
            <div className="dashboard-header">
                <div className="dashboard-header__left">
                    <h1>Campus Air Quality Overview</h1>
                    <p>Real-time environmental monitoring data across Somaiya Vidyavihar.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {currentTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                            <Clock size={14} />
                            <span>{currentTime}</span>
                        </div>
                    )}
                    <button className="last-updated-pill" onClick={handleRefresh} style={{ marginTop: 0 }}>
                        <RefreshCw size={12} />
                        <span>{loading ? 'Loading...' : `Last updated: ${lastUpdated}`}</span>
                    </button>
                </div>
            </div>

            <div className="kpi-grid">
                <AQICard aqi={kpis.aqi} status={kpis.status} high={kpis.high} low={kpis.low} />
                <PM25Card value={kpis.pm25} />
                <TemperatureCard value={kpis.temp} />
                <HumidityCard value={kpis.humidity} />
            </div>
        </>
    );
};
