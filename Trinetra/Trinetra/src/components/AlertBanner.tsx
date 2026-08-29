import { AlertTriangle } from 'lucide-react';

export const AlertBanner = () => (
    <div className="alert-banner">
        <AlertTriangle className="alert-banner__icon" size={16} />
        <div>
            <div className="alert-banner__title">Elevated PM2.5 Detected</div>
            <div className="alert-banner__desc">
                Sensors near Engineering Block indicate poor air quality. Recommend limiting prolonged outdoor activity in this area.
            </div>
        </div>
    </div>
);
