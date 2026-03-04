import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  class?: string;
  batch?: string;
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

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
        isSelected ? "ring-2 ring-primary shadow-[0_0_20px_rgba(255,45,85,0.3)]" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center text-center h-full">
        {/* Avatar */}
        <div className="relative mb-1">
          <motion.div
            animate={isSelected ? { scale: [1, 1.05, 1] } : isAnimating ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.2 }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden ${
              isSelected
                ? "bg-gradient-to-br from-primary-light to-primary"
                : "bg-secondary border border-border"
            }`}
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
        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">
          {user.class || "Unknown"} • {user.batch || "Unknown"}
        </p>

        {/* Select indicator */}
        <motion.div
          animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.2 }}
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-200 mt-2 ${
            isSelected
              ? "bg-gradient-to-r from-primary-light to-primary text-white"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {isSelected ? "Selected ❤️" : "Tap to select"}
        </motion.div>

        {/* Chat Button */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-primary hover:text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/chat?matchId=${user.id}`);
          }}
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Chat
        </Button>
      </div>
    </Card>
  );
};

export default UserCard;

