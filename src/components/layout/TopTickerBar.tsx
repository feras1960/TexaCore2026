/**
 * ════════════════════════════════════════════════════════════════
 * 📢 TopTickerBar — Smart Ticker Bar  
 * ════════════════════════════════════════════════════════════════
 * 
 * Priority hierarchy:
 *   1. Platform announcements (urgent → static, others → scroll)
 *   2. Security alerts (MFA)
 *   3. Exchange rates + welcome (default scroll)
 *
 * Animation: exact same as texacore-astro/AnnouncementBar.tsx
 *   - inline-block + translateX(-33.33%) + 3 copies
 *   - #047857, Inter font, 14px, font-medium
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Lock, AlertTriangle, Info, Wrench, Sparkles, Gift, Scale, Settings } from 'lucide-react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { ExchangeRatesService, type ExchangeRate } from '@/services/data/ExchangeRatesService';
import { ExchangeRateOnlineService } from '@/services/data/ExchangeRateOnlineService';
import { PlatformAnnouncementsService, type PlatformAnnouncement } from '@/services/saas/platformAnnouncementsService';
import { CompanyAnnouncementsService, type CompanyAnnouncement } from '@/services/data/companyAnnouncementsService';
import { TickerKPIsService, type TickerKPIs } from '@/services/data/tickerKPIsService';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ─── Constants ─────────────────────────────────────────────────
const TICKER_HIDDEN_KEY = 'ticker_hidden';
const MFA_DISMISS_KEY = 'ticker_mfa_dismissed_at';
const MFA_REMIND_DAYS = 7;
const ANIMATION_SPEED = 30;

// ─── Icon map ──────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  info: Info,
  maintenance: Wrench,
  feature: Sparkles,
  promotion: Gift,
  legal: Scale,
  lock: Lock,
};

// ─── Component ─────────────────────────────────────────────────
export function TopTickerBar() {
  const { language } = useLanguage();
  const { user, tenantId, isSuperAdmin } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const isRTL = ['ar'].includes(language);

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [liveEurUsd, setLiveEurUsd] = useState<number | null>(null);
  const [hasMfa, setHasMfa] = useState<boolean | null>(null);
  const [platformAnnouncements, setPlatformAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [companyAnnouncements, setCompanyAnnouncements] = useState<CompanyAnnouncement[]>([]);
  const [kpis, setKpis] = useState<TickerKPIs | null>(null);
  const [isHidden, setIsHidden] = useState(() => {
    try { return localStorage.getItem(TICKER_HIDDEN_KEY) === 'true'; } catch { return false; }
  });

  // ─── Deferred parallel load — yields to main page first ─────
  useEffect(() => {
    if (!user?.id) return;
    
    const loadTickerData = async () => {
      const companyId = company?.id;
      const tId = tenantId;
      
      await Promise.allSettled([
        // 1. Platform announcements
        PlatformAnnouncementsService.getActiveForUser(user.id)
          .then(setPlatformAnnouncements)
          .catch(() => {}),
        
        // 2. Company exchange rates
        companyId 
          ? ExchangeRatesService.getRates(companyId).then(setRates).catch(() => {})
          : Promise.resolve(),
        
        // 3. Live EUR/USD from external API
        ExchangeRateOnlineService.getRate('EUR', 'USD')
          .then(r => { if (r && r > 0) setLiveEurUsd(r); })
          .catch(() => {}),
        
        supabase.auth.mfa.listFactors()
          .then(({ data }) => setHasMfa(data?.totp?.some(f => f.status === 'verified') ?? false))
          .catch(() => setHasMfa(null)),

        companyId
          ? CompanyAnnouncementsService.getActive(companyId).then(setCompanyAnnouncements).catch(() => {})
          : Promise.resolve(),

        // 6. KPIs via RPC (needs tenant_id, not company_id)
        tId
          ? TickerKPIsService.getKPIs(tId).then(setKpis).catch(() => {})
          : Promise.resolve(),
      ]);
    };

    // Defer: let the main page content load first
    const timer = setTimeout(loadTickerData, 500);
    
    // Refresh rates periodically
    const iv = company?.id 
      ? setInterval(() => {
          ExchangeRatesService.getRates(company.id, true).then(setRates).catch(() => {});
        }, 5 * 60 * 1000)
      : undefined;

    return () => { clearTimeout(timer); if (iv) clearInterval(iv); };
  }, [user?.id, company?.id, tenantId]);

  // ─── Priority: find TOP announcement (urgent > others) ─────
  const topAnnouncement = useMemo(() => {
    if (!platformAnnouncements.length) return null;
    // Urgent announcements first, then by priority
    const sorted = [...platformAnnouncements].sort((a, b) => {
      if (a.announcement_type === 'urgent' && b.announcement_type !== 'urgent') return -1;
      if (b.announcement_type === 'urgent' && a.announcement_type !== 'urgent') return 1;
      return b.priority - a.priority;
    });
    return sorted[0];
  }, [platformAnnouncements]);

  // ─── Security (MFA) item ───────────────────────────────────
  const securityItem = useMemo(() => {
    if (topAnnouncement) return null; // Platform announcements take priority
    if (hasMfa !== false) return null;
    const ts = localStorage.getItem(MFA_DISMISS_KEY);
    if (ts && (Date.now() - parseInt(ts)) < MFA_REMIND_DAYS * 86400000) return null;
    return {
      id: 'mfa_reminder',
      text: isAr
        ? '🔐 التحقق بخطوتين غير مفعّل — قم بتفعيله لحماية حسابك'
        : '🔐 Two-factor authentication is not enabled — Enable it to secure your account',
      ctaText: isAr ? 'فعّل الآن' : 'Enable Now',
      ctaLink: '/profile/security',
    };
  }, [hasMfa, isAr, topAnnouncement]);

  // ─── Build ticker text (rates + welcome) ────────────────────
  const tickerText = useMemo(() => {
    if (topAnnouncement || securityItem) return ''; // Not needed when announcement/security showing
    
    const local = company?.default_currency || 'TRY';
    const parts: string[] = [];

    // Platform announcements that are scroll-type (non-urgent)
    platformAnnouncements
      .filter(a => a.announcement_type !== 'urgent')
      .forEach(a => {
        const msg = isAr ? a.message_ar : a.message_en;
        if (msg) parts.push(`📢 ${msg}`);
      });

    // Company announcements
    companyAnnouncements
      .filter(a => a.announcement_type !== 'urgent')
      .forEach(a => {
        const msg = isAr ? a.message_ar : a.message_en;
        if (msg) parts.push(`📋 ${msg}`);
      });

    if (rates.length > 0) {
      const seen = new Map<string, ExchangeRate>();
      rates.forEach(r => {
        const k = `${r.from_currency}-${r.to_currency}`;
        if (!seen.has(k)) seen.set(k, r);
      });

      const getRate = (from: string, to: string) => {
        const direct = seen.get(`${from}-${to}`);
        if (direct) return direct.buy_rate || direct.mid_rate || 0;
        const inv = seen.get(`${to}-${from}`);
        if (inv) {
          const v = inv.buy_rate || inv.mid_rate || 0;
          return v > 0 ? 1 / v : 0;
        }
        return 0;
      };

      const usdRate = getRate('USD', local);
      if (usdRate > 0) parts.push(`💱 USD = ${usdRate.toFixed(2)} ${local}`);

      const eurRate = getRate('EUR', local);
      if (eurRate > 0) parts.push(`💱 EUR = ${eurRate.toFixed(2)} ${local}`);
    }

    if (liveEurUsd && liveEurUsd > 0) {
      parts.push(`💱 1 EUR = ${liveEurUsd.toFixed(4)} USD`);
    }

    // KPIs — only show non-zero values
    if (kpis) {
      if (kpis.pending_sales_orders > 0) {
        parts.push(isAr 
          ? `📦 ${kpis.pending_sales_orders} طلبات بيع معلقة`
          : `📦 ${kpis.pending_sales_orders} pending orders`);
      }
      if (kpis.unpaid_invoices > 0) {
        parts.push(isAr
          ? `📄 ${kpis.unpaid_invoices} فواتير غير محصلة`
          : `📄 ${kpis.unpaid_invoices} unpaid invoices`);
      }
      if (kpis.pending_purchases > 0) {
        parts.push(isAr
          ? `🛒 ${kpis.pending_purchases} طلبات شراء معلقة`
          : `🛒 ${kpis.pending_purchases} pending purchases`);
      }
      if (kpis.today_sales_count > 0) {
        parts.push(isAr
          ? `📊 ${kpis.today_sales_count} فاتورة اليوم`
          : `📊 ${kpis.today_sales_count} invoices today`);
      }
    }

    if (user?.email) {
      const name = user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.email?.split('@')[0] || '';
      if (name) parts.push(isAr ? `👋 مرحباً ${name}` : `👋 Welcome ${name}`);
    }

    return parts.join('     ·     ');
  }, [rates, liveEurUsd, user, isAr, company?.default_currency, topAnnouncement, securityItem, platformAnnouncements, companyAnnouncements, kpis]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleDismissAnnouncement = useCallback(async (announcement: PlatformAnnouncement) => {
    if (!user?.id || !announcement.is_dismissable) return;
    try {
      await PlatformAnnouncementsService.dismiss(announcement.id, user.id);
      setPlatformAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    } catch { /* silent */ }
  }, [user?.id]);

  const handleDismissMfa = useCallback(() => {
    localStorage.setItem(MFA_DISMISS_KEY, String(Date.now()));
    setHasMfa(null); // Hides the security item
  }, []);

  const handleHide = useCallback(() => {
    setIsHidden(true);
    localStorage.setItem(TICKER_HIDDEN_KEY, 'true');
  }, []);

  // ─── Visibility ────────────────────────────────────────────
  if (isHidden || (!topAnnouncement && !securityItem && !tickerText)) return null;

  // ─── Determine bar config ─────────────────────────────────
  const bgColor = topAnnouncement 
    ? topAnnouncement.bg_color 
    : securityItem 
      ? '#ea580c' 
      : '#047857';
  
  const textColor = topAnnouncement?.text_color || '#ffffff';
  const isStatic = topAnnouncement?.animation_type === 'static' 
    || topAnnouncement?.announcement_type === 'urgent'
    || !!securityItem;

  const IconComponent = topAnnouncement 
    ? (ICON_MAP[topAnnouncement.icon] || ICON_MAP[topAnnouncement.announcement_type] || Info)
    : securityItem ? Lock : null;

  // Build static text for announcement
  const staticText = topAnnouncement 
    ? (isAr ? topAnnouncement.message_ar : topAnnouncement.message_en)
    : securityItem?.text || '';

  const ctaText = topAnnouncement
    ? (isAr ? topAnnouncement.cta_text_ar : topAnnouncement.cta_text_en)
    : securityItem?.ctaText;

  const ctaLink = topAnnouncement?.cta_link || securityItem?.ctaLink;

  return (
    <>
      {/* ═══ EXACT same animation as texacore-astro ═══ */}
      <style>{`
        @keyframes announcementScroll {
          0% { transform: translateX(${isRTL ? '-33.33%' : '0%'}); }
          100% { transform: translateX(${isRTL ? '0%' : '-33.33%'}); }
        }
      `}</style>

      <div
        className={cn(
          'relative w-full py-2.5 px-4 text-center font-medium z-50 shrink-0',
          isRTL ? 'rtl' : 'ltr'
        )}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          fontFamily: "'Inter', 'Tajawal', sans-serif",
          fontSize: '14px',
        }}
      >
        {isStatic ? (
          /* ── Static announcement / security alert ─────────── */
          <div className="container mx-auto flex items-center justify-center gap-3 overflow-hidden">
            {IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0 animate-pulse" />}
            <span>{staticText}</span>
            {ctaText && ctaLink && (
              <button
                onClick={() => navigate(ctaLink)}
                className="underline underline-offset-2 hover:opacity-90 transition-opacity font-semibold whitespace-nowrap"
              >
                {ctaText}
              </button>
            )}
            {/* Dismiss button */}
            {(topAnnouncement?.is_dismissable || securityItem) && (
              <button
                onClick={() => topAnnouncement 
                  ? handleDismissAnnouncement(topAnnouncement)
                  : handleDismissMfa()
                }
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* ── Scrolling — texacore.ai pattern ──────────────── */
          <div className="container mx-auto flex items-center justify-center overflow-hidden">
            <div className="overflow-hidden w-full">
              <div
                className="whitespace-nowrap inline-block"
                style={{ animation: `announcementScroll ${ANIMATION_SPEED}s linear infinite` }}
              >
                <span className="inline-flex items-center gap-3 mx-8"><span>{tickerText}</span></span>
                <span className="inline-flex items-center gap-3 mx-8"><span>{tickerText}</span></span>
                <span className="inline-flex items-center gap-3 mx-8"><span>{tickerText}</span></span>
              </div>
            </div>
          </div>
        )}

        {/* End buttons for scrolling mode */}
        {!isStatic && (
          <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {/* Settings — admin only */}
            {(isSuperAdmin || user?.user_metadata?.role === 'tenant_owner' || user?.user_metadata?.role === 'company_admin') && (
              <button
                onClick={() => navigate(isSuperAdmin ? '/saas' : '/system-config/announcements')}
                className="p-1 rounded-full hover:bg-white/20 transition-colors opacity-40 hover:opacity-100"
                title={isAr ? 'إعدادات الشريط' : 'Ticker Settings'}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Hide */}
            <button
              onClick={handleHide}
              className="p-1 rounded-full hover:bg-white/20 transition-colors opacity-40 hover:opacity-100"
              title={isAr ? 'إخفاء' : 'Hide'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default TopTickerBar;
