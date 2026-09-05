import React, { useState } from 'react';
import { X, Plus, Check, User, Trash2 } from 'lucide-react';
import { useViewerAuth } from '../context/ViewerAuthContext';

export const ProfileModal: React.FC = () => {
  const { account, activeProfile, switchProfile, addProfile, deleteProfile, isProfileModalOpen, closeProfileModal } =
    useViewerAuth();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAgeGroup, setNewAgeGroup] = useState('4-8');
  const [error, setError] = useState<string | null>(null);

  if (!isProfileModalOpen || !account) return null;

  const handleSelectProfile = (id: string) => {
    switchProfile(id);
    closeProfileModal();
    setIsAdding(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) {
      setError('Please enter a profile name.');
      return;
    }
    const success = addProfile(newName.trim(), newAgeGroup);
    if (success) {
      setNewName('');
      setIsAdding(false);
      closeProfileModal();
    } else {
      setError('Maximum 4 profiles allowed per account.');
    }
  };

  const profiles = account.profiles || [];
  const canAddMore = profiles.length < 4;
  const canDelete = profiles.length > 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-8">
        {/* Close Button */}
        <button
          onClick={() => {
            setIsAdding(false);
            closeProfileModal();
          }}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Who's Watching?</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Select a profile or add up to 4 family profiles with dedicated age safe filters.
          </p>
        </div>

        {/* Profiles Grid */}
        {!isAdding ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile?.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    className="relative flex flex-col items-center space-y-3 group cursor-pointer p-3 rounded-2xl transition-transform hover:-translate-y-1"
                  >
                    {/* Delete Button (if > 1 profile) */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(p.id);
                        }}
                        title={`Delete ${p.name}'s profile`}
                        className="absolute top-1 right-3 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/80 flex items-center justify-center transition-colors shadow-md z-20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <div
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr ${p.avatarColor} flex items-center justify-center shadow-lg group-hover:scale-105 transition-all border-2 ${
                        isActive ? 'border-amber-400 shadow-amber-500/30' : 'border-transparent group-hover:border-slate-400'
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl font-black text-slate-950">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      {isActive && (
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="text-center space-y-0.5">
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 truncate max-w-[100px]">
                        {p.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full inline-block">
                        {p.ageGroup === 'All Ages' ? 'All Ages' : `Ages ${p.ageGroup}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Profile Card */}
              {canAddMore && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex flex-col items-center space-y-3 group cursor-pointer p-3 rounded-2xl transition-transform hover:-translate-y-1"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-700 group-hover:border-amber-500 flex items-center justify-center text-slate-500 group-hover:text-amber-400 group-hover:bg-amber-500/5 transition-all">
                    <Plus className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-slate-400 group-hover:text-amber-400">Add Profile</h4>
                    <span className="text-[10px] text-slate-500">{profiles.length}/4 profiles</span>
                  </div>
                </button>
              )}
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-300">{account.email}</strong>
              </span>
            </div>
          </div>
        ) : (
          /* Add Profile Form */
          <form onSubmit={handleAddSubmit} className="max-w-md mx-auto space-y-5 bg-slate-950/60 p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Add Family Member</span>
              </h3>
              <span className="text-xs text-slate-500">{profiles.length + 1} of 4</span>
            </div>

            {error && (
              <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Profile Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kabir, Siya, Papa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Age Group *</label>
              <select
                value={newAgeGroup}
                onChange={(e) => setNewAgeGroup(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="2-4">Ages 2-4 (Toddlers & Nursery Rhymes)</option>
                <option value="5-8">Ages 5-8 (Early Learning & Moral Stories)</option>
                <option value="9-12">Ages 9-12 (Adventures, Science & Mythology)</option>
                <option value="All Ages">All Ages (Family & Full Access)</option>
              </select>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                Save & Switch
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setError(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
