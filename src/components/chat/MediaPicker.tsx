import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Images, 
  Grid3X3, 
  ChevronRight, 
  X, 
  Play,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  useMediaPicker, 
  uriToBase64, 
  createFormDataFromUri,
  MediaItem 
} from '@/hooks/useMediaPicker';

interface MediaPickerProps {
  onMediaSelect?: (items: MediaItem[]) => void;
  maxItems?: number;
  className?: string;
  maxRecentItems?: number;
}

// Mosaic grid item component
interface MosaicItemProps {
  item: MediaItem;
  index: number;
  isSelected?: boolean;
  onSelect?: (item: MediaItem) => void;
}

const MosaicItem = ({ item, index, isSelected, onSelect }: MosaicItemProps) => {
  const isLarge = index === 0; // First item is large in mosaic
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect?.(item)}
      className={cn(
        "relative overflow-hidden rounded-xl group cursor-pointer",
        "border-2 border-transparent hover:border-primary/50 transition-all",
        isSelected && "border-primary ring-2 ring-primary/30",
        isLarge ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
      )}
    >
      <img 
        src={item.uri} 
        alt={item.name || 'Photo'}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      
      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      )}
    </motion.button>
  );
};

// Main MediaPicker component
const MediaPicker = ({
  onMediaSelect,
  maxItems = 10,
  className,
  maxRecentItems = 20
}: MediaPickerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    recentPhotos,
    isLoading,
    openFullPicker,
    selectFromRecent,
  } = useMediaPicker(onMediaSelect, maxItems);

  // Handle thumbnail click - select/deselect items
  const handleThumbnailClick = (item: MediaItem) => {
    // Check if already selected
    const existingIndex = selectedItems.findIndex(i => i.uri === item.uri);
    
    if (existingIndex >= 0) {
      // Deselect - remove from array
      const newSelected = selectedItems.filter(i => i.uri !== item.uri);
      setSelectedItems(newSelected);
    } else {
      // Select (with max limit) - add to array
      if (selectedItems.length < maxItems) {
        const newSelected = [...selectedItems, item];
        setSelectedItems(newSelected);
        // Don't call onMediaSelect here - only call when sending
      }
    }
  };

  // Handle full gallery button click
  const handleGalleryClick = async () => {
    setIsGalleryLoading(true);
    try {
      await openFullPicker();
    } finally {
      setIsGalleryLoading(false);
    }
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Handle send - pass items to parent and clear selection
  const handleSend = () => {
    if (selectedItems.length > 0) {
      // Pass selected items to parent
      onMediaSelect?.([...selectedItems]);
      // Clear local selection immediately
      setSelectedItems([]);
      setIsExpanded(false);
    }
  };

  // Horizontal scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Determine if we should show the tray
  const showTray = recentPhotos.length > 0;

  if (!showTray) {
    // Show only the gallery button when no recent photos
    return (
      <div className={cn("px-4 py-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGalleryClick}
          disabled={isGalleryLoading || isLoading}
          className="w-full justify-start gap-2 h-10 bg-secondary/50 border-dashed"
        >
          {isGalleryLoading || isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Images className="w-4 h-4 text-primary" />
          )}
          <span className="text-muted-foreground">Open Gallery</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Horizontal Photo Tray - Always Visible */}
      <div className="relative px-4 py-2">
        {/* Scroll Left Button */}
        {recentPhotos.length > 5 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        
        {/* Thumbnail Tray */}
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-2 py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Recent Thumbnails */}
          {recentPhotos.slice(0, maxRecentItems).map((item, index) => (
            <motion.button
              key={item.uri}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleThumbnailClick(item)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden",
                "border-2 border-transparent hover:border-primary/50",
                "transition-all cursor-pointer relative group",
                selectedItems.some(s => s.uri === item.uri) && "border-primary ring-2 ring-primary/30"
              )}
            >
              <img 
                src={item.uri} 
                alt={item.name || 'Recent photo'}
                className="w-full h-full object-cover"
              />
              
              {/* Video indicator */}
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              )}
              
              {/* Selection overlay */}
              {selectedItems.some(s => s.uri === item.uri) && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 bg-primary/30 flex items-center justify-center"
                >
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
        
        {/* Scroll Right Button */}
        {recentPhotos.length > 5 && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Selection Summary Bar (when items selected) */}
      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="flex items-center justify-between bg-primary/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {selectedItems.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearSelection}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <Button 
                  size="sm" 
                  onClick={handleSend}
                  className="h-8 px-3 text-sm"
                >
                  Send
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Expanded Mosaic Grid View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background"
          >
            {/* Grid Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h3 className="font-medium text-sm">All Photos</h3>
              <div className="flex items-center gap-2">
                {selectedItems.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                )}
                <Button 
                  size="sm"
                  onClick={handleSend}
                  disabled={selectedItems.length === 0}
                >
                  Send ({selectedItems.length})
                </Button>
              </div>
            </div>
            
            {/* Mosaic Grid */}
            <div className="grid grid-cols-3 gap-1 p-1" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {recentPhotos.map((item, index) => (
                <MosaicItem
                  key={item.uri}
                  item={item}
                  index={index}
                  isSelected={selectedItems.some(s => s.uri === item.uri)}
                  onSelect={handleThumbnailClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { MediaPicker, uriToBase64, createFormDataFromUri };
export default MediaPicker;

