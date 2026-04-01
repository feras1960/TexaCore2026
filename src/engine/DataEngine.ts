/**
 * ════════════════════════════════════════════════════════════════
 * 🏗️ DataEngine — محرك البيانات المركزي
 * ════════════════════════════════════════════════════════════════
 *
 * يحمّل كل البيانات المطلوبة مرة واحدة عند تسجيل الدخول
 * ويخزنها في React Query + IndexedDB.
 *
 * ⚡ الصفحات تقرأ من الكاش فوراً (0ms)
 * 🔄 Realtime يحدّث الكاش بالخلفية
 * 🔐 يحترم صلاحيات المستخدم
 * 🧹 يمسح الكاش عند تسجيل الخروج / تغيير الباسوورد
 *
 * ════════════════════════════════════════════════════════════════
 */

import type { QueryClient } from '@tanstack/react-query';

// ── Module definition type ──────────────────────────────────────
export interface DataModuleQuery {
  queryKey: unknown[];
  queryFn: (companyId: string) => Promise<unknown>;
  staleTime: number;
  gcTime: number;
}

export interface DataModule {
  /** Module code matching RBAC (e.g., 'accounting', 'warehouse') */
  code: string;
  /** Human-readable labels */
  label: { ar: string; en: string };
  /** Queries to prefetch for this module */
  queries: DataModuleQuery[];
}

// ── Progress state ──────────────────────────────────────────────
export interface DataEngineProgress {
  /** Overall status */
  status: 'idle' | 'loading' | 'done' | 'error';
  /** Total number of queries to load */
  total: number;
  /** Number of queries loaded so far */
  loaded: number;
  /** Percentage 0-100 */
  percent: number;
  /** Currently loading module label */
  currentModule: string;
  /** Error message if any */
  error?: string;
}

export type ProgressListener = (progress: DataEngineProgress) => void;

// ── Cache times ─────────────────────────────────────────────────
export const CACHE_TIMES = {
  STATIC:      30 * 60 * 1000,   // 30 min — settings, account tree
  SEMI_STATIC: 10 * 60 * 1000,   // 10 min — funds, parties, materials
  DYNAMIC:      5 * 60 * 1000,   //  5 min — journal entries, invoices
  GC:          24 * 60 * 60 * 1000, // 24 hours — keep for IndexedDB
} as const;

// ── DataEngine class ────────────────────────────────────────────
class DataEngine {
  private queryClient: QueryClient | null = null;
  private listeners: Set<ProgressListener> = new Set();
  private modules: DataModule[] = [];
  private hasInitialized = false;

  private progress: DataEngineProgress = {
    status: 'idle',
    total: 0,
    loaded: 0,
    percent: 0,
    currentModule: '',
  };

  // ── Initialize ──────────────────────────────────────────────
  setQueryClient(qc: QueryClient) {
    this.queryClient = qc;
  }

  registerModule(module: DataModule) {
    // Avoid duplicate registration
    if (!this.modules.find(m => m.code === module.code)) {
      this.modules.push(module);
    }
  }

  // ── Progress management ─────────────────────────────────────
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    // Immediately send current state
    listener(this.progress);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.progress }));
  }

  private updateProgress(partial: Partial<DataEngineProgress>) {
    Object.assign(this.progress, partial);
    if (this.progress.total > 0) {
      this.progress.percent = Math.round((this.progress.loaded / this.progress.total) * 100);
    }
    this.notify();
  }

  getProgress(): DataEngineProgress {
    return { ...this.progress };
  }

  // ── Core: Load all permitted modules ────────────────────────
  async loadAll(
    companyId: string,
    visibleModules: string[],
    language: string = 'ar'
  ): Promise<void> {
    if (!this.queryClient) {
      console.warn('[DataEngine] No QueryClient set');
      return;
    }

    // Prevent double initialization in same session
    if (this.hasInitialized) {
      console.log('[DataEngine] Already initialized — skipping');
      return;
    }
    this.hasInitialized = true;

    // Filter modules by permissions
    const isAdmin = visibleModules.includes('all');
    const modulesToLoad = isAdmin
      ? this.modules
      : this.modules.filter(m => visibleModules.includes(m.code));

    if (modulesToLoad.length === 0) {
      console.log('[DataEngine] No modules to load');
      this.updateProgress({ status: 'done', total: 0, loaded: 0, percent: 100 });
      return;
    }

    // Count total queries
    const totalQueries = modulesToLoad.reduce((sum, m) => sum + m.queries.length, 0);
    const t0 = performance.now();

    this.updateProgress({
      status: 'loading',
      total: totalQueries,
      loaded: 0,
      currentModule: modulesToLoad[0].label[language === 'ar' ? 'ar' : 'en'],
    });

    console.log(`⚡ [DataEngine] Starting — ${modulesToLoad.length} modules, ${totalQueries} queries`);

    let loaded = 0;

    // Load modules sequentially (one by one) for clear progress
    // but queries WITHIN each module run in parallel for speed
    for (const module of modulesToLoad) {
      this.updateProgress({
        currentModule: module.label[language === 'ar' ? 'ar' : 'en'],
      });

      // Run all queries in this module in parallel
      const results = await Promise.allSettled(
        module.queries.map(q =>
          this.queryClient!.prefetchQuery({
            queryKey: q.queryKey,
            queryFn: () => q.queryFn(companyId),
            staleTime: q.staleTime,
            gcTime: q.gcTime,
          })
        )
      );

      // Count successes
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      loaded += module.queries.length;

      if (failed > 0) {
        console.warn(`⚠️ [DataEngine] ${module.code}: ${failed} queries failed`);
      }

      this.updateProgress({ loaded });
      console.log(`✅ [DataEngine] ${module.code} — ${succeeded}/${module.queries.length} queries loaded`);
    }

    const elapsed = Math.round(performance.now() - t0);
    console.log(`⚡ [DataEngine] Complete — ${loaded}/${totalQueries} queries in ${elapsed}ms 🚀`);

    this.updateProgress({
      status: 'done',
      currentModule: '',
    });
  }

  // ── Reset (for logout / security events) ────────────────────
  async clearAll(): Promise<void> {
    console.log('🗑️ [DataEngine] Clearing all cached data...');
    this.hasInitialized = false;

    if (this.queryClient) {
      // Clear React Query in-memory cache
      this.queryClient.clear();
    }

    // Clear IndexedDB
    try {
      const { clearAllCaches } = await import('@/lib/queryPersistence');
      await clearAllCaches();
    } catch (err) {
      console.warn('[DataEngine] Failed to clear IndexedDB:', err);
    }

    this.updateProgress({
      status: 'idle',
      total: 0,
      loaded: 0,
      percent: 0,
      currentModule: '',
    });
  }

  // ── Reset initialization flag (for re-loading after company change) ──
  resetInitialization() {
    this.hasInitialized = false;
  }
}

// ── Singleton ───────────────────────────────────────────────────
export const dataEngine = new DataEngine();

// ── Global helper: window.__clearCache() — يمسح كل الكاش ويعيد التحميل ──
if (typeof window !== 'undefined') {
  (window as any).__clearCache = async () => {
    console.log('🧹 Clearing all caches...');
    await dataEngine.clearAll();
    // Also nuke IndexedDB databases directly
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ All caches cleared! Reloading...');
    window.location.reload();
  };
}
