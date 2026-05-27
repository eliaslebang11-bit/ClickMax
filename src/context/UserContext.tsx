import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  isLoading: boolean;
  session: any;
  isOnboarded: boolean;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultUser: UserProfile = {
  username: "Guest",
  handle: "guest",
  description: "Welcome to the platform!",
  avatar: undefined,
  banner: undefined,
  videoCount: 0,
  shortsCount: 0,
  following: "0",
  followers: "0",
  joinedDate: new Date().toISOString()
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('streamcore_user_profile_v2');
    return saved ? JSON.parse(saved) : defaultUser;
  });
  const [session, setSession] = useState<any>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_completed') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (currentSession: any) => {
    if (!currentSession?.user) {
      setIsLoading(false);
      return;
    }

    try {
      // If we have a real session, try to find/create profile
      const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).maybeSingle();
      
      if (dbProfile) {
        setUser({
          id: dbProfile.id,
          email: dbProfile.email,
          full_name: dbProfile.full_name,
          username: dbProfile.username,
          handle: dbProfile.handle,
          description: dbProfile.bio || "",
          bio: dbProfile.bio || "",
          avatar: dbProfile.avatar_url,
          banner: dbProfile.banner_url,
          videoCount: 0,
          shortsCount: 0,
          following: "0",
          followers: dbProfile.followers_count || "0",
          joinedDate: dbProfile.created_at || new Date().toISOString(),
          isAdmin: !!dbProfile.isAdmin
        });
        
        setIsOnboarded(true);
        localStorage.setItem('onboarding_completed', 'true');
      } else {
        // Profile doesn't exist yet, but user is logged in
        const meta = currentSession.user.user_metadata;
        setUser(prev => ({
          ...prev,
          username: meta.full_name || meta.name || prev.username,
          avatar: meta.avatar_url || meta.picture || prev.avatar,
          handle: `@${(meta.slug || meta.full_name || "").toLowerCase().replace(/\s+/g, '') || "user"}`
        }));
        setIsOnboarded(true);
        localStorage.setItem('onboarding_completed', 'true');
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session);
      } else {
        setUser(defaultUser);
        setIsOnboarded(false);
        localStorage.removeItem('onboarding_completed');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('streamcore_user_profile_v2', JSON.stringify(user));
  }, [user]);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const completeOnboarding = async () => {
    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id, 
          signup_completed: true,
          username: user.username,
          handle: user.handle,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setIsOnboarded(true);
      localStorage.setItem('onboarding_completed', 'true');
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setSession(null);
    setUser(defaultUser);
    setIsOnboarded(false);
    localStorage.removeItem('onboarding_completed');
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    setIsLoading(true);
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) {
      setSession(currentSession);
      await fetchProfile(currentSession);
    }
    setIsLoading(false);
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      updateUser, 
      isLoading, 
      session, 
      isOnboarded, 
      completeOnboarding,
      refreshProfile,
      signOut 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
