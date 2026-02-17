/**
 * useTradePermissions Hook - صلاحيات المستندات التجارية
 * 
 * @description يحدد ما يمكن لكل دور رؤيته وفعله في الفواتير والكونتينرات
 * 
 * يعتمد على useRBAC الأساسي ويضيف طبقة أعمال تجارية:
 * - إخفاء الأعمدة الحساسة (أسعار التكلفة، هوامش الربح)
 * - تحديد الأفعال المسموحة (حذف، ترحيل، تعديل سعر)
 * - التحكم بالعناصر المرئية حسب نوع المستند
 */

import { useMemo } from 'react';
import { useRBAC } from '@/hooks/useRBAC';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ColumnVisibility {
    /** سعر الوحدة - مرئي لمعظم الأدوار */
    unit_price: boolean;
    /** سعر التكلفة / سعر المورد - حساس */
    cost_price: boolean;
    /** هامش الربح - حساس جداً */
    profit_margin: boolean;
    /** إجمالي التكلفة - حساس */
    total_cost: boolean;
    /** الخصم - مرئي للمديرين والمحاسبين */
    discount: boolean;
    /** الضريبة */
    tax: boolean;
    /** سعر المورد في الكونتينر */
    supplier_price: boolean;
    /** مصاريف الشحن */
    shipping_cost: boolean;
    /** المصاريف الإضافية */
    expenses: boolean;
    /** الربح الصافي */
    net_profit: boolean;
}

export interface ActionPermissions {
    /** يمكنه الحذف */
    canDelete: boolean;
    /** يمكنه الترحيل */
    canPost: boolean;
    /** يمكنه إلغاء الترحيل */
    canUnpost: boolean;
    /** يمكنه التعديل */
    canEdit: boolean;
    /** يمكنه تعديل الأسعار */
    canEditPrice: boolean;
    /** يمكنه إعطاء خصم */
    canApplyDiscount: boolean;
    /** يمكنه تعديل فاتورة مرحّلة */
    canEditPosted: boolean;
    /** يمكنه النسخ/التكرار */
    canDuplicate: boolean;
    /** يمكنه الطباعة */
    canPrint: boolean;
    /** يمكنه التصدير */
    canExport: boolean;
    /** يمكنه تأكيد المستند */
    canConfirm: boolean;
}

