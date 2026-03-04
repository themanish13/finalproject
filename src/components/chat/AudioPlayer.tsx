import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Download, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

const AudioPlayer = ({ src, isOpen, onClose }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Generate fake waveform bars for visual effect
  const waveformBars = Array.from({ length: 40 }, () => Math.random() * 0.6 + 0.2);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipBack = () => {
    seekTo(Math.max(0, currentTime - 15));
  };

  const skipForward = () => {
    seekTo(Math.min(duration, currentTime + 15));
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!src) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = src.split('/').pop() || `voice_message_${Date.now()}.webm`;
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
        onClick={onClose}
      >
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {/* Header */}
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
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
          
          <span className="text-white font-medium">Voice Message</span>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <Download className={`w-5 h-5 ${isDownloading ? 'animate-bounce' : ''}`} />
          </Button>
        </motion.div>

        {/* Main content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="w-full max-w-md px-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Waveform visualization */}
          <div className="flex items-center justify-center gap-1 h-24 mb-8">
            {waveformBars.map((height, index) => {
              const isActive = (index / waveformBars.length) * 100 <= progress;
              return (
                <motion.div
                  key={index}
                  className={`w-1 rounded-full ${isActive ? 'bg-primary' : 'bg-white/30'}`}
                  style={{ height: `${height * 100}%` }}
                  animate={{
                    height: isPlaying ? [`${height * 100}%`, `${height * 120}%`, `${height * 100}%`] : `${height * 100}%`
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isPlaying ? Infinity : 0,
                    delay: index * 0.02
                  }}
                />
              );
            })}
          </div>

          {/* Time display */}
          <div className="flex justify-between text-white/60 text-sm mb-4">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress bar */}
          <div 
            className="w-full h-1 bg-white/20 rounded-full mb-8 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              seekTo(percentage * duration);
            }}
          >
            <div 
              className="h-full bg-primary rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            {/* Skip back 15s */}
            <Button
              size="icon"
              variant="ghost"
              onClick={skipBack}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="icon"
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-white"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>

            {/* Skip forward 15s */}
            <Button
              size="icon"
              variant="ghost"
              onClick={skipForward}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>

          {/* Volume control */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                setIsMuted(newVolume === 0);
              }}
              className="w-32 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </motion.div>

        {/* Hint */}
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          exit={{ y: 60 }}
          className="absolute bottom-8"
        >
          <p className="text-white/40 text-sm">Tap outside to close</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AudioPlayer;

