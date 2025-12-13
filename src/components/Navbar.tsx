import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Compass, Users, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hintsRemaining, setHintsRemaining] = useState(3);


  useEffect(() => {
    loadUserData();
  }, []);


  // Load user data once and cache it

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return;
      }


      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, hints_remaining, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile && !error) {
        setUserName(profile.name || "User");
        setAvatarUrl(profile.avatar_url || "");
        setHintsRemaining(profile.hints_remaining || 3);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

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
            onClick={() => navigate("/")}
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
              <span className="text-sm font-medium">{hintsRemaining} hints left</span>
            </div>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform overflow-hidden">
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
