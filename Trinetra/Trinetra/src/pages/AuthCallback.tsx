import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface ResolveResult {
    ok: boolean;
    error?: string;
}

// Handles both Supabase flow types:
//   PKCE    → /auth/callback?code=...      (default in supabase-js v2)
//   Implicit → /auth/callback#access_token=...
// getSession() can race with supabase-js's own URL detection, so poll briefly
// instead of giving up on the first null. Errors are returned rather than
// swallowed — silently bouncing the user to /login with no message made the
// original failure impossible to diagnose.
const resolveSession = async (): Promise<ResolveResult> => {
    try {
        const code = new URLSearchParams(window.location.search).get('code');
        const hasImplicitTokens = window.location.hash.includes('access_token=');

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error) {
                return { ok: false, error: `Sign-in failed: ${error.message}` };
            }
        } else if (!hasImplicitTokens) {
            return {
                ok: false,
                error:
                    'Sign-in was redirected without an authorisation code. ' +
                    'Add http://localhost:5173/** to Supabase → Authentication → URL Configuration → Redirect URLs.',
            };
        }

        // Poll: supabase-js may still be parsing the URL / restoring the session.
        for (let attempt = 0; attempt < 20; attempt++) {
            const { data } = await supabase.auth.getSession();
            if (data.session) return { ok: true };
            await new Promise((resolve) => setTimeout(resolve, 150));
        }

        return {
            ok: false,
            error: 'Sign-in did not complete — no session was returned.',
        };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : 'Sign-in failed unexpectedly.',
        };
    }
};

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const resolveRef = useRef<Promise<ResolveResult> | null>(null);

    // A session appeared (OAuth redirect or code exchange) → dashboard.
    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user) return;

        // StrictMode-safe: the exchange runs exactly once.
        if (!resolveRef.current) {
            resolveRef.current = resolveSession();
        }

        let cancelled = false;

        resolveRef.current.then((result) => {
            if (cancelled) return;
            if (result.ok) {
                navigate('/dashboard', { replace: true });
            } else {
                console.error('[auth] callback failed:', result.error);
                navigate('/login', {
                    replace: true,
                    state: { authError: result.error },
                });
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
