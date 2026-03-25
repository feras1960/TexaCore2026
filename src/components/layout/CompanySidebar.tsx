/**
 * ════════════════════════════════════════════════════════════════
 * 🏢 CompanySidebar — شريط التنقل بين الشركات
 * ════════════════════════════════════════════════════════════════
 * 
 * بار جانبي ضيق يظهر إذا المستخدم عنده أكثر من شركة.
 * يدعم: التنقل السريع + فتح/إغلاق + إنشاء شركة جديدة.
 * 
 * مبني على تصميم المشروع القديم (ERP-Sytem-12-2025)
 * مع تكييف ليستخدم hooks المشروع الحالي.
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Building2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────
interface CompanyItem {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  business_type: string;
  company_type: 'production' | 'testing';
  is_active: boolean;
  is_current: boolean;
  color: string;
}

// ─── Color palette for companies ─────────────────────────
const COMPANY_COLORS = [
  '#00D4AA', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6',
  '#0EA5E9', '#10B981', '#F97316', '#EC4899', '#14B8A6',
];

// ═════════════════════════════════════════════════════════
export function CompanySidebar() {
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const isAr = language === 'ar';
  const isRtl = direction === 'rtl';

  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('company_sidebar_collapsed') === 'true'; }
    catch { return true; }
  });

  // Save collapsed state
  useEffect(() => {
    try { localStorage.setItem('company_sidebar_collapsed', String(collapsed)); }
    catch {}
  }, [collapsed]);

  // ─── Fetch companies ─────────────────────────────────
  const loadCompanies = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.rpc('get_user_companies', {
        p_user_id: user.id
      });
      if (!error && data) {
        // Assign colors to companies
        const withColors = (data as any[]).map((c, i) => ({
          ...c,
          color: COMPANY_COLORS[i % COMPANY_COLORS.length],
        }));
        setCompanies(withColors);
      }
    } catch (e) {
      console.error('Load companies error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // ─── Switch company ──────────────────────────────────
  const handleSwitch = async (companyId: string) => {
    if (!user?.id || switching) return;
    setSwitching(companyId);

    try {
      const { data, error } = await supabase.rpc('switch_user_company', {
        p_user_id: user.id,
        p_new_company_id: companyId
      });

      if (error || (data && !data.success)) {
        toast.error(isAr ? 'فشل التبديل' : 'Switch failed');
        setSwitching(null);
        return;
      }

      toast.success(isAr ? 'تم التبديل بنجاح' : 'Switched successfully');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error(isAr ? 'حدث خطأ' : 'Error occurred');
      setSwitching(null);
    }
  };

  // ─── Don't render if single company or loading ────────
  if (loading || companies.length <= 1) return null;

  const currentCompany = companies.find(c => c.is_current);
  const otherCompanies = companies.filter(c => !c.is_current);

  const getName = (c: CompanyItem) => isAr ? (c.name_ar || c.name_en) : (c.name_en || c.name_ar);
  const getInitial = (c: CompanyItem) => getName(c).charAt(0);

  // ═══ Collapsed: minimal trigger strip ═══
  if (collapsed) {
    return (
      <div className={cn(
        "fixed top-1/2 -translate-y-1/2 z-50",
        isRtl ? "left-0" : "right-0"
      )}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(false)}
                className={cn(
                  "group flex flex-col items-center justify-center gap-2",
                  "bg-erp-navy/90 hover:bg-erp-navy dark:bg-gray-900/90 dark:hover:bg-gray-900",
                  "backdrop-blur-sm transition-all duration-300 ease-out",
                  "shadow-lg hover:shadow-xl cursor-pointer",
                  "w-8 hover:w-10 py-6",
                  isRtl ? "rounded-r-xl" : "rounded-l-xl"
                )}
              >
                {/* Company dots */}
                <div className="flex flex-col gap-1.5 my-1">
                  {companies.slice(0, 4).map((company) => (
                    <div
                      key={company.id}
                      className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{
                        backgroundColor: company.color,
                        boxShadow: company.is_current ? `0 0 8px ${company.color}` : 'none',
                      }}
                    />
                  ))}
                  {companies.length > 4 && (
                    <span className="text-white/50 text-[7px] text-center">+{companies.length - 4}</span>
                  )}
                </div>

                {/* Expand Arrow */}
                <div className="text-white/50 group-hover:text-erp-teal transition-colors">
                  {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side={isRtl ? 'right' : 'left'} className="font-tajawal">
              {isAr ? 'فتح شريط الشركات' : 'Open company bar'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // ═══ Expanded: full company sidebar ═══
  return (
    <div className={cn(
      "fixed top-1/2 -translate-y-1/2 z-50",
      isRtl ? "left-0" : "right-0"
    )}>
      <div className={cn(
        "flex flex-col bg-erp-navy dark:bg-gray-900 transition-all duration-300 ease-in-out shadow-2xl max-h-[80vh]",
        isRtl ? "rounded-r-2xl" : "rounded-l-2xl",
        "w-[76px]"
      )}>
        {/* Header — Brand + Collapse */}
        <div className="p-2.5 border-b border-white/10 flex flex-col items-center">
          <div className="text-center">
            <h1 className="text-erp-teal font-bold text-[11px] tracking-wider">
              TEXA<span className="text-white">CORE</span>
            </h1>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(true)}
                  className="text-white/60 hover:text-white hover:bg-white/10 h-5 w-5 mt-1.5"
                >
                  {isRtl ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isRtl ? 'right' : 'left'}>
                {isAr ? 'إخفاء' : 'Hide'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Companies List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {companies.map((company) => (
              <TooltipProvider key={company.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => !company.is_current && handleSwitch(company.id)}
                      className={cn(
                        "relative group cursor-pointer rounded-xl transition-all duration-200",
                        "flex flex-col items-center justify-center p-2",
                        company.is_current
                          ? "bg-white/15 shadow-lg scale-105"
                          : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {/* Active Indicator */}
                      {company.is_current && (
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-all",
                            isRtl ? "-right-1" : "-left-1"
                          )}
                          style={{ backgroundColor: company.color }}
                        />
                      )}

                      {/* Company Icon */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg font-cairo transition-all",
                          company.is_current ? "shadow-md" : "",
                          switching === company.id ? "animate-pulse" : ""
                        )}
                        style={{
                          backgroundColor: company.color,
                          boxShadow: company.is_current
                            ? `0 4px 12px ${company.color}50`
                            : 'none'
                        }}
                      >
                        {switching === company.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          getInitial(company)
                        )}
                      </div>

                      {/* Company Name */}
                      <span
                        className="mt-1 text-[9px] text-white/80 text-center leading-tight line-clamp-2 max-w-full px-0.5"
                        style={{
                          color: company.is_current ? company.color : undefined
                        }}
                      >
                        {getName(company).split(' ').slice(0, 2).join(' ')}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={isRtl ? 'right' : 'left'} className="font-tajawal">
                    <p className="font-bold">{getName(company)}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.is_current
                        ? (isAr ? '✅ الشركة الحالية' : '✅ Current')
                        : (isAr ? 'انقر للتبديل' : 'Click to switch')
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>

        {/* Separator */}
        <div className="mx-3 border-t border-white/10" />

        {/* Create New Company */}
        <div className="p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full text-erp-teal hover:text-erp-teal hover:bg-erp-teal/10 border border-dashed border-erp-teal/40 h-auto py-2 flex-col gap-1 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[9px]">{isAr ? 'شركة جديدة' : 'New'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isRtl ? 'right' : 'left'}>
                {isAr ? 'إنشاء شركة جديدة' : 'Create new company'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Footer — Settings */}
        <div className="p-2 border-t border-white/10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full text-white/40 hover:text-white hover:bg-white/10 h-auto py-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isRtl ? 'right' : 'left'}>
                {isAr ? 'إعدادات الشركات' : 'Company settings'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default CompanySidebar;
