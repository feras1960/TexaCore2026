/**
 * ════════════════════════════════════════════════════════════
 * 🤖 NexaPro Agent — Context Provider
 * ════════════════════════════════════════════════════════════
 * Global context provider that tracks user's current page/entity,
 * provides NexaPro state management, and warms AI cache on startup.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface NexaEntity {
  type: string;       // 'customer' | 'material' | 'invoice' | 'journal_entry' | ...
  id: string;
  label: string;
  data?: Record<string, any>;
}

interface NexaContextType {
  // Current page detection
  currentPage: string;
  currentPageLabel: string;
  // Current entity in context
  currentEntity: NexaEntity | null;
  // Copilot UI state
  isOpen: boolean;
  hasNewInsight: boolean;
  // Actions
  pushContext: (type: string, id: string, label: string, data?: Record<string, any>) => void;
  clearContext: () => void;
  toggleCopilot: () => void;
  openCopilot: () => void;
  closeCopilot: () => void;
  setHasNewInsight: (v: boolean) => void;
}

const NexaContext = createContext<NexaContextType | null>(null);

// Route → page type mapping
const ROUTE_MAP: Record<string, { type: string; label_ar: string; label_en: string }> = {
  '/dashboard': { type: 'dashboard', label_ar: 'لوحة التحكم', label_en: 'Dashboard' },
  '/sales': { type: 'sales', label_ar: 'المبيعات', label_en: 'Sales' },
  '/purchases': { type: 'purchases', label_ar: 'المشتريات', label_en: 'Purchases' },
  '/accounting': { type: 'accounting', label_ar: 'المحاسبة', label_en: 'Accounting' },
  '/inventory': { type: 'inventory', label_ar: 'المخزون', label_en: 'Inventory' },
  '/materials': { type: 'materials', label_ar: 'الأقمشة', label_en: 'Materials' },
  '/customers': { type: 'customers', label_ar: 'العملاء', label_en: 'Customers' },
  '/suppliers': { type: 'suppliers', label_ar: 'الموردين', label_en: 'Suppliers' },
  '/hr': { type: 'hr', label_ar: 'الموارد البشرية', label_en: 'HR' },
  '/containers': { type: 'containers', label_ar: 'الكونتينرات', label_en: 'Containers' },
  '/pos': { type: 'pos', label_ar: 'نقاط البيع', label_en: 'POS' },
  '/warehouses': { type: 'warehouses', label_ar: 'المستودعات', label_en: 'Warehouses' },
};

export function NexaContextProvider({ children, isAr }: { children: React.ReactNode; isAr: boolean }) {
  const location = useLocation();
  const [currentEntity, setCurrentEntity] = useState<NexaEntity | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewInsight, setHasNewInsight] = useState(false);
  const { companyId } = useAuth();

  // 🔥 Cache + Edge Function Warming on app start
  useEffect(() => {
    if (!companyId) return;
    const cacheKey = `nexa_cache_warmed_${companyId}`;
    if (sessionStorage.getItem(cacheKey)) return; // Already warmed this session
    sessionStorage.setItem(cacheKey, '1');
    console.log('[NexaPro] 🔥 Warming AI cache + Edge Function...');

    // 1. Warm the DB cache
    Promise.resolve(supabase.rpc('refresh_company_insights', { p_company_id: companyId }))
      .then(() => console.log('[NexaPro] ✅ DB Cache warmed!'))
      .catch((e: any) => console.log('[NexaPro] Cache warm failed:', e?.message));

    // 2. Warm the Edge Function (eliminates cold start)
    supabase.functions.invoke('nexa-agent', {
      body: { message: 'ping', language: 'ar', context_type: 'general', complexity: 'flash-lite', company_id: companyId },
    }).then(() => console.log('[NexaPro] ✅ Edge Function warmed!'))
      .catch(() => {/* ignore warm-up errors */});
  }, [companyId]);

  // 🔄 Keep-Alive: ping Edge Function every 4 minutes to prevent cold shutdown
  useEffect(() => {
    if (!companyId) return;
    const KEEP_ALIVE_MS = 4 * 60 * 1000; // 4 minutes
    const interval = setInterval(() => {
      supabase.functions.invoke('nexa-agent', {
        body: { message: 'ping', language: 'ar', context_type: 'general', complexity: 'flash-lite', company_id: companyId },
      }).catch(() => {/* ignore */});
    }, KEEP_ALIVE_MS);
    return () => clearInterval(interval);
  }, [companyId]);

  // Detect current page from route
  const getPageInfo = useCallback(() => {
    const path = location.pathname;
    // Find best match (longest prefix)
    let bestMatch = { type: 'general', label_ar: 'عام', label_en: 'General' };
    let bestLen = 0;
    for (const [route, info] of Object.entries(ROUTE_MAP)) {
      if (path.startsWith(route) && route.length > bestLen) {
        bestMatch = info;
        bestLen = route.length;
      }
    }
    return bestMatch;
  }, [location.pathname]);

  const pageInfo = getPageInfo();
  const currentPage = pageInfo.type;
  const currentPageLabel = isAr ? pageInfo.label_ar : pageInfo.label_en;

  // Clear entity context when route changes
  useEffect(() => {
    setCurrentEntity(null);
  }, [location.pathname]);

  // Push context from any component
  const pushContext = useCallback((type: string, id: string, label: string, data?: Record<string, any>) => {
    setCurrentEntity({ type, id, label, data });
    setHasNewInsight(true);
  }, []);

  const clearContext = useCallback(() => {
    setCurrentEntity(null);
  }, []);

  const toggleCopilot = useCallback(() => {
    setIsOpen(prev => !prev);
    setHasNewInsight(false);
  }, []);

  const openCopilot = useCallback(() => {
    setIsOpen(true);
    setHasNewInsight(false);
  }, []);

  const closeCopilot = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <NexaContext.Provider value={{
      currentPage, currentPageLabel, currentEntity,
      isOpen, hasNewInsight,
      pushContext, clearContext, toggleCopilot, openCopilot, closeCopilot, setHasNewInsight,
    }}>
      {children}
    </NexaContext.Provider>
  );
}

export function useNexaContext() {
  const ctx = useContext(NexaContext);
  if (!ctx) throw new Error('useNexaContext must be used within NexaContextProvider');
  return ctx;
}
