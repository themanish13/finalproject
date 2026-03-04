import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenImageProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

const FullscreenImage = ({ src, isOpen, onClose }: FullscreenImageProps) => {
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // For pinch-to-zoom
  const lastDistance = useRef<number>(0);
  const lastCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDownload = useCallback(async () => {
    if (!src) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = src.split('/').pop() || `image_${Date.now()}.jpg`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("Download failed:", error);
      window.open(src, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }, [src]);

  const handleShare = useCallback(async () => {
    if (!src) return;
    
    try {
      if (navigator.share) {
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        
        await navigator.share({
          title: 'Shared Image',
          files: [file]
        });
      } else {
        await navigator.clipboard.writeText(src);
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [src]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastDistance.current = distance;
      
      lastCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (lastDistance.current > 0) {
        const scaleDiff = distance / lastDistance.current;
        setScale(prev => Math.min(Math.max(prev * scaleDiff, 0.5), 3));
      }
      
      lastDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    lastDistance.current = 0;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
        onClick={onClose}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomOut}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleResetZoom}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
            >
              {Math.round(scale * 100)}%
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomIn}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Share className="w-5 h-5" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Image container */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.img
            ref={imageRef}
            src={src}
            alt="Fullscreen"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: scale, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-full max-h-full object-contain select-none"
            style={{ transform: `scale(${scale})` }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenImage;

