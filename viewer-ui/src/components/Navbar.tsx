import React, { useState } from 'react';
import { LogOut, LogIn, ChevronDown, Plus } from 'lucide-react';
import { useViewerAuth } from '../context/ViewerAuthContext';
import { LoginModal } from './LoginModal';
import { ProfileModal } from './ProfileModal';

interface NavbarProps {
  onSearchFocus?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const {
    account,
    activeProfile,
    user,
    login,
    logout,
    switchProfile,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
    openProfileModal,
  } = useViewerAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const profiles = account?.profiles || [];
  const canAddMore = profiles.length < 4;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              PEBLO
            </span>
            <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-md tracking-wider uppercase shadow-md shadow-amber-500/20">
              TV
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {user?.isKid && (
              <div className="hidden sm:flex items-center bg-purple-950/40 border border-purple-800/50 text-purple-300 text-xs px-3.5 py-1.5 rounded-full font-semibold shadow-inner">
                <span>Child-Safe Mode Active</span>
              </div>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 px-3 py-1.5 rounded-full shadow-inner transition-all"
                >
                  <div
                    className={`w-6 h-6 rounded-md bg-gradient-to-tr ${
                      activeProfile?.avatarColor || 'from-amber-500 to-yellow-400'
                    } flex items-center justify-center text-slate-950 font-black text-xs shadow-sm`}
                  >
                    <span className="text-[10px] font-black">{(activeProfile?.name || 'P').charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{activeProfile?.name || 'Profile'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#111726] border border-slate-800 rounded-2xl shadow-2xl p-2.5 space-y-2 z-50">
                    <div className="px-2 py-1 border-b border-slate-800/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Family Profiles</p>
                    </div>

                    <div className="space-y-1">
                      {profiles.map((p) => {
                        const isCurrent = p.id === activeProfile?.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              switchProfile(p.id);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                              isCurrent ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-5 h-5 rounded-md bg-gradient-to-tr ${p.avatarColor || 'from-amber-500 to-yellow-400'} flex items-center justify-center text-slate-950 text-[9px] font-black`}
                              >
                                {(p.name || 'P').charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[110px]">{p.name || 'Profile'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{p.ageGroup === 'All Ages' ? 'All' : `${p.ageGroup}`}</span>
                          </button>
                        );
                      })}
                    </div>

                    {canAddMore && (
                      <button
                        onClick={() => {
                          openProfileModal();
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 flex items-center space-x-2 transition-colors border border-dashed border-amber-500/30"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Profile ({profiles.length}/4)</span>
                      </button>
                    )}

                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/40 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
        onLogin={(email, initialName, ageGroup, isSignUp) => login(email, initialName, ageGroup, isSignUp)}
      />

      <ProfileModal />
    </>
  );
};

