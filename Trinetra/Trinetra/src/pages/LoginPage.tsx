import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { TrinetraLogo } from '../components/TrinetraLogo';

type Mode = 'signin' | 'signup';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { user, loading, signUp, signIn, signInWithGoogle } = useAuth();

    const [mode, setMode] = useState<Mode>('signin');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Already signed in → go straight to the dashboard.
    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [loading, user, navigate]);

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setInfo(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setSubmitting(true);
        try {
            if (mode === 'signup') {
                const { error: signUpError } = await signUp(email, password, fullName);
                if (signUpError) {
                    setError(signUpError.message);
                    return;
                }
                // Email confirmation may be enabled — only redirect when a
                // session was actually created.
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    navigate('/dashboard', { replace: true });
                } else {
                    setInfo('Almost there — check your inbox to confirm your email, then sign in.');
                    setMode('signin');
                }
            } else {
                const { error: signInError } = await signIn(email, password);
                if (signInError) {
                    setError(signInError.message);
                    return;
                }
                navigate('/dashboard', { replace: true });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        setInfo(null);
        setSubmitting(true);
        const { error: googleError } = await signInWithGoogle();
        if (googleError) {
            setError(googleError.message);
            setSubmitting(false);
        }
        // On success the browser is redirected to Google.
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <div className="trinetra-logo">
                        <TrinetraLogo />
                        <span className="trinetra-wordmark">Trinetra</span>
                    </div>
                    <p className="auth-card__tagline">Campus Air Quality Monitoring Suite</p>
                </div>

                <div className="auth-card__body">
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={`filter-pill${mode === 'signin' ? ' active' : ''}`}
                            onClick={() => switchMode('signin')}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            className={`filter-pill${mode === 'signup' ? ' active' : ''}`}
                            onClick={() => switchMode('signup')}
                        >
                            Sign up
                        </button>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {mode === 'signup' && (
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="auth-name">
                                    Full name
                                </label>
                                <input
                                    id="auth-name"
                                    className="auth-input"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Jane Doe"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="auth-field">
                            <label className="auth-label" htmlFor="auth-email">
                                Email
                            </label>
                            <input
                                id="auth-email"
                                className="auth-input"
                                type="email"
                                autoComplete="email"
                                placeholder="you@somaiya.edu"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label" htmlFor="auth-password">
                                Password
                            </label>
                            <input
                                id="auth-password"
                                className="auth-input"
                                type="password"
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        {error && <p className="auth-error">{error}</p>}
                        {info && <p className="auth-info">{info}</p>}

                        <button className="auth-btn" type="submit" disabled={submitting}>
                            {submitting
                                ? 'Please wait…'
                                : mode === 'signup'
                                    ? 'Create account'
                                    : 'Sign in'}
                        </button>
                    </form>

                    <div className="auth-divider"><span>or</span></div>

                    <button
                        className="auth-btn--google"
                        type="button"
                        onClick={handleGoogle}
                        disabled={submitting}
                    >
                        <span className="auth-google-g">G</span>
                        Continue with Google
                    </button>
                </div>
            </div>
        </div>
    );
};
