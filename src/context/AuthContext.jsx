import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../lib/supabase';
import { setLoading as setGlobalLoading, showToast } from '../store/slices/uiSlice';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    dispatch(setGlobalLoading({ isVisible: true, message: 'Initializing ThesisTrack...' }));

    // Global Failsafe Timeout: Ensure we NEVER get stuck on loading for more than 8 seconds
    const globalTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('AuthContext: Global timeout reached. Forcing load completion.');
        setLoading(false);
        dispatch(setGlobalLoading(false));
      }
    }, 8000);

    const getSession = async () => {
      try {
        console.log('AuthContext: Starting session check...');
        // Add a timeout to getSession itself
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) throw error;

        if (mounted) {
          if (session) {
             console.log('AuthContext: Session restored', { 
                expires_at: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A' 
             });
             setSession(session);
             setUser(session?.user ?? null);
             await fetchProfile(session.user.id);
          } else {
             console.log('AuthContext: No active session found.');
             setSession(null);
             setUser(null);
             setLoading(false);
             dispatch(setGlobalLoading(false));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // If session check fails, we assume logged out to unblock the user
        if (mounted) {
           setSession(null);
           setUser(null);
           setLoading(false);
           dispatch(setGlobalLoading(false));
        }
      }
    };

    getSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: onAuthStateChange', event, session?.user?.id);
      
      if (!mounted) return;

      if (event === 'TOKEN_REFRESHED') {
        console.log('AuthContext: Token refreshed automatically');
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Only fetch profile if we don't have it or if the user changed
        if (!profile || profile.id !== session.user.id) {
           // We do NOT await this here to avoid blocking the UI if it's just an update
           // But if it's the first load (loading=true), fetchProfile will handle the setLoading(false)
           fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        setProfile(null);
        setSession(null);
        setUser(null);
        setLoading(false);
        dispatch(setGlobalLoading(false));
      }
    });

    return () => {
      mounted = false;
      clearTimeout(globalTimeout);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  const fetchProfile = async (userId) => {
    try {
      console.log('AuthContext: fetchProfile start', userId);
      
      // Re-introduce timeout for profile fetch
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 6000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error && error.code !== 'PGRST116') { 
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
         console.log('AuthContext: fetchProfile success', data);
         setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      console.log('AuthContext: fetchProfile finally');
      // Always clear loading state
      setLoading(false);
      dispatch(setGlobalLoading(false));
    }
  };

  const signUp = async (email, password, metaData = {}) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metaData, 
      },
    });
  };

  const signIn = async (email, password) => {
    try {
       const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign in timed out. Please check your connection.')), 15000)
      );

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      return await Promise.race([signInPromise, timeoutPromise]);
    } catch (error) {
      console.error('AuthContext: signIn error/timeout', error);
      return { data: { user: null, session: null }, error };
    }
  };

  const signOut = async () => {
    try {
      dispatch(setGlobalLoading({ isVisible: true, message: 'Signing out...' }));
      // Clear local state immediately to make UI responsive
      setSession(null);
      setUser(null);
      setProfile(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      dispatch(showToast({ message: error.message || 'Error signing out', type: 'error' }));
    } finally {
      setLoading(false);
      dispatch(setGlobalLoading(false));
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
