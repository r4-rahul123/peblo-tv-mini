import React from 'react';
import { Film, UploadCloud } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Peblo TV</span>
              <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700">Studio CMS</span>
            </div>
            <p className="text-xs text-slate-400">Content Management &amp; Publishing Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectTab('shows')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              currentTab === 'shows'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Catalogue Studio</span>
          </button>

          <button
            onClick={() => onSelectTab('publish')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              currentTab === 'publish'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Publish Dashboard</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2">Role:</span>
            <button
              onClick={() => handleRoleToggle('editor')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                role === 'editor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => handleRoleToggle('admin')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                role === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin (Publisher)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
