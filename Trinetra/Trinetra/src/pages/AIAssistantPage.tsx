import { useState, useRef, useEffect } from 'react';
import { Zap, Shield, Plus, Mic, Send, User } from 'lucide-react';
import { postQuestion } from '../services/api';
import { useData } from '../context/DataContext';
import { useChat } from '../context/ChatContext';

const AQIResponseCard = ({ aqi }: { aqi?: number }) => {
    if (!aqi) return null;
    const status = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 200 ? 'Poor' : 'Unhealthy';
    return (
        <>
            <div className="ai-forecast-card">
                <div className="ai-forecast-card__label">
                    <Zap size={14} style={{ color: '#9b1c1c' }} />
                    Current AQI Reading
                </div>
                <div className="ai-forecast-card__value">
                    {aqi}
                    <span className={`status-badge status-badge--${status.toLowerCase()}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                        {status.toUpperCase()}
                    </span>
                </div>
            </div>
            <div className="ai-health-advisory">
                <div className="ai-health-advisory__title">
                    <Shield size={14} />
                    Health Advisory
                </div>
                <ul>
                    {aqi > 200 && <li>Avoid prolonged outdoor exertion. Sensitive groups should remain indoors.</li>}
                    {aqi > 100 && aqi <= 200 && <li>Reduce prolonged outdoor exertion. Consider indoor alternatives.</li>}
                    {aqi > 50 && aqi <= 100 && <li>Unusually sensitive people should consider reducing prolonged outdoor exertion.</li>}
                    {aqi <= 50 && <li>Air quality is satisfactory. Enjoy outdoor activities.</li>}
                </ul>
            </div>
        </>
    );
};

export const AIAssistantPage = () => {
    const { messages, addMessage, clearMessages, isLoading: isTyping, setIsLoading } = useChat();
    const [inputVal, setInputVal] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { stationReadings } = useData();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async () => {
        const text = inputVal.trim();
        if (!text) return;

        addMessage({ role: 'user', content: text });
        setInputVal('');
        setIsLoading(true);

        try {
            const activeStation = stationReadings.find(sr => sr.latest_reading);
            const response = await postQuestion({
                question: text,
                station_id: activeStation?.id || undefined,
            });

            addMessage({
                role: 'assistant',
                content: response.answer,
                hasCard: activeStation?.latest_reading?.aqi != null,
                forecastAqi: activeStation?.latest_reading?.aqi ?? undefined,
            });
        } catch {
            addMessage({
                role: 'assistant',
                content: 'Sorry, I encountered an error connecting to the AI service. Please check that the API server is running and try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="ai-page">
            <div className="ai-layout">
                <div className="ai-main">
                    <div className="ai-main__header">
                        <div>
                            <div className="ai-main__title">AI Health Assistant</div>
                            <div className="ai-main__powered">
                                <Zap size={12} />
                                Powered by Gemini
                            </div>
                        </div>
                        <div className="ai-system-status">
                            <div className="ai-system-status__dot" />
                            System Online
                        </div>
                    </div>

                    <div className="ai-messages">
                        {messages.length === 0 && (
                            <div className="ai-message">
                                <div className="ai-message__avatar">
                                    <svg viewBox="0 0 48 48" fill="none" style={{ width: 22, height: 22 }}>
                                        <circle cx="24" cy="24" r="22" fill="#1a1a1a" />
                                        <ellipse cx="24" cy="24" rx="12" ry="8" fill="none" stroke="white" strokeWidth="1.5" />
                                        <circle cx="24" cy="24" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                                        <circle cx="24" cy="24" r="1.5" fill="white" />
                                    </svg>
                                </div>
                                <div className="ai-message__bubble">
                                    Hello! I'm Trinetra's AI Health Assistant. Ask me about air quality, pollution sources, health advice, or forecasts for the Somaiya Vidyavihar campus.
                                    {'\n\n'}Supported languages: English, Hindi, Marathi, Gujarati, Tamil, Telugu, Bengali, Kannada, Malayalam, Punjabi, Odia.
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className={`ai-message${msg.role === 'user' ? ' ai-message--user' : ''}`}>
                                <div className="ai-message__avatar">
                                    {msg.role === 'assistant' ? (
                                        <svg viewBox="0 0 48 48" fill="none" style={{ width: 22, height: 22 }}>
                                            <circle cx="24" cy="24" r="22" fill="#1a1a1a" />
                                            <ellipse cx="24" cy="24" rx="12" ry="8" fill="none" stroke="white" strokeWidth="1.5" />
                                            <circle cx="24" cy="24" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                                            <circle cx="24" cy="24" r="1.5" fill="white" />
                                        </svg>
                                    ) : (
                                        <User size={16} />
                                    )}
                                </div>
                                <div className="ai-message__bubble">
                                    {msg.content.split('\n').map((line, i) => (
                                        <span key={i}>
                                            {line}
                                            {i < msg.content.split('\n').length - 1 && <br />}
                                        </span>
                                    ))}
                                    {msg.hasCard && <AQIResponseCard aqi={msg.forecastAqi} />}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="ai-message ai-typing">
                                <div className="ai-message__avatar">
                                    <svg viewBox="0 0 48 48" fill="none" style={{ width: 22, height: 22 }}>
                                        <circle cx="24" cy="24" r="22" fill="#1a1a1a" />
                                        <ellipse cx="24" cy="24" rx="12" ry="8" fill="none" stroke="white" strokeWidth="1.5" />
                                        <circle cx="24" cy="24" r="4" fill="none" stroke="white" strokeWidth="1.5" />
                                        <circle cx="24" cy="24" r="1.5" fill="white" />
                                    </svg>
                                </div>
                                <div className="ai-typing__dots">
                                    <div className="ai-typing__dot" />
                                    <div className="ai-typing__dot" />
                                    <div className="ai-typing__dot" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="ai-input-area">
                        <div className="ai-input-row">
                            <button className="ai-input-attach" title="Attach">
                                <Plus size={16} />
                            </button>
                            <input
                                className="ai-input-field"
                                type="text"
                                placeholder="Ask about air quality, health advice, or campus data..."
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button className="ai-input-mic" title="Voice input">
                                <Mic size={16} />
                            </button>
                            <button className="ai-input-send" onClick={handleSend} title="Send">
                                <Send size={14} />
                            </button>
                        </div>
                        <div className="ai-disclaimer">
                            AI responses may be inaccurate.&nbsp;
                            <a>Verify AQI Data</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
