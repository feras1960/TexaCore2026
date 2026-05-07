/**
 * ════════════════════════════════════════════════════════════════
 * 🤝 CRM Module — تعريف بيانات إدارة الزبائن لـ DataEngine
 * ════════════════════════════════════════════════════════════════
 *
 * يُعرّف كل الـ queries الخاصة بقسم CRM.
 * QueryKeys يجب أن تتطابق تماماً مع ما تستخدمه الصفحات.
 *
 * ════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { contactsService } from '@/services/contactsService';
import type { DataModule } from '../DataEngine';
import { CACHE_TIMES } from '../DataEngine';

export const crmModule: DataModule = {
  code: 'crm',
  label: { ar: 'إدارة الزبائن', en: 'CRM' },
  queries: [
    // ─── 1. Contacts List (no filters — base list) ──────────
    {
      queryKey: ['crm_contacts', null, {}],
      queryFn: async (companyId: string) => {
        return contactsService.getContacts(companyId, {});
      },
      staleTime: CACHE_TIMES.SEMI_STATIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 2. Pipeline Stats ──────────────────────────────────
    {
      queryKey: ['crm_pipeline_stats', null],
      queryFn: async (companyId: string) => {
        return contactsService.getPipelineStats(companyId);
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },

    // ─── 3. Pipeline Deals (recent 3 months — preload) ──────
    {
      queryKey: ['crm_pipeline_deals', null, undefined, undefined],
      queryFn: async (companyId: string) => {
        // Lightweight preload — the full pipeline fetch is expensive,
        // so we just seed the cache with an empty array.
        // The page will refetch with date range when opened.
        return [];
      },
      staleTime: CACHE_TIMES.DYNAMIC,
      gcTime: CACHE_TIMES.GC,
    },
  ],
};

/**
 * Patch query keys: replace `null` with actual companyId
 */
export function resolveCrmQueries(companyId: string): DataModule {
  return {
    ...crmModule,
    queries: crmModule.queries.map(q => ({
      ...q,
      queryKey: q.queryKey.map(k => k === null ? companyId : k),
    })),
  };
}
