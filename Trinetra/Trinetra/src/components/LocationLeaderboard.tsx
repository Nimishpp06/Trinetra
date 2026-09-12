import { ArrowRight } from 'lucide-react';

interface LeaderboardRow {
    location: string;
    type: string;
    aqi: number;
    pollutant: string;
    status: string;
}


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

interface LocationLeaderboardProps {
    onViewMap: () => void;
}

export const LocationLeaderboard = ({ onViewMap }: LocationLeaderboardProps) => (
    <div className="leaderboard-card">
        <div className="leaderboard-card__header">
            <div className="leaderboard-card__title">Location Leaderboard</div>
            <button className="view-map-link" onClick={onViewMap}>
                View Full Map <ArrowRight size={14} />
            </button>
        </div>
        <div className="leaderboard-divider" />
        <div className="leaderboard-table-wrapper">
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
                    {leaderboardData.map((row) => (
                        <tr key={row.location}>
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
        </div>
    </div>
);
