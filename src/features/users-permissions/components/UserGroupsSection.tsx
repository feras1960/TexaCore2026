/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ UserGroupsSection — مجموعات المستخدمين + مصفوفة الصلاحيات
 * ════════════════════════════════════════════════════════════════
 *
 * Unified view with company filter:
 * - Company selector at top (for multi-company tenants)
 * - Section 1: Role cards with CRUD
 * - Section 2: Special permissions matrix
 *
 * Hierarchy:
 * - tenant_owner (مالك الحساب): Full access to ALL companies
 * - company_owner (مالك الشركة): Full access to SELECTED company only
 * - Other roles: Scoped to selected company
 *
 * @module features/users-permissions/components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { companiesService } from '@/services/companiesService';
import RolesManagementTab from '@/features/settings/components/RolesManagementTab';
import SpecialPermissionsTab from './SpecialPermissionsTab';

interface CompanyOption {
    id: string;
    name: string;
    name_en?: string | null;
}

export default function UserGroupsSection() {
    const { language } = useLanguage();
    const { authUser } = useAuth();
    const isAr = language === 'ar';
    const tenantId = authUser?.tenant_id;

    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

    // Load companies for the tenant
    useEffect(() => {
        async function loadCompanies() {
            if (!tenantId) return;
            try {
                const comps = await companiesService.getByTenantId(tenantId);
                setCompanies(comps.map(c => ({
                    id: c.id,
                    name: c.name,
                    name_en: c.name_en,
                })));
                // If only 1 company, auto-select it
                if (comps.length === 1) {
                    setSelectedCompanyId(comps[0].id);
                }
            } catch (err) {
                console.error('Failed to load companies:', err);
            }
        }
        loadCompanies();
    }, [tenantId]);

    const selectedCompanyName = useMemo(() => {
        if (selectedCompanyId === 'all') return isAr ? 'كل الشركات' : 'All Companies';
        const comp = companies.find(c => c.id === selectedCompanyId);
        return comp ? (isAr ? comp.name : (comp.name_en || comp.name)) : '';
    }, [selectedCompanyId, companies, isAr]);

    return (
        <div className="space-y-6">
            {/* ─── Company Filter Bar ─────────────────────────────── */}
            {companies.length > 1 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 border border-gray-200 dark:border-gray-700">
                    <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-tajawal">
                            {isAr ? 'فلترة حسب الشركة:' : 'Filter by company:'}
                        </span>
                    </div>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-[250px] h-9 text-sm font-tajawal bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue placeholder={isAr ? 'اختر الشركة' : 'Select company'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-tajawal">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-teal-600" />
                                    <span>{isAr ? 'كل الشركات' : 'All Companies'}</span>
                                </div>
                            </SelectItem>
                            {companies.map(comp => (
                                <SelectItem key={comp.id} value={comp.id} className="font-tajawal">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-500" />
                                        <span>{isAr ? comp.name : (comp.name_en || comp.name)}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedCompanyId !== 'all' && (
                        <Badge variant="outline" className="font-tajawal text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-700">
                            {selectedCompanyName}
                        </Badge>
                    )}
                </div>
            )}

            {/* ─── Info Banner for tenant_owner ────────────────────── */}
            {selectedCompanyId === 'all' && companies.length > 1 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-tajawal px-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    {isAr
                        ? '👑 مالك الحساب يملك صلاحيات كاملة على كل الشركات — مالك الشركة صلاحياته محدودة بالشركة المحددة'
                        : '👑 Account Owner has full access to all companies — Company Owner is scoped to the selected company'}
                </div>
            )}

            {/* ─── Section 1: Role Management ──────────────────────── */}
            <RolesManagementTab />

            {/* ─── Divider ──────────────────────────────────────────── */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* ─── Section 2: Special Permissions Matrix ────────────── */}
            <SpecialPermissionsTab />
        </div>
    );
}
