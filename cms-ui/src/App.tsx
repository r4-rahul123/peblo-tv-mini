import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { ShowList } from './pages/ShowList';
import { ShowForm } from './pages/ShowForm';
import { PublishDashboard } from './pages/PublishDashboard';
import { Show } from './types';

const queryClient = new QueryClient();

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'shows' | 'publish'>('shows');
  const [selectedShow, setSelectedShow] = useState<Show | null | undefined>(undefined);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [, setRoleRefresh] = useState(0);

  const handleRoleChange = () => {
    setRoleRefresh((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedShow(undefined);
          setIsCreatingShow(false);
        }}
        onRoleChange={handleRoleChange}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'publish' ? (
          <PublishDashboard />
        ) : isCreatingShow || selectedShow !== undefined ? (
          <ShowForm
            show={selectedShow}
            onBack={() => {
              setSelectedShow(undefined);
              setIsCreatingShow(false);
            }}
            onSaved={() => {
              setSelectedShow(undefined);
              setIsCreatingShow(false);
              queryClient.invalidateQueries({ queryKey: ['shows'] });
              queryClient.invalidateQueries({ queryKey: ['validationReport'] });
            }}
          />
        ) : (
          <ShowList
            onSelectShow={(show) => setSelectedShow(show)}
            onCreateShow={() => setIsCreatingShow(true)}
          />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
