import React, { useState } from 'react';
import { X, Lock, Mail, LogIn, User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, initialName?: string, ageGroup?: string, isSignUp?: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidAge, setKidAge] = useState('4-8');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUpMode) {
      const name = kidName.trim() || 'User';
      onLogin(email, name, kidAge, true);
    } else {
      onLogin(email, '', '4-8', false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isSignUpMode ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSignUpMode
              ? 'Join Peblo TV to stream Indian animated stories & rhymes.'
              : 'Sign in to start watching Indian animated stories & rhymes.'}
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUpMode && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul"
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email or mobile number</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {isSignUpMode && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Age Group</label>
              <select
                value={kidAge}
                onChange={(e) => setKidAge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="2-5">Ages 2-5 (Toddlers & Nursery Rhymes)</option>
                <option value="4-8">Ages 4-8 (Moral Stories & Fables)</option>
                <option value="6-12">Ages 6-12 (Mythology & Science)</option>
                <option value="All Ages">All Ages (Family & Full Access)</option>
              </select>
            </div>
          )}

          <div className="flex items-center text-xs text-slate-400 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500" />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-xl shadow-amber-500/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>{isSignUpMode ? 'Get Started' : 'Sign In'}</span>
          </button>
        </form>

        {/* Bottom Switcher */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          {isSignUpMode ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUpMode(false)}
                className="text-amber-400 font-bold hover:underline ml-1"
              >
                Sign in now
              </button>
            </p>
          ) : (
            <p>
              New to Peblo TV?{' '}
              <button
                type="button"
                onClick={() => setIsSignUpMode(true)}
                className="text-amber-400 font-bold hover:underline ml-1"
              >
                Sign up now
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
