/**
 * Edit Flow Service
 * خدمة التحقق من إمكانية التعديل والتحكم في سير العمل
 */

import { supabase } from '@/lib/supabase';

// Types
export interface EditPermissionResult {
    can_edit: boolean;
    mode: 'direct' | 'unpost_edit_repost' | 'closed_period' | 'independent_closed_year' | 'linked_closed_year' | 'adjustment_only' | 'default';
    fiscal_year_mode?: 'independent' | 'linked';
    reason: string;
    message: string;
    warning?: string;
    require_reason?: boolean;
    auto_unpost?: boolean;
    auto_repost?: boolean;
    options?: EditOption[];
}

export interface EditOption {
    id: string;
    label: string;
    description?: string;
    recommended?: boolean;
    required?: boolean;
    requires_permission?: boolean;
    warning?: string;
}

export interface AccountingSettings {
    fiscal_year_mode: 'independent' | 'linked';
    edit_settings: {
        allow_direct_edit_posted: boolean;
        auto_repost_after_save: boolean;
        require_edit_reason: boolean;
        notify_on_posted_edit: boolean;
    };
    closed_period_settings: {
        allow_edit_closed_period: boolean;
        require_manager_approval: boolean;
    };
    closed_year_settings: {
        allow_edit_closed_year: boolean;
        allow_delete_closed_year: boolean;
        require_adjustment_entry: boolean;
        auto_link_adjustments: boolean;
    };
    notifications: {
        notify_cfo_on_closed_year_edit: boolean;
        notify_on_large_adjustments: boolean;
        large_adjustment_threshold: number;
    };
}

// Default settings
const DEFAULT_SETTINGS: AccountingSettings = {
    fiscal_year_mode: 'independent',
    edit_settings: {
        allow_direct_edit_posted: true,
        auto_repost_after_save: true,
        require_edit_reason: true,
        notify_on_posted_edit: false,
    },
    closed_period_settings: {
        allow_edit_closed_period: false,
        require_manager_approval: true,
    },
    closed_year_settings: {
        allow_edit_closed_year: true,
        allow_delete_closed_year: false,
        require_adjustment_entry: false,
        auto_link_adjustments: true,
    },
    notifications: {
        notify_cfo_on_closed_year_edit: true,
        notify_on_large_adjustments: true,
        large_adjustment_threshold: 10000,
    },
};

/**
 * Get company accounting settings
 */
