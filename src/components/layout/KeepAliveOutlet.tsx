/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ KeepAliveOutlet — Keep Visited Pages Mounted + Code-Only Prefetch
 * ════════════════════════════════════════════════════════════════
 *
 * Strategy:
 * 1. User visits a page → it loads and stays mounted (hidden via CSS)
 * 2. After 5s idle, background prefetch downloads JS bundles ONLY
 *    (via import()) — NO component mounting, NO useQuery triggers
 * 3. DataEngine handles data loading independently
 * 4. Result: instant code loading on navigation + data already in cache
 *
 * ════════════════════════════════════════════════════════════════
 */

import { Suspense, useState, useEffect, useCallback, useRef, ComponentType, lazy } from 'react';
import { useLocation } from 'react-router-dom';

// ─── ALL app route → component mappings ─────────────────────────
const ROUTE_MAP: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  // Core modules (prefetch first — most used)
  '/': () => import('@/app/(dashboard)/new-dashboard/page'),
  '/old-dashboard': () => import('@/features/dashboard/Dashboard'),
  '/accounting': () => import('@/features/accounting/Accounting'),
  '/sales': () => import('@/features/sales/SalesPage'),
  '/purchases': () => import('@/features/purchases/PurchasesPage'),
  '/warehouse': () => import('@/features/warehouse/WarehouseModule'),
  '/inventory': () => import('@/features/warehouse/WarehouseModule'),
  '/crm': () => import('@/features/crm/CRM'),
  '/hr': () => import('@/features/hr/HR'),
  '/ecommerce': () => import('@/features/ecommerce/EcommercePage'),
  '/ai-analytics': () => import('@/features/ai/AIAnalyticsPage'),
  '/inspiration-studio': () => import('@/features/ai-studio/components/InspirationStudioPage'),

  // Secondary modules
  '/saas': () => import('@/features/saas/SaaS'),
  '/fabric': () => import('@/features/fabrics/Fabrics'),
  '/pharmacy': () => import('@/features/pharmacy/Pharmacy'),
  '/healthcare': () => import('@/features/healthcare/Healthcare'),
  '/doctors': () => import('@/features/doctors/Doctors'),
  '/restaurant': () => import('@/features/restaurant/Restaurant'),
  '/gold': () => import('@/features/gold/Gold'),
  '/website': () => import('@/features/website/WebsiteManagerPage'),
  '/exchange': () => import('@/features/exchange/Exchange'),

  // Settings & Admin
  '/support': () => import('@/features/mdm/SupportModule'),
  '/system-config': () => import('@/features/settings/SystemConfigPage'),
  '/users-permissions': () => import('@/features/settings/SystemConfigPage'), // Redirect: now a tab inside Settings
  '/workflows': () => import('@/features/workflow-center/WorkflowCenter'),
  '/activity-log': () => import('@/features/admin/activityLog/ActivityLog'),
  '/profile': () => import('@/features/profile/UserProfilePage'),

  // Labs
  '/dev/charts-lab': () => import('@/pages/ChartsLab'),
};

// ═══ Code Prefetch Tiers — JS Bundle Only (No Mounting!) ═══
// Tier 1: Core daily-use pages — download JS code after 5s
const TIER_1_CRITICAL = [
  '/accounting',  // شجرة الحسابات + لوحة المحاسبة
  '/sales',       // المبيعات
  '/purchases',   // المشتريات
  '/warehouse',   // المستودعات + المخزون
  '/inventory',   // المخزون (alias)
  '/crm',         // العملاء والموردين
];

// Tier 2: Important but less frequent — download after 15s
const TIER_2_IMPORTANT = [
  '/hr',                  // الموارد البشرية
  '/ecommerce',           // المتجر الإلكتروني
  '/ai-analytics',        // تحليلات الذكاء الاصطناعي
  '/inspiration-studio',  // استوديو الإلهام
  '/support',             // الدعم وإدارة الأجهزة
  '/system-config',       // إعدادات النظام
  '/users-permissions',   // المستخدمين والصلاحيات
  '/workflows',           // سير العمل
  '/exchange',            // الصرافة
];

// Tier 3: Secondary — download after 30s
const TIER_3_SECONDARY = [
  '/saas', '/fabric', '/pharmacy', '/healthcare',
  '/doctors', '/restaurant', '/gold', '/website',
  '/activity-log', '/profile', '/dev/charts-lab',
];

// Resolve the route key from the current pathname
function getRouteKey(pathname: string): string | null {
  if (ROUTE_MAP[pathname]) return pathname;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const prefix = '/' + segments[0];
    if (prefix === '/profile') return '/profile';
    if (ROUTE_MAP[prefix]) return prefix;
  }
  return null;
}

