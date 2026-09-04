import React, { useState, useEffect } from 'react';
import { DeviceProvider } from './context/DeviceContext';
import { GroceryProvider, useGrocery } from './context/GroceryContext';
import { Header } from './components/Header';
import { ListSelector } from './components/ListSelector';
import { QuickAddBar } from './components/QuickAddBar';
import { ItemList } from './components/ItemList';
import { CompletedList } from './components/CompletedList';
import { DeviceModal } from './components/DeviceModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { NewListModal } from './components/NewListModal';
import { ListSidebar } from './components/ListSidebar';
import { Download, Sparkles } from 'lucide-react';

const GroceryApp: React.FC = () => {
  const { activeList } = useGrocery();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-zinc-950 pb-safe">
      <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
        {/* PWA Install Banner if applicable */}
        {installPrompt && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-100" />
              <div>
                <div className="text-xs font-bold">Install Koffan Grocery PWA</div>
                <div className="text-[11px] text-emerald-100">
                  Instant offline access right on your home screen
                </div>
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-700 text-xs font-bold shadow-xs hover:bg-emerald-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          </div>
        )}

        {/* List Title & Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                {activeList?.name || 'Grocery List'}
              </h1>
              {activeList?.description && (
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {activeList.description}
                </p>
              )}
            </div>
          </div>

          <ListSelector />
        </div>

        {/* Quick Add Bar */}
        <QuickAddBar />

        {/* Active Items */}
        <ItemList />

        {/* Completed Items */}
        <CompletedList />
      </main>

      {/* Modals & Sidebar */}
      <DeviceModal />
      <SyncStatusModal />
      <NewListModal />
      <ListSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DeviceProvider>
      <GroceryProvider>
        <GroceryApp />
      </GroceryProvider>
    </DeviceProvider>
  );
};

export default App;
