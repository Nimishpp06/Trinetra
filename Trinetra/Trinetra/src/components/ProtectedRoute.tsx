import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
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
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Loading Trinetra…
                </p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
