import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';

// ─── MOCK DATA ───
const historicalRows = [
    { date: '2024-08-27', time: '23:00', location: 'Engineering Block', aqi: 156, pm25: 58.2, pm10: 82.1, temp: 31.5, humidity: 65, status: 'Poor' },
    { date: '2024-08-27', time: '22:00', location: 'Engineering Block', aqi: 142, pm25: 52.1, pm10: 74.3, temp: 30.8, humidity: 67, status: 'Poor' },
    { date: '2024-08-27', time: '21:00', location: 'Sports Ground', aqi: 118, pm25: 44.6, pm10: 65.0, temp: 30.2, humidity: 70, status: 'Moderate' },
    { date: '2024-08-27', time: '20:00', location: 'Hostel Campus', aqi: 92, pm25: 34.2, pm10: 52.8, temp: 29.5, humidity: 72, status: 'Moderate' },
    { date: '2024-08-27', time: '19:00', location: 'Kurla Station Area', aqi: 145, pm25: 54.0, pm10: 78.5, temp: 30.0, humidity: 68, status: 'Poor' },
    { date: '2024-08-27', time: '18:00', location: 'Vidyavihar Station', aqi: 122, pm25: 46.3, pm10: 67.2, temp: 31.0, humidity: 66, status: 'Moderate' },
    { date: '2024-08-27', time: '17:00', location: 'Engineering Block', aqi: 138, pm25: 51.0, pm10: 72.0, temp: 32.1, humidity: 63, status: 'Poor' },
    { date: '2024-08-27', time: '16:00', location: 'Sports Ground', aqi: 88, pm25: 32.5, pm10: 50.0, temp: 33.4, humidity: 60, status: 'Moderate' },
    { date: '2024-08-27', time: '15:00', location: 'Hostel Campus', aqi: 45, pm25: 14.2, pm10: 28.0, temp: 34.0, humidity: 58, status: 'Good' },
    { date: '2024-08-27', time: '14:00', location: 'Vidyavihar Station', aqi: 112, pm25: 42.0, pm10: 63.5, temp: 33.8, humidity: 59, status: 'Moderate' },
];

const trend24h = [
    { hour: '12AM', aqi: 78 }, { hour: '3AM', aqi: 62 }, { hour: '6AM', aqi: 58 },
    { hour: '9AM', aqi: 95 }, { hour: '12PM', aqi: 130 }, { hour: '3PM', aqi: 118 },
    { hour: '6PM', aqi: 156 }, { hour: '9PM', aqi: 142 }, { hour: 'Now', aqi: 112 },
];

const weeklyAvg = [
    { day: 'Mon', aqi: 88 }, { day: 'Tue', aqi: 102 }, { day: 'Wed', aqi: 125 },
    { day: 'Thu', aqi: 118 }, { day: 'Fri', aqi: 142 }, { day: 'Sat', aqi: 98 },
    { day: 'Sun', aqi: 85 },
];

function getAQIColor(aqi: number) {
    if (aqi <= 50) return '#16a34a';
    if (aqi <= 100) return '#d97706';
    if (aqi <= 200) return '#ea580c';
    return '#dc2626';
}

function getStatusClass(status: string) {
    switch (status.toLowerCase()) {
        case 'good': return 'status-badge--good';
        case 'moderate': return 'status-badge--moderate';
        case 'poor': return 'status-badge--poor';
        default: return 'status-badge--moderate';
    }
}

const PAGE_SIZE = 8;

const HistoricalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#9b1c1c' }}>AQI: <b>{payload[0].value}</b></div>
            </div>
        );
    }
    return null;
};

// ─── TEMP UNIT CONVERTER ───
const convertTemp = (c: number, unit: 'C' | 'F') => {
    return unit === 'F' ? parseFloat((c * 9 / 5 + 32).toFixed(1)) : c;
};

interface HistoricalDataPageProps {
    tempUnit?: 'C' | 'F';
}

