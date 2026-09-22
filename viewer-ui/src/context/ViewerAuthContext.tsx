import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublishedShow } from '../types';
import { BACKEND_URL } from '../api/client';

export interface UserProfile {
  id: string;
  name: string;
  ageGroup: string; // '2-4' | '5-8' | '9-12' | 'All Ages'
  isKid: boolean;
  avatarColor: string;
}

export interface ViewerAccount {
  id?: string;
  email: string;
  profiles: UserProfile[];
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

const TOKEN_KEY = 'peblo_viewer_jwt_token';
const ACTIVE_PROF_KEY = 'peblo_active_profile_id';
const LOGGED_OUT_KEY = 'peblo_viewer_logged_out';

interface ViewerAuthContextType {
  account: ViewerAccount | null;
  activeProfile: UserProfile | null;
  user: UserProfile | null;
  login: (
    email: string,
    password?: string,
    initialName?: string,
    ageGroup?: string,
    isSignUp?: boolean
  ) => Promise<LoginResult>;
  logout: () => void;
  addProfile: (name: string, ageGroup: string) => Promise<boolean>;
  switchProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => Promise<void>;
  isLoginModalOpen: boolean;
  isProfileModalOpen: boolean;
  pendingShow: PublishedShow | null;
  setPendingShow: React.Dispatch<React.SetStateAction<PublishedShow | null>>;
  openLoginModal: (targetShow?: PublishedShow | null) => void;
  closeLoginModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

// Safe JSON parser that never throws 'Unexpected end of JSON input'
const safeJson = async (res: Response): Promise<any> => {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const formatApiError = (detail: any, fallback: string): string => {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.message || detail.detail || JSON.stringify(detail);
  }
  return fallback;
};

const mapServerProfileToClient = (p: any): UserProfile => ({
  id: p.id || `prof-${Math.random().toString(36).substr(2, 9)}`,
  name: p.name || 'User',
  ageGroup: p.age_group || p.ageGroup || '5-8',
  isKid: p.is_kid !== undefined ? p.is_kid : (p.age_group !== 'All Ages'),
  avatarColor: p.avatar_color || p.avatarColor || 'from-amber-500 to-orange-400',
});

const ViewerAuthContext = createContext<ViewerAuthContextType | undefined>(undefined);

export const ViewerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<ViewerAccount | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROF_KEY) || '';
    } catch {
      return '';
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingShow, setPendingShow] = useState<PublishedShow | null>(null);

  // Restore session from server on load
  useEffect(() => {
    const restoreSession = async () => {
      if (localStorage.getItem(LOGGED_OUT_KEY) === 'true') {
        setAccount(null);
        return;
      }

      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await safeJson(res);
            if (data && data.email) {
              const clientProfiles = (data.profiles || []).map(mapServerProfileToClient);
              const userAcc: ViewerAccount = {
                id: data.id,
                email: data.email,
                profiles: clientProfiles,
              };
              setAccount(userAcc);
              const savedProfId = localStorage.getItem(ACTIVE_PROF_KEY);
              if (savedProfId && clientProfiles.some((p: UserProfile) => p.id === savedProfId)) {
                setActiveProfileId(savedProfId);
              } else if (clientProfiles.length > 0) {
                setActiveProfileId(clientProfiles[0].id);
              }
              return;
            }
          } else {
            localStorage.removeItem(TOKEN_KEY);
          }
        } catch (e) {
          console.error('Failed to fetch user session from server:', e);
        }
      }

      // If no token or not logged in, try default demo family login
      try {
        const demoRes = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'family@peblo.tv', password: 'password123' }),
        });
        if (demoRes.ok) {
          const demoData = await safeJson(demoRes);
          if (demoData && demoData.access_token) {
            localStorage.setItem(TOKEN_KEY, demoData.access_token);
            const clientProfiles = (demoData.account?.profiles || []).map(mapServerProfileToClient);
            setAccount({
              id: demoData.account?.id,
              email: demoData.account?.email || 'family@peblo.tv',
              profiles: clientProfiles,
            });
            if (clientProfiles.length > 0) {
              setActiveProfileId(clientProfiles[0].id);
            }
          }
        }
      } catch {
        // ignore offline fallback
      }
    };

    restoreSession();
  }, []);

  const profilesList = account && Array.isArray(account.profiles) && account.profiles.length > 0
    ? account.profiles
    : [];

  const activeProfile = account
    ? (profilesList.find((p) => p.id === activeProfileId) || profilesList[0] || null)
    : null;

  const login = async (
    email: string,
    password?: string,
    initialName?: string,
    ageGroup?: string,
    isSignUp?: boolean
  ): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your email or mobile number.' };
    }
    const enteredPass = password ? password.trim() : '';

    try {
      if (isSignUp) {
        if (!enteredPass || enteredPass.length < 4) {
          return { success: false, error: 'Password must be at least 4 characters.' };
        }

        const res = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: enteredPass,
            initial_name: initialName?.trim() || undefined,
            age_group: ageGroup || '5-8',
          }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
          return { success: false, error: formatApiError(data?.detail, 'Sign up failed. Please try again.') };
        }

        if (!data || !data.access_token) {
          return { success: false, error: 'Unexpected response from auth server.' };
        }

        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.removeItem(LOGGED_OUT_KEY);

        const clientProfiles = (data.account?.profiles || []).map(mapServerProfileToClient);
        const userAcc: ViewerAccount = {
          id: data.account?.id,
          email: data.account?.email || cleanEmail,
          profiles: clientProfiles,
        };

        setAccount(userAcc);
        if (clientProfiles.length > 0) {
          const firstId = clientProfiles[0].id;
          setActiveProfileId(firstId);
          localStorage.setItem(ACTIVE_PROF_KEY, firstId);
        }

        setIsLoginModalOpen(false);
        return { success: true };
      }

      // Sign In Flow
      if (!enteredPass) {
        return { success: false, error: 'Please enter your password.' };
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: enteredPass,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        return { success: false, error: formatApiError(data?.detail, 'Login failed. Please check credentials.') };
      }

      if (!data || !data.access_token) {
        return { success: false, error: 'Unexpected response from auth server.' };
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.removeItem(LOGGED_OUT_KEY);

      const clientProfiles = (data.account?.profiles || []).map(mapServerProfileToClient);
      const userAcc: ViewerAccount = {
        id: data.account?.id,
        email: data.account?.email || cleanEmail,
        profiles: clientProfiles,
      };

      setAccount(userAcc);
      if (clientProfiles.length > 0) {
        const firstId = clientProfiles[0].id;
        setActiveProfileId(firstId);
        localStorage.setItem(ACTIVE_PROF_KEY, firstId);
      }

      setIsLoginModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to auth server.' };
    }
  };

  const logout = () => {
    setAccount(null);
    setActiveProfileId('');
    try {
      localStorage.setItem(LOGGED_OUT_KEY, 'true');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACTIVE_PROF_KEY);
    } catch {
      // ignore
    }
  };

  const addProfile = async (name: string, ageGroup: string): Promise<boolean> => {
    if (!account) return false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    const cleanName = name.trim();
    if (!cleanName) return false;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: cleanName, age_group: ageGroup }),
      });

      if (!res.ok) return false;
      const created = await safeJson(res);
      if (!created) return false;
      const newProf = mapServerProfileToClient(created);

      setAccount((prev) => (prev ? { ...prev, profiles: [...(prev.profiles || []), newProf] } : null));
      setActiveProfileId(newProf.id);
      localStorage.setItem(ACTIVE_PROF_KEY, newProf.id);
      return true;
    } catch (e) {
      console.error('Failed to add profile on server:', e);
      return false;
    }
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

  const deleteProfile = async (profileId: string): Promise<void> => {
    if (!account || profilesList.length <= 1) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/profiles/${profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setAccount((prev) =>
          prev ? { ...prev, profiles: (prev.profiles || []).filter((p) => p.id !== profileId) } : null
        );
        const remaining = profilesList.filter((p) => p.id !== profileId);
        const nextId = activeProfileId === profileId ? remaining[0]?.id || '' : activeProfileId;
        setActiveProfileId(nextId);
        localStorage.setItem(ACTIVE_PROF_KEY, nextId);
      }
    } catch (e) {
      console.error('Failed to delete profile on server:', e);
    }
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

  const contextValue = React.useMemo(() => ({
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
    setPendingShow,
    openLoginModal,
    closeLoginModal,
    openProfileModal,
    closeProfileModal,
  }), [
    account,
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
