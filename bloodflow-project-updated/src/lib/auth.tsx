import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Profile fetch error:', error);
    }
    if (data) {
      setProfile(data as Profile);
      return;
    }

    if (authUser?.id === userId) {
      const metadata = authUser.user_metadata || {};
      setProfile({
        id: userId,
        email: authUser.email || '',
        role: metadata.role === 'hospital_admin' || metadata.role === 'admin' ? metadata.role : 'donor',
        full_name: metadata.full_name || authUser.email?.split('@')[0] || 'User',
        phone: metadata.phone || '',
        blood_group: metadata.blood_group || null,
        date_of_birth: metadata.date_of_birth || null,
        address: metadata.address || '',
        city: metadata.city || '',
        is_verified: false,
        created_at: authUser.created_at,
        completed_donations: 0,
        total_units_donated: 0,
        reward_points: 0,
        donor_level: 'Starter',
      });
      return;
    }

    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async (userId?: string) => {
    const profileUserId = userId || session?.user?.id;
    if (profileUserId) {
      await fetchProfile(profileUserId);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        fetchProfile(newSession.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useRole(): UserRole | null {
  const { profile } = useAuth();
  return profile?.role ?? null;
}
