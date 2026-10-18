import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { useData } from '../context/DataContext';

function getAQIColor(aqi: number): string {
    if (aqi <= 50) return '#16a34a';
    if (aqi <= 100) return '#d97706';
    if (aqi <= 200) return '#ea580c';
    if (aqi <= 300) return '#dc2626';
    return '#7f1d1d';
}

function getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
        case 'good': return 'status-badge--good';
        case 'moderate': return 'status-badge--moderate';
        case 'poor': return 'status-badge--poor';
        case 'unhealthy': return 'status-badge--unhealthy';
        case 'severe': return 'status-badge--severe';
        default: return 'status-badge--moderate';
    }
}

function aqiToStatus(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    if (aqi <= 300) return 'Unhealthy';
    return 'Severe';
}

interface LocationLeaderboardProps {
    onViewMap: () => void;
}

export const LocationLeaderboard = ({ onViewMap }: LocationLeaderboardProps) => {
    const { stationReadings } = useData();

    const rows = useMemo(() => {
        return stationReadings
            .filter(sr => sr.latest_reading)
            .map(sr => {
                const r = sr.latest_reading!;
                const aqi = r.aqi ?? 0;
                return {
                    station_id: sr.id,
                    location: sr.name,
                    type: r.source || 'Sensor',
                    aqi,
                    pollutant: r.pm25_ug_m3 != null ? 'PM2.5' : 'Dust',
                    status: aqiToStatus(aqi),
                };
            })
            .sort((a, b) => b.aqi - a.aqi);
    }, [stationReadings]);

    return (
        <div className="leaderboard-card">
            <div className="leaderboard-card__header">
                <div className="leaderboard-card__title">Location Leaderboard</div>
                <button className="view-map-link" onClick={onViewMap}>
                    View Full Map <ArrowRight size={14} />
                </button>
            </div>
            <div className="leaderboard-divider" />
            <div className="leaderboard-table-wrapper">
                {rows.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                        No sensor data available yet. Waiting for device readings...
                    </div>
                ) : (
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>Type</th>
                                <th>AQI</th>
                                <th>Primary Pollutant</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.station_id}>
                                    <td className="location-name">{row.location}</td>
                                    <td className="location-type">{row.type}</td>
                                    <td className="aqi-value" style={{ color: getAQIColor(row.aqi) }}>{row.aqi}</td>
                                    <td>{row.pollutant}</td>
                                    <td className="td-status">
                                        <span className={`status-badge ${getStatusClass(row.status)}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