export interface TradePermissions {
    /** رؤية الأعمدة */
    columns: ColumnVisibility;
    /** صلاحيات الأفعال */
    actions: ActionPermissions;
    /** هل هو مدير (admin/tenant_owner) */
    isManager: boolean;
    /** هل هو محاسب */
    isAccountant: boolean;
    /** هل هو مندوب مبيعات */
    isSales: boolean;
    /** هل هو مدير مبيعات */
    isSalesManager: boolean;
    /** هل هو مدير مشتريات */
    isPurchasingManager: boolean;
    /** هل هو موظف عادي */
    isEmployee: boolean;
    /** جاهز (تم تحميل الصلاحيات) */
    ready: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Role Hierarchy (from most to least privileged)
// ═══════════════════════════════════════════════════════════════
// super_admin       → يرى كل شيء، يفعل كل شيء
// tenant_owner      → صاحب المنشأة — يرى كل شيء
// company_admin     → مدير الشركة — يرى كل شيء
// accountant        → المحاسب — يرى الأسعار والتكاليف
// purchasing_manager → مدير المشتريات — يرى أسعار الموردين
// sales_manager     → مدير المبيعات — يرى أسعار البيع + هوامش
// sales_rep         → مندوب مبيعات — يرى أسعار البيع فقط
// warehouse_manager → مدير المستودع — لا يرى الأسعار
// employee          → موظف عادي — أقل صلاحيات

// ═══════════════════════════════════════════════════════════════
// Hook Implementation
// ═══════════════════════════════════════════════════════════════

export function useTradePermissions(context?: {
    tradeMode?: 'sales' | 'purchase';
    docType?: string;
    docStatus?: string;
}): TradePermissions {
    const { hasRole, hasAnyRole, isAdmin, loading } = useRBAC();

    return useMemo(() => {
        // Role detection
        const isSuperAdmin = hasRole('super_admin');
        const isTenantOwner = hasRole('tenant_owner');
        const isCompanyAdmin = hasRole('company_admin');
        const isManager = isSuperAdmin || isTenantOwner || isCompanyAdmin;
        const isAccountant = hasRole('accountant') || isManager;
        const isPurchasingManager = hasRole('purchasing_manager') || isManager;
        const isSalesManager = hasRole('sales_manager') || isManager;
        const isSales = hasRole('sales_rep') || isSalesManager;
        const isWarehouse = hasRole('warehouse_manager');
        const isEmployee = !isManager && !isAccountant && !isSales && !isPurchasingManager;

        // ─────────────────────────────────────────────────────
        // Column Visibility Rules
        // ─────────────────────────────────────────────────────
        const columns: ColumnVisibility = {
            // سعر الوحدة — الكل يراه إلا الموظف العادي ومدير المستودع
            unit_price: !isEmployee || isWarehouse,

            // سعر التكلفة — فقط المدير والمحاسب ومدير المشتريات
            cost_price: isManager || isAccountant || isPurchasingManager,

            // هامش الربح — فقط المدير ومدير المبيعات
            profit_margin: isManager || isSalesManager,

            // إجمالي التكلفة — فقط المدير والمحاسب
            total_cost: isManager || isAccountant,

            // الخصم — المدير والمحاسب ومدير المبيعات
            discount: isManager || isAccountant || isSalesManager,

            // الضريبة — الكل يراها
            tax: true,

            // سعر المورد (في الكونتينر) — فقط المدير والمحاسب ومدير المشتريات
            supplier_price: isManager || isAccountant || isPurchasingManager,

            // مصاريف الشحن — المدير والمحاسب ومدير المشتريات
            shipping_cost: isManager || isAccountant || isPurchasingManager,

            // المصاريف الإضافية — المدير والمحاسب
            expenses: isManager || isAccountant,

            // الربح الصافي — فقط المدير
            net_profit: isManager,
        };

        // ─────────────────────────────────────────────────────
        // Action Permissions
        // ─────────────────────────────────────────────────────
        const isPosted = context?.docStatus === 'posted';

        const actions: ActionPermissions = {
            // حذف — المدير والمحاسب (ليس المرحّل)
            canDelete: (isManager || isAccountant) && !isPosted,

            // ترحيل — المدير والمحاسب
            canPost: isManager || isAccountant,

            // إلغاء ترحيل — فقط المدير
            canUnpost: isManager,

            // تعديل — الكل ماعدا الموظف العادي (ومش المرحّل)
            canEdit: !isEmployee && !isPosted,

            // تعديل الأسعار — المدير والمحاسب ومدير المبيعات
            canEditPrice: isManager || isAccountant || isSalesManager,

            // إضافة خصم — المدير ومدير المبيعات
            canApplyDiscount: isManager || isSalesManager,

            // تعديل فاتورة مرحّلة — فقط المدير
            canEditPosted: isManager,

            // نسخ — كل الأدوار ما عدا الموظف
            canDuplicate: !isEmployee,

            // طباعة — الكل
            canPrint: true,

            // تصدير — المدير والمحاسب ومدراء الأقسام
            canExport: isManager || isAccountant || isSalesManager || isPurchasingManager,

            // تأكيد المستند — المدير والمحاسب ومدراء الأقسام والمندوبين
            canConfirm: !isEmployee,
        };

        return {
            columns,
            actions,
            isManager,
            isAccountant,
            isSales,
            isSalesManager,
            isPurchasingManager,
            isEmployee,
            ready: !loading,
        };
    }, [hasRole, hasAnyRole, isAdmin, loading, context?.tradeMode, context?.docType, context?.docStatus]);
}

export default useTradePermissions;
