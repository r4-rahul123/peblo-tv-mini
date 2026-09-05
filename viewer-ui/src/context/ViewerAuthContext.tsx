import React, { createContext, useContext, useState } from 'react';
import { PublishedShow } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  ageGroup: string; // '2-5' | '4-8' | '6-12' | 'All Ages'
  isKid: boolean;
  avatarColor: string;
}

export interface ViewerAccount {
  email: string;
  profiles: UserProfile[];
}

interface ViewerAuthContextType {
  account: ViewerAccount | null;
  activeProfile: UserProfile | null;
  user: UserProfile | null; // Alias for backward compatibility
  login: (email: string, initialName?: string, ageGroup?: string, isSignUp?: boolean) => void;
  logout: () => void;
  addProfile: (name: string, ageGroup: string) => boolean;
  switchProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;
  isLoginModalOpen: boolean;
  isProfileModalOpen: boolean;
  pendingShow: PublishedShow | null;
  openLoginModal: (targetShow?: PublishedShow | null) => void;
  closeLoginModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const AVATAR_COLORS = [
  'from-amber-500 to-orange-400',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-400',
  'from-blue-600 to-cyan-400',
];

const ACCOUNTS_STORAGE_KEY = 'peblo_saved_accounts';
const SESSION_STORAGE_KEY = 'peblo_viewer_account';
const ACTIVE_PROF_KEY = 'peblo_active_profile_id';

const getStoredAccounts = (): Record<string, ViewerAccount> => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Clean out any legacy dummy accounts
    Object.keys(parsed).forEach((key) => {
      if (key.includes('mypeblo.com') || key.includes('dummy')) {
        delete parsed[key];
      }
    });
    return parsed;
  } catch {
    return {};
  }
};

const persistAccountToStore = (acc: ViewerAccount) => {
  const all = getStoredAccounts();
  all[acc.email.toLowerCase()] = acc;
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(all));
};

const ViewerAuthContext = createContext<ViewerAuthContextType | undefined>(undefined);

export const ViewerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<ViewerAccount | null>(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.email?.includes('mypeblo.com')) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_PROF_KEY);
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_PROF_KEY) || '';
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingShow, setPendingShow] = useState<PublishedShow | null>(null);

  const activeProfile = account?.profiles.find((p) => p.id === activeProfileId) || account?.profiles[0] || null;

  const saveAccountState = (updatedAccount: ViewerAccount | null, newActiveId?: string) => {
    setAccount(updatedAccount);
    if (updatedAccount) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedAccount));
      persistAccountToStore(updatedAccount);
      const targetId = newActiveId || (updatedAccount.profiles[0]?.id || '');
      setActiveProfileId(targetId);
      localStorage.setItem(ACTIVE_PROF_KEY, targetId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROF_KEY);
      setActiveProfileId('');
    }
  };

  const login = (email: string, initialName?: string, ageGroup?: string, isSignUp?: boolean) => {
    const cleanEmail = email.trim().toLowerCase() || 'family@mypeblo.com';
    const allAccounts = getStoredAccounts();
    const existing = allAccounts[cleanEmail];

    // If it's pure Sign In (not Sign Up) AND existing account found -> restore existing!
    if (!isSignUp && existing && existing.profiles && existing.profiles.length > 0) {
      saveAccountState(existing, existing.profiles[0].id);
      return;
    }

    // Otherwise (Sign Up or new user), create fresh account with the exact Name entered!
    const profileName = initialName?.trim() || cleanEmail.split('@')[0] || 'User';
    const selectedAge = ageGroup || '4-8';
    const isKid = selectedAge !== 'All Ages';

    const newProfile: UserProfile = {
      id: `prof-${Date.now()}`,
      name: profileName,
      ageGroup: selectedAge,
      isKid,
      avatarColor: AVATAR_COLORS[0],
    };

    const newAccount: ViewerAccount = {
      email: cleanEmail,
      profiles: [newProfile],
    };

    saveAccountState(newAccount, newProfile.id);
  };

  const logout = () => {
    saveAccountState(null);
  };

  const addProfile = (name: string, ageGroup: string): boolean => {
    if (!account) return false;
    if (account.profiles.length >= 4) return false; // Max 4 profiles

    const cleanName = name.trim();
    if (!cleanName) return false;

    const colorIdx = account.profiles.length % AVATAR_COLORS.length;
    const isKid = ageGroup !== 'All Ages';

    const newProfile: UserProfile = {
      id: `prof-${Date.now()}`,
      name: cleanName,
      ageGroup,
      isKid,
      avatarColor: AVATAR_COLORS[colorIdx],
    };

    const updatedAccount: ViewerAccount = {
      ...account,
      profiles: [...account.profiles, newProfile],
    };

    saveAccountState(updatedAccount, newProfile.id);
    return true;
  };

  const switchProfile = (profileId: string) => {
    if (!account) return;
    const exists = account.profiles.some((p) => p.id === profileId);
    if (exists) {
      setActiveProfileId(profileId);
      localStorage.setItem('peblo_active_profile_id', profileId);
    }
  };

  const deleteProfile = (profileId: string) => {
    if (!account || account.profiles.length <= 1) return; // Keep at least 1 profile

    const updatedProfiles = account.profiles.filter((p) => p.id !== profileId);
    const updatedAccount: ViewerAccount = {
      ...account,
      profiles: updatedProfiles,
    };

    const nextActiveId = activeProfileId === profileId ? updatedProfiles[0].id : activeProfileId;
    saveAccountState(updatedAccount, nextActiveId);
  };

  const openLoginModal = (targetShow?: PublishedShow | null) => {
    if (targetShow) setPendingShow(targetShow);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setPendingShow(null);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <ViewerAuthContext.Provider
      value={{
        account,
        activeProfile,
        user: activeProfile,
        login,
        logout,
        addProfile,
        switchProfile,
        deleteProfile,
        isLoginModalOpen,
        isProfileModalOpen,
        pendingShow,
        openLoginModal,
        closeLoginModal,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}
    </ViewerAuthContext.Provider>
  );
};

export const useViewerAuth = () => {
  const context = useContext(ViewerAuthContext);
  if (!context) {
    throw new Error('useViewerAuth must be used within a ViewerAuthProvider');
  }
  return context;
};
