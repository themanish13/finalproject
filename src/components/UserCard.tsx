import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Soft haptic vibration when selecting a crush to build "secret" excitement
  const handleClick = () => {
    // Trigger haptic feedback if available (mobile devices)
    if (navigator.vibrate) {
      navigator.vibrate(50); // Soft 50ms vibration
    }
    onSelect();
  };

  return (
    <Card
      variant={isSelected ? "glow" : "glass"}
      className={`h-full min-h-[280px] p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        isSelected ? "ring-2 ring-primary" : "hover:bg-white/10"
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center text-center h-full">
        {/* Avatar */}
        <div className="relative mb-3">
          <motion.div
            animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden ${
              isSelected
                ? "bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30"
                : "bg-white/10 border border-white/10"
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
              className={`text-2xl md:text-3xl font-bold ${
                isSelected ? "text-white" : "text-foreground"
              }`}
              style={{ display: user.avatar_url ? 'none' : 'flex' }}
            >
              {initials}
            </span>
          </motion.div>

          {/* Heart indicator */}
          <motion.div
            initial={false}
            animate={isSelected ? { scale: [0, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0 }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
          >
            <Heart className="w-3 h-3 text-white fill-white" />
          </motion.div>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-base md:text-lg mb-1 truncate w-full">{user.name}</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-2">
          {user.class || "Unknown"} • {user.batch || "Unknown"}
        </p>

        {/* Select indicator */}
        <motion.div
          animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.2 }}
          className={`text-xs font-medium px-3 py-1 rounded-full transition-all duration-300 mt-auto ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 text-muted-foreground"
          }`}
        >
          {isSelected ? "Selected 💚" : "Tap to select"}
        </motion.div>
      </div>
    </Card>
  );
};

export default UserCard;
