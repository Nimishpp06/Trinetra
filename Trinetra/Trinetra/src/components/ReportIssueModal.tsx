import { X } from 'lucide-react';
import { useState } from 'react';

interface ReportIssueModalProps {
    onClose: () => void;
}

export const ReportIssueModal = ({ onClose }: ReportIssueModalProps) => {
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <h2 className="modal__title">Report an Issue</h2>
                    <button className="modal__close" onClick={onClose}><X size={16} /></button>
                </div>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#16a34a' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                        <div style={{ fontWeight: 600 }}>Issue reported successfully.</div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="modal__field">
                            <label className="modal__label">Location</label>
                            <select
                                className="modal__input"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                required
                            >
                                <option value="">Select location</option>
                                <option value="engineering">Engineering Block</option>
                                <option value="kurla">Kurla Station Area</option>
                                <option value="vidyavihar">Vidyavihar Station</option>
                                <option value="sports">Sports Ground</option>
                                <option value="hostel">Hostel Campus</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="modal__field">
                            <label className="modal__label">Issue Type</label>
                            <select className="modal__input" required>
                                <option value="">Select issue type</option>
                                <option value="sensor">Sensor malfunction</option>
                                <option value="data">Incorrect data reading</option>
                                <option value="alert">Alert not triggered</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="modal__field">
                            <label className="modal__label">Description</label>
                            <textarea
                                className="modal__textarea"
                                placeholder="Describe the issue..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="modal__submit">Submit Report</button>
                    </form>
                )}
            </div>
        </div>
    );
};
