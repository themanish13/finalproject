import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

/**
 * Hook to track online/offline status of users using Supabase Presence
 * This provides real-time presence information without needing a database table
 */
export function useUserPresence(userId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [userLastSeen, setUserLastSeen] = useState<Record<string, string>>({});

  // Track current user's presence
  useEffect(() => {
    if (!userId) return;

    console.log('[useUserPresence] Setting up presence for:', userId);

    const channel = supabase.channel('user-presence', {
      config: {
        presence: { key: userId },
      },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log('[useUserPresence] Presence sync:', state);
      
      // Get all online user IDs
      const online: string[] = [];
      const lastSeen: Record<string, string> = {};
      
      Object.entries(state).forEach(([key, presences]) => {
        if (presences && presences.length > 0) {
          const presence = presences[0] as unknown as { last_seen?: string; online_at?: string };
          if (key !== userId) {
            online.push(key);
          }
          if (presence?.last_seen) {
            lastSeen[key] = presence.last_seen;
          }
        }
      });
      
      setOnlineUsers(new Set(online));
      setUserLastSeen(lastSeen);
    });

    // Handle user joining
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[useUserPresence] User joined:', key, newPresences);
      if (key !== userId) {
        setOnlineUsers(prev => new Set([...prev, key]));
      }
    });

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[useUserPresence] User left:', key, leftPresences);
      if (key !== userId) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      console.log('[useUserPresence] Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        // Track presence with timestamp
        await channel.track({
          online_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
      }
    });

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // User came back online
        await channel.track({
          online_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        } as Record<string, unknown>);
      } else {
        // User went offline (but keep in presence for a bit)
        const currentState = channel.presenceState()[userId] as unknown as Array<{ online_at?: string }> | undefined;
        await channel.track({
          online_at: currentState?.[0]?.online_at,
          last_seen: new Date().toISOString(),
        } as Record<string, unknown>);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      console.log('[useUserPresence] Cleaning up...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Check if a specific user is online
  const isUserOnline = useCallback((targetUserId: string): boolean => {
    return onlineUsers.has(targetUserId);
  }, [onlineUsers]);

  // Get last seen time for a user
  const getLastSeen = useCallback((targetUserId: string): string | null => {
    return userLastSeen[targetUserId] || null;
  }, [userLastSeen]);

  // Format last seen for display
  const formatLastSeen = useCallback((targetUserId: string): string => {
    const lastSeen = getLastSeen(targetUserId);
    if (!lastSeen) return 'Unknown';
    
    if (onlineUsers.has(targetUserId)) {
      return 'Online now';
    }
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, [getLastSeen, onlineUsers]);

  return {
    onlineUsers,
    userLastSeen,
    isUserOnline,
    getLastSeen,
    formatLastSeen,
  };
}

/**
 * Hook for a single user's presence (to track if someone is viewing your profile)
 * Returns functions to track your own presence
 */
export function useMyPresence(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;

    console.log('[useMyPresence] Setting up for:', userId);

    const channel = supabase.channel('my-presence', {
      config: {
        presence: { key: userId },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const myPresence = state[userId] as unknown as Array<{ online_at?: string }> | undefined;
      setIsOnline(!!(myPresence && myPresence.length > 0));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          online_at: new Date().toISOString(),
        } as Record<string, unknown>);
      }
    });

    // Handle page unload
    const handleUnload = () => {
      channel.untrack();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isOnline };
}

