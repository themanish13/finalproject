import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Sparkles, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import UserCard from "@/components/UserCard";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
  gender?: string;
}

// Centered Modal Match Reveal Component
const MatchReveal = ({ 
  isOpen, 
  onClose, 
  matchedUserName, 
  matchedUserAvatar 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  matchedUserName: string;
  matchedUserAvatar?: string;
}) => {
  useEffect(() => {
    if (isOpen && navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }, [isOpen]);

  // Handle click outside the card
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={handleBackdropClick}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      {/* Match Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-[320px] mx-4 rounded-3xl bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CSS-based floating hearts background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 to-transparent" />
          <Heart className="heart-float heart-1 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-2 text-pink-400 fill-pink-300" />
          <Heart className="heart-float heart-3 text-red-400 fill-red-300" />
          <Heart className="heart-float heart-4 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-5 text-pink-400 fill-pink-300" />
          <Heart className="heart-float heart-6 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-7 text-red-400 fill-red-300" />
          <Heart className="heart-float heart-8 text-pink-400 fill-pink-300" />
          <Heart className="heart-float heart-9 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-10 text-pink-400 fill-pink-300" />
          <Heart className="heart-float heart-11 text-red-400 fill-red-300" />
          <Heart className="heart-float heart-12 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-13 text-pink-400 fill-pink-300" />
          <Heart className="heart-float heart-14 text-rose-400 fill-rose-300" />
          <Heart className="heart-float heart-15 text-red-400 fill-red-300" />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground p-1 bg-background/50 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Content */}
        <div className="relative p-6 pt-8 text-center">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-3"
          >
            <div className="text-4xl mb-1">🎉</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#FF2D55] to-[#FF6B8A] bg-clip-text text-transparent">
              IT'S A MATCH!
            </h2>
          </motion.div>

          <p className="text-sm text-muted-foreground mb-4">
            You and <span className="text-foreground font-semibold">{matchedUserName}</span> liked each other!
          </p>

          {/* Avatar with glow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-light to-primary p-0.5 shadow-[0_0_25px_rgba(255,45,85,0.4)]">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                {matchedUserAvatar ? (
                  <img src={matchedUserAvatar} alt={matchedUserName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {matchedUserName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-primary-light to-primary text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200"
          >
            Start Chatting 💬
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Crush limit indicator component
const CrushLimitIndicator = ({ count, max = 5 }: { count: number; max?: number }) => {
  const percentage = (count / max) * 100;
  const isFull = count >= max;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <Heart className={`w-5 h-5 ${isFull ? 'text-[#FF2D55]' : 'text-primary'}`} />
        <span className={`text-sm ${isFull ? 'text-[#FF2D55]' : 'text-muted-foreground'}`}>
          <span className="font-semibold">{count}</span>/{max} selected
        </span>
      </div>
      {/* Progress bar */}
      <div className="flex-1 max-w-[100px] h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${isFull ? 'bg-[#FF2D55]' : 'bg-gradient-to-r from-primary-light to-primary'}`}
        />
      </div>
      {isFull && (
        <span className="text-xs text-[#FF2D55] font-medium">Limit reached!</span>
      )}
    </motion.div>
  );
};

const MAX_CRUSHES = 5;

