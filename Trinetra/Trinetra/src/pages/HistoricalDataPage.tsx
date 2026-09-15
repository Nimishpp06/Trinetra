import { useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';
import { useData } from '../context/DataContext';
import { useStationHistory } from '../hooks/useSupabase';

const PAGE_SIZE = 20;

export const HistoricalDataPage = () => {
    const { stations, stationReadings } = useData();
    const [selectedStation, setSelectedStation] = useState<string>(() => {
        return stationReadings.find(sr => sr.latest_reading)?.id || '';
    });
    const [period, setPeriod] = useState(24);
    const [page, setPage] = useState(0);

    const { readings, loading } = useStationHistory(selectedStation || null, period);

    const chartData = useMemo(() => {
        return readings
            .filter(r => r.aqi !== null)
            .map(r => ({
                time: new Date(r.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                aqi: r.aqi,
                pm25: r.pm25_ug_m3,
                temp: r.temperature,
                humidity: r.humidity,
            }));
    }, [readings]);

    const pagedReadings = useMemo(() => {
        const start = page * PAGE_SIZE;
        return readings.slice(start, start + PAGE_SIZE);
    }, [readings, page]);

    const totalPages = Math.ceil(readings.length / PAGE_SIZE);

    const handleExportCSV = () => {
        if (readings.length === 0) return;
        const headers = ['timestamp', 'station_id', 'temperature', 'humidity', 'pm25', 'pm10', 'aqi', 'category'];
        const rows = readings.map(r => [
            r.processed_at, r.station_id, r.temperature, r.humidity,
            r.pm25_ug_m3, r.pm10_ug_m3, r.aqi,
        ]);
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trinetra_history_${selectedStation}_${period}h.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="page-content">
            <div className="analytics-header">
                <h1>Historical Data</h1>
                <p>Browse and export historical sensor readings from Trinetra monitoring stations.</p>
            </div>

            {/* Filters */}
            <div className="analytics-filters">
                <select className="filter-select" value={selectedStation} onChange={e => { setSelectedStation(e.target.value); setPage(0); }}>
                    <option value="">Select Station</option>
                    {stations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select className="filter-select" value={period} onChange={e => { setPeriod(parseInt(e.target.value)); setPage(0); }}>
                    <option value={6}>Last 6 Hours</option>
                    <option value={24}>Last 24 Hours</option>
                    <option value={72}>Last 3 Days</option>
                    <option value={168}>Last 7 Days</option>
                </select>

                <div className="filter-divider" />

                <button className="chart-icon-btn" onClick={handleExportCSV} title="Export CSV" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Download size={14} /> Export
                </button>
            </div>

            {/* Chart */}
            <div className="chart-card chart-card--wide" style={{ marginBottom: 20 }}>
                <div className="chart-card__header">
                    <div>
                        <div className="chart-card__title">AQI History</div>
                        <div className="chart-card__subtitle">{readings.length} readings from {stations.find(s => s.id === selectedStation)?.name || 'N/A'}</div>
                    </div>
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading readings...</div>
                ) : chartData.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                        No readings available for this station yet. Waiting for device data...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                formatter={(val: any, name: any) => [val, name === 'aqi' ? 'AQI' : name === 'pm25' ? 'PM2.5' : name]}
                            />
                            <Area type="monotone" dataKey="aqi" stroke="#9b1c1c" fill="#9b1c1c" fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Data Table */}
            <div className="chart-card">
                <div className="chart-card__header">
                    <div>
                        <div className="chart-card__title">Readings Table</div>
                        <div className="chart-card__subtitle">Page {page + 1} of {totalPages || 1}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="chart-icon-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                            <ChevronLeft size={14} />
                        </button>
                        <button className="chart-icon-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
                {pagedReadings.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                        No readings to display.
                    </div>
                ) : (
                    <div className="leaderboard-table-wrapper">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Station</th>
                                    <th>Temp (deg C)</th>
                                    <th>Humidity (%)</th>
                                    <th>PM2.5</th>
                                    <th>AQI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedReadings.map(r => {
                                    const stationName = stations.find(s => s.id === r.station_id)?.name || r.station_id;
                                    const temp = r.temperature != null
                                        ? r.temperature
                                        : '-';
                                    return (
                                        <tr key={r.id}>
                                            <td>{new Date(r.processed_at).toLocaleString()}</td>
                                            <td className="location-name">{stationName}</td>
                                            <td>{temp}</td>
                                            <td>{r.humidity ?? '-'}</td>
                                            <td>{r.pm25_ug_m3 ?? '-'}</td>
                                            <td className="aqi-value" style={{ color: (r.aqi ?? 0) > 100 ? '#ea580c' : undefined }}>{r.aqi ?? '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
