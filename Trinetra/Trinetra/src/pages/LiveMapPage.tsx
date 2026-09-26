import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useData } from '../context/DataContext';
import 'leaflet/dist/leaflet.css';

function getAQIColor(aqi: number): string {
    if (aqi <= 50) return '#16a34a';
    if (aqi <= 100) return '#d97706';
    if (aqi <= 200) return '#ea580c';
    if (aqi <= 300) return '#dc2626';
    return '#7f1d1d';
}

function getAQIRadius(aqi: number): number {
    if (aqi <= 50) return 10;
    if (aqi <= 100) return 14;
    if (aqi <= 200) return 18;
    if (aqi <= 300) return 22;
    return 26;
}

function aqiToStatus(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    if (aqi <= 300) return 'Unhealthy';
    return 'Severe';
}

const CAMPUS_CENTER: [number, number] = [19.0740, 72.8860];

const legendItems = [
    { label: 'Good (0-50)', color: '#16a34a' },
    { label: 'Moderate (51-100)', color: '#d97706' },
    { label: 'Poor (101-200)', color: '#ea580c' },
    { label: 'Unhealthy (201-300)', color: '#dc2626' },
    { label: 'Severe (301+)', color: '#7f1d1d' },
];

function MapRecenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useMemo(() => { map.setView(center, 16); }, [map, center]);
    return null;
}

export const LiveMapPage = () => {
    const { stationReadings } = useData();
    const [selectedStation, setSelectedStation] = useState<string | null>(null);

    const stationsWithData = useMemo(() => {
        return stationReadings
            .filter(sr => sr.latest_reading)
            .map(sr => ({
                id: sr.id,
                name: sr.name,
                lat: sr.lat,
                lng: sr.lng,
                aqi: sr.latest_reading!.aqi ?? 0,
                temp: sr.latest_reading!.temperature,
                humidity: sr.latest_reading!.humidity,
                pm25: sr.latest_reading!.pm25_ug_m3,
                source: sr.latest_reading!.source,
                thermalComfort: sr.latest_reading!.thermal_comfort,
                recorded_at: sr.latest_reading!.processed_at,
            }));
    }, [stationReadings]);

    const allStations = useMemo(() => {
        return stationReadings.map(sr => ({
            id: sr.id,
            name: sr.name,
            lat: sr.lat,
            lng: sr.lng,
            aqi: sr.latest_reading?.aqi ?? 0,
            temp: sr.latest_reading?.temperature,
            humidity: sr.latest_reading?.humidity,
            pm25: sr.latest_reading?.pm25_ug_m3,
            source: sr.latest_reading?.source,
            thermalComfort: sr.latest_reading?.thermal_comfort,
            hasData: !!sr.latest_reading,
        }));
    }, [stationReadings]);

    return (
        <div className="map-page">
            <div className="map-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
                <MapContainer
                    center={CAMPUS_CENTER}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    <MapRecenter center={CAMPUS_CENTER} />

                    {allStations.map(station => {
                        const color = station.hasData ? getAQIColor(station.aqi) : '#9ca3af';
                        const radius = station.hasData ? getAQIRadius(station.aqi) : 8;
                        return (
                            <CircleMarker
                                key={station.id}
                                center={[station.lat, station.lng]}
                                radius={radius}
                                pathOptions={{
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: 0.6,
                                    weight: selectedStation === station.id ? 3 : 1,
                                }}
                                eventHandlers={{
                                    click: () => setSelectedStation(station.id),
                                }}
                            >
                                <Popup>
                                    <div style={{ fontSize: 13, minWidth: 160 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{station.name}</div>
                                        {station.hasData ? (
                                            <>
                                                <div>AQI: <b style={{ color }}>{station.aqi}</b> ({aqiToStatus(station.aqi)})</div>
                                                {station.temp && <div>Temp: {station.temp}C</div>}
                                                {station.humidity && <div>Humidity: {station.humidity}%</div>}
                                                {station.pm25 && <div>PM2.5: {station.pm25} ug/m3</div>}
                                                {station.source && <div>Source: {station.source}</div>}
                                                {station.thermalComfort && <div>Comfort: {station.thermalComfort}</div>}
                                            </>
                                        ) : (
                                            <div style={{ color: '#9ca3af' }}>No readings yet</div>
                                        )}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>

                {/* Campus label */}
                <div className="map-header-label">Somaiya Vihar Campus, Mumbai</div>

                {/* AQI Legend */}
                <div className="map-legend">
                    <div className="map-legend__title">AQI Legend</div>
                    {legendItems.map(item => (
                        <div key={item.label} className="map-legend__item">
                            <div className="map-legend__dot" style={{ background: item.color }} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Station count */}
                <div style={{
                    position: 'absolute', bottom: 80, left: 12, zIndex: 1000,
                    background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                    {stationsWithData.length} / {allStations.length} stations active
                </div>
            </div>
        </div>
    );
};
