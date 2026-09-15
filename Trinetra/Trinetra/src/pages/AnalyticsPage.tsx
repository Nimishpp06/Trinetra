import { useState, useMemo } from 'react';
import { Download, MoreVertical } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useData } from '../context/DataContext';

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

const parameters = ['AQI', 'PM2.5', 'Temperature', 'Humidity'];

export const AnalyticsPage = () => {
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('24');
    const [activeParam, setActiveParam] = useState('AQI');
    const { recentReadings, stationReadings, stations } = useData();

    const aqiTrendData = useMemo(() => {
        const hours = parseInt(selectedPeriod);
        const filtered = selectedLocation === 'all'
            ? recentReadings
            : recentReadings.filter(r => r.station_id === selectedLocation);

        const hourlyMap = new Map<string, number[]>();
        const now = Date.now();
        for (const r of filtered) {
            const t = new Date(r.processed_at).getTime();
            if (now - t > hours * 3600 * 1000) continue;
            const hourKey = new Date(r.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!hourlyMap.has(hourKey)) hourlyMap.set(hourKey, []);
            if (r.aqi) hourlyMap.get(hourKey)!.push(r.aqi);
        }
        return Array.from(hourlyMap.entries()).map(([time, aqis]) => ({
            time,
            aqi: Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length),
        }));
    }, [recentReadings, selectedLocation, selectedPeriod]);

    const pollutantData = useMemo(() => {
        const withPm = recentReadings.filter(r => r.pm25_ug_m3 && r.pm10_ug_m3);
        if (withPm.length === 0) return [
            { name: 'PM2.5', value: 40, color: '#9b1c1c' },
            { name: 'PM10', value: 25, color: '#ea580c' },
            { name: 'Gas', value: 20, color: '#d97706' },
            { name: 'Other', value: 15, color: '#6b7280' },
        ];
        const avgPm25 = withPm.reduce((s, r) => s + (r.pm25_ug_m3 ?? 0), 0) / withPm.length;
        const avgPm10 = withPm.reduce((s, r) => s + (r.pm10_ug_m3 ?? 0), 0) / withPm.length;
        const total = avgPm25 + avgPm10 + 1;
        return [
            { name: 'PM2.5', value: Math.round(avgPm25 / total * 100), color: '#9b1c1c' },
            { name: 'PM10', value: Math.round(avgPm10 / total * 100), color: '#ea580c' },
            { name: 'Other', value: Math.round(100 - (avgPm25 + avgPm10) / total * 100), color: '#6b7280' },
        ];
    }, [recentReadings]);

    const locationCompData = useMemo(() => {
        return stationReadings
            .filter(sr => sr.latest_reading)
            .map(sr => ({
                location: sr.name.split(' ').slice(0, 2).join(' '),
                aqi: sr.latest_reading!.aqi ?? 0,
            }))
            .sort((a, b) => b.aqi - a.aqi);
    }, [stationReadings]);

    const scatterData = useMemo(() => {
        return recentReadings
            .filter(r => r.temperature && r.humidity)
            .map(r => ({
                temp: r.temperature!,
                humidity: r.humidity!,
                aqi: r.aqi ?? 0,
            }));
    }, [recentReadings]);

    return (
        <div className="page-content">
            <div className="analytics-header">
                <h1>Analytical Insights</h1>
                <p>Deep dive into historical trends, cross-parameter correlations, and predictive modeling for Somaiya Vidyavihar campus air quality.</p>
            </div>

            <div className="analytics-filters">
                <select className="filter-select" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                    <option value="all">All Campus Locations</option>
                    {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select className="filter-select" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                    <option value="6">Last 6 Hours</option>
                    <option value="24">Last 24 Hours</option>
                    <option value="72">Last 3 Days</option>
                    <option value="168">Last 7 Days</option>
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

            <div className="analytics-charts-grid">
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
                            <Line type="monotone" dataKey="aqi" stroke="#9b1c1c" strokeWidth={2} dot={{ r: 4, fill: '#9b1c1c', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#9b1c1c' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

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
                                <Pie data={pollutantData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
                                    {pollutantData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#9b1c1c', fontFamily: 'Playfair Display, serif' }}>PM2.5</div>
                                <div style={{ fontSize: 10, color: '#6b7280' }}>Primary</div>
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
                            <XAxis dataKey="temp" name="Temperature" unit="deg C" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="humidity" name="Humidity" unit="%" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <ZAxis dataKey="aqi" range={[40, 200]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(val: any, name: any) => [val, name]} />
                            <Scatter data={scatterData} fill="#9b1c1c" fillOpacity={0.7} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
