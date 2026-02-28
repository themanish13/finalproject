import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";

interface SwipeWrapperProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

const SwipeWrapper = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  threshold = 100 
}: SwipeWrapperProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Motion values for swipe animation
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-150, 0, 150], [0.9, 1, 0.9]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = threshold;
    
    // Check swipe direction and velocity
    if (info.offset.x < -swipeThreshold || info.velocity.x < -500) {
      // Swipe left - go to next page
      if (onSwipeLeft) onSwipeLeft();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 500) {
      // Swipe right - go to previous page
      if (onSwipeRight) onSwipeRight();
    }
  };

  // Get the next/previous route based on current location
  const getNavigationRoutes = () => {
    const routes = ["/discover", "/matches", "/settings"];
    const currentIndex = routes.indexOf(location.pathname);
    
    return {
      next: routes[(currentIndex + 1) % routes.length], // wraps around
      previous: routes[(currentIndex - 1 + routes.length) % routes.length] // wraps around
    };
  };

  const { next, previous } = getNavigationRoutes();

  const handleSwipeLeft = () => {
    if (onSwipeLeft) {
      onSwipeLeft();
    } else {
      navigate(next);
    }
  };

  const handleSwipeRight = () => {
    if (onSwipeRight) {
      onSwipeRight();
    } else {
      navigate(previous);
    }
  };

  // Don't apply swipe on desktop or if not mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ x, opacity, scale }}
      className="touch-none cursor-grab active:cursor-grabbing"
      whileTap={{ cursor: "grabbing" }}
    >
      {children}
    </motion.div>
  );
};

export default SwipeWrapper;

