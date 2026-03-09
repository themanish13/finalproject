import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useShowProfile } from "@/contexts/ProfileViewerContext";

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
}

interface UserCardProps {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
}

const UserCard = ({ user, isSelected, onSelect }: UserCardProps) => {
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastTapRef = useRef<number>(0);
  const navigate = useNavigate();
  const { showProfile } = useShowProfile();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Handle tap to show profile viewer (double tap or long press)
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Show profile viewer with user info
    showProfile(user.name, user.avatar_url, initials, user.id, user.bio);
  };

  // Haptic vibration and animation when selecting a crush
  const handleClick = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300 && !isSelected) {
      // Trigger haptic feedback if available (mobile devices)
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]); // Double vibration pattern
      }
      // Show heart burst animation
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 600);
      onSelect();
    } else {
      // Single tap - trigger soft haptic
      if (navigator.vibrate) {
        navigator.vibrate(30); // Soft 30ms vibration
      }
      
      // If not selected, show animation
      if (!isSelected) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 200);
      }
      onSelect();
    }
  };

  return (
    <Card
      variant={isSelected ? "glow" : "clean"}
      className={`relative h-full min-h-[180px] p-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
        isSelected ? "ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center text-center h-full">
        {/* Avatar */}
        <div className="relative mb-1">
          <motion.div
            animate={isSelected ? { scale: [1, 1.05, 1] } : isAnimating ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.2 }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden cursor-pointer ${
              isSelected
                ? "bg-gradient-to-br from-primary-light to-primary"
                : "bg-secondary border border-border"
            }`}
            onClick={handleAvatarClick}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  const nextElement = target.nextElementSibling as HTMLElement;
                  target.style.display = 'none';
                  if (nextElement) {
                    nextElement.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <span
              className={`text-3xl md:text-4xl font-bold ${
                isSelected ? "text-white" : "text-foreground"
              }`}
              style={{ display: user.avatar_url ? 'none' : 'flex' }}
            >
              {initials}
            </span>
          </motion.div>

          {/* Heart indicator - Soft Neon Red #FF2D55 */}
          <motion.div
            initial={false}
            animate={isSelected ? { scale: [0, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0 }}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FF2D55] flex items-center justify-center shadow-[0_0_10px_rgba(255,45,85,0.5)]"
          >
            <Heart className="w-3 h-3 text-white fill-white" />
          </motion.div>

          {/* Heart Burst Animation */}
          <AnimatePresence>
            {showHeartBurst && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: 0, 
                      y: 0, 
                      scale: 0, 
                      opacity: 1 
                    }}
                    animate={{ 
                      x: Math.cos((i * 60) * Math.PI / 180) * 30,
                      y: Math.sin((i * 60) * Math.PI / 180) * 30,
                      scale: 1,
                      opacity: 0
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-4 h-4"
                  >
                    <Heart className="w-4 h-4 text-[#FF2D55] fill-[#FF2D55]" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-sm md:text-base mb-0.5 truncate w-full">{user.name}</h3>
        
        {/* Bio - Fixed height container to keep card constant */}
        <div className="h-8 mb-1 px-1">
          {user.bio ? (
            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
              {user.bio}
            </p>
          ) : (
            <p className="text-[10px] md:text-xs text-muted-foreground italic">
              No bio yet
            </p>
          )}
        </div>

        {/* Buttons Row - Side by Side */}
        <div className="flex items-center gap-2 mt-1">
          {/* Select Button - Chat btn style */}
          <motion.div
            animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.2 }}
            className="chat-btn"
            onClick={handleClick}
          >
            {isSelected ? "Selected ❤️" : "Tap to select"}
          </motion.div>

          {/* Chat Button - Same chat btn style */}
          <motion.button
            animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.2 }}
            className="chat-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/chat?matchId=${user.id}`);
            }}
          >
            <MessageCircle className="w-3 h-3 inline mr-1" />
            Chat
          </motion.button>
        </div>
      </div>
    </Card>
  );
};

export default UserCard;

