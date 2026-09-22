import React from 'react';
import { Film, UploadCloud, Shield, Crown } from 'lucide-react';
import { getStoredRole, setStoredRole } from '../api/client';

interface NavbarProps {
  currentTab: 'shows' | 'publish';
  onSelectTab: (tab: 'shows' | 'publish') => void;
  onRoleChange: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onRoleChange,
}) => {
  const role = getStoredRole();

  const handleRoleToggle = (newRole: 'admin' | 'editor') => {
    setStoredRole(newRole);
    onRoleChange();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar: Brand + Desktop Nav Tabs + Role Switcher */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 font-bold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base sm:text-lg text-white tracking-tight truncate">Peblo TV</span>
                <span className="text-[10px] sm:text-xs bg-amber-500/15 text-amber-400 font-bold px-1.5 py-0.5 rounded-md border border-amber-500/30 shrink-0">
                  CMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                Content Management &amp; Publishing Engine
              </p>
            </div>
          </div>

          {/* Desktop Center Navigation Tabs (Hidden on mobile) */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectTab('shows')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
                currentTab === 'shows'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Catalogue Studio</span>
            </button>

            <button
              onClick={() => onSelectTab('publish')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
                currentTab === 'publish'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish Dashboard</span>
            </button>
          </div>

          {/* Role Switcher (Compact & fully visible on mobile) */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 sm:p-1 text-xs shadow-inner">
              <button
                onClick={() => handleRoleToggle('editor')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 ${
                  role === 'editor'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => handleRoleToggle('admin')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center space-x-1 ${
                  role === 'admin'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span className="hidden sm:inline">Admin (Publisher)</span>
                <span className="sm:hidden">Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar (Segmented 50/50 tabs) */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectTab('shows')}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                currentTab === 'shows'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Catalogue Shows</span>
            </button>

            <button
              onClick={() => onSelectTab('publish')}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                currentTab === 'publish'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Publish &amp; Deploy</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
