import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";

interface SwipeWrapperProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: (data?: any) => void;
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-150, 0, 150], [0.9, 1, 0.9]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = threshold;
    
    if (info.offset.x < -swipeThreshold || info.velocity.x < -500) {
      if (onSwipeLeft) onSwipeLeft();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 500) {
      if (onSwipeRight) onSwipeRight();
    }
  };

  const getNavigationRoutes = () => {
    const routes = ["/discover", "/matches", "/settings"];
    const currentIndex = routes.indexOf(location.pathname);
    
    return {
      next: routes[(currentIndex + 1) % routes.length],
      previous: routes[(currentIndex - 1 + routes.length) % routes.length]
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

