import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MatchCard from "@/components/MatchCard";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface MatchedUser {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
  matchedAt: string;
  lastMessage?: string;
  lastMessageSender?: 'me' | 'them' | null;
  hasUnread?: boolean;
}

const Matches = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        return;
      }

      setCurrentUserId(user.id);

      // Get matches where current user is either user1 or user2
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select(`
          id,
          user1_id,
          user2_id,
          matched_at
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matchesError) {
        console.error("Matches fetch error:", matchesError);
        toast({
          title: "Error",
          description: "Failed to load matches. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (matchesData && matchesData.length > 0) {
        // Get profile data for matched users
        const matchedUserIds = matchesData.map(match => 
          match.user1_id === user.id ? match.user2_id : match.user1_id
        );

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, class, batch")
          .in("id", matchedUserIds);

        if (profilesError) {
          console.error("Profiles fetch error:", profilesError);
          return;
        }

        // Combine match data with profile data
        const matchedUsers: MatchedUser[] = await Promise.all(matchesData.map(async match => {
          const matchedUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const profile = profiles?.find(p => p.id === matchedUserId);
          
          // Get last message between current user and this match
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, sender_id, receiver_id, read_at")
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${matchedUserId}),and(sender_id.eq.${matchedUserId},receiver_id.eq.${user.id})`)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Check if there are unread messages from this match - count messages where:
          // - sender is the matched user (not current user)
          // - read_at is null (not read yet)
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: 'exact', head: true })
            .eq("sender_id", matchedUserId)
            .eq("receiver_id", user.id)
            .is("read_at", null);

          const hasUnread = (unreadCount || 0) > 0;

          return {
            id: matchedUserId,
            name: profile?.name || "Unknown",
            avatar_url: profile?.avatar_url,
            class: profile?.class,
            batch: profile?.batch,
            matchedAt: new Date(match.matched_at).toLocaleDateString(),
            lastMessage: lastMsg?.content,
            lastMessageSender: lastMsg?.sender_id === user.id ? 'me' : 'them',
            hasUnread
          };
        }));

        setMatches(matchedUsers);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-5 md:w-6 text-primary fill-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Matches</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Your mutual connections. These people also selected you!
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--border)' }}>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading matches...</h3>
            <p className="text-muted-foreground text-sm">Checking your mutual connections</p>
          </motion.div>
        )}

        {/* Matches List */}
        {!loading && matches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <MatchCard
                  id={match.id}
                  name={match.name}
                  avatar_url={match.avatar_url}
                  bio={match.class ? `${match.class} • ${match.batch}` : undefined}
                  matchedAt={match.matchedAt}
                  lastMessage={match.lastMessage}
                  lastMessageSender={match.lastMessageSender}
                  hasUnread={match.hasUnread}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : !loading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--border)' }}>
              <PartyPopper className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No matches yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Keep selecting crushes! When someone you like also likes you back, 
              they'll appear here.
            </p>
            <Button variant="glow" onClick={() => window.location.href = "/discover"} className="btn-gradient">
              <Sparkles className="w-4 h-4 mr-2" />
              Discover People
            </Button>
          </motion.div>
        ) : null}

        {/* Match celebration banner */}
        {!loading && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 md:mt-12"
          >
            <Card variant="glow" className="p-6 md:p-8 text-center" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="relative z-10">
                <PartyPopper className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  You have {matches.length} mutual {matches.length === 1 ? "match" : "matches"}!
                </h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  These connections are real. Start a conversation!
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Matches;