const Discover = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrushes, setSelectedCrushes] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingCrushes, setExistingCrushes] = useState<string[]>([]);
  
  // Match reveal state
  const [showMatchReveal, setShowMatchReveal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar_url?: string } | null>(null);
  
  // Someone has a crush on you notification
  const [showCrushNotification, setShowCrushNotification] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        return;
      }

      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, class, batch, gender")
        .not("name", "is", null);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      if (profiles && profiles.length > 0) {
        const otherUsers = user 
          ? profiles.filter(profile => profile.id !== user.id)
          : profiles;
        setUsers(otherUsers);
      } else {
        setUsers([]);
      }

      if (user) {
        const { data: crushes, error: crushError } = await supabase
          .from("crushes")
          .select("receiver_id")
          .eq("sender_id", user.id);

        if (!crushError && crushes) {
          const crushIds = crushes.map(crush => crush.receiver_id);
          setExistingCrushes(crushIds);
          setSelectedCrushes(crushIds);
        }
        
        // Check if someone has a crush on the current user
        const { data: crushOnMe } = await supabase
          .from("crushes")
          .select("sender_id, receiver_id")
          .eq("receiver_id", user.id)
          .limit(1);
        
        if (crushOnMe && crushOnMe.length > 0) {
          // Show notification after a delay for emotional impact
          setTimeout(() => {
            setShowCrushNotification(true);
            setTimeout(() => setShowCrushNotification(false), 5000);
          }, 3000);
        }
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrushSelect = async (userId: string) => {
    try {
      if (!currentUserId) {
        toast({
          title: "Error",
          description: "You must be logged in to select crushes.",
          variant: "destructive",
        });
        return;
      }

      // Check crush limit
      if (!selectedCrushes.includes(userId) && selectedCrushes.length >= MAX_CRUSHES) {
        toast({
          title: "Limit Reached 😔",
          description: `You can only select up to ${MAX_CRUSHES} crushes. Remove one to add another.`,
        });
        return;
      }

      if (selectedCrushes.includes(userId)) {
        const { error } = await supabase
          .from("crushes")
          .delete()
          .eq("sender_id", currentUserId)
          .eq("receiver_id", userId);

        if (error) throw error;

        setSelectedCrushes(selectedCrushes.filter((id) => id !== userId));
        setExistingCrushes(existingCrushes.filter((id) => id !== userId));
        
        toast({
          title: "Crush Removed",
          description: "Your selection has been updated.",
        });
      } else {
        const { error } = await supabase
          .from("crushes")
          .insert({
            sender_id: currentUserId,
            receiver_id: userId
          });

        if (error) throw error;

        // Check for mutual match using a different approach
        try {
          // First insert the crush, then check for mutual
          const { data: matchCheck } = await supabase
            .from("crushes")
            .select("*")
            .eq("sender_id", userId)
            .eq("receiver_id", currentUserId);
        
        console.log("Match check result:", matchCheck);

        setSelectedCrushes([...selectedCrushes, userId]);
        setExistingCrushes([...existingCrushes, userId]);
        
        // Check if they already had a crush on you (mutual)
        const isMutual = matchCheck && matchCheck.length > 0;
        
        if (isMutual) {
          // It's a match! Show the match reveal animation
          console.log("It's a match! Showing popup...");
          const matchedUserData = users.find(u => u.id === userId);
          if (matchedUserData) {
            setMatchedUser({
              name: matchedUserData.name,
              avatar_url: matchedUserData.avatar_url
            });
            setShowMatchReveal(true);
          }
          
          toast({
            title: "🎉 CONGRATULATIONS  ❤️",
            description: "YOU FOUND YOURSELF A PARTNER 💕",
          });
        } else {
          toast({
            title: "Crush Added! ❤️",
            description: "They'll never know unless it's mutual.",
          });
        }
        } catch (err) {
          console.error("Match check error:", err);
          // Still add the crush even if match check fails
          setSelectedCrushes([...selectedCrushes, userId]);
          setExistingCrushes([...existingCrushes, userId]);
          toast({
            title: "Crush Added! ❤️",
            description: "They'll never know unless it's mutual.",
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving crush:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save crush selection. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Enhanced search filter - handles name, class (faculty), and batch (year)
  const filteredUsers = useMemo(() => {
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    if (searchTerms.length === 0) return users;
    
    return users.filter((user) => {
      // Create searchable text from all relevant fields
      const searchableText = [
        user.name?.toLowerCase() || '',
        user.class?.toLowerCase() || '',
        user.batch?.toLowerCase() || '',
        // Also search for common variations
        user.batch ? `${user.batch} batch` : '',
        user.batch ? `batch ${user.batch}` : '',
        user.class ? `${user.class} year` : '',
      ].join(' ');
      
      // Check if any search term matches
      return searchTerms.some(term => {
        // Check for exact matches in individual fields
        const nameMatch = user.name?.toLowerCase().includes(term);
        const classMatch = user.class?.toLowerCase().includes(term);
        const batchMatch = user.batch?.toLowerCase().includes(term);
        
        // Check for batch year variations (e.g., "2021" matches "2021")
        // Also check if user types "batch 2021" or "2021 batch"
        const batchYearMatch = 
          user.batch?.includes(term) || 
          (term === 'batch' && user.batch) ||
          (user.batch && term.startsWith(user.batch));
        
        return nameMatch || classMatch || batchMatch || batchYearMatch;
      });
    });
  }, [users, searchQuery]);

  const clearSearch = () => setSearchQuery("");

  return (
    <div className="relative min-h-screen bg-background pb-20 md:pb-0">
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 md:w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Discover</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Browse people from your community. Tap the heart to select your crush.
          </p>
        </motion.div>

        {/* Match Reveal - Inline in Discover page */}
        <AnimatePresence>
          <MatchReveal
            isOpen={showMatchReveal}
            onClose={() => setShowMatchReveal(false)}
            matchedUserName={matchedUser?.name || ""}
            matchedUserAvatar={matchedUser?.avatar_url}
          />
        </AnimatePresence>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 md:mb-8 space-y-4"
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-card border-border focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active filters indicator */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'}
                {searchQuery && ` for "${searchQuery}"`}
              </span>
              <button 
                onClick={clearSearch}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Loading users...</h3>
            <p className="text-muted-foreground text-sm">Fetching profiles from database</p>
          </motion.div>
        )}

        {/* Users Grid */}
        {!loading && filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-2"
          >
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <UserCard
                    user={user}
                    isSelected={selectedCrushes.includes(user.id)}
                    onSelect={() => handleCrushSelect(user.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {filteredUsers.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-lg bg-secondary border border-border flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {users.length === 0 ? "No users yet" : "No matches found"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {users.length === 0 
                ? "No other users to discover yet" 
                : "Try adjusting your search"}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-primary text-sm font-medium hover:underline"
              >
                Clear search
              </button>
            )}
          </motion.div>
        )}

        {/* Bottom info with Crush Limit */}
        {filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 md:mt-8 text-center"
          >
            <Card variant="premium" className="inline-flex items-center gap-3 px-5 py-3">
              <CrushLimitIndicator count={selectedCrushes.length} max={MAX_CRUSHES} />
            </Card>
          </motion.div>
        )}
      </main>

      {/* Someone has a crush on you notification */}
      <AnimatePresence>
        {showCrushNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-[100] px-4 py-3 bg-card border border-primary/30 rounded-xl shadow-lg flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Someone has a crush on you 👀</p>
              <p className="text-xs text-muted-foreground">Check your matches!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;