export async function getCompanyAccountingSettings(companyId: string): Promise<AccountingSettings> {
    try {
        const { data, error } = await supabase
            .from('companies')
            .select('accounting_settings')
            .eq('id', companyId)
            .single();

        if (error || !data?.accounting_settings) {
            return DEFAULT_SETTINGS;
        }

        return {
            ...DEFAULT_SETTINGS,
            ...data.accounting_settings,
        };
    } catch (error) {
        console.error('Error fetching accounting settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Check if a journal entry can be edited
 */
export async function canEditJournalEntry(entryId: string): Promise<EditPermissionResult> {
    try {
        // Call RPC function (if available) or implement logic here
        const { data, error } = await supabase.rpc('can_edit_journal_entry', {
            p_entry_id: entryId,
        });

        if (error) {
            // Fallback to client-side logic
            return await checkEditPermissionClientSide(entryId);
        }

        return data as EditPermissionResult;
    } catch (error) {
        console.error('Error checking edit permission:', error);
        return await checkEditPermissionClientSide(entryId);
    }
}

/**
 * Client-side fallback for checking edit permissions
 */
async function checkEditPermissionClientSide(entryId: string): Promise<EditPermissionResult> {
    try {
        // Get entry details
        const { data: entry, error: entryError } = await supabase
            .from('journal_entries')
            .select(`
        id,
        company_id,
        fiscal_year_id,
        period_id,
        is_posted,
        entry_date
      `)
            .eq('id', entryId)
            .single();

        if (entryError || !entry) {
            return {
                can_edit: false,
                mode: 'direct',
                reason: 'entry_not_found',
                message: 'القيد غير موجود',
            };
        }

        // Get company settings
        const settings = await getCompanyAccountingSettings(entry.company_id);

        // Case 1: Entry is draft
        if (!entry.is_posted) {
            return {
                can_edit: true,
                mode: 'direct',
                reason: 'draft_entry',
                message: 'القيد مسودة - يمكن التعديل بحرية',
            };
        }

        // Get fiscal year status
        let fiscalYearStatus = 'open';
        if (entry.fiscal_year_id) {
            const { data: fy } = await supabase
                .from('fiscal_years')
                .select('status, is_closed')
                .eq('id', entry.fiscal_year_id)
                .single();

            if (fy) {
                fiscalYearStatus = fy.is_closed ? 'closed' : (fy.status || 'open');
            }
        }

        // Get period status
        let periodStatus = 'open';
        if (entry.period_id) {
            const { data: period } = await supabase
                .from('accounting_periods')
                .select('status')
                .eq('id', entry.period_id)
                .single();

            if (period) {
                periodStatus = period.status || 'open';
            }
        }

        // Case 2: Both period and year are open
        if (fiscalYearStatus === 'open' && periodStatus === 'open') {
            return {
                can_edit: true,
                mode: 'unpost_edit_repost',
                reason: 'open_period_year',
                message: 'سيتم إلغاء الترحيل تلقائياً للتعديل ثم إعادة الترحيل',
                auto_unpost: true,
                auto_repost: settings.edit_settings.auto_repost_after_save,
            };
        }

        // Case 3: Period is closed but year is open
        if (periodStatus === 'closed' && fiscalYearStatus === 'open') {
            return {
                can_edit: settings.closed_period_settings.allow_edit_closed_period,
                mode: 'closed_period',
                reason: 'closed_period',
                message: 'الفترة المحاسبية مُغلقة',
                warning: 'قد تحتاج موافقة المدير',
                options: [
                    { id: 'reopen_period', label: 'إعادة فتح الفترة', requires_permission: true },
                    { id: 'adjustment', label: 'قيد تسوية في الفترة الحالية', recommended: true },
                ],
            };
        }

        // Case 4: Fiscal year is closed
        if (fiscalYearStatus === 'closed') {
            if (settings.fiscal_year_mode === 'independent') {
                return {
                    can_edit: settings.closed_year_settings.allow_edit_closed_year,
                    mode: 'independent_closed_year',
                    fiscal_year_mode: 'independent',
                    reason: 'closed_year_independent',
                    message: 'السنة المالية مُغلقة (نظام مستقل)',
                    warning: 'التعديل لن يؤثر على السنوات اللاحقة',
                    require_reason: true,
                    options: [
                        { id: 'direct_edit', label: 'تعديل مباشر', warning: 'السنة مُغلقة' },
                        { id: 'adjustment', label: 'قيد تسوية في السنة الحالية', recommended: true },
                    ],
                };
            } else {
                return {
                    can_edit: false,
                    mode: 'linked_closed_year',
                    fiscal_year_mode: 'linked',
                    reason: 'closed_year_linked',
                    message: 'السنة المالية مُغلقة (نظام مترابط) - لا يمكن التعديل المباشر',
                    options: [
                        { id: 'adjustment', label: 'إنشاء قيد تسوية في السنة الحالية', required: true },
                    ],
                };
            }
        }

        // Default case
        return {
            can_edit: true,
            mode: 'default',
            reason: 'default',
            message: 'يمكن التعديل',
        };
    } catch (error) {
        console.error('Error in checkEditPermissionClientSide:', error);
        return {
            can_edit: false,
            mode: 'direct',
            reason: 'error',
            message: 'حدث خطأ أثناء التحقق من صلاحيات التعديل',
        };
    }
}

/**
 * Unpost a journal entry (for editing)
 */
export async function unpostJournalEntry(entryId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('journal_entries')
            .update({ is_posted: false })
            .eq('id', entryId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error unposting entry:', error);
        return false;
    }
}

/**
 * Re-post a journal entry (after editing)
 */
export async function repostJournalEntry(entryId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('journal_entries')
            .update({ is_posted: true })
            .eq('id', entryId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error reposting entry:', error);
        return false;
    }
}

/**
 * Log document edit history
 */
export async function logDocumentEdit(params: {
    documentType: string;
    documentId: string;
    documentNumber: string;
    editType: 'direct_edit' | 'unpost_edit' | 'adjustment' | 'delete' | 'restore';
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    reason?: string;
}): Promise<string | null> {
    try {
        const { data, error } = await supabase.rpc('log_document_edit', {
            p_document_type: params.documentType,
            p_document_id: params.documentId,
            p_document_number: params.documentNumber,
            p_edit_type: params.editType,
            p_old_values: params.oldValues,
            p_new_values: params.newValues,
            p_reason: params.reason,
        });

        if (error) {
            console.error('Error logging edit:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error in logDocumentEdit:', error);
        return null;
    }
}

export default {
    getCompanyAccountingSettings,
    canEditJournalEntry,
    unpostJournalEntry,
    repostJournalEntry,
    logDocumentEdit,
};
