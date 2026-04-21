/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 ExchangeBranches — تبويب الفروع
 * ════════════════════════════════════════════════════════════════
 * V1 — Cards + NexaListTable toggle — يستخدم branchesService الموجود
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { branchesService, type Branch } from '@/services/branchesService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Building, MapPin, Phone, Users, Wallet,
  Star, Plus, Search, LayoutGrid, List,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
export default function ExchangeBranches() {
  const { t, language } = useLanguage();
  const { companyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // ─── Fetch branches ─────────────────────────────────────────
  const { data: branches = [], isLoading } = useCachedQuery({
    queryKey: ['exchange_branches', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return branchesService.getBranches(companyId);
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // ─── Filter ─────────────────────────────────────────────────
  const filteredBranches = useMemo(() => {
    if (!searchTerm.trim()) return branches;
    const q = searchTerm.toLowerCase();
    return branches.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.name_en || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.phone || '').includes(q)
    );
  }, [branches, searchTerm]);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: branches.length,
    active: branches.filter(b => b.is_active).length,
    main: branches.filter(b => b.is_main).length,
  }), [branches]);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 border-indigo-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-600/70 font-tajawal">{t('exchange.branches.totalBranches')}</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-indigo-500/10 rounded-xl"><Building className="w-5 h-5 text-indigo-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 font-tajawal">{t('exchange.branches.activeBranches')}</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl"><Users className="w-5 h-5 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600/70 font-tajawal">{t('exchange.branches.mainBranch')}</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.main}</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl"><Star className="w-5 h-5 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('exchange.branches.searchPlaceholder')}
            className="w-full h-9 ps-9 pe-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === 'cards' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === 'list' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" />
            {t('exchange.branches.newBranch')}
          </Button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <Building className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">{t('exchange.branches.noBranches')}</p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'cards'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
        )}>
          {filteredBranches.map((branch) => (
            <Card
              key={branch.id}
              className={cn(
                "group cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700",
                branch.is_main && "ring-1 ring-amber-200 dark:ring-amber-800",
                !branch.is_active && "opacity-60"
              )}
            >
              <CardContent className={cn(
                viewMode === 'cards' ? "p-5" : "p-3 flex items-center gap-4"
              )}>
                {/* Header */}
                <div className={cn("flex items-start justify-between", viewMode === 'list' && "flex-1")}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      branch.is_main
                        ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30"
                        : "bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30"
                    )}>
                      <Building className={cn("w-5 h-5", branch.is_main ? "text-amber-600" : "text-indigo-600")} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {branch.name}
                        </h3>
                        {branch.is_main && (
                          <Badge className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200" variant="outline">
                            <Star className="w-2.5 h-2.5 me-0.5" />
                            {t('exchange.branches.main')}
                          </Badge>
                        )}
                      </div>
                      {branch.name_en && language === 'ar' && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{branch.name_en}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      branch.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    )}
                  >
                    {branch.is_active ? t('exchange.status.active') : t('exchange.status.inactive')}
                  </Badge>
                </div>

                {/* Details */}
                {viewMode === 'cards' && (
                  <div className="mt-4 space-y-2">
                    {(branch.city || branch.country) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{[branch.city, branch.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span dir="ltr">{branch.phone}</span>
                      </div>
                    )}
                    
                    {/* Counts */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>{branch.users_count || 0} {t('exchange.branches.employees')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{branch.warehouses_count || 0} {t('exchange.branches.warehouses')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      {!isLoading && filteredBranches.length > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {t('exchange.common.showing')} {filteredBranches.length} {t('exchange.common.of')} {branches.length} {t('exchange.branches.countLabel')}
        </div>
      )}
    </div>
  );
}
