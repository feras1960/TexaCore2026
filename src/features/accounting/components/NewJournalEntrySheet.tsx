import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Sheet,
    SheetContent,
} from '@/components/ui/sheet';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import JournalEntryForm from './JournalEntryForm';
import { EntryActionToolbar } from './EntryActionToolbar';
import journalEntriesService from '@/services/journalEntriesService';
import { Loader2 } from 'lucide-react';

type TabType = 'journal' | 'cash' | 'receipt' | 'payment' | 'transfer' | 'exchange';

interface NewJournalEntrySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: TabType;
    editMode?: boolean;
    entryId?: string | null;
    onUpdate?: () => void;
}

export default function NewJournalEntrySheet({
    open,
    onOpenChange,
    defaultTab = 'journal',
    editMode = false,
    entryId = null,
    onUpdate
}: NewJournalEntrySheetProps) {
    const { t, direction, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

    // Internal Mode State: 'view' | 'edit' | 'create'
    const [internalMode, setInternalMode] = useState<'view' | 'edit' | 'create'>('create');

    // Data for View/Edit Mode
    const [entryData, setEntryData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Linked entry detection - entries created by containers/invoices cannot be edited/deleted here
    const isLinkedEntry = Boolean(
        entryData?.reference_type &&
        ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt'].includes(entryData.reference_type)
    );
    const linkedEntryTypes = ['container_expense', 'container_expense_reversal', 'purchase', 'auto', 'provisional'];
    const isSystemEntry = Boolean(entryData?.entry_type && linkedEntryTypes.includes(entryData.entry_type));
    const isProtected = isLinkedEntry || isSystemEntry;

    // Human-readable source name for protected entries
    const getProtectedSource = () => {
        if (entryData?.reference_type === 'container') return language === 'ar' ? 'كونتينر' : 'Container';
        if (entryData?.reference_type === 'purchase_invoice') return language === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice';
        if (entryData?.reference_type === 'sales_invoice') return language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice';
        if (entryData?.reference_type === 'goods_receipt') return language === 'ar' ? 'سند استلام' : 'Goods Receipt';
        if (entryData?.entry_type === 'container_expense') return language === 'ar' ? 'مصروف كونتينر' : 'Container Expense';
        if (entryData?.entry_type === 'auto') return language === 'ar' ? 'قيد تلقائي' : 'Auto Entry';
        return language === 'ar' ? 'مصدر آخر' : 'Other Source';
    };

    // Print ref
    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Journal_Entry_${entryData?.entry_number || 'New'}`,
    } as any);

    // Reset internal mode when props change
    useEffect(() => {
        if (open) {
            if (entryId) {
                // If we have an ID, we start in VIEW mode (requested change)
                setInternalMode('view');
                loadEntryData(entryId);
            } else {
                setInternalMode('create');
                setEntryData(null);
            }
        }
    }, [open, entryId, editMode]);

    const loadEntryData = async (id: string) => {
        try {
            setLoading(true);
            const data: any = await journalEntriesService.getById(id);
            // Also fetch reference_type and entry_type from DB for protection check
            const { data: metaData } = await (await import('@/lib/supabase')).supabase
                .from('journal_entries')
                .select('reference_type, reference_id, entry_type')
                .eq('id', id)
                .single();
            if (metaData) {
                data.reference_type = metaData.reference_type;
                data.reference_id = metaData.reference_id;
                data.entry_type = metaData.entry_type;
            }
            setEntryData(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load entry');
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleEdit = () => {
        if (isProtected) {
            toast.error(language === 'ar'
                ? `⚠️ لا يمكن تعديل هذا القيد — مرتبط بـ ${getProtectedSource()}. عدّل من المصدر الأصلي.`
                : `⚠️ Cannot edit this entry — linked to ${getProtectedSource()}. Edit from original source.`);
            return;
        }
        setInternalMode('edit');
    };

    const handlePost = async () => {
        try {
            if (!entryId) return;
            const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
            if (!user) {
                toast.error('User not found');
                return;
            }
            await journalEntriesService.post(entryId, user.id);
            toast.success('Entry posted successfully');
            loadEntryData(entryId); // Refresh status
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to post entry: ' + (error.message || 'Unknown error'));
        }
    };

    const handleUnpost = async () => {
        if (isProtected) {
            toast.error(language === 'ar'
                ? `⚠️ لا يمكن إلغاء ترحيل هذا القيد — مرتبط بـ ${getProtectedSource()}.`
                : `⚠️ Cannot unpost this entry — linked to ${getProtectedSource()}.`);
            return;
        }
        try {
            if (!entryId) return;
            await journalEntriesService.unpost(entryId);
            toast.success('Entry unposted');
            loadEntryData(entryId); // Refresh status
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to unpost entry');
        }
    };

    const handleDuplicate = async () => {
        try {
            if (!entryId) return;
            // Assuming duplicate returns the new ID, but here we just want to duplicate logic
            await journalEntriesService.duplicate(entryId);
            toast.success('Entry duplicated');
            onOpenChange(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to duplicate');
        }
    };

    const handleDelete = async () => {
        if (isProtected) {
            toast.error(language === 'ar'
                ? `⚠️ لا يمكن حذف هذا القيد — مرتبط بـ ${getProtectedSource()}. احذف من المصدر الأصلي.`
                : `⚠️ Cannot delete this entry — linked to ${getProtectedSource()}. Delete from original source.`);
            return;
        }
        if (!confirm('Are you sure you want to delete this entry?')) return;
        try {
            if (!entryId) return;
            await journalEntriesService.delete(entryId);
            toast.success('Entry deleted');
            onOpenChange(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="sm:max-w-[60vw] max-w-[1200px] w-full p-0 transition-none duration-0 animate-none"
                side={direction === 'rtl' ? 'left' : 'right'}
            >
                <div className="h-full flex flex-col bg-gray-50/50 dark:bg-gray-900">

                    {/* Unified Header with Toolbar */}
                    <div className={`
             px-6 py-4 border-b flex items-center justify-between
             ${internalMode === 'view' && entryData?.status === 'posted' ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-white dark:bg-gray-900'}
          `}>
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-cairo flex items-center gap-2">
                                    {internalMode === 'create' ? t('accounting.newEntry') :
                                        internalMode === 'edit' ? t('actions.edit') + ' ' + (entryData?.entry_number || '') :
                                            t('accounting.journalEntry') + ' #' + (entryData?.entry_number || '...')}
                                    {isProtected && internalMode === 'view' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                                            🔗 {language === 'ar' ? `مرتبط بـ ${getProtectedSource()}` : `Linked to ${getProtectedSource()}`}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-gray-500 font-tajawal">
                                    {internalMode === 'create' ? t('accounting.entryTabs.journal.description') :
                                        internalMode === 'edit' ? 'تعديل بيانات القيد' :
                                            isProtected ? (language === 'ar' ? 'عرض فقط — التعديل من المصدر الأصلي' : 'View only — edit from source') : 'عرض تفاصيل القيد'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <EntryActionToolbar
                                mode={internalMode}
                                status={entryData?.status}
                                isProtected={isProtected}
                                protectedSource={getProtectedSource()}
                                onEdit={handleEdit}
                                onPrint={handlePrint}
                                onPost={handlePost}
                                onUnpost={handleUnpost}
                                onCopy={handleDuplicate}
                                onDelete={handleDelete}
                                onToggleQR={() => { }} // TODO
                            />
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden" ref={componentRef}>
                        {loading && internalMode !== 'create' ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            /* Unified Form Component used for ALL modes */
                            <JournalEntryForm
                                key={internalMode + (entryId || 'new') + activeTab} // Force remount if tab changes for new entries
                                isActive={true}
                                onDirtyChange={() => { }}
                                defaultVoucherType={activeTab} // Pass the active tab as default type
                                onSave={() => {
                                    onOpenChange(false);
                                    if (onUpdate) onUpdate();
                                }}
                                onCancel={() => {
                                    if (internalMode === 'edit' && entryId) {
                                        setInternalMode('view'); // Cancel edit goes back to View
                                    } else {
                                        onOpenChange(false);
                                    }
                                }}
                                editMode={internalMode === 'edit'}
                                readOnly={internalMode === 'view'} // Pass readOnly for View Mode
                                entryId={entryId}
                                initialData={internalMode !== 'create' ? entryData : null}
                                onUpdate={() => {
                                    if (onUpdate) onUpdate();
                                    if (entryId) loadEntryData(entryId); // Refresh data after update
                                    setInternalMode('view'); // Switch back to view after update
                                }}
                            />
                        )}
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    );
}
