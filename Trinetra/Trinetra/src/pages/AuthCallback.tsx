import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, INITIAL_AUTH_URL } from '../services/supabase';

interface ResolveResult {
    ok: boolean;
    error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSession = async (attempts: number, delayMs: number): Promise<boolean> => {
    for (let attempt = 0; attempt < attempts; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return true;
        if (attempt < attempts - 1) await sleep(delayMs);
    }
    return false;
};

// supabase-js parses /auth/callback during its own async init and can strip
// ?code= from window.location before this component even mounts. Reading the
// live URL alone therefore looks like "no code arrived" — which is what the
// original silent bounce actually was. So: read the snapshot taken before
// createClient(), let supabase-js finish its own exchange first, and only
// then exchange the code ourselves.
const resolveSession = async (): Promise<ResolveResult> => {
    try {
        const live = new URLSearchParams(window.location.search);
        const snap = new URLSearchParams(INITIAL_AUTH_URL.split('?')[1]?.split('#')[0] ?? '');
        const code = live.get('code') ?? snap.get('code');
        const hasImplicitTokens =
            window.location.hash.includes('access_token=') ||
            INITIAL_AUTH_URL.includes('access_token=');

        if (!code && !hasImplicitTokens) {
            // Nothing arrived — report *what* Supabase actually sent instead of
            // guessing. GoTrue sends ?error=&error_description= when it rejects
            // the redirect URL, which looks identical to "no code" if unread.
            const snapQuery = INITIAL_AUTH_URL.includes('?')
                ? INITIAL_AUTH_URL.slice(INITIAL_AUTH_URL.indexOf('?'))
                : '';
            const params = new URLSearchParams(
                `${window.location.search}&${snapQuery.replace(/^\?/, '')}`,
            );
            // Implicit-flow failures land in the fragment, not the query.
            for (const raw of [window.location.hash, INITIAL_AUTH_URL.split('#')[1] ?? '']) {
                if (!raw) continue;
                new URLSearchParams(raw.replace(/^#/, '')).forEach((v, k) => params.append(k, v));
            }
            const reason =
                params.get('error_description') || params.get('error') || null;

            console.error('[auth] callback URL carried no credentials:', INITIAL_AUTH_URL);

            if (reason) {
                return { ok: false, error: `Google sign-in failed: ${decodeURIComponent(reason)}` };
            }

            return {
                ok: false,
                error:
                    `No authorisation code was returned. Callback URL was: ` +
                    `${INITIAL_AUTH_URL} — Add http://localhost:5173/** to ` +
                    `Supabase → Authentication → URL Configuration → Redirect URLs.`,
            };
        }

        // 1. supabase-js may already be exchanging the code — give it a moment
        //    so we don't fire a second exchange against a consumed code.
        if (await waitForSession(8, 200)) return { ok: true };

        // 2. Exchange it ourselves using whichever URL still carries the code.
        if (code) {
            const exchangeUrl = live.get('code') ? window.location.href : INITIAL_AUTH_URL;
            const { error } = await supabase.auth.exchangeCodeForSession(exchangeUrl);
            if (error) return { ok: false, error: `Sign-in failed: ${error.message}` };
            if (await waitForSession(20, 150)) return { ok: true };
        }

        return { ok: false, error: 'Sign-in did not complete — no session was returned.' };
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
