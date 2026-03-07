import { useRef, useEffect, useCallback, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Heart, MessageCircle, User, Home as HomeIcon } from "lucide-react";
import Navbar from "./Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";

// Pages
import Discover from "@/pages/Discover";
import Matches from "@/pages/Matches";
import ChatList from "@/pages/ChatList";
import SettingsPage from "@/pages/Settings";
import Home from "@/pages/Home";

const PAGES = [
  { path: "/home", icon: HomeIcon, label: "Home" },
  { path: "/discover", icon: Compass, label: "Discover" },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/matches", icon: Heart, label: "Matches" },
  { path: "/settings", icon: User, label: "Profile" },
];

// Swipe configuration - Instagram-style
const SWIPE_THRESHOLD = 30; // Reduced from 60 for more responsive swipes
const VELOCITY_THRESHOLD = 0.25; // Slightly reduced for better sensitivity
const TRANSITION_DURATION = "0.28s";
const TRANSITION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EDGE_RESISTANCE = 0.35;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get unread counts for notifications
  const { totalUnread } = useUnreadCounts({
    userId: user?.id || '',
    enabled: !!user,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Use refs for better performance (avoids re-renders)
  const currentIndex = useRef(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const startTime = useRef(0);
  const isDragging = useRef(false);
  const isAnimating = useRef(false);
  
  // Motion values for smooth animations
  const x = useMotionValue(0);

  // Sync with URL on mount and URL change
  useEffect(() => {
    const index = PAGES.findIndex(p => p.path === location.pathname);
    if (index !== -1 && index !== currentIndex.current) {
      currentIndex.current = index;
      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.style.transition = TRANSITION_DURATION + " " + TRANSITION_EASE;
        wrapper.style.transform = `translateX(-${index * 100}vw)`;
        x.set(-index * window.innerWidth);
      }
    }
  }, [location.pathname, x]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.style.transition = "none";
        wrapper.style.transform = `translateX(-${currentIndex.current * window.innerWidth}px)`;
        x.set(-currentIndex.current * window.innerWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x]);

  // Check if swipe is allowed - simplified to always allow unless in input field
  const checkSwipeAllowed = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return true;
    
    const tagName = target.tagName.toLowerCase();
    
    // Only block when actively typing in an input/textarea
    if (tagName === 'input' || tagName === 'textarea') {
      return document.activeElement !== target;
    }
    
    return true;
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating.current) return;
    
    const target = e.target as Element;
    if (!checkSwipeAllowed(target)) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Don't start swipe if touching interactive elements or chat items
    const closestInteractive = target.closest('a, button, [role="button"], .chat-list-item, [data-chat-item]');
    if (closestInteractive) return;
    
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    startTime.current = Date.now();
    isDragging.current = true;
    
    // Disable transition during drag for immediate response
    wrapper.style.transition = "none";
    wrapper.style.willChange = "transform";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isAnimating.current) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    const deltaX = e.touches[0].clientX - startX.current;
    currentX.current = e.touches[0].clientX;

    let translate = -currentIndex.current * window.innerWidth + deltaX;

    // Edge resistance at boundaries
    if (currentIndex.current === 0 && deltaX > 0) {
      translate = -currentIndex.current * window.innerWidth + deltaX * EDGE_RESISTANCE;
    } else if (currentIndex.current === PAGES.length - 1 && deltaX < 0) {
      translate = -currentIndex.current * window.innerWidth + deltaX * EDGE_RESISTANCE;
    }

    wrapper.style.transform = `translateX(${translate}px)`;
    x.set(translate);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || isAnimating.current) return;
    isDragging.current = false;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    const deltaX = currentX.current - startX.current;
    const time = Date.now() - startTime.current;
    const velocity = deltaX / time;

    let newIndex = currentIndex.current;

    // Check if swipe meets threshold or velocity
    if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(velocity) > VELOCITY_THRESHOLD) {
      // Swipe LEFT - only if not on last page
      if (deltaX < 0 && currentIndex.current < PAGES.length - 1) {
        newIndex = currentIndex.current + 1;
      } 
      // Swipe RIGHT - only if not on first page
      else if (deltaX > 0 && currentIndex.current > 0) {
        newIndex = currentIndex.current - 1;
      }
    }

    // Animate to new position
    isAnimating.current = true;
    currentIndex.current = newIndex;
    
    wrapper.style.transition = TRANSITION_DURATION + " " + TRANSITION_EASE;
    wrapper.style.transform = `translateX(-${newIndex * 100}vw)`;
    x.set(-newIndex * window.innerWidth);
    
    // Navigate after animation
    setTimeout(() => {
      isAnimating.current = false;
      navigate(PAGES[newIndex].path);
      wrapper.style.willChange = "auto";
    }, 280); // Match transition duration
    
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Mouse handlers (for desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating.current) return;
    
    const target = e.target as Element;
    if (!checkSwipeAllowed(target)) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Don't start swipe if clicking on interactive elements or chat items
    const closestInteractive = target.closest('a, button, [role="button"], .chat-list-item, [data-chat-item]');
    if (closestInteractive) return;
    
    startX.current = e.clientX;
    currentX.current = startX.current;
    startTime.current = Date.now();
    isDragging.current = true;
    
    wrapper.style.transition = "none";
    wrapper.style.willChange = "transform";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || isAnimating.current) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    const deltaX = e.clientX - startX.current;
    currentX.current = e.clientX;

    let translate = -currentIndex.current * window.innerWidth + deltaX;

    // Edge resistance at boundaries
    if (currentIndex.current === 0 && deltaX > 0) {
      translate = -currentIndex.current * window.innerWidth + deltaX * EDGE_RESISTANCE;
    } else if (currentIndex.current === PAGES.length - 1 && deltaX < 0) {
      translate = -currentIndex.current * window.innerWidth + deltaX * EDGE_RESISTANCE;
    }

    wrapper.style.transform = `translateX(${translate}px)`;
    x.set(translate);
  };

  const handleMouseUp = () => {
    if (!isDragging.current || isAnimating.current) return;
    isDragging.current = false;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    const deltaX = currentX.current - startX.current;
    const time = Date.now() - startTime.current;
    const velocity = deltaX / time;

    let newIndex = currentIndex.current;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(velocity) > VELOCITY_THRESHOLD) {
      if (deltaX < 0 && currentIndex.current < PAGES.length - 1) {
        newIndex = currentIndex.current + 1;
      } else if (deltaX > 0 && currentIndex.current > 0) {
        newIndex = currentIndex.current - 1;
      }
    }

    isAnimating.current = true;
    currentIndex.current = newIndex;
    
    wrapper.style.transition = TRANSITION_DURATION + " " + TRANSITION_EASE;
    wrapper.style.transform = `translateX(-${newIndex * 100}vw)`;
    x.set(-newIndex * window.innerWidth);
    
    setTimeout(() => {
      isAnimating.current = false;
      navigate(PAGES[newIndex].path);
      wrapper.style.willChange = "auto";
    }, 280);
    
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
      const wrapper = wrapperRef.current;
      if (wrapper) {
        wrapper.style.transition = TRANSITION_DURATION + " " + TRANSITION_EASE;
        wrapper.style.transform = `translateX(-${currentIndex.current * 100}vw)`;
        x.set(-currentIndex.current * window.innerWidth);
      }
    }
  };

  // Get current index for rendering
  const activeIndex = PAGES.findIndex(p => p.path === location.pathname);

  return (
    <>
      {/* Desktop Navbar - only shows on lg+ screens */}
      <div className="hidden lg:block">
        <Navbar />
      </div>
      
      <div 
        ref={containerRef}
        className="fixed inset-0 overflow-hidden bg-background lg:top-20 lg:pt-0 hide-scrollbar"
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
        <div
          ref={wrapperRef}
          className="flex h-full hide-scrollbar"
          style={{ 
            width: `${PAGES.length * 100}vw`,
            willChange: "transform",
            transform: `translateX(-${activeIndex * 100}vw)`
          }}
        >
          {/* Home - Anonymous Posts */}
          <div 
            className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20 hide-scrollbar"
            style={{ height: '100dvh' }}
          >
            <Home />
          </div>
          
          {/* Discover */}
          <div 
            className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20 hide-scrollbar"
            style={{ height: '100dvh' }}
          >
            <Discover />
          </div>
          
          {/* Chats */}
          <div 
            className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20 hide-scrollbar"
            style={{ height: '100dvh' }}
          >
            <ChatList />
          </div>
          
          {/* Matches */}
          <div 
            className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20 hide-scrollbar"
            style={{ height: '100dvh' }}
          >
            <Matches />
          </div>
          
          {/* Profile/Settings */}
          <div 
            className="w-screen h-screen flex-shrink-0 overflow-y-auto touch-scrollable pb-20 hide-scrollbar"
            style={{ height: '100dvh' }}
          >
            <SettingsPage />
          </div>
        </div>
      </div>

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
            const showBadge = index === 2 && totalUnread > 0;
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (index !== activeIndex) {
                    if (navigator.vibrate) navigator.vibrate(10);
                    
                    const wrapper = wrapperRef.current;
                    if (wrapper) {
                      isAnimating.current = true;
                      wrapper.style.transition = TRANSITION_DURATION + " " + TRANSITION_EASE;
                      wrapper.style.transform = `translateX(-${index * 100}vw)`;
                      x.set(-index * window.innerWidth);
                      
                      setTimeout(() => {
                        isAnimating.current = false;
                        navigate(PAGES[index].path);
                      }, 280);
                    }
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all relative min-w-[60px] touch-manipulation"
              >
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`p-1.5 rounded-xl ${isActive ? "bg-white/10" : ""}`}
                >
                  <div className="relative">
                    <Icon 
                      className={`w-5 h-5 transition-colors ${
                        isActive ? "text-white" : "text-white"
                      }`} 
                    />
                    {/* Notification Badge */}
                    {showBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
                      >
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
                <span 
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-white" : "text-white"
                  }`}
                >
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};

export default MainLayout;

