/**
 * ═══════════════════════════════════════════════════════════════
 * ✏️ In-Place Edit Service
 * ═══════════════════════════════════════════════════════════════
 * 
 * خدمة التعديل المباشر — تسمح بتعديل المستندات المرحّلة مباشرة
 * بدون قيود عكسية. يتم تعديل القيد الأصلي وتسجيل كل تعديل
 * في edit_history للرقابة الكاملة.
 * 
 * القواعد:
 *   ① التعديل على نفس السجل (نفس ID)
 *   ② التاريخ الأصلي لا يتغير
 *   ③ كل تعديل يُسجّل في edit_history
 *   ④ الفترات المقفلة محمية
 *   ⑤ صلاحيات خاصة مطلوبة
 * 
 * ═══════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { activityLogService } from './activityLogService';

// ═══════════════════════════════════════════════════════════════
// الأنواع
// ═══════════════════════════════════════════════════════════════

export type EditableDocumentType = 'purchase' | 'sale' | 'journal_entry';
export type EditMode = 'full' | 'price_only' | 'journal';

/** التغييرات التي تم رصدها */
export interface FieldChange {
    field: string;
    old: any;
    new: any;
}

/** نتيجة التعديل */
export interface InPlaceEditResult {
    success: boolean;
    error?: string;
    changes: FieldChange[];
    editHistoryEntry?: EditHistoryEntry;
    journalEntryUpdated?: boolean;
    stockUpdated?: boolean;
}

/** سجل تعديل واحد */
export interface EditHistoryEntry {
    edited_at: string;
    edited_by: string;
    edited_by_name: string;
    reason?: string;
    changes: Record<string, { old: any; new: any }>;
}

/** مدخلات فحص الأهلية */
export interface EditEligibilityInput {
    documentType: EditableDocumentType;
    documentId: string;
    userId: string;
    // userPermissions?: string[]; // صلاحيات المستخدم — مستقبلاً
}

/** نتيجة فحص الأهلية */
export interface EditEligibilityResult {
    canEdit: boolean;
    reason?: string;
    editMode: EditMode;
    restrictions: string[];
}

/** مدخلات تعديل بنود الفاتورة */
export interface ItemEdit {
    item_id?: string; // null = بند جديد
    material_id?: string;
    color_id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_amount?: number;
    warehouse_id?: string;
    notes?: string;
    _action?: 'add' | 'update' | 'delete';
}

// ═══════════════════════════════════════════════════════════════
// الجداول المرجعية
// ═══════════════════════════════════════════════════════════════

const TABLE_MAP: Record<EditableDocumentType, string> = {
    purchase: 'purchase_transactions',
    sale: 'sales_transactions',
    journal_entry: 'journal_entries',
};

const ITEMS_TABLE_MAP: Record<string, string> = {
    purchase: 'purchase_transaction_items',
    sale: 'sales_transaction_items',
};

// ═══════════════════════════════════════════════════════════════
// الخدمة الرئيسية
// ═══════════════════════════════════════════════════════════════

