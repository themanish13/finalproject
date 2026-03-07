import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'match' | 'message' | 'like' | 'hint';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/**
 * Hook to get realtime notifications
 * Automatically updates when new notifications arrive
 */
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    console.log('[useNotifications] Fetching initial notifications...');

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[useNotifications] Table might not exist or has different schema:', error.message);
        // Table might not exist yet or has different columns - that's ok
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Filter to only include notifications with required fields
      const validNotifications = (data || []).filter(n => n.id && n.title);
      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.warn('[useNotifications] Error fetching:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    console.log('[useNotifications] Subscribing to realtime...');

    const channel = supabase.channel('notifications-realtime');

    // Listen for new notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newNotification = payload.new as AppNotification;
        console.log('[useNotifications] New notification:', newNotification);

        // Add to beginning of list (newest first)
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.body,
            icon: '/icon-192.jpg',
          });
        }
      }
    );

    // Listen for read status updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as AppNotification;
        console.log('[useNotifications] Notification updated:', updated);

        setNotifications(prev => 
          prev.map(n => n.id === updated.id ? updated : n)
        );

        // Recalculate unread count
        setNotifications(prev => {
          const newUnread = prev.filter(n => !n.read).length;
          setUnreadCount(newUnread);
          return prev;
        });
      }
    );

    // Subscribe
    channel.subscribe((status) => {
      console.log('[useNotifications] Subscription status:', status);
    });

    // Initial fetch
    fetchNotifications();

    // Cleanup
    return () => {
      console.log('[useNotifications] Unsubscribing...');
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update in database
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (err) {
      console.warn('[useNotifications] Could not mark as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    // Update in database
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    } catch (err) {
      console.warn('[useNotifications] Could not mark all as read:', err);
    }
  }, [userId]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Delete from database
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    } catch (err) {
      console.warn('[useNotifications] Could not delete:', err);
    }
  }, [notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}

