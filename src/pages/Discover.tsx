import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Filter, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import UserCard from "@/components/UserCard";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
  gender?: string;
}

const Discover = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrushes, setSelectedCrushes] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        return;
      }

      if (user) {
        setCurrentUserId(user.id);
        console.log("Current user ID:", user.id);
      }

      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, class, batch, gender")
        .not("name", "is", null);

      console.log("All profiles:", profiles);
      console.log("Profile error:", profileError);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return;
      }

      if (profiles && profiles.length > 0) {
        // Filter out current user
        const otherUsers = user 
          ? profiles.filter(profile => profile.id !== user.id)
          : profiles;

        console.log("Filtered users (excluding current user):", otherUsers);
        setUsers(otherUsers);
      } else {
        console.log("No profiles found");
        setUsers([]);
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

  const handleCrushSelect = (userId: string) => {
    if (selectedCrushes.includes(userId)) {
      setSelectedCrushes(selectedCrushes.filter((id) => id !== userId));
      toast({
        title: "Crush Removed",
        description: "Your selection has been updated.",
      });
    } else {
      setSelectedCrushes([...selectedCrushes, userId]);
      toast({
        title: "Crush Added! 💚",
        description: "They'll never know unless it's mutual.",
      });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.class?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.batch?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Discover</h1>
          </div>
          <p className="text-muted-foreground">
            Browse people from your community. Tap the heart to select your crush.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, class, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Loading users...</h3>
            <p className="text-muted-foreground">Fetching profiles from database</p>
          </motion.div>
        )}

        {/* Users Grid */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
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

        {filteredUsers.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              {users.length === 0 ? "No other users to discover yet" : "Try a different search term"}
            </p>
          </motion.div>
        )}

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <Card variant="glass" className="inline-flex items-center gap-3 px-6 py-3">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              You've selected <span className="text-primary font-semibold">{selectedCrushes.length}</span> crushes
            </span>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Discover;