export const inPlaceEditService = {

    // ───────────────────────────────────────────────────────────
    // ① فحص الأهلية — هل يمكن تعديل هذا المستند؟
    // ───────────────────────────────────────────────────────────

    async checkEditEligibility(input: EditEligibilityInput): Promise<EditEligibilityResult> {
        const table = TABLE_MAP[input.documentType];
        const restrictions: string[] = [];

        // جلب المستند
        const { data: doc, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', input.documentId)
            .single();

        if (error || !doc) {
            return { canEdit: false, reason: 'المستند غير موجود', editMode: 'full', restrictions: [] };
        }

        // ─── القيود المحاسبية ───
        if (input.documentType === 'journal_entry') {
            // حماية: القيود المولّدة تلقائياً لا تُعدّل من هنا
            const protectedRefs = ['container', 'purchase_invoice', 'sales_invoice', 'goods_receipt'];
            const protectedTypes = ['container_expense', 'container_expense_reversal', 'auto', 'provisional'];

            if (protectedRefs.includes(doc.reference_type) || protectedTypes.includes(doc.entry_type)) {
                return {
                    canEdit: false,
                    reason: 'هذا القيد مرتبط بمستند آخر — التعديل متاح فقط من المصدر الأصلي',
                    editMode: 'journal',
                    restrictions: ['auto_generated'],
                };
            }

            return {
                canEdit: true,
                editMode: 'journal',
                restrictions,
            };
        }

        // ─── فواتير المشتريات والمبيعات ───
        const stage = doc.stage;
        const isPosted = doc.is_posted;
        const receiptMode = doc.receipt_mode; // 'direct' (POS) or 'workflow'

        // المسودات — تعديل حر بالكامل
        if (stage === 'draft' || stage === 'confirmed') {
            return {
                canEdit: true,
                editMode: 'full',
                restrictions,
            };
        }

        // المستلمة أو المرحّلة — يعتمد على النوع
        if (isPosted || stage === 'received' || stage === 'delivered') {
            if (receiptMode === 'direct') {
                // POS — تعديل شامل
                return {
                    canEdit: true,
                    editMode: 'full',
                    restrictions: ['posted_document'],
                };
            } else {
                // Workflow — تعديل السعر فقط (الكمية ثابتة)
                restrictions.push('price_only');
                return {
                    canEdit: true,
                    editMode: 'price_only',
                    restrictions,
                };
            }
        }

        // ملغية — لا يُسمح بالتعديل
        if (stage === 'cancelled') {
            return {
                canEdit: false,
                reason: 'لا يمكن تعديل مستند ملغي',
                editMode: 'full',
                restrictions: ['cancelled'],
            };
        }

        return { canEdit: true, editMode: 'full', restrictions };
    },


    // ───────────────────────────────────────────────────────────
    // ② تعديل فاتورة مشتريات/مبيعات — Header فقط
    // ───────────────────────────────────────────────────────────

    async editTransactionHeader(
        documentType: 'purchase' | 'sale',
        documentId: string,
        updates: Record<string, any>,
        userId: string,
        userName: string,
        reason?: string,
    ): Promise<InPlaceEditResult> {
        const table = TABLE_MAP[documentType] as 'purchase_transactions' | 'sales_transactions';
        const changes: FieldChange[] = [];

        try {
            // جلب الحالة الحالية
            const { data: current, error: fetchErr } = await supabase
                .from(table)
                .select('*')
                .eq('id', documentId)
                .single();

            if (fetchErr || !current) {
                return { success: false, error: 'المستند غير موجود', changes: [] };
            }

            // حساب التغييرات
            const changesMap: Record<string, { old: any; new: any }> = {};
            const cleanUpdates: Record<string, any> = {};

            // الحقول المسموح تعديلها في الـ Header
            const allowedFields = [
                'supplier_name', 'customer_name', 'notes', 'internal_notes',
                'supplier_notes', 'due_date', 'payment_terms_days',
                'currency', 'exchange_rate', 'tags',
            ];

            for (const field of allowedFields) {
                if (updates[field] !== undefined && updates[field] !== current[field]) {
                    changesMap[field] = { old: current[field], new: updates[field] };
                    cleanUpdates[field] = updates[field];
                    changes.push({ field, old: current[field], new: updates[field] });
                }
            }

            if (changes.length === 0) {
                return { success: true, changes: [], error: 'لا توجد تغييرات' };
            }

            // بناء سجل التعديل
            const editEntry: EditHistoryEntry = {
                edited_at: new Date().toISOString(),
                edited_by: userId,
                edited_by_name: userName,
                reason,
                changes: changesMap,
            };

            // تحديث edit_history و metadata
            const existingHistory = current.edit_history || [];
            const newHistory = [...existingHistory, editEntry];

            // حفظ التعديل
            const { error: updateErr } = await supabase
                .from(table)
                .update({
                    ...cleanUpdates,
                    edit_history: newHistory,
                    edit_count: (current.edit_count || 0) + 1,
                    last_edited_at: new Date().toISOString(),
                    last_edited_by: userId,
                })
                .eq('id', documentId);

            if (updateErr) {
                return { success: false, error: updateErr.message, changes: [] };
            }

            // تسجيل في activity_log
            activityLogService.logEdit(
                table,
                documentId,
                userId,
                userName,
                changesMap,
                reason,
            );

            return {
                success: true,
                changes,
                editHistoryEntry: editEntry,
            };

        } catch (err: any) {
            return { success: false, error: err.message, changes: [] };
        }
    },


    // ───────────────────────────────────────────────────────────
    // ③ تعديل بنود الفاتورة (الأصناف) — POS أو Workflow
    // ───────────────────────────────────────────────────────────

    async editTransactionItems(
        documentType: 'purchase' | 'sale',
        documentId: string,
        editedItems: ItemEdit[],
        userId: string,
        userName: string,
        reason?: string,
    ): Promise<InPlaceEditResult> {
        const table = TABLE_MAP[documentType] as 'purchase_transactions' | 'sales_transactions';
        const itemsTable = ITEMS_TABLE_MAP[documentType];
        const changes: FieldChange[] = [];

        try {
            // فحص الأهلية
            const eligibility = await this.checkEditEligibility({
                documentType,
                documentId,
                userId,
            });

            if (!eligibility.canEdit) {
                return { success: false, error: eligibility.reason, changes: [] };
            }

            // جلب المستند والبنود الحالية
            const { data: doc } = await supabase
                .from(table)
                .select('*')
                .eq('id', documentId)
                .single();

            if (!doc) {
                return { success: false, error: 'المستند غير موجود', changes: [] };
            }

            const { data: currentItems } = await supabase
                .from(itemsTable)
                .select('*')
                .eq('transaction_id', documentId)
                .order('line_number', { ascending: true });

            const oldItems = currentItems || [];
            const changesMap: Record<string, { old: any; new: any }> = {};

            // ─── وضع Workflow: السعر فقط ───
            if (eligibility.editMode === 'price_only') {
                for (const editItem of editedItems) {
                    if (!editItem.item_id) continue;

                    const oldItem = oldItems.find(i => i.id === editItem.item_id);
                    if (!oldItem) continue;

                    // فقط السعر مسموح بالتعديل
                    if (editItem.unit_price !== oldItem.unit_price) {
                        const subtotal = oldItem.quantity * editItem.unit_price - (editItem.discount_amount || 0);
                        const taxAmount = subtotal * ((editItem.tax_rate || oldItem.tax_rate || 0) / 100);
                        const total = subtotal + taxAmount;

                        await supabase
                            .from(itemsTable)
                            .update({
                                unit_price: editItem.unit_price,
                                subtotal,
                                tax_amount: taxAmount,
                                total,
                            })
                            .eq('id', editItem.item_id);

                        changesMap[`item_${editItem.item_id}_unit_price`] = {
                            old: oldItem.unit_price,
                            new: editItem.unit_price,
                        };
                        changes.push({
                            field: `بند: ${oldItem.description || oldItem.item_code} — السعر`,
                            old: oldItem.unit_price,
                            new: editItem.unit_price,
                        });
                    }
                }
            }

            // ─── وضع POS: تعديل شامل ───
            if (eligibility.editMode === 'full') {
                // حذف البنود المحذوفة
                const deletedItems = editedItems.filter(i => i._action === 'delete' && i.item_id);
                for (const delItem of deletedItems) {
                    const oldItem = oldItems.find(i => i.id === delItem.item_id);
                    if (oldItem) {
                        await supabase.from(itemsTable).delete().eq('id', delItem.item_id!);
                        changesMap[`item_deleted_${delItem.item_id}`] = {
                            old: { description: oldItem.description, quantity: oldItem.quantity },
                            new: null,
                        };
                        changes.push({
                            field: `حذف بند: ${oldItem.description || oldItem.item_code}`,
                            old: oldItem.quantity,
                            new: 0,
                        });
                    }
                }

                // تحديث البنود الموجودة
                const updatedItems = editedItems.filter(i => i._action === 'update' && i.item_id);
                for (const editItem of updatedItems) {
                    const oldItem = oldItems.find(i => i.id === editItem.item_id);
                    if (!oldItem) continue;

                    const subtotal = editItem.quantity * editItem.unit_price - (editItem.discount_amount || 0);
                    const taxRate = editItem.tax_rate ?? oldItem.tax_rate ?? 0;
                    const taxAmount = subtotal * (taxRate / 100);
                    const total = subtotal + taxAmount;

                    const itemUpdates: Record<string, any> = {
                        quantity: editItem.quantity,
                        unit_price: editItem.unit_price,
                        subtotal,
                        tax_amount: taxAmount,
                        total,
                    };

                    // رصد التغييرات
                    if (editItem.quantity !== oldItem.quantity) {
                        changesMap[`item_${editItem.item_id}_quantity`] = {
                            old: oldItem.quantity,
                            new: editItem.quantity,
                        };
                        changes.push({
                            field: `بند: ${oldItem.description || oldItem.item_code} — الكمية`,
                            old: oldItem.quantity,
                            new: editItem.quantity,
                        });
                    }
                    if (editItem.unit_price !== oldItem.unit_price) {
                        changesMap[`item_${editItem.item_id}_unit_price`] = {
                            old: oldItem.unit_price,
                            new: editItem.unit_price,
                        };
                        changes.push({
                            field: `بند: ${oldItem.description || oldItem.item_code} — السعر`,
                            old: oldItem.unit_price,
                            new: editItem.unit_price,
                        });
                    }

                    if (editItem.discount_amount !== undefined) {
                        itemUpdates.discount_amount = editItem.discount_amount;
                    }
                    if (editItem.notes !== undefined) {
                        itemUpdates.notes = editItem.notes;
                    }

                    await supabase
                        .from(itemsTable)
                        .update(itemUpdates)
                        .eq('id', editItem.item_id);
                }

                // إضافة بنود جديدة
                const newItems = editedItems.filter(i => i._action === 'add');
                if (newItems.length > 0) {
                    const maxLine = oldItems.reduce((max, i) => Math.max(max, i.line_number || 0), 0);
                    const newRows = newItems.map((item, idx) => {
                        const subtotal = item.quantity * item.unit_price - (item.discount_amount || 0);
                        const taxAmount = subtotal * ((item.tax_rate || 0) / 100);
                        const total = subtotal + taxAmount;

                        return {
                            transaction_id: documentId,
                            line_number: maxLine + idx + 1,
                            material_id: item.material_id || null,
                            color_id: item.color_id || null,
                            description: item.description || null,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            discount_amount: item.discount_amount || 0,
                            tax_rate: item.tax_rate || 0,
                            tax_amount: taxAmount,
                            subtotal,
                            total,
                            warehouse_id: item.warehouse_id || null,
                            notes: item.notes || null,
                        };
                    });

                    await supabase.from(itemsTable).insert(newRows);

                    for (const item of newItems) {
                        changesMap[`item_added_${item.description}`] = {
                            old: null,
                            new: { description: item.description, quantity: item.quantity, unit_price: item.unit_price },
                        };
                        changes.push({
                            field: `إضافة بند: ${item.description}`,
                            old: null,
                            new: item.quantity,
                        });
                    }
                }
            }

            if (changes.length === 0) {
                return { success: true, changes: [], error: 'لا توجد تغييرات في البنود' };
            }

            // ─── إعادة حساب الإجماليات ───
            const { data: updatedItems } = await supabase
                .from(itemsTable)
                .select('subtotal, tax_amount, total')
                .eq('transaction_id', documentId);

            const newSubtotal = (updatedItems || []).reduce((s, i) => s + Number(i.subtotal || 0), 0);
            const newTaxAmount = (updatedItems || []).reduce((s, i) => s + Number(i.tax_amount || 0), 0);
            const newTotalAmount = (updatedItems || []).reduce((s, i) => s + Number(i.total || 0), 0);

            // حفظ التغيير مع الإجماليات الجديدة
            const prevSubtotal = Number(doc.subtotal || 0);
            const prevTotal = Number(doc.total_amount || 0);

            if (newSubtotal !== prevSubtotal || newTotalAmount !== prevTotal) {
                changesMap['subtotal'] = { old: prevSubtotal, new: newSubtotal };
                changesMap['total_amount'] = { old: prevTotal, new: newTotalAmount };
            }

            const editEntry: EditHistoryEntry = {
                edited_at: new Date().toISOString(),
                edited_by: userId,
                edited_by_name: userName,
                reason,
                changes: changesMap,
            };

            const existingHistory = doc.edit_history || [];

            await supabase
                .from(table)
                .update({
                    subtotal: newSubtotal,
                    tax_amount: newTaxAmount,
                    total_amount: newTotalAmount,
                    edit_history: [...existingHistory, editEntry],
                    edit_count: (doc.edit_count || 0) + 1,
                    last_edited_at: new Date().toISOString(),
                    last_edited_by: userId,
                })
                .eq('id', documentId);

            // تسجيل في activity_log
            activityLogService.logEdit(table, documentId, userId, userName, changesMap, reason);

            return {
                success: true,
                changes,
                editHistoryEntry: editEntry,
                journalEntryUpdated: false, // سيتم في الخطوة القادمة
                stockUpdated: false,
            };

        } catch (err: any) {
            return { success: false, error: err.message, changes: [] };
        }
    },


    // ───────────────────────────────────────────────────────────
    // ④ تعديل قيد محاسبي يدوي مباشرة
    // ───────────────────────────────────────────────────────────

    async editJournalEntry(
        entryId: string,
        updates: {
            description?: string;
            entry_date?: string;
            lines?: { account_id: string; debit: number; credit: number; description?: string }[];
        },
        userId: string,
        userName: string,
        reason?: string,
    ): Promise<InPlaceEditResult> {
        const changes: FieldChange[] = [];

        try {
            // فحص الأهلية
            const eligibility = await this.checkEditEligibility({
                documentType: 'journal_entry',
                documentId: entryId,
                userId,
            });

            if (!eligibility.canEdit) {
                return { success: false, error: eligibility.reason, changes: [] };
            }

            // جلب القيد الحالي
            const { data: entry } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('id', entryId)
                .single();

            if (!entry) {
                return { success: false, error: 'القيد غير موجود', changes: [] };
            }

            const changesMap: Record<string, { old: any; new: any }> = {};

            // تعديل الوصف والتاريخ
            const headerUpdates: Record<string, any> = {};

            if (updates.description && updates.description !== entry.description) {
                changesMap['description'] = { old: entry.description, new: updates.description };
                headerUpdates.description = updates.description;
                changes.push({ field: 'الوصف', old: entry.description, new: updates.description });
            }

            if (updates.entry_date && updates.entry_date !== entry.entry_date) {
                changesMap['entry_date'] = { old: entry.entry_date, new: updates.entry_date };
                headerUpdates.entry_date = updates.entry_date;
                changes.push({ field: 'التاريخ', old: entry.entry_date, new: updates.entry_date });
            }

            // تعديل البنود
            if (updates.lines) {
                const totalDebit = updates.lines.reduce((s, l) => s + (l.debit || 0), 0);
                const totalCredit = updates.lines.reduce((s, l) => s + (l.credit || 0), 0);

                // التحقق من التوازن
                if (Math.abs(totalDebit - totalCredit) > 0.01) {
                    return {
                        success: false,
                        error: 'القيد غير متوازن! المدين يجب أن يساوي الدائن',
                        changes: [],
                    };
                }

                changesMap['total_debit'] = { old: entry.total_debit, new: totalDebit };
                changesMap['total_credit'] = { old: entry.total_credit, new: totalCredit };
                headerUpdates.total_debit = totalDebit;
                headerUpdates.total_credit = totalCredit;

                changes.push({
                    field: 'إجمالي المدين',
                    old: entry.total_debit,
                    new: totalDebit,
                });

                // حذف البنود القديمة
                const { data: tenantData } = await supabase
                    .from('journal_entries')
                    .select('tenant_id')
                    .eq('id', entryId)
                    .single();

                await supabase
                    .from('journal_entry_lines')
                    .delete()
                    .eq('entry_id', entryId);

                // إدخال البنود الجديدة
                const linesData = updates.lines.map((line, index) => ({
                    tenant_id: tenantData?.tenant_id,
                    entry_id: entryId,
                    line_number: index + 1,
                    account_id: line.account_id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    description: line.description || null,
                }));

                await supabase.from('journal_entry_lines').insert(linesData);
            }

            if (changes.length === 0) {
                return { success: true, changes: [], error: 'لا توجد تغييرات' };
            }

            // حفظ edit_history
            const editEntry: EditHistoryEntry = {
                edited_at: new Date().toISOString(),
                edited_by: userId,
                edited_by_name: userName,
                reason,
                changes: changesMap,
            };

            const existingHistory = entry.edit_history || [];

            await supabase
                .from('journal_entries')
                .update({
                    ...headerUpdates,
                    edit_history: [...existingHistory, editEntry],
                    edit_count: (entry.edit_count || 0) + 1,
                    last_edited_at: new Date().toISOString(),
                    last_edited_by: userId,
                })
                .eq('id', entryId);

            // تسجيل في activity_log
            activityLogService.logEdit(
                'journal_entries',
                entryId,
                userId,
                userName,
                changesMap,
                reason,
            );

            return {
                success: true,
                changes,
                editHistoryEntry: editEntry,
                journalEntryUpdated: true,
            };

        } catch (err: any) {
            return { success: false, error: err.message, changes: [] };
        }
    },


    // ───────────────────────────────────────────────────────────
    // ⑤ جلب سجل التعديلات لمستند
    // ───────────────────────────────────────────────────────────

    async getEditHistory(
        documentType: EditableDocumentType,
        documentId: string,
    ): Promise<EditHistoryEntry[]> {
        const table = TABLE_MAP[documentType];

        const { data, error } = await supabase
            .from(table)
            .select('edit_history, edit_count, last_edited_at, last_edited_by')
            .eq('id', documentId)
            .single();

        if (error || !data) return [];
        return data.edit_history || [];
    },


    // ───────────────────────────────────────────────────────────
    // ⑥ هل المستند مُعدّل سابقاً؟ (للبادج)
    // ───────────────────────────────────────────────────────────

    async isEdited(
        documentType: EditableDocumentType,
        documentId: string,
    ): Promise<{ edited: boolean; editCount: number; lastEditedAt: string | null }> {
        const table = TABLE_MAP[documentType];

        const { data } = await supabase
            .from(table)
            .select('edit_count, last_edited_at')
            .eq('id', documentId)
            .single();

        return {
            edited: (data?.edit_count || 0) > 0,
            editCount: data?.edit_count || 0,
            lastEditedAt: data?.last_edited_at || null,
        };
    },
};

export default inPlaceEditService;
