import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatSkeletonProps {
  count?: number;
  className?: string;
}

export const ChatSkeleton = ({ count = 5, className }: ChatSkeletonProps) => {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {/* Date header skeleton */}
      <div className="flex items-center justify-center">
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      
      {/* Message skeletons */}
      {Array.from({ length: count }).map((_, index) => {
        const isOwn = index % 2 === 0;
        const hasMedia = index % 3 === 0;
        
        return (
          <div
            key={index}
            className={cn(
              "flex",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] space-y-1.5",
                isOwn ? "items-end" : "items-start"
              )}
            >
              {/* Avatar + name for received messages */}
              {!isOwn && (
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              )}
              
              {/* Media skeleton */}
              {hasMedia && (
                <Skeleton className="w-48 h-32 rounded-2xl" />
              )}
              
              {/* Message bubble skeleton */}
              <div
                className={cn(
                  "px-3 py-2 rounded-2xl space-y-1",
                  isOwn 
                    ? "bg-primary/20 rounded-br-md" 
                    : "bg-secondary rounded-bl-md"
                )}
              >
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              
              {/* Time skeleton */}
              <Skeleton className="h-2 w-12 ml-auto" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Skeleton for empty chat
export const EmptyChatSkeleton = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        {/* Avatar skeleton */}
        <Skeleton className="w-20 h-20 rounded-full mx-auto" />
        
        {/* Name skeleton */}
        <Skeleton className="h-5 w-24 mx-auto" />
        
        {/* Subtitle skeleton */}
        <Skeleton className="h-3 w-32 mx-auto" />
      </div>
    </div>
  );
};

// Skeleton for chat list item
export const ChatListItemSkeleton = () => {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-2 w-8 ml-auto" />
        <Skeleton className="h-4 w-4 rounded-full ml-auto" />
      </div>
    </div>
  );
};

