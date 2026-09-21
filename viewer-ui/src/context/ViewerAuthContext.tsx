import React, { createContext, useContext, useState } from 'react';
import { PublishedShow } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  ageGroup: string; // '2-4' | '5-8' | '9-12' | 'All Ages'
  isKid: boolean;
  avatarColor: string;
}

export interface ViewerAccount {
  email: string;
  profiles: UserProfile[];
}

export const DEFAULT_FAMILY_ACCOUNT: ViewerAccount = {
  email: 'family@peblo.tv',
  profiles: [
    {
      id: 'prof-kabir',
      name: 'Kabir',
      ageGroup: '2-4',
      isKid: true,
      avatarColor: 'from-amber-500 to-orange-400',
    },
    {
      id: 'prof-siya',
      name: 'Siya',
      ageGroup: '5-8',
      isKid: true,
      avatarColor: 'from-purple-500 to-pink-500',
    },
    {
      id: 'prof-aarav',
      name: 'Aarav',
      ageGroup: '9-12',
      isKid: true,
      avatarColor: 'from-emerald-500 to-teal-400',
    },
    {
      id: 'prof-family',
      name: 'Family',
      ageGroup: 'All Ages',
      isKid: false,
      avatarColor: 'from-blue-600 to-cyan-400',
    },
  ],
};

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
  setPendingShow: React.Dispatch<React.SetStateAction<PublishedShow | null>>;
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
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistAccountToStore = (acc: ViewerAccount) => {
  const all = getStoredAccounts();
  all[acc.email.toLowerCase()] = acc;
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

const ViewerAuthContext = createContext<ViewerAuthContextType | undefined>(undefined);

export const ViewerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<ViewerAccount | null>(() => {
    const saved = localStorage.getItem('peblo_account');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROF_KEY) || 'prof-kabir';
    } catch {
      return 'prof-kabir';
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingShow, setPendingShow] = useState<PublishedShow | null>(null);

  const effectiveAccount = account || DEFAULT_FAMILY_ACCOUNT;
  const profilesList = Array.isArray(effectiveAccount.profiles) && effectiveAccount.profiles.length > 0
    ? effectiveAccount.profiles
    : DEFAULT_FAMILY_ACCOUNT.profiles;

  const activeProfile =
    profilesList.find((p) => p.id === activeProfileId) || profilesList[0] || DEFAULT_FAMILY_ACCOUNT.profiles[0];

  const saveAccountState = (updatedAccount: ViewerAccount | null, newActiveId?: string) => {
    const finalAccount = updatedAccount || DEFAULT_FAMILY_ACCOUNT;
    setAccount(finalAccount);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(finalAccount));
      persistAccountToStore(finalAccount);
      const targetId = newActiveId || finalAccount.profiles[0]?.id || 'prof-kabir';
      setActiveProfileId(targetId);
      localStorage.setItem(ACTIVE_PROF_KEY, targetId);
    } catch {
      // ignore
    }
  };

  const login = (email: string, initialName?: string, ageGroup?: string, isSignUp?: boolean) => {
    const cleanEmail = email.trim().toLowerCase() || 'family@peblo.tv';
    const allAccounts = getStoredAccounts();
    const existing = allAccounts[cleanEmail];

    if (!isSignUp && existing && Array.isArray(existing.profiles) && existing.profiles.length > 0) {
      saveAccountState(existing, existing.profiles[0].id);
      return;
    }

    const profileName = initialName?.trim() || cleanEmail.split('@')[0] || 'User';
    const selectedAge = ageGroup || '5-8';
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
    saveAccountState(DEFAULT_FAMILY_ACCOUNT, 'prof-kabir');
  };

  const addProfile = (name: string, ageGroup: string): boolean => {
    const currentProfiles = Array.isArray(effectiveAccount.profiles) ? effectiveAccount.profiles : [];
    if (currentProfiles.length >= 4) return false;

    const cleanName = name.trim();
    if (!cleanName) return false;

    const colorIdx = currentProfiles.length % AVATAR_COLORS.length;
    const isKid = ageGroup !== 'All Ages';

    const newProfile: UserProfile = {
      id: `prof-${Date.now()}`,
      name: cleanName,
      ageGroup,
      isKid,
      avatarColor: AVATAR_COLORS[colorIdx],
    };

    const updatedAccount: ViewerAccount = {
      ...effectiveAccount,
      profiles: [...currentProfiles, newProfile],
    };

    saveAccountState(updatedAccount, newProfile.id);
    return true;
  };

  const switchProfile = (profileId: string) => {
    const exists = profilesList.some((p) => p.id === profileId);
    if (exists) {
      setActiveProfileId(profileId);
      try {
        localStorage.setItem(ACTIVE_PROF_KEY, profileId);
      } catch {
        // ignore
      }
    }
  };

  const deleteProfile = (profileId: string) => {
    if (profilesList.length <= 1) return;

    const updatedProfiles = profilesList.filter((p) => p.id !== profileId);
    const updatedAccount: ViewerAccount = {
      ...effectiveAccount,
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
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const contextValue = React.useMemo(() => ({
    account: effectiveAccount,
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
    setPendingShow,
    openLoginModal,
    closeLoginModal,
    openProfileModal,
    closeProfileModal,
  }), [
    effectiveAccount,
    activeProfile,
    isLoginModalOpen,
    isProfileModalOpen,
    pendingShow,
  ]);

  return (
    <ViewerAuthContext.Provider value={contextValue}>
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
