import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, CheckCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ChatListItemProps {
  id: string;
  name: string;
  avatar_url?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: 'me' | 'them' | null;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

const ChatListItem = ({
  id,
  name,
  avatar_url,
  lastMessage,
  lastMessageTime,
  lastMessageSender,
  unreadCount = 0,
  isOnline = false,
  isTyping = false,
}: ChatListItemProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat?matchId=${id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        "chat-list-item flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none",
        "bg-card border border-border",
        "hover:border-primary/30 hover:bg-card/80",
        "transition-all duration-200"
      )}
      data-chat-item
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-14 h-14 rounded-full overflow-hidden",
          "bg-gradient-to-br from-primary/30 to-primary/10",
          unreadCount > 0 ? "ring-2 ring-primary" : "ring-2 ring-primary/20"
        )}>
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Online indicator */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 ring-2 ring-card" />
        )}
      </div>

      {/* Message Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-semibold truncate",
            unreadCount > 0 ? "text-foreground" : "text-foreground/80"
          )}>
            {name}
          </h3>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {lastMessageTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          {/* Typing indicator */}
          {isTyping ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-primary font-medium">typing</span>
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : lastMessage ? (
            <>
              {lastMessageSender === 'me' && (
                <span className="flex-shrink-0">
                  {unreadCount > 0 || !lastMessage?.includes("✓") ? (
                    <Check className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </span>
              )}
              <p className={cn(
                "text-sm truncate",
                unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {lastMessageSender === 'me' ? 'You: ' : ''}
                {lastMessage}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">No messages yet</p>
          )}
        </div>
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0">
          <span className="flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      )}

      {/* Chat Icon */}
      <div className={cn(
        "flex-shrink-0 p-2 rounded-lg",
        "bg-primary/10 text-primary",
        "opacity-0 group-hover:opacity-100 transition-opacity"
      )}>
        <MessageCircle className="w-4 h-4" />
      </div>
    </motion.div>
  );
};

export default ChatListItem;

