/**
 * useEditFlow Hook
 * Hook for managing edit flow for journal entries and documents
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    canEditJournalEntry,
    unpostJournalEntry,
    repostJournalEntry,
    logDocumentEdit,
    getCompanyAccountingSettings,
    type EditPermissionResult,
    type AccountingSettings,
} from '@/services/editFlowService';

interface UseEditFlowOptions {
    onEditStart?: () => void;
    onEditComplete?: () => void;
    onEditCancel?: () => void;
}

interface EditFlowState {
    isChecking: boolean;
    isUnposting: boolean;
    isReposting: boolean;
    permission: EditPermissionResult | null;
    showEditDialog: boolean;
    editReason: string;
    selectedOption: string | null;
}

export function useEditFlow(options: UseEditFlowOptions = {}) {
    const { toast } = useToast();
    const { language } = useLanguage();

    const [state, setState] = useState<EditFlowState>({
        isChecking: false,
        isUnposting: false,
        isReposting: false,
        permission: null,
        showEditDialog: false,
        editReason: '',
        selectedOption: null,
    });

    /**
     * Check if entry can be edited
     */
    const checkEditPermission = useCallback(async (entryId: string): Promise<EditPermissionResult | null> => {
        setState(prev => ({ ...prev, isChecking: true }));

        try {
            const permission = await canEditJournalEntry(entryId);
            setState(prev => ({ ...prev, permission, isChecking: false }));

            // If direct edit is allowed, proceed
            if (permission.can_edit && permission.mode === 'direct') {
                return permission;
            }

            // If unpost/edit/repost, proceed automatically
            if (permission.can_edit && permission.mode === 'unpost_edit_repost') {
                return permission;
            }

            // If needs dialog (closed period/year), show dialog
            if (permission.mode === 'closed_period' ||
                permission.mode === 'independent_closed_year' ||
                permission.mode === 'linked_closed_year') {
                setState(prev => ({ ...prev, showEditDialog: true }));
                return permission;
            }

            return permission;
        } catch (error) {
            console.error('Error checking edit permission:', error);
            setState(prev => ({ ...prev, isChecking: false }));
            toast({
                title: language === 'ar' ? 'خطأ' : 'Error',
                description: language === 'ar' ? 'حدث خطأ أثناء التحقق من صلاحيات التعديل' : 'Error checking edit permissions',
                variant: 'destructive',
            });
            return null;
        }
    }, [language, toast]);

    /**
     * Start edit flow for an entry
     */
    const startEditFlow = useCallback(async (
        entryId: string,
        entryNumber: string,
        isPosted: boolean
    ): Promise<boolean> => {
        // If not posted, allow direct edit
        if (!isPosted) {
            options.onEditStart?.();
            return true;
        }

        // Check permission
        const permission = await checkEditPermission(entryId);
        if (!permission) return false;

        // Direct or unpost_edit_repost mode
        if (permission.can_edit && (permission.mode === 'direct' || permission.mode === 'unpost_edit_repost')) {
            // Auto unpost if needed
            if (permission.auto_unpost) {
                setState(prev => ({ ...prev, isUnposting: true }));
                const success = await unpostJournalEntry(entryId);
                setState(prev => ({ ...prev, isUnposting: false }));

                if (!success) {
                    toast({
                        title: language === 'ar' ? 'خطأ' : 'Error',
                        description: language === 'ar' ? 'فشل إلغاء ترحيل القيد' : 'Failed to unpost entry',
                        variant: 'destructive',
                    });
                    return false;
                }

                // Log the unpost action
                await logDocumentEdit({
                    documentType: 'journal_entry',
                    documentId: entryId,
                    documentNumber: entryNumber,
                    editType: 'unpost_edit',
                    reason: 'Automatic unpost for editing',
                });
            }

            options.onEditStart?.();
            return true;
        }

        // Need to show dialog for user to choose
        if (permission.options && permission.options.length > 0) {
            setState(prev => ({ ...prev, showEditDialog: true }));
            return false; // Don't proceed yet, wait for user choice
        }

        // Cannot edit
        if (!permission.can_edit) {
            toast({
                title: language === 'ar' ? 'لا يمكن التعديل' : 'Cannot Edit',
                description: permission.message,
                variant: 'destructive',
            });
            return false;
        }

        return false;
    }, [checkEditPermission, language, options, toast]);

    /**
     * Complete edit flow (re-post if needed)
     */
    const completeEditFlow = useCallback(async (
        entryId: string,
        entryNumber: string,
        oldValues?: Record<string, unknown>,
        newValues?: Record<string, unknown>
    ): Promise<boolean> => {
        const permission = state.permission;

        // Log the edit
        await logDocumentEdit({
            documentType: 'journal_entry',
            documentId: entryId,
            documentNumber: entryNumber,
            editType: 'direct_edit',
            oldValues,
            newValues,
            reason: state.editReason || undefined,
        });

        // Auto repost if needed
        if (permission?.auto_repost) {
            setState(prev => ({ ...prev, isReposting: true }));
            const success = await repostJournalEntry(entryId);
            setState(prev => ({ ...prev, isReposting: false }));

            if (!success) {
                toast({
                    title: language === 'ar' ? 'تحذير' : 'Warning',
                    description: language === 'ar' ? 'تم حفظ التعديلات لكن فشل إعادة الترحيل' : 'Changes saved but failed to re-post',
                    variant: 'default',
                });
            }
        }

        // Reset state
        setState(prev => ({
            ...prev,
            permission: null,
            showEditDialog: false,
            editReason: '',
            selectedOption: null,
        }));

        options.onEditComplete?.();
        return true;
    }, [state.permission, state.editReason, language, options, toast]);

    /**
     * Cancel edit flow
     */
    const cancelEditFlow = useCallback(() => {
        setState(prev => ({
            ...prev,
            permission: null,
            showEditDialog: false,
            editReason: '',
            selectedOption: null,
        }));
        options.onEditCancel?.();
    }, [options]);

    /**
     * Handle option selection in dialog
     */
    const selectOption = useCallback((optionId: string) => {
        setState(prev => ({ ...prev, selectedOption: optionId }));
    }, []);

    /**
     * Set edit reason
     */
    const setEditReason = useCallback((reason: string) => {
        setState(prev => ({ ...prev, editReason: reason }));
    }, []);

    /**
     * Close edit dialog
     */
    const closeEditDialog = useCallback(() => {
        setState(prev => ({ ...prev, showEditDialog: false }));
    }, []);

    return {
        // State
        isChecking: state.isChecking,
        isUnposting: state.isUnposting,
        isReposting: state.isReposting,
        permission: state.permission,
        showEditDialog: state.showEditDialog,
        editReason: state.editReason,
        selectedOption: state.selectedOption,

        // Actions
        checkEditPermission,
        startEditFlow,
        completeEditFlow,
        cancelEditFlow,
        selectOption,
        setEditReason,
        closeEditDialog,
    };
}

export default useEditFlow;
