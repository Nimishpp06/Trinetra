import { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Crosshair, Layers, Play, Pause } from 'lucide-react';


const legendItems = [
    { label: 'Good (0–50)', color: '#16a34a' },
    { label: 'Moderate (51–100)', color: '#d97706' },
    { label: 'Poor (101–200)', color: '#ea580c' },
    { label: 'Unhealthy (201–300)', color: '#dc2626' },
    { label: 'Severe (301+)', color: '#7f1d1d' },
];

// Draw heatmap on canvas
function drawHeatmap(canvas: HTMLCanvasElement, sensorList: { id: number; name: string; x: number; y: number; aqi: number; color: string }[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Base map color
    ctx.fillStyle = '#dde1e8';
    ctx.fillRect(0, 0, w, h);

    // Draw roads (simple grid)
    ctx.strokeStyle = '#c8cdd8';
    ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 80) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i < h; i += 80) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Green campus area
    ctx.fillStyle = 'rgba(134, 187, 134, 0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.48, w * 0.30, h * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // AQI heat blobs using radial gradients
    sensorList.forEach(sensor => {
        const cx = (sensor.x / 100) * w;
        const cy = (sensor.y / 100) * h;
        const radius = Math.min(w, h) * 0.18;

        let color = '22, 163, 74'; // good green
        if (sensor.aqi > 200) color = '220, 38, 38';
        else if (sensor.aqi > 100) color = '234, 88, 12';
        else if (sensor.aqi > 50) color = '217, 119, 6';

        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grd.addColorStop(0, `rgba(${color}, 0.55)`);
        grd.addColorStop(0.5, `rgba(${color}, 0.25)`);
        grd.addColorStop(1, `rgba(${color}, 0)`);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
    });
}

export const LiveMapPage = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sliderValue, setSliderValue] = useState(85);
    const [tooltip, setTooltip] = useState<{ name: string; aqi: number; x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            drawHeatmap(canvas, sensors);
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const timeLabel = () => {
        const base = 6 + Math.floor((sliderValue / 100) * 18);
        return `${base}:${sliderValue % 2 === 0 ? '00' : '30'} PM`;
    };

    return (
        <div className="map-page">
            <div className="map-container" ref={containerRef}>
                <canvas ref={canvasRef} className="map-canvas" />

                {/* Campus label */}
                <div className="map-header-label">Somaiya Vihar Campus, Mumbai</div>

                {/* Sensor dots */}
                {sensors.map(sensor => (
                    <div
                        key={sensor.id}
                        className="sensor-dot"
                        style={{
                            left: `${sensor.x}%`,
                            top: `${sensor.y}%`,
                            width: 14,
                            height: 14,
                            background: sensor.color,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({ name: sensor.name, aqi: sensor.aqi, x: rect.left, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                    />
                ))}

                {/* Tooltip */}
                {tooltip && (
                    <div style={{
                        position: 'fixed',
                        left: tooltip.x + 18,
                        top: tooltip.y - 10,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        zIndex: 20,
                        pointerEvents: 'none',
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.name}</div>
                        <div style={{ color: '#6b7280' }}>AQI: <b style={{ color: '#ea580c' }}>{tooltip.aqi}</b></div>
                    </div>
                )}

                {/* Map controls */}
                <div className="map-controls">
                    <button className="map-ctrl-btn" title="Zoom in"><Plus size={16} /></button>
                    <button className="map-ctrl-btn" title="Zoom out"><Minus size={16} /></button>
                    <button className="map-ctrl-btn" title="My location"><Crosshair size={16} /></button>
                    <button className="map-ctrl-btn" title="Layers"><Layers size={16} /></button>
                </div>

                {/* AQI Legend */}
                <div className="map-legend">
                    <div className="map-legend__title">AQI Intensity Legend</div>
                    {legendItems.map(item => (
                        <div key={item.label} className="map-legend__item">
                            <div className="map-legend__dot" style={{ background: item.color }} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Playback bar */}
                <div className="map-playback">
                    <span className="playback__title">Historical Playback</span>
                    <button
                        className="playback__play-btn"
                        onClick={() => setIsPlaying(p => !p)}
                    >
                        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <div className="playback__slider-wrap">
                        <input
                            type="range"
                            className="playback__slider"
                            min={0}
                            max={100}
                            value={sliderValue}
                            onChange={e => setSliderValue(Number(e.target.value))}
                        />
                    </div>
                    <span className="playback__time">{timeLabel()}</span>
                    <span className="playback__live-badge">Live</span>
                </div>
            </div>
        </div>
    );
};
