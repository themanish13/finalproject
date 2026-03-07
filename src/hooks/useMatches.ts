import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Match, Profile } from '@/lib/supabase';

interface MatchWithProfile extends Match {
  profile?: Profile;
  lastMessage?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unreadCount?: number;
}

/**
 * Hook to get realtime updates for matches
 * Automatically updates when new matches occur
 */
export function useMatches(userId: string | null) {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial matches
  const fetchMatches = useCallback(async () => {
    if (!userId) return;

    console.log('[useMatches] Fetching initial matches...');

    try {
      // Get matches where current user is either user1 or user2
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('matched_at', { ascending: false });

      if (matchesError) {
        console.error('[useMatches] Error fetching matches:', matchesError);
        return;
      }

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Get profile data for matched users
      const matchedUserIds = matchesData.map(match => 
        match.user1_id === userId ? match.user2_id : match.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedUserIds);

      // Get last message and unread count for each match
      const matchesWithProfiles: MatchWithProfile[] = await Promise.all(
        matchesData.map(async (match) => {
          const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
          const profile = profiles?.find(p => p.id === matchedUserId);

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, sender_id, created_at')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${matchedUserId}),and(sender_id.eq.${matchedUserId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', matchedUserId)
            .eq('receiver_id', userId)
            .is('read_at', null);

          return {
            ...match,
            profile: profile || undefined,
            lastMessage: lastMsg ? {
              content: lastMsg.content,
              sender_id: lastMsg.sender_id,
              created_at: lastMsg.created_at,
            } : undefined,
            unreadCount: unreadCount || 0,
          };
        })
      );

      setMatches(matchesWithProfiles);
    } catch (err) {
      console.error('[useMatches] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to realtime match events
  useEffect(() => {
    if (!userId) return;

    console.log('[useMatches] Subscribing to realtime...');

    const channel = supabase.channel('matches-realtime');

    // Listen for new matches
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      },
      async (payload) => {
        const newMatch = payload.new as Match;
        console.log('[useMatches] New match detected:', newMatch);

        // Determine the matched user ID
        const matchedUserId = newMatch.user1_id === userId ? newMatch.user2_id : newMatch.user1_id;

        // Get profile for the matched user
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', matchedUserId)
          .single();

        // Add new match to the list
        const newMatchWithProfile: MatchWithProfile = {
          ...newMatch,
          profile: profile || undefined,
          unreadCount: 0,
        };

        setMatches(prev => [newMatchWithProfile, ...prev]);
      }
    );

    // Listen for deleted matches (when a crush is removed)
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'matches',
      },
      (payload) => {
        const deletedMatch = payload.old as Match;
        console.log('[useMatches] Match deleted:', deletedMatch);

        // Remove the deleted match from state
        setMatches(prev => 
          prev.filter(m => m.id !== deletedMatch.id)
        );
      }
    );

    // Subscribe
    channel.subscribe((status) => {
      console.log('[useMatches] Subscription status:', status);
    });

    // Initial fetch
    fetchMatches();

    // Cleanup
    return () => {
      console.log('[useMatches] Unsubscribing...');
      supabase.removeChannel(channel);
    };
  }, [userId, fetchMatches]);

  return {
    matches,
    loading,
    refresh: fetchMatches,
  };
}