export default function KeepAliveOutlet({ fallbackElement }: { fallbackElement?: React.ReactNode }) {
  const location = useLocation();
  const currentKey = getRouteKey(location.pathname);

  // ⚡ EPHEMERAL ROUTES — These pages unmount when you navigate away.
  // They are heavy (system-config has 10+ tab components with polling/effects)
  // and don't benefit from keep-alive since users rarely switch back quickly.
  const EPHEMERAL_ROUTES = new Set([
    '/system-config',
    '/users-permissions',
    '/activity-log',
    '/profile',
    '/dev/charts-lab',
  ]);

  // Track MOUNTED routes — only pages the user has actually visited
  const [mountedRoutes, setMountedRoutes] = useState<Set<string>>(() => {
    return currentKey ? new Set([currentKey]) : new Set();
  });

  // Lazy component cache
  const [componentCache] = useState<Map<string, ComponentType<any>>>(() => new Map());
  const prefetchStarted = useRef(false);

  // Track which JS bundles have been preloaded (code only, no mount)
  const preloadedCode = useRef<Set<string>>(new Set());

  // Mount current route (only when user actually visits)
  // For ephemeral routes: unmount them when navigating away
  useEffect(() => {
    if (currentKey && !mountedRoutes.has(currentKey)) {
      setMountedRoutes(prev => new Set(prev).add(currentKey));
    }
    // Clean up ephemeral routes that are no longer active
    setMountedRoutes(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const route of prev) {
        if (EPHEMERAL_ROUTES.has(route) && route !== currentKey) {
          next.delete(route);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentKey]);

  // ⚡ Code-Only Prefetch — Download JS bundles WITHOUT mounting
  // This ensures the browser caches the JS code, so when the user
  // navigates to a page, there's no network delay for the JS bundle.
  // But since components are NOT mounted, no useQuery hooks fire,
  // and no data requests are made. DataEngine handles data separately.
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Helper: preload JS code only (import() downloads the chunk, nothing mounts)
    const preloadCode = (routeKey: string) => {
      if (!ROUTE_MAP[routeKey] || preloadedCode.current.has(routeKey)) return;
      preloadedCode.current.add(routeKey);

      // Just call import() — downloads the JS chunk, browser caches it
      // No React mounting, no useQuery, no side effects
      const schedule = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 50));
      schedule(() => {
        ROUTE_MAP[routeKey]().catch(() => {
          // Non-critical: if code preload fails, page will load normally on visit
        });
      });
    };

    // Helper: preload routes sequentially with gaps
    const preloadSequential = (routes: string[], gapMs: number, startDelay: number): number => {
      const toPreload = routes.filter(r => ROUTE_MAP[r] && !preloadedCode.current.has(r));
      toPreload.forEach((routeKey, idx) => {
        timeouts.push(setTimeout(() => preloadCode(routeKey), startDelay + idx * gapMs));
      });
      return toPreload.length;
    };

    // 🔴 Tier 1: Critical pages — preload JS code after 5s (one every 1s)
    //    DataEngine loads DATA during this time, no conflict
    const t1Count = preloadSequential(TIER_1_CRITICAL, 1000, 5000);
    console.log(`📦 [KeepAlive] Tier 1: ${t1Count} critical page bundles queued (code-only, 5s delay)`);

    // 🟡 Tier 2: Important — preload after 15s (one every 2s)
    const t2Count = preloadSequential(TIER_2_IMPORTANT, 2000, 15000);
    console.log(`📦 [KeepAlive] Tier 2: ${t2Count} important page bundles queued`);

    // 🟢 Tier 3: Secondary — preload after 30s (one every 2s)
    const t3Count = preloadSequential(TIER_3_SECONDARY, 2000, 30000);
    console.log(`📦 [KeepAlive] Tier 3: ${t3Count} secondary page bundles queued`);

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Get or create lazy component
  const getComponent = useCallback((routeKey: string): ComponentType<any> | null => {
    if (!componentCache.has(routeKey)) {
      const loader = ROUTE_MAP[routeKey];
      if (loader) {
        componentCache.set(routeKey, lazy(loader));
      }
    }
    return componentCache.get(routeKey) || null;
  }, [componentCache]);

  // Non-mapped routes → fallback
  if (!currentKey) {
    return <>{fallbackElement}</>;
  }

  return (
    <>
      {Array.from(mountedRoutes).map(routeKey => {
        const Component = getComponent(routeKey);
        if (!Component) return null;
        const isActive = routeKey === currentKey;

        return (
          <div
            key={routeKey}
            aria-hidden={!isActive}
            style={isActive ? {
              // Active page — normal rendering
              display: 'block',
            } : {
              // ⚡ Inactive page — keep mounted but fully out of layout flow
              // Using fixed position + visibility:hidden ensures:
              // 1. Elements keep real dimensions (ECharts happy)
              // 2. Zero impact on parent scroll height (fixes scroll cutoff bug)
              // 3. No paint cost (visibility:hidden = no compositing)
              position: 'fixed',
              top: 0,
              left: '-200vw',
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
              visibility: 'hidden',
              pointerEvents: 'none',
              zIndex: -9999,
            }}
          >
            <Suspense fallback={isActive ? (
              <div className="flex items-center justify-center p-12 min-h-[200px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-gray-200 dark:border-gray-700 border-t-teal-500 rounded-full animate-spin" />
                </div>
              </div>
            ) : <div />}>
              <Component />
            </Suspense>
          </div>
        );
      })}

      {!currentKey && fallbackElement}
    </>
  );
}
