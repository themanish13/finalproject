import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuth, useAuthStore } from "@/hooks/useAuth";
import { ProfileViewerProvider } from "@/contexts/ProfileViewerContext";
import GlobalProfileViewer from "@/components/GlobalProfileViewer";

// Lazy load pages for better performance
import { lazy, Suspense, useEffect } from "react";

// Initialize chat cache on app startup
import { initializeCache } from "@/utils/chatCache";

const routerFutureConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

// Lazy load pages - use default export
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Chat = lazy(() => import("./pages/Chat"));
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MainLayout = lazy(() => import("./components/MainLayout"));

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading screen while checking auth
const AuthLoader = ({ children }: { children: React.ReactNode }) => {
  const { initialized, loading } = useAuthStore();
  
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-20 h-20">
          <span className="z-loading z-1">Z</span>
          <span className="z-loading z-2">Z</span>
          <span className="z-loading z-3">Z</span>
          <span className="z-loading z-4">Z</span>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, initialized } = useAuthStore();
  
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-20 h-20">
          <span className="z-loading z-1">Z</span>
          <span className="z-loading z-2">Z</span>
          <span className="z-loading z-3">Z</span>
          <span className="z-loading z-4">Z</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// App routes
const AppRoutes = () => {
  const { user, initialized } = useAuthStore();
  
  // If user is logged in and initialized, redirect from "/" to "/home"
  if (initialized && user) {
    // Check if we're on root or auth route and redirect to home
  }
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-20 h-20">
          <span className="z-loading z-1">Z</span>
          <span className="z-loading z-2">Z</span>
          <span className="z-loading z-3">Z</span>
          <span className="z-loading z-4">Z</span>
        </div>
      </div>
    }>
      <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
      
      {/* Chat page (separate from main navigation) */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const App = () => {
  // Initialize auth - this sets initialized = true
  useAuth();

  // Initialize chat cache on app startup
  useEffect(() => {
    initializeCache().catch(console.error);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProfileViewerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={routerFutureConfig.future}>
            <AuthLoader>
              <AppRoutes />
            </AuthLoader>
          </BrowserRouter>
          <GlobalProfileViewer />
        </ProfileViewerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

