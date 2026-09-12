import { RefreshCw, Wind, Thermometer, Droplets, TrendingUp, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

// ─── TYPES ───
interface KPIData {
    overallAQI: number;
    aqiStatus: string;
    high24h: number;
    low24h: number;
    pm25: number;
    pm25Change: string;
    temperature: number;
    temperatureChange: string;
    humidity: number;
    humidityChange: string;
    realFeel: number;
}

// ─── AQI RING ───
interface AQIRingProps {
    value: number;
    status: string;
    max?: number;
}

const AQI_RING_RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * AQI_RING_RADIUS;
// We span ~270 degrees of the circle (leaving 90-degree gap at bottom-left)
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

const AQIRing = ({ value, status, max = 300 }: AQIRingProps) => {
    const color = getAQIColor(status);
    const progress = Math.min(value / max, 1);
    const dashArray = CIRCUMFERENCE * SWEEP_FRACTION;
    const dashOffset = dashArray * (1 - progress);

    return (
        <div className="aqi-ring">
            <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                {/* Track */}
                <circle
                    cx="80" cy="80" r={AQI_RING_RADIUS}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE * SWEEP_FRACTION} ${CIRCUMFERENCE}`}
                />
                {/* Progress */}
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

// ─── AQI CARD ───
const AQICard = ({ data }: { data: KPIData }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Overall Campus AQI</span>
        </div>
        <div className="aqi-card__ring-container">
            <AQIRing value={data.overallAQI} status={data.aqiStatus} />
        </div>
        <div className="aqi-card__divider" />
        <div className="aqi-card__stats">
            <div className="aqi-stat">
                <div className="aqi-stat__label">24H High</div>
                <div className="aqi-stat__value">{data.high24h}</div>
            </div>
            <div className="aqi-stat">
                <div className="aqi-stat__label">24H Low</div>
                <div className="aqi-stat__value">{data.low24h}</div>
            </div>
        </div>
    </div>
);

// ─── PM2.5 CARD ───
const PM25Card = ({ data }: { data: KPIData }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">PM2.5</span>
            <Wind className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{data.pm25}</span>
            <span className="simple-kpi__unit">µg/m³</span>
        </div>
        <div className="simple-kpi__change change--up">
            <TrendingUp size={13} />
            <span>+{data.pm25Change}</span>
        </div>
    </div>
);

// ─── TEMP UNIT CONVERTER ───
const convertTemp = (c: number, unit: 'C' | 'F') => {
    return unit === 'F' ? parseFloat((c * 9 / 5 + 32).toFixed(1)) : c;
};

// ─── TEMPERATURE CARD ───
const TemperatureCard = ({ data, tempUnit }: { data: KPIData; tempUnit: 'C' | 'F' }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Temperature</span>
            <Thermometer className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{convertTemp(data.temperature, tempUnit)}</span>
            <span className="simple-kpi__unit">°{tempUnit}</span>
        </div>
        <div className="simple-kpi__change change--steady" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>→ {data.temperatureChange}</span>
            <span style={{ fontSize: '11px', color: 'green', fontWeight: 500 }}>
                Real Feel {convertTemp(data.realFeel, tempUnit)}°{tempUnit}
            </span>
        </div>
    </div>
);

// ─── HUMIDITY CARD ───
const HumidityCard = ({ data }: { data: KPIData }) => (
    <div className="kpi-card">
        <div className="kpi-card__header">
            <span className="kpi-card__title">Humidity</span>
            <Droplets className="kpi-card__icon" size={18} />
        </div>
        <div className="simple-kpi__value">
            <span className="simple-kpi__number">{data.humidity}</span>
            <span className="simple-kpi__unit">%</span>
        </div>
        <div className="simple-kpi__change change--down">
            <span>↘ {data.humidityChange}</span>
        </div>
    </div>
);

// ─── MAIN KPI GRID ───

interface KPIGridProps {
    tempUnit?: 'C' | 'F';
}

export const KPIGrid = ({ tempUnit = 'C' }: KPIGridProps) => {
    const [lastUpdated, setLastUpdated] = useState('Just now');
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleRefresh = () => {
        setLastUpdated('Just now');
    };

    return (
        <>
            {/* Page title */}
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
                        <span>Last updated: {lastUpdated}</span>
                    </button>
                </div>
            </div>

            {/* KPI cards */}
            <div className="kpi-grid">
            </div>
        </>
    );
};
