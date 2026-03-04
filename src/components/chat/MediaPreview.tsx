import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Upload, Image, Video, File, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio' | 'file';
}

interface MediaPreviewProps {
  files: MediaFile[];
  onRemove: (index: number) => void;
  onSend: () => void;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

const MediaPreview = ({
  files,
  onRemove,
  onSend,
  uploading = false,
  uploadProgress = 0,
  className
}: MediaPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentFile = files[currentIndex];

  useEffect(() => {
    return () => {
      // Cleanup preview URLs
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextFile = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
    setIsPlaying(false);
  };

  const prevFile = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    setIsPlaying(false);
  };

  if (files.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "mx-4 my-2 bg-card border border-border rounded-2xl overflow-hidden",
        "shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {currentFile.type === 'image' && <Image className="w-4 h-4 text-blue-400" />}
          {currentFile.type === 'video' && <Video className="w-4 h-4 text-purple-400" />}
          {currentFile.type === 'audio' && <Upload className="w-4 h-4 text-green-400" />}
          {currentFile.type === 'file' && <File className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-medium">
            {currentIndex + 1} / {files.length}
          </span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(currentIndex)}
          className="w-8 h-8 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Preview Content */}
      <div className="relative aspect-video bg-black/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentFile.type === 'image' && (
              <img
                src={currentFile.preview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            )}
            {currentFile.type === 'video' && (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  src={currentFile.preview}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={togglePlay}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-12 h-12 bg-black/50 hover:bg-black/70"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-1" />
                  )}
                </Button>
              </div>
            )}
            {currentFile.type === 'audio' && (
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground truncate max-w-full">
                  {currentFile.file.name}
                </span>
              </div>
            )}
            {currentFile.type === 'file' && (
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <File className="w-8 h-8 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground truncate max-w-full">
                  {currentFile.file.name}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows for multiple files */}
        {files.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={prevFile}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 w-8 h-8"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={nextFile}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 w-8 h-8"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </Button>
          </>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="p-3 border-t border-border">
          <Progress value={uploadProgress} className="h-1" />
          <p className="text-xs text-muted-foreground mt-1">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Send Button */}
      <div className="p-3 border-t border-border">
        <Button
          onClick={onSend}
          disabled={uploading}
          className="w-full rounded-xl"
        >
          Send {files.length > 1 ? `${files.length} files` : ''}
        </Button>
      </div>
    </motion.div>
  );
};

export default MediaPreview;

