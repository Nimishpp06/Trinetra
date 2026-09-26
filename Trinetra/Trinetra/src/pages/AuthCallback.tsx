import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

type Resolver = () => Promise<boolean>;

// Runs the code exchange at most once, even if the effect re-runs (StrictMode).
const resolveSession: Resolver = async () => {
    try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        return Boolean(data.session);
    } catch {
        return false;
    }
};

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const resolveRef = useRef<Promise<boolean> | null>(null);

    // A session appeared (OAuth redirect or code exchange) → dashboard.
    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user) return;

        if (!resolveRef.current) {
            resolveRef.current = resolveSession();
        }

        let cancelled = false;

        resolveRef.current.then(hasSession => {
            if (cancelled) return;
            if (hasSession) {
                navigate('/dashboard', { replace: true });
            } else {
                // No code and no session → let the state settle, then login.
                window.setTimeout(() => {
                    if (!cancelled) navigate('/login', { replace: true });
                }, 800);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [user, navigate]);

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                background: 'var(--color-bg-page)',
            }}
        >
            <div
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    animation: 'pulse 1.5s infinite',
                }}
            />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Signing you in…</p>
        </div>
    );
};
