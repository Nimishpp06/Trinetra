import { useState, useRef, useEffect } from 'react';
import { Zap, Shield, Plus, Mic, Send, User } from 'lucide-react';

interface Message {
    id: number;
    role: 'assistant' | 'user';
    content: string;
    hasCard?: boolean;
    isTyping?: boolean;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: 1,
        role: 'assistant',
        content: 'Hello. I am the Trinetra AI Health Assistant. I monitor air quality data across the Somaiya Vidyavihar campus and provide contextual health advisories.\n\nThe current campus AQI is 115 (Moderate). How can I assist you today?',
    },
    {
        id: 2,
        role: 'user',
        content: 'I have an outdoor sports practice at the engineering ground at 5 PM. Should I reschedule?',
    },
    {
        id: 3,
        role: 'assistant',
        content: 'Based on current predictive models, the air quality near the engineering ground is expected to deteriorate slightly by 5 PM due to evening traffic patterns.',
        hasCard: true,
    },
];

const AQIResponseCard = () => (
    <>
        <div className="ai-forecast-card">
            <div className="ai-forecast-card__label">
                <Zap size={14} style={{ color: '#9b1c1c' }} />
                Forecasted AQI (5:00 PM)
            </div>
            <div className="ai-forecast-card__value">
                152
                <span className="status-badge status-badge--unhealthy" style={{ fontSize: 10, padding: '3px 8px' }}>UNHEALTHY</span>
            </div>
        </div>
        <div className="ai-health-advisory">
            <div className="ai-health-advisory__title">
                <Shield size={14} />
                Health Advisory
            </div>
            <ul>
                <li>Intense physical activity outdoors is not recommended for sensitive groups.</li>
                <li>Consider moving practice indoors to the campus sports complex if possible.</li>
                <li>If outdoors, reduce exertion levels and stay hydrated.</li>
            </ul>
        </div>
    </>
);

export const AIAssistantPage = () => {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputVal, setInputVal] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = () => {
        const text = inputVal.trim();
        if (!text) return;

        const userMsg: Message = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInputVal('');
        setIsTyping(true);

        setTimeout(() => {
            setIsTyping(false);
            const reply: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: `Based on current sensor readings and predictive analysis, I can provide guidance on your query about "${text}". The campus AQI is currently at 112 (Moderate). For specific health recommendations, please consult with the campus health center.`,
            };
            setMessages(prev => [...prev, reply]);
        }, 2000);
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
                {/* Chat main area */}
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
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`ai-message${msg.role === 'user' ? ' ai-message--user' : ''}`}
                            >
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
                                    {msg.hasCard && <AQIResponseCard />}
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
