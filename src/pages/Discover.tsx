import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Sparkles, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import UserCard from "@/components/UserCard";
import SwipeWrapper from "@/components/SwipeWrapper";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
  gender?: string;
}

// Extract year from batch string (handles "2025", "4th sem - 2025", "2025 batch", etc.)
const extractYear = (batch: string | undefined): string | null => {
  if (!batch) return null;
  const yearMatch = batch.match(/\b(202[5-9]|203[0-9])\b/);
  return yearMatch ? yearMatch[1] : null;
};

const filterOptions = [
  { value: "all", label: "All Years" },
  { value: "2025", label: "25" },
  { value: "2024", label: "24" },
  { value: "2023", label: "23" },
  { value: "2022", label: "22" },
  { value: "2021", label: "21" },
  { value: "2020", label: "20" },
  { value: "2019", label: "19" },
];

const Discover = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrushes, setSelectedCrushes] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingCrushes, setExistingCrushes] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");

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

        const { data: matchCheck } = await supabase
          .from("matches")
          .select("id")
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .single();

        setSelectedCrushes([...selectedCrushes, userId]);
        setExistingCrushes([...existingCrushes, userId]);
        
        if (matchCheck) {
          toast({
            title: "🎉 It's a Match! ❤️",
            description: "You both like each other! Check your Matches page.",
          });
        } else {
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

  // Combined filter: search + year filter
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        user.name?.toLowerCase().includes(searchLower) ||
        user.class?.toLowerCase().includes(searchLower) ||
        user.batch?.toLowerCase().includes(searchLower);

      // Year filter
      const userYear = extractYear(user.batch);
      const matchesYear = activeFilter === "all" || userYear === activeFilter;

      return matchesSearch && matchesYear;
    });
  }, [users, searchQuery, activeFilter]);

  const clearSearch = () => setSearchQuery("");

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
            <Sparkles className="w-5 md:w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Discover</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Browse people from your community. Tap the heart to select your crush.
          </p>
        </motion.div>

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
              placeholder="Search by name, class, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-primary"
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

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
            {filterOptions.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeFilter === filter.value
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Active filters indicator */}
          {(searchQuery || activeFilter !== "all") && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'}
                {searchQuery && ` for "${searchQuery}"`}
                {activeFilter !== "all" && ` in ${activeFilter}`}
              </span>
              <button 
                onClick={() => { clearSearch(); setActiveFilter("all"); }}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Clear all
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
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
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
            className="grid grid-cols-3 md:grid-cols-4 gap-3"
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
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {users.length === 0 ? "No users yet" : "No matches found"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {users.length === 0 
                ? "No other users to discover yet" 
                : "Try adjusting your search or filter"}
            </p>
            {(searchQuery || activeFilter !== "all") && (
              <button
                onClick={() => { clearSearch(); setActiveFilter("all"); }}
                className="text-primary text-sm font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}

        {/* Bottom info */}
        {filteredUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 md:mt-8 text-center"
          >
            <Card variant="glass" className="inline-flex items-center gap-3 px-5 py-3">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                You've selected <span className="text-primary font-semibold">{selectedCrushes.length}</span> crushes
              </span>
            </Card>
          </motion.div>
        )}
        </main>
      </SwipeWrapper>
    </div>
  );
};

export default Discover;
