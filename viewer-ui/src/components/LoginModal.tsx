import React, { useState } from 'react';
import { X, Lock, Mail, LogIn, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useViewerAuth } from '../context/ViewerAuthContext';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogin?: (email: string, initialName?: string, ageGroup?: string, isSignUp?: boolean) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const { isLoginModalOpen, closeLoginModal, login } = useViewerAuth();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isLoginModalOpen;
  const handleClose = propOnClose || closeLoginModal;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidAge, setKidAge] = useState('5-8');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email or mobile number.');
      return;
    }

    if (cleanEmail.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@example.com).');
      return;
    } else if (!cleanEmail.includes('@') && !/^\d{10,12}$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email (e.g. name@gmail.com) or a 10-digit mobile number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUpMode) {
        const name = kidName.trim() || 'User';
        const res = await login(cleanEmail, password, name, kidAge, true);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create account.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await login(cleanEmail, password, '', '5-8', false);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid credentials. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Reset & close
      setEmail('');
      setPassword('');
      setKidName('');
      setShowPassword(false);
      setErrorMessage(null);
      setIsSubmitting(false);
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = (signUp: boolean) => {
    setIsSignUpMode(signUp);
    setShowPassword(false);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close button */}
        <button
          onClick={handleClose}
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

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-950/70 border border-red-800/80 rounded-xl p-3 text-red-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMessage}</div>
          </div>
        )}

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
                required
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
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={isSignUpMode ? 'Min 4 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-amber-400 transition-colors p-1 cursor-pointer focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
                <option value="2-4">Ages 2-4 (Toddlers & Nursery Rhymes)</option>
                <option value="5-8">Ages 5-8 (Early Learning & Moral Stories)</option>
                <option value="9-12">Ages 9-12 (Adventures, Science & Mythology)</option>
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
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-xl shadow-amber-500/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isSubmitting
                ? isSignUpMode
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignUpMode
                ? 'Create Account'
                : 'Sign In'}
            </span>
          </button>
        </form>

        {/* Bottom Switcher */}
        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          {isSignUpMode ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode(false)}
                className="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Sign in now
              </button>
            </p>
          ) : (
            <p>
              New to Peblo TV?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode(true)}
                className="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
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
