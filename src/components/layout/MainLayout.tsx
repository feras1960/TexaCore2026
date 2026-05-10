import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { QuickAddButton } from './QuickAddButton';
import { QuickAccessBar } from './QuickAccessBar';
import { TopTickerBar } from './TopTickerBar';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CartFloatingWidget } from '@/components/cart/CartFloatingWidget';
import { CurrencyCalculator } from '@/components/common/CurrencyCalculator';
import { NexaContextProvider } from '@/providers/NexaContextProvider';
import { NexaProAgent } from '@/components/ai/NexaProAgent';
import { GlobalSheetProvider } from '@/contexts/GlobalSheetContext';
import { CompanySidebar } from './CompanySidebar';
import { DataEngineProvider } from '@/engine/DataEngineProvider';
import { DataEngineIndicator } from '@/engine/DataEngineIndicator';
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime';
import { initStoragePersistence } from '@/lib/storage/storagePersistence';
import { stockCountOfflineStore } from '@/features/warehouse/services/stockCountOfflineStore';
// ⚡ useDataPreloader removed — DataEngine is the sole data loading system

export default function MainLayout() {
  const { direction, language } = useLanguage();
  const isAr = language === 'ar';
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // 🔝 Scroll to top when navigating between sections
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, [pathname]);

  // 🌐 Real-time sync: auto-update cache when other users make changes
  useGlobalRealtime();

  // ⚡ Data preloading handled by DataEngine (via DataEngineProvider above)
  // useDataPreloader removed — was duplicating 27+ queries with DataEngine

  // 💾 Initialize storage, service worker, integrity checks, offline listener (once)
  useEffect(() => {
    const isSelfHosted = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.texacore.ai');

    // 💾 IndexedDB cache persistence — enabled for ALL modes (cloud + local)
    // This ensures React Query cache survives page refresh → instant load
    initStoragePersistence();

    // 🖥️ Localhost: skip Service Worker & integrity checks (cloud-only features)
    if (!isSelfHosted) {
      // ⚡ Register Service Worker (background sync)
      import('@/lib/serviceWorker/register').then(({ registerServiceWorker }) => {
        registerServiceWorker();
      }).catch(() => { /* non-critical */ });

      // 🔍 Schedule daily integrity checks
      import('@/lib/integrity/periodicIntegrityCheck').then(({ scheduleIntegrityChecks }) => {
        scheduleIntegrityChecks();
      }).catch(() => { /* non-critical */ });
    }

    stockCountOfflineStore.setupReconnectListener();

    return () => {
      stockCountOfflineStore.teardownReconnectListener();
    };
  }, []);

  return (
    <DataEngineProvider>
      <CartProvider>
        <NexaContextProvider isAr={isAr}>
         <GlobalSheetProvider>
          <div className="h-screen bg-erp-cream dark:bg-gray-950 font-tajawal flex overflow-hidden" dir={direction}>
            {/* Sidebar */}
            <Sidebar className="shrink-0" />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
              {/* Smart Ticker Bar */}
              <TopTickerBar />

              {/* Header + DataEngine Indicator */}
              <div className="relative">
                <Header />
                {/* ⚡ DataEngine loading indicator — top-right corner */}
                <div className="absolute top-1/2 -translate-y-1/2 end-[320px] z-10">
                  <DataEngineIndicator />
                </div>
              </div>


              {/* Main Content */}
              <motion.main
                ref={mainRef}
                className="flex-1 p-4 lg:p-6 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="max-w-[1400px] mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Outlet />
                </motion.div>
              </motion.main>
            </div>

            {/* Floating Quick Add Button */}
            <QuickAddButton />

            {/* Cart Floating Widget */}
            <CartFloatingWidget />

            {/* 🤖 NexaPro Agent — AI Assistant on every page */}
            <NexaProAgent />

            {/* 🏢 Company Sidebar — shows only with multiple companies */}
            <CompanySidebar />
          </div>

          {/* Cart Drawer (outside layout div for proper layering) */}
          <CartDrawer />

          {/* 💱 Currency Calculator — Ctrl+E / ⌘+E from anywhere */}
          <CurrencyCalculator />
         </GlobalSheetProvider>
        </NexaContextProvider>
      </CartProvider>
    </DataEngineProvider>
  );
}
