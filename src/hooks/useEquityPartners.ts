/**
 * useEquityPartners Hook
 * هوك إدارة شركاء حقوق الملكية
 * يوفر: جلب البيانات + CRUD + الإحصائيات + التحقق من النسب
 */

import { useState, useEffect, useCallback } from 'react';
import { equityPartnersService, EquityPartner, CreatePartnerInput } from '@/services/equityPartnersService';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface UseEquityPartnersReturn {
    // البيانات
    partners: EquityPartner[];
    loading: boolean;
    error: string | null;

    // الإحصائيات
    stats: {
        totalPartners: number;
        totalCapital: number;
        totalCurrentBalance: number;
        totalSalaries: number;
        isBalanced: boolean;
        totalPercentage: number;
    } | null;

    // العمليات
    refresh: () => Promise<void>;
    addPartner: (input: CreatePartnerInput) => Promise<EquityPartner | null>;
    updatePartner: (id: string, updates: Partial<CreatePartnerInput>) => Promise<EquityPartner | null>;
    deletePartner: (id: string) => Promise<boolean>;
    validatePercentage: (percentage: number, excludeId?: string) => Promise<{ valid: boolean; message: string; totalUsed: number }>;
}

export function useEquityPartners(): UseEquityPartnersReturn {
    const [partners, setPartners] = useState<EquityPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<UseEquityPartnersReturn['stats']>(null);

    const { companyId } = useCompany();

    // جلب البيانات
    const refresh = useCallback(async () => {
        if (!companyId) return;

        try {
            setLoading(true);
            setError(null);

            const [partnersData, statsData] = await Promise.all([
                equityPartnersService.getAllWithBalances(companyId),
                equityPartnersService.getStats(companyId),
            ]);

            setPartners(partnersData);
            setStats(statsData);
        } catch (err: any) {
            setError(err.message);
            console.error('خطأ في جلب بيانات الشركاء:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // إضافة شريك
    const addPartner = useCallback(async (input: CreatePartnerInput): Promise<EquityPartner | null> => {
        try {
            const partner = await equityPartnersService.create(input);
            toast.success(`تمت إضافة الشريك: ${partner.name_ar}`);
            await refresh();
            return partner;
        } catch (err: any) {
            toast.error(err.message || 'خطأ في إضافة الشريك');
            return null;
        }
    }, [refresh]);

    // تحديث شريك
    const updatePartner = useCallback(async (id: string, updates: Partial<CreatePartnerInput>): Promise<EquityPartner | null> => {
        try {
            const partner = await equityPartnersService.update(id, updates);
            toast.success(`تم تحديث الشريك: ${partner.name_ar}`);
            await refresh();
            return partner;
        } catch (err: any) {
            toast.error(err.message || 'خطأ في تحديث الشريك');
            return null;
        }
    }, [refresh]);

    // حذف (سحب) شريك
    const deletePartner = useCallback(async (id: string): Promise<boolean> => {
        try {
            await equityPartnersService.delete(id);
            toast.success('تم سحب الشريك');
            await refresh();
            return true;
        } catch (err: any) {
            toast.error(err.message || 'خطأ في سحب الشريك');
            return false;
        }
    }, [refresh]);

    // التحقق من النسبة
    const validatePercentage = useCallback(async (
        percentage: number,
        excludeId?: string
    ) => {
        if (!companyId) {
            return { valid: false, message: 'لم يتم تحديد الشركة', totalUsed: 0 };
        }
        return equityPartnersService.validateSharePercentage(companyId, percentage, excludeId);
    }, [companyId]);

    return {
        partners,
        loading,
        error,
        stats,
        refresh,
        addPartner,
        updatePartner,
        deletePartner,
        validatePercentage,
    };
}
