import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MatchCard from "@/components/MatchCard";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useMatches } from "@/hooks/useMatches";

interface MatchedUser {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  matchedAt: string;
  lastMessage?: string;
  lastMessageSender?: 'me' | 'them' | null;
  hasUnread?: boolean;
}

const Matches = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Use the realtime matches hook
  const { matches, loading, refresh } = useMatches(currentUserId);

  // Transform matches for display
  const displayMatches: MatchedUser[] = matches.map(match => {
    const matchedUserId = match.user1_id === currentUserId ? match.user2_id : match.user1_id;
    
    return {
      id: matchedUserId,
      name: match.profile?.name || "Unknown",
      avatar_url: match.profile?.avatar_url,
      bio: (match.profile as any)?.bio,
      matchedAt: new Date(match.matched_at).toLocaleDateString(),
      lastMessage: match.lastMessage?.content,
      lastMessageSender: match.lastMessage?.sender_id === currentUserId ? 'me' : 'them',
      hasUnread: (match.unreadCount || 0) > 0,
    };
  });

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
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="relative w-20 h-20">
              <span className="z-loading z-1">Z</span>
              <span className="z-loading z-2">Z</span>
              <span className="z-loading z-3">Z</span>
              <span className="z-loading z-4">Z</span>
            </div>
          </div>
        )}

        {/* Matches List */}
        {!loading && displayMatches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {displayMatches.map((match, index) => (
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
                  bio={match.bio}
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
        {!loading && displayMatches.length > 0 && (
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
                  You have {displayMatches.length} mutual {displayMatches.length === 1 ? "match" : "matches"}!
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

