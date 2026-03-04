import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Heart, MessageCircle, Settings } from "lucide-react";
import Navbar from "./Navbar";

// Pages
import Discover from "@/pages/Discover";
import Matches from "@/pages/Matches";
import ChatList from "@/pages/ChatList";
import SettingsPage from "@/pages/Settings";

const PAGES = [
  { path: "/discover", icon: Compass, label: "Discover" },
  { path: "/matches", icon: Heart, label: "Matches" },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

// Very low threshold for easy swiping
const SWIPE_THRESHOLD = 20;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Track touch position
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  
  // Motion values
  const x = useMotionValue(0);

  // Get current index from location
  useEffect(() => {
    const index = PAGES.findIndex(p => p.path === location.pathname);
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
      const screenWidth = window.innerWidth;
      x.set(-index * screenWidth);
    }
  }, [location.pathname, activeIndex, x]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      x.set(-activeIndex * screenWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex, x]);

  // Check if swipe is allowed
  const checkSwipeAllowed = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return true;
    
    const tagName = target.tagName.toLowerCase();
    
    // Block swipe on form elements
    if (['input', 'textarea', 'select', 'video', 'audio'].includes(tagName)) {
      return false;
    }
    
    // Block swipe on interactive elements
    const closest = target.closest('button, [contenteditable="true"], .no-swipe, .swipe-locked, [data-scrollable="true"], .chat-messages, .messages-container');
    if (closest) return false;
    
    return true;
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as Element;
    if (!checkSwipeAllowed(target)) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;
    
    // Only handle horizontal if more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      const screenWidth = window.innerWidth;
      const basePosition = -activeIndex * screenWidth;
      x.set(basePosition + deltaX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - startX.current;
    const screenWidth = window.innerWidth;
    
    let newIndex = activeIndex;
    
    // Easy threshold - just 20px
    if (deltaX < -SWIPE_THRESHOLD && activeIndex < PAGES.length - 1) {
      newIndex = activeIndex + 1;
    } else if (deltaX > SWIPE_THRESHOLD && activeIndex > 0) {
      newIndex = activeIndex - 1;
    }
    
    // Animate to new position
    const targetX = -newIndex * screenWidth;
    
    if (newIndex !== activeIndex) {
      if (navigator.vibrate) navigator.vibrate(10);
      setActiveIndex(newIndex);
      navigate(PAGES[newIndex].path);
    }
    
    // Snap to position
    x.set(targetX);
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (!checkSwipeAllowed(target)) return;
    
    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const screenWidth = window.innerWidth;
      const basePosition = -activeIndex * screenWidth;
      x.set(basePosition + deltaX);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaX = e.clientX - startX.current;
    const screenWidth = window.innerWidth;
    
    let newIndex = activeIndex;
    
    if (deltaX < -SWIPE_THRESHOLD && activeIndex < PAGES.length - 1) {
      newIndex = activeIndex + 1;
    } else if (deltaX > SWIPE_THRESHOLD && activeIndex > 0) {
      newIndex = activeIndex - 1;
    }
    
    const targetX = -newIndex * screenWidth;
    
    if (newIndex !== activeIndex) {
      if (navigator.vibrate) navigator.vibrate(10);
      setActiveIndex(newIndex);
      navigate(PAGES[newIndex].path);
    }
    
    x.set(targetX);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      const screenWidth = window.innerWidth;
      x.set(-activeIndex * screenWidth);
    }
  };

  // Nav click handler
  const handleNavClick = (index: number) => {
    if (index !== activeIndex) {
      if (navigator.vibrate) navigator.vibrate(10);
      setActiveIndex(index);
      navigate(PAGES[index].path);
    }
    const screenWidth = window.innerWidth;
    x.set(-index * screenWidth);
  };

  // Transform for position
  const pageTransform = useTransform(x, (value) => `${value}px`);

  return (
    <>
      {/* Desktop Navbar - only shows on lg+ screens */}
      <div className="hidden lg:block">
        <Navbar />
      </div>
      
      <div 
        ref={containerRef}
        className="fixed inset-0 overflow-hidden bg-background lg:top-20 lg:pt-0"
        style={{ height: '100dvh', width: '100vw' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
      {/* Pages Container */}
      <motion.div
        className="flex h-full"
        style={{ 
          x: pageTransform,
          width: `${PAGES.length * 100}%`,
        }}
      >
        {/* Discover */}
        <div 
          className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20"
          style={{ height: '100dvh' }}
        >
          <Discover />
        </div>
        
        {/* Matches */}
        <div 
          className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20"
          style={{ height: '100dvh' }}
        >
          <Matches />
        </div>
        
        {/* Chats */}
        <div 
          className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20"
          style={{ height: '100dvh' }}
        >
          <ChatList />
        </div>
        
        {/* Settings */}
        <div 
          className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20"
          style={{ height: '100dvh' }}
        >
          <SettingsPage />
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-[9999] lg:hidden bg-[#0E0F0F] opacity-100"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)] border-t border-border/50">
          {PAGES.map((item, index) => {
            const isActive = activeIndex === index;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(index)}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all relative min-w-[60px] touch-manipulation"
              >
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`p-1.5 rounded-xl ${isActive ? "bg-primary/10" : ""}`}
                >
                  <Icon 
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`} 
                  />
                </motion.div>
                <span 
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default MainLayout;

