/**
 * ════════════════════════════════════════════════════════════════
 * 🔌 DataEngineProvider — ربط المحرك مع React
 * ════════════════════════════════════════════════════════════════
 *
 * يوفر:
 *   - useDataEngine() hook لقراءة حالة التقدم
 *   - يبدأ التحميل تلقائياً بعد تسجيل الدخول
 *   - يمسح الكاش عند تسجيل الخروج
 *
 * ════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRBAC } from '@/hooks/useRBAC';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { isSelfHosted } from '@/lib/supabase';
import { dataEngine, type DataEngineProgress } from './DataEngine';
import { resolveAccountingQueries } from './modules/accountingModule';
import { resolveWarehouseQueries } from './modules/warehouseModule';
import { resolveSalesQueries } from './modules/salesModule';
import { resolvePurchasesQueries } from './modules/purchasesModule';
import { resolveCrmQueries } from './modules/crmModule';
import { resolveHrQueries } from './modules/hrModule';

// 🖥️ LOCAL MODE: skip heavy engine loading — data is on localhost (~5ms fetch)
// 🌐 REMOTE SELFHOSTED: keep engine loading (network latency makes preloading valuable)
const isLocalMode = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// ── Context ─────────────────────────────────────────────────────
interface DataEngineContextValue {
  progress: DataEngineProgress;
  clearCache: () => Promise<void>;
}

const DONE_PROGRESS: DataEngineProgress = { status: 'done', total: 0, loaded: 0, percent: 100, currentModule: '' };

const DataEngineContext = createContext<DataEngineContextValue>({
  progress: { status: 'idle', total: 0, loaded: 0, percent: 0, currentModule: '' },
  clearCache: async () => {},
});

export function useDataEngine() {
  return useContext(DataEngineContext);
}

// ── Provider ────────────────────────────────────────────────────
export function DataEngineProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { companyId, user } = useAuth();
  const { visibleModules, loading: rbacLoading } = useRBAC();
  const { language } = useLanguage();
  const isRestoring = useIsRestoring();
  const hasStarted = useRef(false);

  // 🖥️ In local mode, start with 'done' immediately — no loading bar
  const [progress, setProgress] = useState<DataEngineProgress>(
    isLocalMode ? DONE_PROGRESS : { status: 'idle', total: 0, loaded: 0, percent: 0, currentModule: '' }
  );

  // Set QueryClient on the engine
  useEffect(() => {
    dataEngine.setQueryClient(queryClient);
  }, [queryClient]);

  // Register modules (skip in local mode — not needed)
  useEffect(() => {
    if (!companyId || isLocalMode) return;
    // Register all modules with resolved company ID
    dataEngine.registerModule(resolveAccountingQueries(companyId));
    dataEngine.registerModule(resolveWarehouseQueries(companyId));
    dataEngine.registerModule(resolveSalesQueries(companyId));
    dataEngine.registerModule(resolvePurchasesQueries(companyId));
    dataEngine.registerModule(resolveCrmQueries(companyId));
    dataEngine.registerModule(resolveHrQueries(companyId));
  }, [companyId]);

  // Subscribe to progress updates (skip in local mode)
  useEffect(() => {
    if (isLocalMode) return;
    const unsubscribe = dataEngine.subscribe(setProgress);
    return unsubscribe;
  }, []);

  // ── Start loading when ready ──────────────────────────────
  useEffect(() => {
    // 🖥️ Local mode: skip heavy engine loading entirely
    if (isLocalMode) {
      console.log('⚡ [DataEngine] Local mode — skipping heavy preload, on-demand fetch is fast enough');
      return;
    }

    // Wait for: auth, RBAC, IndexedDB restoration
    if (!companyId || rbacLoading || isRestoring || hasStarted.current) return;
    if (!user?.id) return;

    hasStarted.current = true;

    // Small delay to let UI render first → non-blocking experience
    const timer = setTimeout(() => {
      dataEngine.loadAll(companyId, visibleModules, language);
    }, 300);

    return () => clearTimeout(timer);
  }, [companyId, rbacLoading, isRestoring, user?.id, visibleModules, language]);

  // ── Reset on company change ───────────────────────────────
  useEffect(() => {
    return () => {
      hasStarted.current = false;
      dataEngine.resetInitialization();
    };
  }, [companyId]);

  // ── Clear cache function ──────────────────────────────────
  const clearCache = useCallback(async () => {
    hasStarted.current = false;
    await dataEngine.clearAll();
  }, []);

  return (
    <DataEngineContext.Provider value={{ progress, clearCache }}>
      {children}
    </DataEngineContext.Provider>
  );
}
