import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

// Re-export for convenience
export type { User, Session };

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Async actions
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  // Initialize auth - restore session on app load
  initializeAuth: async () => {
    // Don't re-initialize if already done
    if (get().initialized) return;
    
    try {
      set({ loading: true });
      
      // Create a timeout promise - force initialize after 5 seconds
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log('[Auth] Timeout reached, forcing initialization');
          resolve();
        }, 5000);
      });
      
      // Get current session from storage
      const sessionPromise = supabase.auth.getSession();
      
      // Race between session fetch and timeout
      const result: any = await Promise.race([sessionPromise, timeoutPromise]);
      
      // If result is the timeout (undefined), just proceed with no session
      if (!result || !result.data) {
        console.log('[Auth] No session or timeout, proceeding as logged out');
        set({ user: null, session: null, loading: false, initialized: true });
        return;
      }
      
      const { data: { session }, error } = result;
      
      if (error) {
        console.error('Error getting session:', error);
        set({ user: null, session: null, loading: false, initialized: true });
        return;
      }

      if (session) {
        console.log('[Auth] Session restored:', session.user.id);
        set({ 
          user: session.user, 
          session, 
          loading: false, 
          initialized: true 
        });
      } else {
        console.log('[Auth] No session found');
        set({ user: null, session: null, loading: false, initialized: true });
      }
    } catch (error) {
      console.error('[Auth] Error initializing:', error);
      set({ user: null, session: null, loading: false, initialized: true });
    }
  },

  // Sign out
  signOut: async () => {
    try {
      set({ loading: true });
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ loading: false });
    }
  },
}));

// React hook for auth with automatic session restoration
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const { user, session, loading, initialized, initializeAuth, signOut } = useAuthStore();
  const [authListenerSetup, setAuthListenerSetup] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    if (!initialized) {
      initializeAuth();
    }
  }, [initializeAuth, initialized]);

  // Set up auth state listener
  useEffect(() => {
    if (authListenerSetup) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event, session?.user?.id);
        
        if (session) {
          useAuthStore.getState().setSession(session);
          useAuthStore.getState().setUser(session.user);
        } else {
          useAuthStore.getState().setSession(null);
          useAuthStore.getState().setUser(null);
        }
        
        useAuthStore.getState().setLoading(false);
      }
    );

    setAuthListenerSetup(true);

    return () => {
      subscription.unsubscribe();
    };
  }, [authListenerSetup]);

  return {
    user,
    session,
    loading: loading && !initialized,
    initialized,
    signOut,
    isAuthenticated: !!user,
  };
};

// Hook to protect routes - redirects to auth if not logged in
export const useRequireAuth = (redirectTo: string = '/auth') => {
  const { user, loading, initialized } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (initialized && !loading) {
      setIsReady(true);
    }
  }, [initialized, loading]);

  return { user, loading: !isReady || (loading && initialized), isReady };
};