export const HistoricalDataPage = ({ tempUnit = 'C' }: HistoricalDataPageProps) => {
    const [location, setLocation] = useState('all');
    const [period, setPeriod] = useState('today');
    const [page, setPage] = useState(1);

    const filtered = historicalRows.filter(r =>
        location === 'all' || r.location.toLowerCase().includes(location)
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="page-content">
            {/* Header */}
            <div className="historical-header">
                <div className="historical-header__left">
                    <h1>Historical Data</h1>
                    <p>Browse and analyze past air quality readings across all monitoring nodes.</p>
                </div>
                <button className="export-btn">
                    <Download size={14} />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="historical-filters">
                <span className="historical-filter-label">Filter:</span>
                <select
                    className="filter-select"
                    value={location}
                    onChange={e => { setLocation(e.target.value); setPage(1); }}
                >
                    <option value="all">All Locations</option>
                    <option value="engineering">Engineering Block</option>
                    <option value="kurla">Kurla Station Area</option>
                    <option value="vidyavihar">Vidyavihar Station</option>
                    <option value="sports">Sports Ground</option>
                    <option value="hostel">Hostel Campus</option>
                </select>
                <select
                    className="filter-select"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                >
                    <option value="today">Today</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 3 Months</option>
                </select>
            </div>

            {/* Summary stats */}
            <div className="historical-stats-grid">
                {[
                    { label: 'Avg AQI (Period)', value: '112', sub: 'Moderate range' },
                    { label: 'Peak AQI', value: '156', sub: 'Engineering Block' },
                    { label: 'Lowest AQI', value: '45', sub: 'Hostel Campus' },
                    { label: 'Total Readings', value: '2.4K', sub: 'Last 30 days' },
                ].map(stat => (
                    <div key={stat.label} className="historical-stat-card">
                        <div className="historical-stat-card__label">{stat.label}</div>
                        <div className="historical-stat-card__value">{stat.value}</div>
                        <div className="historical-stat-card__sub">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="historical-content-grid">
                <div className="chart-card">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">24-Hour AQI Trend</div>
                            <div className="chart-card__subtitle">Today's readings</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={trend24h} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#9b1c1c" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#9b1c1c" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 180]} />
                            <Tooltip content={<HistoricalTooltip />} />
                            <Area type="monotone" dataKey="aqi" stroke="#9b1c1c" strokeWidth={2} fill="url(#aqiGrad)" dot={{ r: 3, fill: '#9b1c1c', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">Weekly Average AQI</div>
                            <div className="chart-card__subtitle">7-day pattern</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={weeklyAvg} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 180]} />
                            <Tooltip content={<HistoricalTooltip />} />
                            <Area type="monotone" dataKey="aqi" stroke="#d97706" strokeWidth={2} fill="url(#weekGrad)" dot={{ r: 3, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Data Table */}
                <div className="data-table-card">
                    <div className="data-table-card__header">
                        <div className="data-table-card__title">Raw Sensor Readings</div>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{filtered.length} records found</span>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Location</th>
                                    <th>AQI</th>
                                    <th>PM2.5 (µg/m³)</th>
                                    <th>PM10 (µg/m³)</th>
                                    <th>Temp (°{tempUnit})</th>
                                    <th>Humidity (%)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageData.map((row, i) => (
                                    <tr key={i}>
                                        <td>{row.date}</td>
                                        <td>{row.time}</td>
                                        <td style={{ fontWeight: 600, color: '#1e1b4b' }}>{row.location}</td>
                                        <td className="aqi-value" style={{ color: getAQIColor(row.aqi) }}>{row.aqi}</td>
                                        <td>{row.pm25}</td>
                                        <td>{row.pm10}</td>
                                        <td>{convertTemp(row.temp, tempUnit)}</td>
                                        <td>{row.humidity}</td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(row.status)}`}>{row.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="pagination">
                        <span className="pagination__info">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
                        </span>
                        <div className="pagination__controls">
                            <button
                                className="pagination__btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={13} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button
                                    key={n}
                                    className={`pagination__btn${page === n ? ' active' : ''}`}
                                    onClick={() => setPage(n)}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                className="pagination__btn"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
