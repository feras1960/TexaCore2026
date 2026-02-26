/**
 * useTradePermissions Hook - صلاحيات المستندات التجارية
 * 
 * @description يحدد ما يمكن لكل دور رؤيته وفعله في الفواتير والكونتينرات
 * 
 * 🔄 V2 — ديناميكي: يقرأ من special_permissions بدلاً من أسماء الأدوار
 * 
 * الآن الصلاحيات قابلة للتعديل من واجهة "المستخدمون والصلاحيات"
 * بدون الحاجة لتعديل الكود.
 * 
 * Role detection مازال موجوداً كـ fallback + لتصنيف المستخدم.
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
// Hook Implementation — V2 Dynamic (reads from special_permissions)
// ═══════════════════════════════════════════════════════════════

export function useTradePermissions(context?: {
    tradeMode?: 'sales' | 'purchase';
    docType?: string;
    docStatus?: string;
}): TradePermissions {
    const { hasRole, hasAnyRole, isAdmin, loading, hasSpecialPermission } = useRBAC();

    return useMemo(() => {
        // ─── Role Detection (kept for classification + fallback) ───
        const isTenantOwner = hasRole('tenant_owner');
        const isCompanyAdmin = hasRole('company_admin');
        const isManager = isTenantOwner || isCompanyAdmin || isAdmin();
        const isAccountant = hasRole('accountant') || isManager;
        const isPurchasingManager = hasRole('purchasing_manager') || isManager;
        const isSalesManager = hasRole('sales_manager') || isManager;
        const isSales = hasRole('sales_rep') || isSalesManager;
        const isWarehouse = hasRole('warehouse_manager');
        const isEmployee = !isManager && !isAccountant && !isSales && !isPurchasingManager;

        // ─── Special Permissions (dynamic source of truth) ─────────
        // These read from special_permissions JSONB in the roles table.
        // If special_permissions not configured, falls back to role-based logic.
        const sp = {
            viewCost: hasSpecialPermission('can_view_cost_prices'),
            viewProfit: hasSpecialPermission('can_view_profit_margins'),
            editPostedPurchase: hasSpecialPermission('can_edit_posted_purchase'),
            editPostedSale: hasSpecialPermission('can_edit_posted_sale'),
            editPostedJournal: hasSpecialPermission('can_edit_posted_journal'),
            deletePosted: hasSpecialPermission('can_delete_posted'),
            unpost: hasSpecialPermission('can_unpost'),
            editClosed: hasSpecialPermission('can_edit_closed_period'),
            approve: hasSpecialPermission('can_approve_transactions'),
            exportData: hasSpecialPermission('can_export_data'),
            manageContainers: hasSpecialPermission('can_manage_containers'),
        };

        // ─────────────────────────────────────────────────────
        // Column Visibility Rules
        // 🔄 V2: Uses special_permissions with role-based fallback
        // ─────────────────────────────────────────────────────
        const columns: ColumnVisibility = {
            // سعر الوحدة — الكل يراه إلا الموظف العادي ومدير المستودع
            unit_price: !isEmployee || isWarehouse,

            // سعر التكلفة — special_permission أو fallback (المدير/المحاسب/مدير المشتريات)
            cost_price: sp.viewCost || isManager || isAccountant || isPurchasingManager,

            // هامش الربح — special_permission أو fallback (المدير/مدير المبيعات)
            profit_margin: sp.viewProfit || isManager || isSalesManager,

            // إجمالي التكلفة — مرتبط بسعر التكلفة
            total_cost: sp.viewCost || isManager || isAccountant,

            // الخصم — المدير والمحاسب ومدير المبيعات
            discount: isManager || isAccountant || isSalesManager,

            // الضريبة — الكل يراها
            tax: true,

            // سعر المورد (في الكونتينر) — مرتبط بسعر التكلفة
            supplier_price: sp.viewCost || isManager || isAccountant || isPurchasingManager,

            // مصاريف الشحن — مرتبط بسعر التكلفة
            shipping_cost: sp.viewCost || isManager || isAccountant || isPurchasingManager,

            // المصاريف الإضافية — المدير والمحاسب
            expenses: sp.viewCost || isManager || isAccountant,

            // الربح الصافي — مرتبط بهامش الربح
            net_profit: sp.viewProfit || isManager,
        };

        // ─────────────────────────────────────────────────────
        // Action Permissions
        // 🔄 V2: Uses special_permissions with role-based fallback
        // ─────────────────────────────────────────────────────
        const isPosted = context?.docStatus === 'posted';
        const isPurchase = context?.tradeMode === 'purchase';

        const actions: ActionPermissions = {
            // حذف — المدير والمحاسب (ليس المرحّل إلا إذا لديه صلاحية)
            canDelete: isPosted
                ? sp.deletePosted  // فقط من لديه صلاحية خاصة
                : (isManager || isAccountant),

            // ترحيل — المدير والمحاسب أو من لديه صلاحية التأكيد
            canPost: sp.approve || isManager || isAccountant,

            // إلغاء ترحيل — special_permission أو المدير
            canUnpost: sp.unpost || isManager,

            // تعديل — المرحّل يحتاج صلاحية خاصة
            canEdit: isPosted
                ? (isPurchase ? sp.editPostedPurchase : sp.editPostedSale) || isManager
                : !isEmployee,

            // تعديل الأسعار — المدير والمحاسب ومدير المبيعات
            canEditPrice: isManager || isAccountant || isSalesManager,

            // إضافة خصم — المدير ومدير المبيعات
            canApplyDiscount: isManager || isSalesManager,

            // تعديل فاتورة مرحّلة — special_permission أو المدير
            canEditPosted: isPurchase
                ? sp.editPostedPurchase || isManager
                : sp.editPostedSale || isManager,

            // نسخ — كل الأدوار ما عدا الموظف
            canDuplicate: !isEmployee,

            // طباعة — الكل
            canPrint: true,

            // تصدير — special_permission أو المدير/المحاسب/مدراء الأقسام
            canExport: sp.exportData || isManager || isAccountant || isSalesManager || isPurchasingManager,

            // تأكيد المستند — special_permission أو غير الموظف
            canConfirm: sp.approve || !isEmployee,
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
    }, [hasRole, hasAnyRole, isAdmin, loading, hasSpecialPermission, context?.tradeMode, context?.docType, context?.docStatus]);
}

export default useTradePermissions;

