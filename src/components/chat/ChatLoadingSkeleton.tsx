import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChatLoadingSkeletonProps {
  className?: string;
}

const ChatLoadingSkeleton = ({ className }: ChatLoadingSkeletonProps) => {
  return (
    <div className={cn("flex flex-col gap-3 p-4 min-h-[100dvh] bg-background", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4">
        {/* Receive message skeleton */}
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 max-w-[70%]">
            <Skeleton className="h-16 w-48 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Send message skeleton */}
        <div className="flex justify-end gap-3">
          <div className="flex flex-col gap-1 max-w-[70%] items-end">
            <Skeleton className="h-12 w-32 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* More receive messages */}
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 max-w-[70%]">
            <Skeleton className="h-20 w-56 rounded-2xl" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Send message */}
        <div className="flex justify-end gap-3">
          <div className="flex flex-col gap-1 max-w-[70%] items-end">
            <Skeleton className="h-10 w-40 rounded-2xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Receive message */}
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 max-w-[70%]">
            <Skeleton className="h-14 w-44 rounded-2xl" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="p-3 border-t border-border">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
};

export default ChatLoadingSkeleton;

