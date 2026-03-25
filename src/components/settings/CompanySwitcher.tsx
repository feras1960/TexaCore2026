/**
 * Company Switcher Component
 * مكون التبديل بين الشركات (الحقيقية والتجريبية)
 * 
 * يُستخدم في صفحة الإعدادات للسماح للمستخدم بالتنقل بين شركاته
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Building2,
  TestTube,
  Check,
  Loader2,
  RefreshCw,
  Info,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface Company {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  business_type: string;
  company_type: 'production' | 'testing';
  is_active: boolean;
  is_current: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const CompanySwitcher: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_companies', {
        p_user_id: user?.id
      });

      if (error) {
        console.error('Error loading companies:', error);
        toast.error(t('settings.companySwitcher.loadError'));
      } else {
        setCompanies(data || []);
      }
    } catch (err) {
      console.error('Load companies error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (companyId: string) => {
    if (!user?.id) return;

    setSwitching(true);
    
    try {
      const { data, error } = await supabase.rpc('switch_user_company', {
        p_user_id: user.id,
        p_new_company_id: companyId
      });

      if (error) {
        console.error('Switch error:', error);
        toast.error(t('settings.companySwitcher.switchError'));
        setSwitching(false);
        return;
      }

      if (data && !data.success) {
        toast.error(data.error || t('settings.companySwitcher.switchError'));
        setSwitching(false);
        return;
      }

      // Success!
      toast.success(t('settings.companySwitcher.switchSuccess'));
      
      // Reload page to apply new company context
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error('Switch company error:', err);
      toast.error(err.message || t('settings.companySwitcher.switchError'));
      setSwitching(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            {t('settings.companySwitcher.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.companySwitcher.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // SINGLE COMPANY - NO NEED TO SHOW
  // ============================================

  if (companies.length <= 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            {t('settings.companySwitcher.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              {t('settings.companySwitcher.singleCompany')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  const currentCompany = companies.find(c => c.is_current);
  const otherCompanies = companies.filter(c => !c.is_current);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" />
          {t('settings.companySwitcher.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.companySwitcher.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Company */}
        {currentCompany && (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {t('settings.companySwitcher.currentCompany')}:
            </p>
            <CompanyCard
              company={currentCompany}
              isCurrent={true}
              onSwitch={handleSwitch}
              switching={switching}
            />
          </div>
        )}

        {/* Other Companies */}
        {otherCompanies.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {t('settings.companySwitcher.availableCompanies')}:
            </p>
            <div className="space-y-2">
              {otherCompanies.map(company => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  isCurrent={false}
                  onSwitch={handleSwitch}
                  switching={switching}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fabric Info */}
        {companies.some(c => c.business_type === 'fabric') && (
          <Alert className="bg-purple-50 border-purple-200">
            <Info className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-sm text-purple-900">
              {t('settings.companySwitcher.fabricInfo')}
            </AlertDescription>
          </Alert>
        )}

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadCompanies}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={cn("w-4 h-4 me-2", loading && "animate-spin")} />
          {t('common.refresh')}
        </Button>
      </CardContent>
    </Card>
  );
};

// ============================================
// COMPANY CARD SUB-COMPONENT
// ============================================

interface CompanyCardProps {
  company: Company;
  isCurrent: boolean;
  onSwitch: (companyId: string) => void;
  switching: boolean;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  isCurrent,
  onSwitch,
  switching
}) => {
  const { t, language } = useLanguage();
  const isProduction = company.company_type === 'production';

  const companyName = language === 'ar' ? company.name_ar : company.name_en;

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all",
        isCurrent
          ? "border-teal-500 bg-teal-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Company Info */}
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className={cn(
            "p-2.5 rounded-lg",
            isProduction
              ? "bg-teal-100 text-teal-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {isProduction ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <TestTube className="w-5 h-5" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">
              {companyName || company.name}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                isProduction
                  ? "bg-teal-100 text-teal-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {t(`settings.companySwitcher.types.${company.company_type}`)}
              </span>
              <span className="text-xs text-gray-500">
                {company.code}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button or Current Badge */}
        {isCurrent ? (
          <div className="flex items-center gap-1.5 text-teal-700 bg-teal-100 px-3 py-1.5 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" />
            {t('settings.companySwitcher.current')}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSwitch(company.id)}
            disabled={switching}
            className="shrink-0"
          >
            {switching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('settings.companySwitcher.switch')
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompanySwitcher;
