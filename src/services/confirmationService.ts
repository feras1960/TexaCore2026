/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 Confirmation & Approval Service
 * ═══════════════════════════════════════════════════════════════
 * 
 * Handles document confirmation workflow:
 * 1. Pre-confirmation validation (items, customer, payment)
 * 2. Manager approval flow
 * 3. Document confirmation + delivery note creation
 * 4. Warehouse keeper notification
 * 
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';

// ═══ Types ═══
export type DocType = 'quotation' | 'sales_order' | 'sales_invoice' | 'reservation' | 'purchase_order' | 'purchase_invoice';
export type ConfirmationStatus = 'draft' | 'pending_approval' | 'approved' | 'confirmed' | 'cancelled';
export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface WorkflowSettings {
    require_manager_approval_quotation: boolean;
    require_manager_approval_order: boolean;
    require_manager_approval_invoice: boolean;
    require_manager_approval_reservation: boolean;
    approval_amount_threshold: number;
    auto_create_delivery_on_confirm: boolean;
    allow_edit_after_confirm: boolean;
    edit_after_confirm_roles: string[];
    notify_warehouse_on_confirm: boolean;
    notify_manager_on_save: boolean;
    notify_channel: string;
    require_payment_for_confirmation: boolean;
    min_payment_percent: number;
}

export interface ValidationResult {
    isValid: boolean;
    checks: ValidationCheck[];
    blockers: string[];
}

export interface ValidationCheck {
    id: string;
    label_ar: string;
    label_en: string;
    passed: boolean;
    required: boolean;
    details?: string;
}

export interface ConfirmationResult {
    success: boolean;
    message_ar: string;
    message_en: string;
    delivery_note_id?: string;
    notification_sent?: boolean;
}

// ═══ Table name map ═══
const TABLE_MAP: Record<DocType, string> = {
    quotation: 'quotations',
    sales_order: 'sales_orders',
    sales_invoice: 'sales_transactions',
    reservation: 'sales_orders', // reservations stored in sales_orders with type
    purchase_order: 'purchase_orders',
    purchase_invoice: 'purchase_transactions',
};

// ═══ Default settings ═══
const DEFAULT_SETTINGS: WorkflowSettings = {
    require_manager_approval_quotation: false,
    require_manager_approval_order: false,
    require_manager_approval_invoice: false,
    require_manager_approval_reservation: false,
    approval_amount_threshold: 0,
    auto_create_delivery_on_confirm: true,
    allow_edit_after_confirm: false,
    edit_after_confirm_roles: ['company_admin', 'tenant_owner'],
    notify_warehouse_on_confirm: true,
    notify_manager_on_save: false,
    notify_channel: 'internal',
    require_payment_for_confirmation: false,
    min_payment_percent: 0,
};

class ConfirmationService {

