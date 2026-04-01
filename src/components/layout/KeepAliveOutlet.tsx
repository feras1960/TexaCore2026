/**
 * ════════════════════════════════════════════════════════════════
 * ⚡ KeepAliveOutlet — Keep ALL Pages Mounted + Background Prefetch
 * ════════════════════════════════════════════════════════════════
 *
 * Strategy:
 * 1. User visits a page → it loads and stays mounted (hidden via CSS)
 * 2. After 3s idle, background prefetch starts loading ALL other pages
 *    one by one (staggered 800ms apart) using requestIdleCallback
 * 3. Result: after ~20s of idle time, ALL pages are pre-loaded
 *    and switching between them is INSTANT (0ms)
 *
 * ════════════════════════════════════════════════════════════════
 */

import { Suspense, useState, useEffect, useCallback, useRef, ComponentType, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import PageLoader from '@/components/common/PageLoader';

// ─── ALL app route → component mappings ─────────────────────────
const ROUTE_MAP: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  // Core modules (prefetch first — most used)
  '/': () => import('@/features/dashboard/Dashboard'),
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
  '/system-config': () => import('@/features/settings/SystemConfigPage'),
  '/users-permissions': () => import('@/features/settings/SystemConfigPage'), // Redirect: now a tab inside Settings
  '/workflows': () => import('@/features/workflow-center/WorkflowCenter'),
  '/activity-log': () => import('@/features/admin/activityLog/ActivityLog'),
  '/profile': () => import('@/features/profile/UserProfilePage'),

  // Labs
  '/dev/charts-lab': () => import('@/pages/ChartsLab'),
};

// ═══ Prefetch Tiers — Parallel Loading Strategy ═══
// Tier 1: Data-heavy, daily-use pages → load ALL in parallel (1.5s)
const TIER_1_CRITICAL = [
  '/accounting',  // شجرة الحسابات + لوحة المحاسبة
  '/sales',       // المبيعات
  '/purchases',   // المشتريات
  '/warehouse',   // المستودعات + المخزون
  '/inventory',   // المخزون (alias)
  '/crm',         // العملاء والموردين
];

// Tier 2: Important but less frequent → load in parallel (4s)
const TIER_2_IMPORTANT = [
  '/hr',                  // الموارد البشرية
  '/ecommerce',           // المتجر الإلكتروني
  '/ai-analytics',        // تحليلات الذكاء الاصطناعي
  '/inspiration-studio',  // استوديو الإلهام
  '/system-config',       // إعدادات النظام
  '/users-permissions',   // المستخدمين والصلاحيات
  '/workflows',           // سير العمل
  '/exchange',            // الصرافة
];

// Tier 3: Secondary — sequential loading to save resources (8s)
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

  // Track mounted routes (includes prefetched ones)
  const [mountedRoutes, setMountedRoutes] = useState<Set<string>>(() => {
    return currentKey ? new Set([currentKey]) : new Set();
  });

  // Lazy component cache
  const [componentCache] = useState<Map<string, ComponentType<any>>>(() => new Map());
  const prefetchStarted = useRef(false);

  // Mount current route
  useEffect(() => {
    if (currentKey && !mountedRoutes.has(currentKey)) {
      setMountedRoutes(prev => new Set(prev).add(currentKey));
    }
  }, [currentKey]);

  // ⚡ 3-Tier Staggered Prefetch — Non-blocking background loading
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Helper: mount a single route (light — one component at a time)
    const mountOne = (routeKey: string) => {
      if (!ROUTE_MAP[routeKey] || mountedRoutes.has(routeKey)) return;
      setMountedRoutes(prev => new Set(prev).add(routeKey));
    };

    // Helper: mount routes sequentially with gaps
    const mountSequential = (routes: string[], gapMs: number, startDelay: number) => {
      const toMount = routes.filter(r => ROUTE_MAP[r] && !mountedRoutes.has(r));
      toMount.forEach((routeKey, idx) => {
        timeouts.push(setTimeout(() => {
          const schedule = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 16));
          schedule(() => mountOne(routeKey));
        }, startDelay + idx * gapMs));
      });
      return toMount.length;
    };

    // 🔴 Tier 1: Critical — staggered 1s apart, starting after 8s idle
    //    (delayed from 3s to avoid competing with DataEngine's initial sync)
    const t1Count = mountSequential(TIER_1_CRITICAL, 1000, 8000);
    console.log(`⚡ [KeepAlive] Tier 1: ${t1Count} critical pages queued (staggered, 8s delay)`);

    // 🟡 Tier 2: Important — staggered 800ms apart, starting after 18s
    const t2Count = mountSequential(TIER_2_IMPORTANT, 800, 18000);
    console.log(`⚡ [KeepAlive] Tier 2: ${t2Count} important pages queued`);

    // 🟢 Tier 3: Secondary — staggered 600ms apart, starting after 28s
    const t3Count = mountSequential(TIER_3_SECONDARY, 600, 28000);
    console.log(`⚡ [KeepAlive] Tier 3: ${t3Count} secondary pages queued`);

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
              // ⚡ Inactive page — keep mounted OFF-SCREEN with real dimensions
              // This fixes ECharts "Can't get DOM width or height" errors
              // because display:none gives elements 0×0 dimensions
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: -1,
              contain: 'strict',
              contentVisibility: 'hidden',
            }}
          >
            <Suspense fallback={isActive ? <PageLoader variant="default" /> : <div />}>
              <Component />
            </Suspense>
          </div>
        );
      })}

      {!currentKey && fallbackElement}
    </>
  );
}
