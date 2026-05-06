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

// 🖥️ LOCAL MODE: still preload — even localhost has HTTP overhead (PostgREST → SQL → JSON)
// The difference is we start slightly later to let the local services warm up
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

  const [progress, setProgress] = useState<DataEngineProgress>(
    { status: 'idle', total: 0, loaded: 0, percent: 0, currentModule: '' }
  );

  // Set QueryClient on the engine
  useEffect(() => {
    dataEngine.setQueryClient(queryClient);
  }, [queryClient]);

  // Register modules for ALL modes (cloud + local)
  useEffect(() => {
    if (!companyId) return;
    dataEngine.registerModule(resolveAccountingQueries(companyId));
    dataEngine.registerModule(resolveWarehouseQueries(companyId));
    dataEngine.registerModule(resolveSalesQueries(companyId));
    dataEngine.registerModule(resolvePurchasesQueries(companyId));
    dataEngine.registerModule(resolveCrmQueries(companyId));
    dataEngine.registerModule(resolveHrQueries(companyId));
  }, [companyId]);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = dataEngine.subscribe(setProgress);
    return unsubscribe;
  }, []);

  // ── Start loading when ready ──────────────────────────────
  useEffect(() => {
    // Wait for: auth, RBAC, IndexedDB restoration
    if (!companyId || rbacLoading || isRestoring || hasStarted.current) return;
    if (!user?.id) return;

    hasStarted.current = true;

    // Local mode: slightly longer delay (800ms) to let PostgREST warm up
    // Cloud mode: shorter delay (300ms) — network is the bottleneck anyway
    const startDelay = isLocalMode ? 800 : 300;
    
    console.log(`⚡ [DataEngine] Starting preload in ${startDelay}ms (${isLocalMode ? 'local' : 'cloud'} mode)`);

    const timer = setTimeout(() => {
      dataEngine.loadAll(companyId, visibleModules, language);
    }, startDelay);

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