    /**
     * Get workflow settings for a company (with defaults)
     */
    async getWorkflowSettings(companyId: string): Promise<WorkflowSettings> {
        try {
            const { data, error } = await supabase
                .from('company_workflow_settings')
                .select('*')
                .eq('company_id', companyId)
                .maybeSingle();

            if (error || !data) {
                return { ...DEFAULT_SETTINGS };
            }

            return {
                require_manager_approval_quotation: data.require_manager_approval_quotation ?? false,
                require_manager_approval_order: data.require_manager_approval_order ?? false,
                require_manager_approval_invoice: data.require_manager_approval_invoice ?? false,
                require_manager_approval_reservation: data.require_manager_approval_reservation ?? false,
                approval_amount_threshold: data.approval_amount_threshold ?? 0,
                auto_create_delivery_on_confirm: data.auto_create_delivery_on_confirm ?? true,
                allow_edit_after_confirm: data.allow_edit_after_confirm ?? false,
                edit_after_confirm_roles: data.edit_after_confirm_roles ?? ['company_admin', 'tenant_owner'],
                notify_warehouse_on_confirm: data.notify_warehouse_on_confirm ?? true,
                notify_manager_on_save: data.notify_manager_on_save ?? false,
                notify_channel: data.notify_channel ?? 'internal',
                require_payment_for_confirmation: data.require_payment_for_confirmation ?? false,
                min_payment_percent: data.min_payment_percent ?? 0,
            };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Save workflow settings
     */
    async saveWorkflowSettings(companyId: string, tenantId: string, settings: Partial<WorkflowSettings>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('company_workflow_settings')
                .upsert({
                    company_id: companyId,
                    tenant_id: tenantId,
                    ...settings,
                }, { onConflict: 'company_id' });

            return !error;
        } catch {
            return false;
        }
    }

    /**
     * Validate a document before confirmation
     */
    async validateForConfirmation(
        docType: DocType,
        docId: string,
        docData: any,
        settings: WorkflowSettings
    ): Promise<ValidationResult> {
        const checks: ValidationCheck[] = [];
        const blockers: string[] = [];

        // 1. Check: Document has items
        const hasItems = docData.items && Array.isArray(docData.items) && docData.items.length > 0;
        checks.push({
            id: 'has_items',
            label_ar: 'المستند يحتوي على أصناف',
            label_en: 'Document has items',
            passed: hasItems,
            required: true,
        });
        if (!hasItems) blockers.push('no_items');

        // 2. Check: Document has customer/supplier
        const isPurchase = docType === 'purchase_order' || docType === 'purchase_invoice';
        const hasParty = isPurchase
            ? !!(docData.supplier_id || docData.supplier_name)
            : !!(docData.customer_id || docData.customer_name);
        checks.push({
            id: 'has_customer',
            label_ar: isPurchase ? 'المورد محدد' : 'العميل محدد',
            label_en: isPurchase ? 'Supplier is specified' : 'Customer is specified',
            passed: hasParty,
            required: true,
        });
        if (!hasParty) blockers.push('no_customer');

        // 3. Check: Not already confirmed
        const notConfirmed = docData.confirmation_status !== 'confirmed';
        checks.push({
            id: 'not_confirmed',
            label_ar: 'المستند غير مؤكد مسبقاً',
            label_en: 'Document not already confirmed',
            passed: notConfirmed,
            required: true,
        });
        if (!notConfirmed) blockers.push('already_confirmed');

        // 4. Check: Approval status (if required)
        const needsApproval = this.isApprovalRequired(docType, settings, docData);
        if (needsApproval) {
            const isApproved = docData.approval_status === 'approved';
            checks.push({
                id: 'manager_approved',
                label_ar: 'موافقة المدير',
                label_en: 'Manager approval',
                passed: isApproved,
                required: true,
                details: isApproved
                    ? undefined
                    : docData.approval_status === 'pending'
                        ? 'بانتظار موافقة المدير'
                        : 'يجب طلب موافقة المدير أولاً',
            });
            if (!isApproved) blockers.push('needs_approval');
        }

        // 5. Check: Payment (if required)
        if (settings.require_payment_for_confirmation) {
            const totalAmount = docData.total_amount || docData.grand_total || 0;
            const paidAmount = docData.paid_amount || 0;
            const minRequired = totalAmount * (settings.min_payment_percent / 100);
            const paymentOk = paidAmount >= minRequired;

            checks.push({
                id: 'payment_received',
                label_ar: `الدفعة مستلمة (${paidAmount.toLocaleString()} من ${minRequired.toLocaleString()})`,
                label_en: `Payment received (${paidAmount.toLocaleString()} of ${minRequired.toLocaleString()})`,
                passed: paymentOk,
                required: true,
                details: paymentOk ? undefined : `يجب دفع ${settings.min_payment_percent}% على الأقل`,
            });
            if (!paymentOk) blockers.push('insufficient_payment');
        } else {
            checks.push({
                id: 'payment_received',
                label_ar: 'الدفعة الإلزامية: غير مفعلة',
                label_en: 'Mandatory payment: disabled',
                passed: true,
                required: false,
            });
        }

        return {
            isValid: blockers.length === 0,
            checks,
            blockers,
        };
    }

    /**
     * Check if manager approval is required for this doc
     */
    isApprovalRequired(docType: DocType, settings: WorkflowSettings, docData?: any): boolean {
        // Check by doc type setting
        const typeKey = `require_manager_approval_${docType === 'sales_order' ? 'order' : docType === 'sales_invoice' ? 'invoice' : docType}` as keyof WorkflowSettings;
        const requireByType = settings[typeKey] as boolean;

        // Check by amount threshold
        const totalAmount = docData?.total_amount || docData?.grand_total || 0;
        const requireByAmount = settings.approval_amount_threshold > 0 && totalAmount >= settings.approval_amount_threshold;

        return requireByType || requireByAmount;
    }

    /**
     * Request manager approval
     */
    async requestApproval(
        docType: DocType,
        docId: string,
        docNumber: string,
        totalAmount: number,
        currency: string,
        tenantId: string,
        companyId: string,
        userId: string,
        notes?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Create approval request
            const { data: request, error: reqError } = await supabase
                .from('document_approval_requests')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    doc_type: docType,
                    doc_id: docId,
                    doc_number: docNumber,
                    requested_by: userId,
                    total_amount: totalAmount,
                    currency: currency,
                    request_notes: notes,
                    status: 'pending',
                })
                .select()
                .single();

