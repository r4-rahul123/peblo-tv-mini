import React, { Component, ErrorInfo, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ViewerAuthProvider } from './context/ViewerAuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Peblo TV Viewer UI Uncaught Error:', error, errorInfo);
  }

  public handleReset = () => {
    try {
      localStorage.removeItem('peblo_viewer_account');
      localStorage.removeItem('peblo_active_profile_id');
      localStorage.removeItem('peblo_saved_accounts');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111726] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Display Restored</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                We detected a state refresh requirement. Click below to clear temporary session cache and launch cleanly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 border border-slate-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <Home />
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>&copy; {new Date().getFullYear()} Peblo TV Mini &bull; India's AI-Powered Learning Platform</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ViewerAuthProvider>
          <AppContent />
        </ViewerAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

