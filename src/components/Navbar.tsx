import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Compass, Settings, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    if (!hasInitialLoad) {
      loadUserData();
    }
  }, [hasInitialLoad]);

  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setAvatarUrl(event.detail.avatarUrl);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  const loadUserData = async (force = false) => {
    if (isLoading && !force) return;
    
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
        if (profile.avatar_url && profile.avatar_url.trim() !== "") {
          setAvatarUrl(profile.avatar_url);
        }
        setUserId(user.id);
      } else if (!hasInitialLoad) {
        setUserName("User");
        setUserId(user.id);
      }

      setHasInitialLoad(true);
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

  const handleAvatarClick = () => {
    navigate("/settings");
  };

  const navItems = [
    { path: "/discover", label: "Discover", icon: Compass },
    { path: "/matches", label: "Matches", icon: Heart },
    { path: "/chats", label: "Chats", icon: MessageCircle },
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
    <>
      <nav className="sticky top-0 z-50 bg-[#0E0F0F]" style={{ backgroundColor: 'var(--nav-bg, #0E0F0F)' }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/discover")}
            >
              <div className="relative w-10 h-[36px] md:w-12 md:h-[43px] rounded-lg overflow-hidden">
                <img 
                  src="/sp.jpg" 
                  alt="CrushRadar Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--foreground, #fff)' }}>CrushRadar</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={isActive(item.path) 
                    ? "bg-[var(--secondary)] text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>

            {/* User Actions - Desktop */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ backgroundColor: 'var(--secondary)', borderColor: 'var(--border)' }}>
                <Heart className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{userName}</span>
              </div>

              <div
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform overflow-hidden border border-primary/20"
                onClick={handleAvatarClick}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName || "User"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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

            
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
