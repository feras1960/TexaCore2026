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
  '/users-permissions': () => import('@/features/users-permissions/UsersPermissionsPage'),
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

  // ⚡ 3-Tier Parallel Prefetch — Critical pages load FAST
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Helper: mount a batch of routes in parallel
    const mountBatch = (routes: string[]) => {
      const toMount = routes.filter(r => ROUTE_MAP[r] && !mountedRoutes.has(r));
      if (toMount.length === 0) return;
      setMountedRoutes(prev => {
        const next = new Set(prev);
        toMount.forEach(r => next.add(r));
        return next;
      });
    };

    // 🔴 Tier 1: Critical — ALL in parallel after 1.5s
    timeouts.push(setTimeout(() => {
      mountBatch(TIER_1_CRITICAL);
      console.log(`⚡ [KeepAlive] Tier 1: ${TIER_1_CRITICAL.length} critical pages loaded in parallel`);
    }, 1500));

    // 🟡 Tier 2: Important — ALL in parallel after 4s
    timeouts.push(setTimeout(() => {
      mountBatch(TIER_2_IMPORTANT);
      console.log(`⚡ [KeepAlive] Tier 2: ${TIER_2_IMPORTANT.length} important pages loaded in parallel`);
    }, 4000));

    // 🟢 Tier 3: Secondary — sequential with 500ms gaps after 8s
    timeouts.push(setTimeout(() => {
      let index = 0;
      const loadNext = () => {
        if (index >= TIER_3_SECONDARY.length) {
          console.log(`⚡ [KeepAlive] Tier 3: All secondary pages loaded`);
          return;
        }
        const routeKey = TIER_3_SECONDARY[index];
        index++;
        if (!ROUTE_MAP[routeKey] || mountedRoutes.has(routeKey)) {
          loadNext();
          return;
        }
        const schedule = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 50));
        schedule(() => {
          setMountedRoutes(prev => new Set(prev).add(routeKey));
          setTimeout(loadNext, 500);
        });
      };
      loadNext();
    }, 8000));

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
            className={isActive ? 'block' : 'hidden'}
            style={{
              contain: isActive ? 'none' : 'strict',
              contentVisibility: isActive ? 'visible' : 'hidden',
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
