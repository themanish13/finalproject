import { useNavigate, useLocation } from "react-router-dom"; 
import { 
  Home as HomeIcon, 
  Compass, 
  Heart, 
  MessageCircle, 
  Settings, 
  LogOut
} from "lucide-react";
import { useAuthStore } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface SpaceFeedSidebarProps {
  onSignOut?: () => void;
}

const SpaceFeedSidebar = ({ onSignOut }: SpaceFeedSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems = [
    { path: "/home", icon: HomeIcon, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/matches", icon: Heart, label: "Matches" },
    { path: "/chats", icon: MessageCircle, label: "Chats" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Get username from localStorage
  const userName = localStorage.getItem('navbar_userName') || "User";
  const avatarUrl = localStorage.getItem('navbar_avatarUrl') || "";

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] flex flex-col z-40">
      {/* Glassmorphic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#161A18]/95 to-[#0E0F0F]/95 backdrop-blur-xl" />
      
      {/* Subtle Space Glow Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-[#972837]/5 rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Header - Logo Only */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-[#972837]/20 flex items-center justify-center border border-primary/20">
            <span className="text-lg">🚀</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  active 
                    ? "bg-white/10 text-white shadow-lg shadow-primary/10" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "text-primary")} />
                <span className="font-medium">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - User Identity */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 mb-3">
            {/* Facebook-style Avatar */}
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center border border-blue-500/20 cursor-pointer overflow-hidden"
              onClick={() => navigate("/settings")}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-blue-400">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Signed in as
              </p>
              <p className="text-xs text-gray-400 truncate">
                @{userName}
              </p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SpaceFeedSidebar;