            if (reqError) throw reqError;

            // 2. Update document approval_status
            const table = TABLE_MAP[docType];
            await supabase
                .from(table)
                .update({
                    approval_status: 'pending',
                    confirmation_status: 'pending_approval',
                })
                .eq('id', docId);

            // 3. Notify managers (in_app_notifications)
            await this.notifyManagers(
                tenantId,
                companyId,
                'approval_request',
                {
                    title: `طلب موافقة: ${docNumber}`,
                    message: `طلب موافقة على ${this.getDocTypeLabel(docType, 'ar')} رقم ${docNumber} بمبلغ ${totalAmount.toLocaleString()} ${currency}`,
                    doc_type: docType,
                    doc_id: docId,
                    doc_number: docNumber,
                }
            );

            return {
                success: true,
                message: 'تم إرسال طلب الموافقة للمدير',
            };
        } catch (err: any) {
            return {
                success: false,
                message: err.message || 'حدث خطأ',
            };
        }
    }

    /**
     * Approve a document (by manager)
     */
    async approveDocument(
        requestId: string,
        reviewerId: string,
        notes?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Update approval request
            const { data: req, error } = await supabase
                .from('document_approval_requests')
                .update({
                    status: 'approved',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: notes,
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error || !req) throw error || new Error('Request not found');

            // 2. Update document
            const table = TABLE_MAP[req.doc_type as DocType];
            await supabase
                .from(table)
                .update({
                    approval_status: 'approved',
                    approved_by: reviewerId,
                    approved_at: new Date().toISOString(),
                    approval_notes: notes,
                })
                .eq('id', req.doc_id);

            // 3. Notify the requester
            await this.sendNotification(
                req.tenant_id,
                req.requested_by,
                'approval_granted',
                {
                    title: `تمت الموافقة ✅: ${req.doc_number}`,
                    message: `تمت الموافقة على ${this.getDocTypeLabel(req.doc_type as DocType, 'ar')} رقم ${req.doc_number} — يمكنك الآن تأكيده وإرساله للمستودع`,
                    doc_type: req.doc_type,
                    doc_id: req.doc_id,
                }
            );

            return { success: true, message: 'تمت الموافقة بنجاح' };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }

    /**
     * Reject a document (by manager)
     */
    async rejectDocument(
        requestId: string,
        reviewerId: string,
        notes: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const { data: req, error } = await supabase
                .from('document_approval_requests')
                .update({
                    status: 'rejected',
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: notes,
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error || !req) throw error || new Error('Request not found');

            // Update document
            const table = TABLE_MAP[req.doc_type as DocType];
            await supabase
                .from(table)
                .update({
                    approval_status: 'rejected',
                    confirmation_status: 'draft',
                    approval_notes: notes,
                })
                .eq('id', req.doc_id);

            // Notify requester
            await this.sendNotification(
                req.tenant_id,
                req.requested_by,
                'approval_rejected',
                {
                    title: `تم الرفض ❌: ${req.doc_number}`,
                    message: `تم رفض ${this.getDocTypeLabel(req.doc_type as DocType, 'ar')} رقم ${req.doc_number} — السبب: ${notes}`,
                    doc_type: req.doc_type,
                    doc_id: req.doc_id,
                }
            );

            return { success: true, message: 'تم الرفض' };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    }

    /**
     * 🔑 MAIN ACTION: Confirm document + create delivery note + notify warehouse
     */
    async confirmDocument(
        docType: DocType,
        docId: string,
        docData: any,
        tenantId: string,
        companyId: string,
        userId: string,
        settings: WorkflowSettings
    ): Promise<ConfirmationResult> {
        try {
            const table = TABLE_MAP[docType];
            const now = new Date().toISOString();

            // 1. Update document status to confirmed
            const isTransaction = table.includes('_transactions');
            const { error: updateError } = await supabase
                .from(table)
                .update({
                    confirmation_status: 'confirmed',
                    // confirmed_at and confirmed_by columns do not exist in the schema
                    updated_at: now,
                    ...(isTransaction ? { stage: 'confirmed' } : { status: 'confirmed' }),
                })
                .eq('id', docId);

            if (updateError) throw updateError;

            let deliveryNoteId: string | undefined;

            // 2. Auto-create delivery note if enabled
            if (settings.auto_create_delivery_on_confirm && (docType === 'sales_order' || docType === 'sales_invoice')) {
                deliveryNoteId = await this.createDeliveryNote(
                    docType, docId, docData, tenantId, companyId, userId
                );

                // Link delivery note to source document
                if (deliveryNoteId) {
                    await supabase
                        .from(table)
                        .update({ delivery_note_id: deliveryNoteId })
                        .eq('id', docId);
                }
            }

            // 3. Notify warehouse keeper
            let notificationSent = false;
            if (settings.notify_warehouse_on_confirm) {
                notificationSent = await this.notifyWarehouseKeepers(
                    tenantId,
                    companyId,
                    docType,
                    docId,
                    docData.order_number || docData.invoice_number || docData.doc_number || '',
                    docData
                );
            }

            return {
                success: true,
                message_ar: this.getConfirmMessage(docType, 'ar'),
                message_en: this.getConfirmMessage(docType, 'en'),
                delivery_note_id: deliveryNoteId,
                notification_sent: notificationSent,
            };
        } catch (err: any) {
            return {
                success: false,
                message_ar: `خطأ في التأكيد: ${err.message}`,
                message_en: `Confirmation error: ${err.message}`,
            };
        }
    }

    /**
     * Create a delivery note from a confirmed document
     */
    private async createDeliveryNote(
        docType: DocType,
        docId: string,
        docData: any,
        tenantId: string,
        companyId: string,
        userId: string
    ): Promise<string | undefined> {
        try {
            const { data, error } = await supabase
                .from('delivery_notes')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    source_doc_type: docType,
                    source_order_id: docId,
                    customer_id: docData.customer_id,
                    customer_name: docData.customer_name,
                    warehouse_id: docData.warehouse_id,
                    status: 'draft',
                    items: docData.items,
                    notes: `تم الإنشاء تلقائياً من ${this.getDocTypeLabel(docType, 'ar')}`,
                    created_by: userId,
                })
                .select('id')
                .single();

            if (error) {
                console.error('Failed to create delivery note:', error);
                return undefined;
            }

            return data?.id;
        } catch (err) {
            console.error('Error creating delivery note:', err);
            return undefined;
        }
    }

    /**
     * Get pending approval requests for a company
     */
    async getPendingApprovals(companyId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('document_approval_requests')
                .select('*')
                .eq('company_id', companyId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            return error ? [] : (data || []);
        } catch {
            return [];
        }
    }

    // ═══ Notification Helpers ═══

    /**
     * Notify all managers in the company
     */
    private async notifyManagers(
        tenantId: string,
        companyId: string,
        type: string,
        payload: {
            title: string;
            message: string;
            doc_type: string;
            doc_id: string;
            doc_number?: string;
        }
    ): Promise<void> {
        try {
            // Find managers/admins for this company
            const { data: managerProfiles } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('company_id', companyId);

            // Get manager role IDs
            const { data: managerRoles } = await supabase
                .from('roles')
                .select('id')
                .in('code', ['company_admin', 'tenant_owner', 'branch_manager']);

            if (!managerRoles?.length || !managerProfiles?.length) return;

            const managerRoleIds = managerRoles.map(r => r.id);
            const profileIds = managerProfiles.map(p => p.id);

            // Find users with manager roles
            const { data: userRolesData } = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role_id', managerRoleIds)
                .in('user_id', profileIds);

            if (!userRolesData?.length) return;

            // Send notification to each manager
            const notifications = userRolesData.map(ur => ({
                tenant_id: tenantId,
                user_id: ur.user_id,
                title: payload.title,
                message: payload.message,
                notification_type: type,
                priority: 'high',
                action_url: `/sales?doc=${payload.doc_type}&id=${payload.doc_id}`,
                icon: '📋',
                is_read: false,
            }));

            await supabase
                .from('in_app_notifications')
                .insert(notifications);
        } catch (err) {
            console.error('Error notifying managers:', err);
        }
    }

    /**
     * Notify warehouse keepers for a confirmed document
     */
    private async notifyWarehouseKeepers(
        tenantId: string,
        companyId: string,
        docType: DocType,
        docId: string,
        docNumber: string,
        docData: any
    ): Promise<boolean> {
        try {
            // Find warehouse keepers
            const { data: whRoles } = await supabase
                .from('roles')
                .select('id')
                .in('code', ['warehouse_keeper', 'warehouse_manager']);

            if (!whRoles?.length) return false;

            const whRoleIds = whRoles.map(r => r.id);

            const { data: profileIds } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('company_id', companyId);

            if (!profileIds?.length) return false;

            const { data: whUsers } = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role_id', whRoleIds)
                .in('user_id', profileIds.map(p => p.id));

            if (!whUsers?.length) return false;

            const itemCount = docData.items?.length || 0;
            const customerName = docData.customer_name || 'عميل';

            const notifications = whUsers.map(u => ({
                tenant_id: tenantId,
                user_id: u.user_id,
                title: `📦 طلب تجهيز جديد: ${docNumber}`,
                message: `${this.getDocTypeLabel(docType, 'ar')} مؤكد — ${itemCount} صنف للعميل ${customerName}. جاهز للتجهيز والتسليم.`,
                notification_type: 'delivery_ready',
                priority: 'high',
                action_url: `/warehouse/delivery?doc=${docType}&id=${docId}`,
                icon: '📦',
                is_read: false,
            }));

            const { error } = await supabase
                .from('in_app_notifications')
                .insert(notifications);

            return !error;
        } catch (err) {
            console.error('Error notifying warehouse keepers:', err);
            return false;
        }
    }

    /**
     * Send a single notification to a user
     */
    private async sendNotification(
        tenantId: string,
        userId: string,
        type: string,
        payload: {
            title: string;
            message: string;
            doc_type?: string;
            doc_id?: string;
        }
    ): Promise<void> {
        try {
            await supabase
                .from('in_app_notifications')
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    title: payload.title,
                    message: payload.message,
                    notification_type: type,
                    priority: 'normal',
                    action_url: payload.doc_id
                        ? `/sales?doc=${payload.doc_type}&id=${payload.doc_id}`
                        : undefined,
                    icon: type === 'approval_granted' ? '✅' : type === 'approval_rejected' ? '❌' : '📋',
                    is_read: false,
                });
        } catch (err) {
            console.error('Error sending notification:', err);
        }
    }

    // ═══ Label Helpers ═══

    getDocTypeLabel(docType: DocType, lang: 'ar' | 'en'): string {
        const labels: Record<DocType, { ar: string; en: string }> = {
            quotation: { ar: 'عرض السعر', en: 'Quotation' },
            sales_order: { ar: 'أمر البيع', en: 'Sales Order' },
            sales_invoice: { ar: 'الفاتورة', en: 'Sales Invoice' },
            reservation: { ar: 'الحجز', en: 'Reservation' },
            purchase_order: { ar: 'أمر الشراء', en: 'Purchase Order' },
            purchase_invoice: { ar: 'فاتورة الشراء', en: 'Purchase Invoice' },
        };
        return labels[docType]?.[lang] || docType;
    }

    getConfirmMessage(docType: DocType, lang: 'ar' | 'en'): string {
        const messages: Record<DocType, { ar: string; en: string }> = {
            quotation: {
                ar: 'تم تأكيد عرض السعر بنجاح ✅',
                en: 'Quotation confirmed successfully ✅',
            },
            sales_order: {
                ar: 'تم تأكيد أمر البيع وإرساله للمستودع 📦',
                en: 'Sales order confirmed and sent to warehouse 📦',
            },
            sales_invoice: {
                ar: 'تم تأكيد الفاتورة وإنشاء إذن التسليم 🚚',
                en: 'Invoice confirmed and delivery note created 🚚',
            },
            reservation: {
                ar: 'تم تأكيد الحجز وإرساله لأمين المستودع 📦',
                en: 'Reservation confirmed and sent to warehouse 📦',
            },
            purchase_order: {
                ar: 'تم تأكيد أمر الشراء ✅',
                en: 'Purchase order confirmed ✅',
            },
            purchase_invoice: {
                ar: 'تم تأكيد فاتورة الشراء ✅',
                en: 'Purchase invoice confirmed ✅',
            },
        };
        return messages[docType]?.[lang] || (lang === 'ar' ? 'تم التأكيد' : 'Confirmed');
    }

    /**
     * Check if a user can edit a confirmed document
     */
    async canEditConfirmedDocument(
        companyId: string,
        userId: string,
        docId: string,
        docType: DocType
    ): Promise<{ canEdit: boolean; reason?: string }> {
        try {
            const settings = await this.getWorkflowSettings(companyId);

            if (!settings.allow_edit_after_confirm) {
                return { canEdit: false, reason: 'تعديل المستندات المؤكدة غير مسموح في الإعدادات' };
            }

            // Check user role
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role_id, roles:role_id(code)')
                .eq('user_id', userId);

            const userRoleCodes = (userRoles || []).map((ur: any) => ur.roles?.code).filter(Boolean);
            const hasEditRole = settings.edit_after_confirm_roles.some(r => userRoleCodes.includes(r));

            if (!hasEditRole) {
                return { canEdit: false, reason: 'ليس لديك صلاحية تعديل المستندات المؤكدة' };
            }

            // Check if delivery note is already executed
            const table = TABLE_MAP[docType];
            const { data: doc } = await supabase
                .from(table)
                .select('delivery_note_id')
                .eq('id', docId)
                .single();

            if (doc?.delivery_note_id) {
                const { data: dn } = await supabase
                    .from('delivery_notes')
                    .select('status')
                    .eq('id', doc.delivery_note_id)
                    .single();

                if (dn?.status && !['draft', 'picking'].includes(dn.status)) {
                    return { canEdit: false, reason: 'إذن التسليم تحت التنفيذ أو مكتمل — لا يمكن التعديل' };
                }
            }

            return { canEdit: true };
        } catch {
            return { canEdit: false, reason: 'حدث خطأ في التحقق من الصلاحيات' };
        }
    }
}

export const confirmationService = new ConfirmationService();
export default confirmationService;
