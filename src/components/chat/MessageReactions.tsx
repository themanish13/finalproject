import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus, Heart, ThumbsUp, Laugh, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  onReact: (reaction: string) => void;
  className?: string;
}

const reactions = [
  { emoji: "👍", icon: ThumbsUp, label: "Like" },
  { emoji: "❤️", icon: Heart, label: "Love" },
  { emoji: "😂", icon: Laugh, label: "Laugh" },
  { emoji: "😊", icon: SmilePlus, label: "Smile" },
  { emoji: "😢", icon: SmilePlus, label: "Sad" },
  { emoji: "😮", icon: SmilePlus, label: "Wow" },
];

const MessageReactions = ({ onReact, className }: MessageReactionsProps) => {
  const [open, setOpen] = useState(false);

  const handleReactionClick = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-1.5 rounded-full opacity-0 group-hover:opacity-100 select-none",
            "hover:bg-secondary transition-all duration-200",
            "text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <SmilePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-2 bg-card border-border flex gap-1 select-none" 
        side="top" 
        align="center"
        sideOffset={5}
      >
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full select-none",
              "text-lg hover:bg-secondary transition-colors",
              "scale-90 hover:scale-100 transition-transform"
            )}
            title={reaction.label}
          >
            {reaction.emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// Mini reaction display on message
interface ReactionBadgeProps {
  reactions: string[];
  className?: string;
}

export const ReactionBadge = ({ reactions, className }: ReactionBadgeProps) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
        "bg-secondary/80 backdrop-blur-sm",
        className
      )}
    >
      {reactions.slice(0, 3).map((reaction, index) => (
        <span key={index} className="text-xs">{reaction}</span>
      ))}
      {reactions.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{reactions.length - 3}</span>
      )}
    </motion.div>
  );
};

export default MessageReactions;

