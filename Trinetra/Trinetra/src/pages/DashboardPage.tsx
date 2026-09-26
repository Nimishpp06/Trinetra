import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { KPIGrid } from '../components/KPIGrid';
import { LocationLeaderboard } from '../components/LocationLeaderboard';
import { PAGE_PATHS } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface ProfileRow {
    full_name: string | null;
    avatar_url: string | null;
}

const ProfileCard = () => {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<ProfileRow | null>(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        setProfile(null);

        const loadProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .single();
                if (!cancelled && !error && data) {
                    setProfile({ full_name: data.full_name, avatar_url: data.avatar_url });
                }
            } catch {
                // profiles table not created yet — fall back to auth metadata.
            }
        };

        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, [user]);

    if (!user) return null;

    const metaName = user.user_metadata?.full_name;
    const displayName =
        (profile?.full_name as string | undefined) ||
        (typeof metaName === 'string' ? metaName : '') ||
        user.email ||
        'Account';
    const initial = displayName.trim().charAt(0).toUpperCase() || '?';

    return (
        <div className="profile-card">
            <div className="profile-avatar">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} />
                ) : (
                    <span>{initial}</span>
                )}
            </div>

            <div className="profile-info">
                <div className="profile-name">{displayName}</div>
                <div className="profile-email">{user.email}</div>
            </div>

            <button
                className="profile-signout"
                type="button"
                onClick={() => {
                    void signOut();
                }}
            >
                <LogOut size={14} />
                Sign out
            </button>
        </div>
    );
};

export const DashboardPage = () => {
    const navigate = useNavigate();

    return (
        <div className="page-content">
            <ProfileCard />
            <KPIGrid />
            <LocationLeaderboard onViewMap={() => navigate(PAGE_PATHS.map)} />
        </div>
    );
};
