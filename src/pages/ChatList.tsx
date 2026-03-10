import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Search, Loader2, MessageSquareDiff } from "lucide-react";
import ChatListItem from "@/components/chat/ChatListItem";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Cache utilities
import { cacheChatList, loadCachedChatList, preloadAvatars } from "@/utils/chatCache";

interface ChatUser {
  id: string;
  name: string;
  avatar_url?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: 'me' | 'them' | null;
  unreadCount: number;
}

const ChatList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load cached chats on mount, then fetch fresh data
  useEffect(() => {
    // First, try to load from cache for instant display
    loadChatsFromCache();
    
    // Then fetch fresh data
    loadChats();
    
    // Set up interval for background refresh (every 30 seconds)
    const refreshInterval = setInterval(() => {
      refreshChats();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Load chats from cache for instant display
  const loadChatsFromCache = async () => {
    try {
      const cached = await loadCachedChatList();
      if (cached && cached.chats.length > 0) {
        setChats(cached.chats);
        // Preload avatars in the background
        preloadAvatars(cached.chats);
      }
    } catch (error) {
      console.error("Error loading cached chats:", error);
    }
  };

  // Refresh chats in background
  const refreshChats = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch fresh data (same logic as loadChats but without setting loading state)
      const { data: messagesData } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at, read_at, is_unsent, deleted_for_sender, deleted_for_receiver")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messagesData) {
        const userIds = new Set<string>();
        const userLastMessages: Record<string, { content: string; created_at: string; sender_id: string; read_at: string | null }> = {};
        
        messagesData.forEach(msg => {
          if (msg.is_unsent) return;
          if (msg.sender_id !== user.id && msg.deleted_for_receiver) return;
          if (msg.sender_id === user.id && msg.deleted_for_sender) return;
          
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          userIds.add(otherUserId);
          
          if (!userLastMessages[otherUserId] || new Date(msg.created_at) > new Date(userLastMessages[otherUserId].created_at)) {
            userLastMessages[otherUserId] = {
              content: msg.content,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              read_at: msg.read_at
            };
          }
        });

        if (userIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", Array.from(userIds));

          const chatUsers: ChatUser[] = Array.from(userIds).map(userId => {
            const profile = profiles?.find(p => p.id === userId);
            const lastMsg = userLastMessages[userId];
            const unreadCount = messagesData?.filter(
              msg => msg.sender_id === userId && msg.receiver_id === user.id && 
                     !msg.read_at && !msg.is_unsent && 
                     !(msg.sender_id !== user.id && msg.deleted_for_receiver) &&
                     !(msg.sender_id === user.id && msg.deleted_for_sender)
            ).length || 0;

            return {
              id: userId,
              name: profile?.name || "Unknown",
              avatar_url: profile?.avatar_url,
              lastMessage: lastMsg?.content,
              lastMessageTime: lastMsg?.created_at 
                ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
              lastMessageSender: lastMsg?.sender_id === user.id ? 'me' : 'them',
              unreadCount,
            };
          });

          chatUsers.sort((a, b) => {
            const timeA = userLastMessages[a.id]?.created_at;
            const timeB = userLastMessages[b.id]?.created_at;
            if (!timeA) return 1;
            if (!timeB) return -1;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          });

          // Update state and cache
          setChats(chatUsers);
          await cacheChatList(chatUsers);
        }
      }
    } catch (error) {
      console.error("Error refreshing chats:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  const loadChats = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        return;
      }

      setCurrentUserId(user.id);

      // Get all users the current user has exchanged messages with
      // Exclude unsent messages and messages deleted for the current user
      const { data: messagesData } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at, read_at, is_unsent, deleted_for_sender, deleted_for_receiver")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Get unique user IDs from messages
      const userIds = new Set<string>();
      const userLastMessages: Record<string, { content: string; created_at: string; sender_id: string; read_at: string | null }> = {};
      
      if (messagesData) {
        messagesData.forEach(msg => {
          // Skip messages that are unsent or deleted for current user
          if (msg.is_unsent) return;
          if (msg.sender_id !== user.id && msg.deleted_for_receiver) return;
          if (msg.sender_id === user.id && msg.deleted_for_sender) return;
          
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          userIds.add(otherUserId);
          
          // Keep only the most recent message for each user
          if (!userLastMessages[otherUserId] || new Date(msg.created_at) > new Date(userLastMessages[otherUserId].created_at)) {
            userLastMessages[otherUserId] = {
              content: msg.content,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              read_at: msg.read_at
            };
          }
        });
      }

      if (userIds.size > 0) {
        // Get profile data for users with conversations
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", Array.from(userIds));

        // Build chat users list
        const chatUsers: ChatUser[] = Array.from(userIds).map(userId => {
          const profile = profiles?.find(p => p.id === userId);
          const lastMsg = userLastMessages[userId];
          
          // Get unread count (excluding deleted messages)
          const unreadCount = messagesData?.filter(
            msg => msg.sender_id === userId && msg.receiver_id === user.id && 
                   !msg.read_at && !msg.is_unsent && 
                   !(msg.sender_id !== user.id && msg.deleted_for_receiver) &&
                   !(msg.sender_id === user.id && msg.deleted_for_sender)
          ).length || 0;

          return {
            id: userId,
            name: profile?.name || "Unknown",
            avatar_url: profile?.avatar_url,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at 
              ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
            lastMessageSender: lastMsg?.sender_id === user.id ? 'me' : 'them',
            unreadCount,
          };
        });

        // Sort by last message time
        chatUsers.sort((a, b) => {
          const timeA = userLastMessages[a.id]?.created_at;
          const timeB = userLastMessages[b.id]?.created_at;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

        setChats(chatUsers);
        
        // Cache the chat list for instant loading next time
        await cacheChatList(chatUsers);
        
        // Preload avatars in the background
        preloadAvatars(chatUsers);
      }

      // Also load all profiles for starting new chats
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .neq("id", user.id);

      if (allProfiles) {
        const usersList: ChatUser[] = allProfiles.map(profile => ({
          id: profile.id,
          name: profile.name || "Unknown",
          avatar_url: profile.avatar_url,
          unreadCount: 0,
        }));
        setAllUsers(usersList);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter chats based on search
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // When searching in main search bar, also show other users in the app
  const searchResults = searchQuery.length > 0 
    ? allUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !chats.find(c => c.id === user.id)
      )
    : [];

  const handleStartChat = (userId: string) => {
    navigate(`/chat?matchId=${userId}`);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-5 md:w-6 text-primary fill-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Chats</h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Your conversations with matches and others
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mb-6"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations or find people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl"
            />
          </motion.div>

          {/* Search Results - Show other users in the app */}
          {!loading && searchQuery.length > 0 && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                Start a chat with
              </h3>
              <div className="flex flex-col gap-2">
                {searchResults.slice(0, 5).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartChat(user.id)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left bg-card border border-border"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="relative w-20 h-20">
                <span className="z-loading z-1">Z</span>
                <span className="z-loading z-2">Z</span>
                <span className="z-loading z-3">Z</span>
                <span className="z-loading z-4">Z</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && chats.length === 0 && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-card border border-border">
                <MessageSquareDiff className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Search for someone to start a conversation!
              </p>
            </motion.div>
          )}

          {/* Chats List */}
          {!loading && filteredChats.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-2 select-none"
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                All Messages
              </h3>
              <div className="flex flex-col gap-2">
                {filteredChats.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="chat-list-item"
                    data-chat-item
                  >
                    <ChatListItem {...chat} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </main>
    </div>
  );
};

export default ChatList;

