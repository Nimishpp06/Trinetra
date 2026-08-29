import { useState } from 'react';
import { Download, MoreVertical } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, ZAxis,
    ReferenceLine
} from 'recharts';

// ─── MOCK DATA ───
const aqiTrendData = [
    { time: '6AM', aqi: 58 },
    { time: '8AM', aqi: 72 },
    { time: '10AM', aqi: 95 },
    { time: '12PM', aqi: 130 },
    { time: '2PM', aqi: 118 },
    { time: '4PM', aqi: 142 },
    { time: '6PM', aqi: 156 },
    { time: '8PM', aqi: 145 },
    { time: '10PM', aqi: 122 },
    { time: 'Now', aqi: 112 },
    { time: '+2H', aqi: 128, forecast: true },
    { time: '+4H', aqi: 135, forecast: true },
];

const pollutantData = [
    { name: 'PM2.5', value: 45, color: '#9b1c1c' },
    { name: 'PM10', value: 25, color: '#d97706' },
    { name: 'O3', value: 15, color: '#ca8a04' },
    { name: 'NO2', value: 15, color: '#16a34a' },
];

const locationCompData = [
    { location: 'Eng Block', aqi: 156 },
    { location: 'Kurla Stn', aqi: 142 },
    { location: 'Vidyavihar', aqi: 118 },
    { location: 'Sports Gnd', aqi: 92 },
    { location: 'Hostel', aqi: 45 },
];

const scatterData = [
    { temp: 28, humidity: 75, aqi: 80 },
    { temp: 30, humidity: 68, aqi: 95 },
    { temp: 31.5, humidity: 68, aqi: 112 },
    { temp: 33, humidity: 60, aqi: 128 },
    { temp: 35, humidity: 55, aqi: 142 },
    { temp: 29, humidity: 80, aqi: 70 },
    { temp: 27, humidity: 82, aqi: 62 },
    { temp: 32, humidity: 62, aqi: 118 },
];

const parameters = ['AQI', 'PM2.5', 'PM10', 'Temp/Humidity'];

// Custom tooltip
const AQITooltip = ({ active, payload, label }: any) => {
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

const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#ea580c' }}>AQI: <b>{payload[0].value}</b></div>
            </div>
        );
    }
    return null;
};

const getBarColor = (aqi: number) => {
    if (aqi <= 50) return '#16a34a';
    if (aqi <= 100) return '#d97706';
    if (aqi <= 200) return '#ea580c';
    return '#dc2626';
};


// ─── TEMP UNIT CONVERTER ───
const convertTemp = (c: number, unit: 'C' | 'F') => {
    return unit === 'F' ? parseFloat((c * 9 / 5 + 32).toFixed(1)) : c;
};

interface AnalyticsPageProps {
    tempUnit?: 'C' | 'F';
}

export const AnalyticsPage = ({ tempUnit = 'C' }: AnalyticsPageProps) => {
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('30');
    const [activeParam, setActiveParam] = useState('AQI');

    return (
        <div className="page-content">
            <div className="analytics-header">
                <h1>Analytical Insights</h1>
                <p>Deep dive into historical trends, cross-parameter correlations, and predictive modeling for Somaiya Vidyavihar campus air quality.</p>
            </div>

            {/* Filters */}
            <div className="analytics-filters">
                <select
                    className="filter-select"
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                >
                    <option value="all">All Campus Locations</option>
                    <option value="eng">Engineering Block</option>
                    <option value="sports">Sports Ground</option>
                    <option value="hostel">Hostel Campus</option>
                </select>

                <select
                    className="filter-select"
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="365">Last Year</option>
                </select>

                <div className="filter-divider" />

                <div className="filter-pills">
                    {parameters.map(p => (
                        <button
                            key={p}
                            className={`filter-pill${activeParam === p ? ' active' : ''}`}
                            onClick={() => setActiveParam(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts */}
            <div className="analytics-charts-grid">
                {/* AQI Trend – wide */}
                <div className="chart-card chart-card--wide">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">Campus AQI Trend</div>
                            <div className="chart-card__subtitle">Historical analysis over selected period</div>
                        </div>
                        <div className="chart-card__actions">
                            <button className="chart-icon-btn" title="Download"><Download size={14} /></button>
                            <button className="chart-icon-btn" title="More"><MoreVertical size={14} /></button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={aqiTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 200]} />
                            <Tooltip content={<AQITooltip />} />
                            <ReferenceLine x="Now" stroke="#9b1c1c" strokeDasharray="4 4" label={{ value: '24H FORECAST', position: 'top', fontSize: 10, fill: '#9b1c1c' }} />
                            {/* Historical line */}
                            <Line
                                type="monotone"
                                dataKey="aqi"
                                stroke="#9b1c1c"
                                strokeWidth={2}
                                dot={(dotProps: any) => {
                                    const { cx, cy, payload } = dotProps;
                                    return payload.forecast ? <circle key={`d-${cx}`} cx={cx} cy={cy} r={0} fill="none" /> : <circle key={`d-${cx}`} cx={cx} cy={cy} r={4} fill="#9b1c1c" stroke="#fff" strokeWidth={2} />;
                                }}
                                activeDot={{ r: 6, fill: '#9b1c1c' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Pollutant Composition */}
                <div className="chart-card">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">Pollutant Composition</div>
                            <div className="chart-card__subtitle"></div>
                        </div>
                        <button className="chart-icon-btn" title="Download"><Download size={14} /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ position: 'relative', flex: '0 0 140px' }}>
                            <PieChart width={140} height={140}>
                                <Pie
                                    data={pollutantData}
                                    cx={65}
                                    cy={65}
                                    innerRadius={40}
                                    outerRadius={65}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {pollutantData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#9b1c1c', fontFamily: 'Playfair Display, serif' }}>PM2.5</div>
                                <div style={{ fontSize: 10, color: '#6b7280' }}>Primary Drv</div>
                            </div>
                        </div>
                        <div className="pollutant-legend">
                            {pollutantData.map(item => (
                                <div key={item.name} className="pollutant-legend-item">
                                    <div className="pollutant-legend-dot" style={{ background: item.color }} />
                                    <span>{item.name} ({item.value}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Location Comparison */}
                <div className="chart-card">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">Location Comparison</div>
                            <div className="chart-card__subtitle">Avg AQI by monitoring node</div>
                        </div>
                        <button className="chart-icon-btn" title="Download"><Download size={14} /></button>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={locationCompData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="location" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 180]} />
                            <Tooltip content={<BarTooltip />} />
                            <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                                {locationCompData.map((entry, i) => (
                                    <Cell key={i} fill={getBarColor(entry.aqi)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Temp vs Humidity Scatter */}
                <div className="chart-card">
                    <div className="chart-card__header">
                        <div>
                            <div className="chart-card__title">Temp vs Humidity</div>
                            <div className="chart-card__subtitle">Correlation analysis</div>
                        </div>
                        <button className="chart-icon-btn" title="Download"><Download size={14} /></button>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <ScatterChart margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="temp" name="Temperature" unit={`°${tempUnit}`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="humidity" name="Humidity" unit="%" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <ZAxis dataKey="aqi" range={[40, 200]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(val: any, name: any) => [val, name]} />
                            <Scatter data={scatterData.map(d => ({ ...d, temp: convertTemp(d.temp, tempUnit) })) as any[]} fill="#9b1c1c" fillOpacity={0.7} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
