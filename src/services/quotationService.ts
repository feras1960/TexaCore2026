/**
 * 🛒 Quotation Service
 * خدمة عروض الأسعار — حفظ/تحميل مسودات السلة
 * 
 * ✅ Constitution Law 2: All Supabase calls centralized here
 */

import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/CartContext';

export interface QuotationDraft {
    id?: string;
    tenant_id: string;
    company_id: string;
    quotation_number: string;
    quotation_date: string;
    customer_id?: string;
    customer_name?: string;
    currency: string;
    subtotal: number;
    total_amount: number;
    status: string;
    notes?: string;
    created_by?: string;
}

export interface QuotationItem {
    quotation_id: string;
    tenant_id: string;
    line_number: number;
    material_id?: string;
    roll_id?: string;
    warehouse_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    total: number;
    notes?: string;
}

// Generate unique quotation number
async function generateQuotationNumber(companyId: string): Promise<string> {
    const today = new Date();
    const prefix = `QT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    try {
        const { data, error } = await supabase
            .from('quotations')
            .select('quotation_number')
            .eq('company_id', companyId)
            .ilike('quotation_number', `${prefix}%`)
            .order('quotation_number', { ascending: false })
            .limit(1);

        if (error || !data?.length) {
            return `${prefix}-0001`;
        }

        const lastNum = data[0].quotation_number;
        const numPart = parseInt(lastNum.split('-').pop() || '0', 10);
        return `${prefix}-${String(numPart + 1).padStart(4, '0')}`;
    } catch {
        return `${prefix}-${Date.now().toString().slice(-4)}`;
    }
}

export const quotationService = {
    /**
     * Save cart as draft quotation
     * حفظ السلة كمسودة عرض سعر
     */
    async saveDraft(params: {
        tenantId: string;
        companyId: string;
        items: CartItem[];
        customerId?: string;
        customerName?: string;
        currency: string;
        totalAmount: number;
        notes?: string;
        userId?: string;
    }): Promise<{ quotationId: string; quotationNumber: string }> {
        const quotationNumber = await generateQuotationNumber(params.companyId);

        // 1. Create quotation
        const { data: quotation, error: qError } = await supabase
            .from('quotations')
            .insert({
                tenant_id: params.tenantId,
                company_id: params.companyId,
                quotation_number: quotationNumber,
                quotation_date: new Date().toISOString().split('T')[0],
                customer_id: params.customerId || null,
                customer_name: params.customerName || null,
                currency: params.currency,
                subtotal: params.totalAmount,
                total_amount: params.totalAmount,
                status: 'draft',
                notes: params.notes || null,
                created_by: params.userId || null,
            })
            .select('id')
            .single();

        if (qError || !quotation) {
            throw new Error(`فشل في إنشاء عرض السعر: ${qError?.message}`);
        }

        // 2. Create items
        const items: QuotationItem[] = params.items.map((item, index) => ({
            quotation_id: quotation.id,
            tenant_id: params.tenantId,
            line_number: index + 1,
            material_id: item.material_id || null,
            roll_id: null,
            warehouse_id: item.warehouse_id || null,
            description: item.material_name_ar || item.material_name_en || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            total: item.subtotal,
            notes: item.notes || null,
        }));

        const { error: iError } = await supabase
            .from('sales_transaction_items')
            .insert(items);

        if (iError) {
            // Cleanup: delete quotation if items failed
            await supabase.from('quotations').delete().eq('id', quotation.id);
            throw new Error(`فشل في حفظ البنود: ${iError.message}`);
        }

        return { quotationId: quotation.id, quotationNumber };
    },

    /**
     * Load a draft quotation into cart format
     * تحميل مسودة عرض سعر
     */
    async loadDraft(quotationId: string): Promise<{
        quotation: any;
        items: CartItem[];
    }> {
        // Fetch quotation
        const { data: quotation, error: qError } = await supabase
            .from('quotations')
            .select('*')
            .eq('id', quotationId)
            .single();

        if (qError || !quotation) {
            throw new Error(`فشل في تحميل عرض السعر: ${qError?.message}`);
        }

        // Fetch items
        const { data: items, error: iError } = await supabase
            .from('sales_transaction_items')
            .select(`
        *,
        material:fabric_materials(id, name_ar, name_en, code),
        warehouse:warehouses(id, name_ar, name_en)
      `)
            .eq('quotation_id', quotationId)
            .order('line_number', { ascending: true });

        if (iError) {
            throw new Error(`فشل في تحميل البنود: ${iError.message}`);
        }

        // Convert to CartItem format
        const cartItems: CartItem[] = (items || []).map((item: any) => ({
            id: item.id,
            material_id: item.material_id || '',
            material_name_ar: item.material?.name_ar || item.description || '',
            material_name_en: item.material?.name_en || '',
            material_code: item.material?.code || '',
            quantity: Number(item.quantity),
            unit: 'meter',
            warehouse_id: item.warehouse_id || '',
            warehouse_name_ar: item.warehouse?.name_ar || '',
            warehouse_name_en: item.warehouse?.name_en || '',
            preferred_rolls: [],
            unit_price: Number(item.unit_price),
            currency: quotation.currency || 'SAR',
            subtotal: Number(item.total),
            added_at: item.created_at || new Date().toISOString(),
            notes: item.notes || undefined,
        }));

        return { quotation, items: cartItems };
    },

    /**
     * Get draft quotations
     * جلب المسودات
     */
    async getDrafts(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('quotations')
            .select('id, quotation_number, quotation_date, customer_name, total_amount, currency, status, created_at')
            .eq('company_id', companyId)
            .eq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.warn('getDrafts error:', error.message);
            return [];
        }
        return data || [];
    },

    /**
     * Delete a draft quotation
     * حذف مسودة
     */
    async deleteDraft(quotationId: string): Promise<void> {
        // Items will cascade-delete
        const { error } = await supabase
            .from('quotations')
            .delete()
            .eq('id', quotationId)
            .eq('status', 'draft');

        if (error) {
            throw new Error(`فشل في حذف المسودة: ${error.message}`);
        }
    },
};

export default quotationService;
