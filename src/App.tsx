import React, { useState, useEffect } from 'react';
import { DeviceProvider } from './context/DeviceContext';
import { GroceryProvider } from './context/GroceryContext';
import { Header } from './components/Header';
import { ListSelector } from './components/ListSelector';
import { QuickAddBar } from './components/QuickAddBar';
import { ItemList } from './components/ItemList';
import { CompletedList } from './components/CompletedList';
import { DeviceModal } from './components/DeviceModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { NewListModal } from './components/NewListModal';
import { ListSidebar } from './components/ListSidebar';
import { Download, Sparkles, X } from 'lucide-react';

const GroceryApp: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dismissInstall, setDismissInstall] = useState(false);

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
    <div className="min-h-screen flex flex-col bg-[#fafaf9] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 space-y-4">
        {/* Subtle PWA Install Banner */}
        {installPrompt && !dismissInstall && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Install <strong>CartSync</strong> for instant offline use</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleInstallApp}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 shadow-xs transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>
              <button
                onClick={() => setDismissInstall(true)}
                className="p-1 text-emerald-600/70 hover:text-emerald-800 dark:hover:text-emerald-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Clean Horizontal List Switcher */}
        <ListSelector />

        {/* Active Grocery Items List */}
        <ItemList />

        {/* Collapsed/Expandable Completed Items */}
        <CompletedList />
      </main>

      {/* Sticky Bottom Thumb-Friendly Quick Add Bar */}
      <QuickAddBar />

      {/* Modals */}
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
