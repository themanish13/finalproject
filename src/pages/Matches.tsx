import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Sparkles, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import SwipeWrapper from "@/components/SwipeWrapper";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface MatchedUser {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
  matchedAt: string;
}

const Matches = () => {
  const { toast } = useToast();
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
        const matchedUsers: MatchedUser[] = matchesData.map(match => {
          const matchedUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
          const profile = profiles?.find(p => p.id === matchedUserId);
          
          return {
            id: matchedUserId,
            name: profile?.name || "Unknown",
            avatar_url: profile?.avatar_url,
            class: profile?.class,
            batch: profile?.batch,
            matchedAt: new Date(match.matched_at).toLocaleDateString()
          };
        });

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
      <Navbar />

      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <SwipeWrapper>
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
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading matches...</h3>
            <p className="text-muted-foreground text-sm">Checking your mutual connections</p>
          </motion.div>
        )}

        {/* Matches Grid */}
        {!loading && matches.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 md:grid-cols-4 gap-3"
          >
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  variant="glow" 
                  className="p-5 md:p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar with glow effect */}
                    <motion.div 
                      className="relative mb-4"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center overflow-hidden transition-all duration-300 bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30`}>
                        {match.avatar_url ? (
                          <img
                            src={match.avatar_url}
                            alt={match.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl md:text-4xl font-bold text-white">
                            {match.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      {/* Heart badge */}
                      <motion.div
                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
                      >
                        <Heart className="w-4 h-4 text-white fill-white" />
                      </motion.div>
                    </motion.div>

                    {/* Info */}
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold">
                        {match.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {match.class || "Unknown"} • {match.batch || "Unknown"}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Matched {match.matchedAt}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : !loading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
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
            <Card variant="glow" className="p-6 md:p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-primary/20 blur-[80px] rounded-full" />
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
      </SwipeWrapper>
    </div>
  );
};

export default Matches;

