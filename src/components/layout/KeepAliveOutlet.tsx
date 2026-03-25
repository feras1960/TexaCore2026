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

// Prefetch priority order (most-used pages first)
const PREFETCH_ORDER = [
  '/', '/accounting', '/sales', '/purchases', '/warehouse',
  '/crm', '/hr', '/ecommerce', '/ai-analytics', '/inspiration-studio',
  '/system-config', '/users-permissions', '/workflows',
  '/saas', '/fabric', '/pharmacy', '/healthcare',
  '/doctors', '/restaurant', '/gold', '/website', '/exchange',
  '/activity-log', '/profile',
  '/dev/charts-lab',
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

  // ⚡ Background Prefetch — load ALL pages after initial idle
  useEffect(() => {
    if (prefetchStarted.current) return;
    prefetchStarted.current = true;

    // Wait 3 seconds for the current page to fully load and settle
    const startDelay = setTimeout(() => {
      let index = 0;

      const prefetchNext = () => {
        if (index >= PREFETCH_ORDER.length) return;

        const routeKey = PREFETCH_ORDER[index];
        index++;

        // Skip if already mounted or same as current
        if (mountedRoutes.has(routeKey)) {
          prefetchNext(); // Skip to next immediately
          return;
        }

        // Use requestIdleCallback to avoid blocking UI
        const schedule = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 50));
        schedule(() => {
          setMountedRoutes(prev => new Set(prev).add(routeKey));
          // Stagger: wait 800ms before prefetching next page
          setTimeout(prefetchNext, 800);
        });
      };

      prefetchNext();
    }, 3000);

    return () => clearTimeout(startDelay);
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
