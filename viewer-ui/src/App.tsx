import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ViewerAuthProvider } from './context/ViewerAuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
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
    <QueryClientProvider client={queryClient}>
      <ViewerAuthProvider>
        <AppContent />
      </ViewerAuthProvider>
    </QueryClientProvider>
  );
}
