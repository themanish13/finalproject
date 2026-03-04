import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MatchCardProps {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  status?: string;
  matchedAt: string;
  lastMessage?: string;
  lastMessageSender?: 'me' | 'them' | null;
  hasUnread?: boolean;
  className?: string;
}

const MatchCard = ({
  id,
  name,
  avatar_url,
  bio,
  status,
  matchedAt,
  lastMessage,
  lastMessageSender,
  hasUnread = false,
  className,
}: MatchCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/chat?matchId=${id}`)}
      className={cn(
        "flex flex-col sm:flex-row gap-4 p-4 rounded-lg cursor-pointer",
        "bg-card border border-border",
        "hover:border-primary/50 transition-all duration-200",
        className
      )}
    >
      {/* Left Column: Profile Card */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-start gap-4">
          {/* Circular Avatar */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden",
              "bg-gradient-to-br from-primary to-primary/70",
              hasUnread ? "ring-2 ring-primary" : "ring-2 ring-primary/30"
            )}>
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Unread indicator dot */}
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary" />
            )}
          </div>

          {/* Name and Bio */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {bio || status || "Hey there! I'm using this app."}
            </p>
          </div>
        </div>

        {/* Last Message Status */}
        {lastMessage && (
          <div className="mt-3 flex items-center gap-2">
            {lastMessageSender === 'them' ? (
              <>
                <ArrowLeft className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  <span className="text-primary font-medium">{name}</span> messaged you
                </span>
              </>
            ) : lastMessageSender === 'me' ? (
              <>
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  You: {lastMessage}
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* Matched Date and Chat Button Row */}
        <div className="mt-3 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary">
              Matched {matchedAt}
            </span>
          </div>
          
          {/* Small Chat Button - laptop: under matched date */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/chat?matchId=${id}`);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5",
              "rounded-lg border border-primary",
              "bg-primary text-primary-foreground",
              "hover:opacity-90",
              "transition-all duration-200",
              "py-1.5 px-2.5",
              // Small button ~1.5cm (approx 40px)
              "w-auto min-w-[3rem]"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">CHAT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;

