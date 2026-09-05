import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { DeviceProvider } from './context/DeviceContext';
import { GroceryProvider } from './context/GroceryContext';
import { AuthProvider } from './context/AuthContext';
import { LockScreen } from './components/LockScreen';
import { Header } from './components/Header';
import { ListSelector } from './components/ListSelector';
import { QuickAddBar } from './components/QuickAddBar';
import { ItemList } from './components/ItemList';
import { CompletedList } from './components/CompletedList';
import { DeviceModal } from './components/DeviceModal';
import { SyncStatusModal } from './components/SyncStatusModal';
import { NewListModal } from './components/NewListModal';
import { ListSidebar } from './components/ListSidebar';
import { AutoListRulesModal } from './components/AutoListRulesModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { AdminModal } from './components/AdminModal';
import { UndoToast } from './components/UndoToast';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { useGrocery } from './context/GroceryContext';
import { Download, Sparkles, X } from 'lucide-react';

const GroceryApp: React.FC = () => {
  const { isCategoryModalOpen, closeCategoryModal } = useGrocery();
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Global Household Lock Screen */}
      <LockScreen />

      <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-3 pb-32 space-y-4">
        {/* Subtle PWA Install Banner */}
        {installPrompt && !dismissInstall && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Install <strong>CartSync</strong> for instant offline use</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissInstall(true)}
                className="p-1 rounded-lg text-emerald-600/70 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-100 active:scale-95 transition-all cursor-pointer"
                title="Dismiss"
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

      {/* Floating Back to Top Button (Bottom-Left) */}
      <ScrollToTopButton />

      {/* Floating Undo Notification Toast */}
      <UndoToast />

      {/* Modals */}
      <AdminModal />
      <DeviceModal />
      <SyncStatusModal />
      <NewListModal />
      <AutoListRulesModal />
      <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} />
      <ListSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DeviceProvider>
          <GroceryProvider>
            <GroceryApp />
          </GroceryProvider>
        </DeviceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
