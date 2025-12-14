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

  return (
    <Card
      variant={isSelected ? "glow" : "glass"}
      className={`p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        isSelected ? "ring-2 ring-primary" : "hover:border-primary/30"
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-col items-center text-center">

        {/* Avatar */}
        <div className="relative mb-4">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden ${
              isSelected
                ? "bg-gradient-to-br from-primary to-primary/70"
                : "bg-gradient-to-br from-secondary to-muted"
            }`}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-full h-full object-cover"

                onError={(e) => {
                  // Fallback to initials if image fails to load
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
              className={`text-2xl font-bold ${
                isSelected ? "text-primary-foreground" : "text-foreground"
              }`}
              style={{ display: user.avatar_url ? 'none' : 'flex' }}
            >
              {initials}
            </span>
          </div>

          {/* Heart indicator */}
          <motion.div
            initial={false}
            animate={isSelected ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
          >
            <Heart className="w-4 h-4 text-white fill-white" />
          </motion.div>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-lg mb-1">{user.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {user.class || "Unknown"} • {user.batch || "Unknown"}
        </p>

        {/* Select indicator */}
        <div
          className={`text-xs font-medium px-3 py-1 rounded-full transition-all duration-300 ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {isSelected ? "Selected as crush 💚" : "Tap to select"}
        </div>
      </div>
    </Card>
  );
};

export default UserCard;
