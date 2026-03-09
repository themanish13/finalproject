import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useProfileViewer } from "@/contexts/ProfileViewerContext";

const GlobalProfileViewer = () => {
  const { isOpen, profile, closeProfile } = useProfileViewer();

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeProfile();
      }
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeProfile]);

  return (
    <AnimatePresence>
      {isOpen && profile && (
        // Floating modal wrapper
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          onClick={closeProfile}
        >
          {/* Soft blurred background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm"
          />

          {/* Content - click to prevent closing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeProfile}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Circle with photo */}
            <div
              className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden shadow-2xl"
              style={{
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : (
                // Fallback background if no avatar
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-6xl md:text-7xl font-light text-neutral-500">
                    {profile.userInitials || profile.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Name below circle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-6 text-2xl md:text-3xl font-medium text-white"
            >
              {profile.name}
            </motion.p>

            {/* Bio if available */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="mt-2 text-sm md:text-base text-neutral-400 text-center max-w-xs px-4"
              >
                {profile.bio}
              </motion.p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlobalProfileViewer;
