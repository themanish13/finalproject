
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Compass, Users, Settings, Menu, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);




  // Initialize state from localStorage to persist across navigation

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('navbar_userName') || "";
  });
  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem('navbar_avatarUrl') || "";
  });
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('navbar_userId') || "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Save to localStorage whenever state changes

  useEffect(() => {
    localStorage.setItem('navbar_userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('navbar_avatarUrl', avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    localStorage.setItem('navbar_userId', userId);
  }, [userId]);

  useEffect(() => {
    // Only load data once when component first mounts
    if (!hasInitialLoad) {
      loadUserData();
    }
  }, [hasInitialLoad]);

  // Add effect to listen for custom events when avatar is updated
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setAvatarUrl(event.detail.avatarUrl);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);


  // Load user data with refresh capability
  const loadUserData = async (force = false) => {
    if (isLoading && !force) return;
    
    // Only set loading to true for initial load or forced refresh
    if (!hasInitialLoad || force) {
      setIsLoading(true);
    }
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      

      if (userError || !user) {
        if (!hasInitialLoad) {
          setUserName("User");
          setUserId("");
          setHasInitialLoad(true);
        }
        setIsLoading(false);
        return;
      }


      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();


      if (profile && !error) {
        setUserName(profile.name || "User");
        // Only update avatar URL if we have a new one AND it's not empty
        // This prevents resetting to null during navigation
        if (profile.avatar_url && profile.avatar_url.trim() !== "") {
          setAvatarUrl(profile.avatar_url);
        }
        setUserId(user.id);
      } else if (!hasInitialLoad) {
        // If no profile found, only set defaults on initial load
        setUserName("User");
        setUserId(user.id);
      }

    } catch (error) {
      console.error("Error loading user data:", error);
      if (!hasInitialLoad) {
        setUserName("User");
        setUserId("");
      }


    } finally {
      setIsLoading(false);
      setHasInitialLoad(true);
    }
  };

  // Force refresh function for manual refresh
  const forceRefreshUserData = async () => {
    setIsLoading(true);
    await loadUserData(true);
  };

  // Function to handle avatar click - navigate to settings
  const handleAvatarClick = () => {
    navigate("/settings");
  };



  // Removed global refresh function to prevent unnecessary updates

  const navItems = [
    { path: "/discover", label: "Discover", icon: Compass },
    { path: "/matches", label: "Matches", icon: Heart },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/discover")}
          >
            <div className="relative">
              <Heart className="w-7 h-7 text-primary fill-primary" />
              <div className="absolute inset-0 w-7 h-7 bg-primary/30 blur-md" />
            </div>
            <span className="text-lg font-bold">CrushRadar</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={isActive(item.path) ? "text-primary" : ""}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </div>



          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{userName}</span>
            </div>






            <div 
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              onClick={handleAvatarClick}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`text-sm font-bold text-primary ${avatarUrl ? 'hidden' : ''}`}>
                {userName ? getInitials(userName) : "U"}
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`justify-start ${isActive(item.path) ? "text-primary" : ""}`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
