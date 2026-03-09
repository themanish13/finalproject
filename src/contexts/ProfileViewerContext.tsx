import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserProfile {
  id?: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  userInitials?: string;
}

interface ProfileViewerContextType {
  isOpen: boolean;
  profile: UserProfile | null;
  openProfile: (profile: UserProfile) => void;
  closeProfile: () => void;
}

const ProfileViewerContext = createContext<ProfileViewerContextType | undefined>(undefined);

export const ProfileViewerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const openProfile = (userProfile: UserProfile) => {
    setProfile(userProfile);
    setIsOpen(true);
  };

  const closeProfile = () => {
    setIsOpen(false);
    setProfile(null);
  };

  return (
    <ProfileViewerContext.Provider value={{ isOpen, profile, openProfile, closeProfile }}>
      {children}
    </ProfileViewerContext.Provider>
  );
};

export const useProfileViewer = () => {
  const context = useContext(ProfileViewerContext);
  if (!context) {
    throw new Error('useProfileViewer must be used within a ProfileViewerProvider');
  }
  return context;
};

// Helper hook to trigger profile view from anywhere
export const useShowProfile = () => {
  const { openProfile } = useProfileViewer();
  
  return {
    showProfile: (name: string, avatarUrl?: string, userInitials?: string, id?: string, bio?: string) => {
      openProfile({ name, avatarUrl, userInitials, id, bio });
    },
  };
};

