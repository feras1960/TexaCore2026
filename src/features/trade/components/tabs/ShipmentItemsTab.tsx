/**
 * 📦 ShipmentItemsTab — تبويب بنود الكونتينر
 * 
 * Container Items Tab with 3 view modes:
 * 1. Flat Table with filters
 * 2. Grouped by Supplier (Accordion)
 * 3. Grouped by Invoice (Accordion)
 * 
 * Features:
 * - Smart filters (supplier, invoice, material, color, status)
 * - RBAC-based column visibility (cost/supplier hidden from sales staff)
 * - Summary statistics bar
 * - Available quantity tracking with reservation support
 * - 🛒 Transit reservation cart (Phase 13B-3)
 * 
 * @module ShipmentItemsTab
 * @phase 13B-2 + 13B-3
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Package,
    Search,
    LayoutGrid,
    Building2,
    FileText,
    ChevronDown,
    ChevronRight,
    Filter,
    X,
    Box,
    Truck,
    ShoppingCart,
    BarChart3,
    Eye,
    EyeOff,
    RefreshCw,
    Plus,
    Check,
    Trash2,
    Lock,
    AlertTriangle,
    Unlink,
} from 'lucide-react';
import { useTransitCart } from '../../hooks/useTransitCart';
import { TransitCartDrawer } from '../TransitCartDrawer';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ShipmentItem {
    id: string;
    shipment_id: string;
    material_id: string | null;
    color_id: string | null;
    product_id: string | null;
    purchase_invoice_id: string | null;
    supplier_id: string | null;

    item_description: string;
    material_code: string;
    color_name: string;
    supplier_name: string;
    invoice_number: string;

    expected_rolls: number;
    received_rolls: number;
    expected_quantity: number;
    received_quantity: number;
    unit: string;
    reserved_quantity: number;
    sold_quantity: number;
    available_quantity: number;

    unit_price: number;
    total_price: number;
    provisional_unit_cost: number;
    final_unit_cost: number;
    allocated_costs: number;
    total_provisional_cost: number;
    total_final_cost: number;
    expected_sell_price: number;
    weight_kg: number;

    notes: string;
    created_at: string;
}

interface ShipmentItemsTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
    onClose?: () => void;
}

type ViewMode = 'table' | 'by_supplier' | 'by_invoice';

interface FilterState {
    search: string;
    supplier: string;
    invoice: string;
    material: string;
    color: string;
}

// ═══════════════════════════════════════════════════════════════
// RBAC Permissions Hook (Container-specific)
// ═══════════════════════════════════════════════════════════════

function useContainerPermissions() {
    // For now, assume admin/manager can see everything
    // This will be enhanced in Phase 13B-4 with real RBAC
    const [userRole, setUserRole] = useState<string>('admin');

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role) {
                    setUserRole(profile.role);
                }
            }
        };
        fetchRole();
    }, []);

    return {
        canSeeCostPrice: ['manager', 'admin', 'owner', 'super_admin'].includes(userRole),
        canSeeSupplierInfo: ['manager', 'admin', 'owner', 'super_admin'].includes(userRole),
        canSeeMargin: ['manager', 'admin', 'owner', 'super_admin'].includes(userRole),
        canSeeClientPrice: ['sales', 'sales_manager', 'manager', 'admin', 'owner', 'super_admin'].includes(userRole),
        canSeeAccounting: ['admin', 'owner', 'super_admin'].includes(userRole),
        canCreateReservation: ['sales', 'sales_manager', 'manager', 'admin', 'owner', 'super_admin'].includes(userRole),
        userRole,
    };
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const ShipmentItemsTab: React.FC<ShipmentItemsTabProps> = ({
    data,
    mode,
    onChange,
    onClose,
}) => {
    const { t, isRTL } = useLanguage();
    const { companyId } = useCompany();
    const { currencyCode: companyCurrency } = useCompanyCurrency();
    const permissions = useContainerPermissions();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        supplier: 'all',
        invoice: 'all',
        material: 'all',
        color: 'all',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importingInvoiceId, setImportingInvoiceId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const containerId = data?.id;
    const tenantId = data?.tenant_id;

    // 🛒 Transit Cart
    const transitCart = useTransitCart(containerId || '');

    // ── Fetch Items ──
    const { data: items = [], isLoading, refetch } = useQuery({
        queryKey: ['container-items', containerId],
        queryFn: async () => {
            if (!containerId) return [];

            const { data: result, error } = await supabase
                .from('container_items')
                .select(`
                    *,
                    material:fabric_materials(id, name_ar, name_en, code, tax_rate),
                    color:fabric_colors(id, name, name_en),
                    supplier_ref:suppliers(id, name_ar, name_en)
                `)
                .eq('container_id', containerId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching container items:', error);
                return [];
            }

            return (result || []).map((item: any) => {
                // For materials without colors, keep color_name as null
                const hasColor = !!(item.color_id);
                const resolvedColorName = hasColor
                    ? (item.color_name || item.color?.name || item.color?.name_en || '')
                    : null;

                // Material description fallback chain (respects current language)
                const matName = isRTL
                    ? (item.material?.name_ar || item.material?.name_en || '')
                    : (item.material?.name_en || item.material?.name_ar || '');
                const resolvedDescription = item.item_description || matName || '';

                return {
                    ...item,
                    shipment_id: containerId, // compat
                    item_description: resolvedDescription,
                    material_code: item.material_code || item.material?.code || '',
                    color_name: resolvedColorName,
                    supplier_name: item.supplier_name || item.supplier_ref?.name_ar || item.supplier_ref?.name_en || '',
                    invoice_number: item.invoice_no || '',
                    purchase_invoice_id: item.purchase_invoice_id || null,
                    available_quantity: item.available_quantity || ((item.expected_quantity || 0) - (item.reserved_quantity || 0) - (item.sold_quantity || 0)),
                };
            });
        },
        enabled: !!containerId,
    });

    // ── Fetch total tax from actual (posted) expenses ──
    const { data: totalActualTax = 0 } = useQuery({
        queryKey: ['container-actual-tax', containerId],
        queryFn: async () => {
            if (!containerId) return 0;
            const { data: rows } = await supabase
                .from('container_expenses')
                .select('tax_amount')
                .eq('container_id', containerId)
                .not('vendor_account_id', 'is', null); // فقط الفعلية
            return (rows || []).reduce((sum: number, r: any) => sum + (r.tax_amount || 0), 0);
        },
        enabled: !!containerId,
    });

    // ── حساب الضريبة الموزعة على كل بند حسب نسبته من القيمة ──
    const itemTaxMap = useMemo(() => {
        const map: Record<string, number> = {};
        if (!totalActualTax || !items.length) return map;
        const totalValue = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.expected_quantity || 0)), 0);
        if (totalValue <= 0) return map;
        for (const item of items) {
            const itemValue = (item.unit_price || 0) * (item.expected_quantity || 0);
            map[item.id] = (itemValue / totalValue) * totalActualTax;
        }
        return map;
    }, [items, totalActualTax]);

    // ── Fetch confirmed international purchase invoices for import ──
    const { data: availableInvoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ['international-invoices-for-container', companyId, containerId],
        queryFn: async () => {
            if (!companyId) return [];

            // 1. Get all confirmed international invoices
            const { data: invoices, error } = await supabase
                .from('purchase_transactions')
                .select(`
                    id, invoice_no, invoice_date, doc_date, supplier_id,
                    subtotal, total_amount, currency, stage, receipt_mode,
                    supplier:suppliers(id, name_ar, name_en)
                `)
                .eq('company_id', companyId)
                .eq('receipt_mode', 'international')
                .in('stage', ['posted', 'partial_paid', 'paid'])
                .order('invoice_date', { ascending: false });

            if (error) {
                console.warn('Error fetching international invoices:', error);
                return [];
            }

            // 2. Get invoice IDs already imported into ANY container
            const { data: imported } = await supabase
                .from('container_items')
                .select('purchase_invoice_id')
                .not('purchase_invoice_id', 'is', null);

            const importedIds = new Set(
                (imported || []).map((i: any) => i.purchase_invoice_id)
            );

            // 3. Filter out already-imported invoices
            return (invoices || []).filter((inv: any) => !importedIds.has(inv.id));
        },
        enabled: !!companyId && (mode === 'edit' || mode === 'create'),
    });

    // ── Import items from an invoice into this container ──
    const handleImportFromInvoice = async (invoiceId: string) => {
        if (!containerId || !tenantId) {
            toast.error(isRTL ? 'يرجى حفظ الكونتينر أولاً' : 'Please save the container first');
            return;
        }
        setImportingInvoiceId(invoiceId);
        try {
            // Check if this invoice was already imported to THIS container
            const { data: existingItems } = await supabase
                .from('container_items')
                .select('id')
                .eq('container_id', containerId)
                .eq('purchase_invoice_id', invoiceId)
                .limit(1);

            if (existingItems && existingItems.length > 0) {
                toast.warning(isRTL ? 'هذه الفاتورة مستوردة بالفعل في هذا الكونتينر' : 'This invoice is already imported in this container');
                setImportingInvoiceId(null);
                return;
            }

            // Fetch invoice items (all needed data is directly in the table)
            const { data: invoiceItems, error: itemsError } = await supabase
                .from('purchase_transaction_items')
                .select('*')
                .eq('transaction_id', invoiceId);

            if (itemsError) throw itemsError;
            if (!invoiceItems || invoiceItems.length === 0) {
                toast.warning(isRTL ? 'لا توجد بنود في هذه الفاتورة' : 'No items in this invoice');
                return;
            }

            // Get invoice header for supplier info
            const invoice = availableInvoices.find((inv: any) => inv.id === invoiceId);
            const sup = Array.isArray(invoice?.supplier) ? invoice?.supplier?.[0] : invoice?.supplier;
            const supplierName = isRTL
                ? sup?.name_ar || sup?.name_en || ''
                : sup?.name_en || sup?.name_ar || '';

            // Map invoice items to container_items (denormalized for performance)
            const containerItems = invoiceItems.map((item: any) => {
                const itemDescription = item.description || item.description_ar || '';

                return {
                    tenant_id: tenantId,
                    container_id: containerId,
                    purchase_invoice_id: invoiceId,
                    invoice_no: invoice?.invoice_no || '',
                    supplier_id: invoice?.supplier_id || null,
                    supplier_name: supplierName,
                    material_id: item.material_id || null,
                    product_id: item.product_id || null,
                    color_id: item.color_id || null,
                    item_description: itemDescription,
                    material_code: item.item_code || '',
                    color_name: item.color_name || null,
                    expected_quantity: Number(item.quantity) || 0,
                    expected_rolls: item.rolls_count || null,
                    unit_cost: Number(item.unit_price) || 0,
                    unit: item.unit || 'meter',
                    unit_price: Number(item.unit_price) || 0,
                    total_price: Number(item.subtotal || item.total) || 0,
                    notes: `Imported from invoice: ${invoice?.invoice_no || invoiceId.substring(0, 8)}`,
                };
            });

            const { error: insertError } = await supabase
                .from('container_items')
                .insert(containerItems);

            if (insertError) throw insertError;

            toast.success(
                isRTL
                    ? `تم استيراد ${containerItems.length} بنود من الفاتورة`
                    : `Imported ${containerItems.length} items from invoice`
            );

            // Link the invoice directly to this container
            await supabase
                .from('purchase_transactions')
                .update({
                    container_id: containerId,
                    container_number: data?.container_number || null,
                    container_status: data?.status || 'draft'
                })
                .eq('id', invoiceId);

            // Refresh items list + available invoices + purchase cycle
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
            queryClient.invalidateQueries({ queryKey: ['international-invoices-for-container'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
            setShowImportDialog(false);
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(isRTL ? 'خطأ في الاستيراد: ' + err.message : 'Import error: ' + err.message);
        } finally {
            setImportingInvoiceId(null);
        }
    };

    // ── Container locked status (no edits when received or closed) ──
    const isContainerLocked = ['received', 'closed'].includes(data?.status || '');
    const effectiveMode = isContainerLocked ? 'view' : mode;

    // ── Delete a single item ──
    const handleDeleteItem = async (itemId: string) => {
        if (isContainerLocked) return;
        const confirmed = window.confirm(
            isRTL ? 'هل أنت متأكد من حذف هذا البند؟' : 'Are you sure you want to delete this item?'
        );
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('container_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            toast.success(isRTL ? 'تم حذف البند' : 'Item deleted');
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
            queryClient.invalidateQueries({ queryKey: ['international-invoices-for-container'] });
        } catch (err: any) {
            toast.error(isRTL ? 'خطأ في الحذف: ' + err.message : 'Delete error: ' + err.message);
        }
    };

    // ── Delete all items from a specific invoice ──
    const handleDeleteInvoiceItems = async (invoiceId: string, invoiceNo: string) => {
        if (isContainerLocked) return;
        const confirmed = window.confirm(
            isRTL
                ? `هل أنت متأكد من حذف جميع بنود الفاتورة ${invoiceNo}؟`
                : `Are you sure you want to delete all items from invoice ${invoiceNo}?`
        );
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('container_items')
                .delete()
                .eq('container_id', containerId)
                .eq('purchase_invoice_id', invoiceId);

            if (error) throw error;

            // Unlink the invoice from this container — clear ALL container fields
            await supabase
                .from('purchase_transactions')
                .update({ container_id: null, container_number: null, container_status: null })
                .eq('id', invoiceId);

            toast.success(isRTL ? `تم حذف بنود الفاتورة ${invoiceNo}` : `Invoice ${invoiceNo} items deleted`);
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
            queryClient.invalidateQueries({ queryKey: ['international-invoices-for-container'] });
            queryClient.invalidateQueries({ queryKey: ['available_invoices_for_container'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
        } catch (err: any) {
            toast.error(isRTL ? 'خطأ في الحذف: ' + err.message : 'Delete error: ' + err.message);
        }
    };

    // ── Unlink invoice from container (remove items + free the invoice) ──
    const handleUnlinkInvoice = async (invoiceId: string, invoiceNo: string) => {
        if (isContainerLocked) return;
        const confirmed = window.confirm(
            isRTL
                ? `هل أنت متأكد من فك ارتباط الفاتورة ${invoiceNo} من هذا الكونتينر؟\nسيتم حذف بنود الفاتورة من الكونتينر وتحرير الفاتورة.`
                : `Are you sure you want to unlink invoice ${invoiceNo} from this container?\nInvoice items will be removed and the invoice will be freed.`
        );
        if (!confirmed) return;

        try {
            // 1. Delete invoice items from container_items
            await supabase
                .from('container_items')
                .delete()
                .eq('container_id', containerId)
                .eq('purchase_invoice_id', invoiceId);

            // 2. Clear all container fields from the invoice
            const { error } = await supabase
                .from('purchase_transactions')
                .update({ container_id: null, container_number: null, container_status: null })
                .eq('id', invoiceId);

            if (error) throw error;

            toast.success(
                isRTL
                    ? `✅ تم فك ارتباط الفاتورة ${invoiceNo} — يمكن إضافتها لكونتينر آخر`
                    : `✅ Invoice ${invoiceNo} unlinked — can be added to another container`
            );
            queryClient.invalidateQueries({ queryKey: ['container-items', containerId] });
            queryClient.invalidateQueries({ queryKey: ['international-invoices-for-container'] });
            queryClient.invalidateQueries({ queryKey: ['available_invoices_for_container'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_cycle_full'] });
        } catch (err: any) {
            toast.error(isRTL ? 'خطأ في فك الارتباط: ' + err.message : 'Unlink error: ' + err.message);
        }
    };

    // ── Delete the entire container (only if empty) ──
    const handleDeleteContainer = async () => {
        if (items.length > 0) {
            toast.error(isRTL ? 'لا يمكن حذف كونتينر يحتوي على بنود. احذف البنود أولاً.' : 'Cannot delete a container with items. Delete items first.');
            return;
        }
        const confirmed = window.confirm(
            isRTL ? 'هل أنت متأكد من حذف هذا الكونتينر نهائياً؟' : 'Are you sure you want to permanently delete this container?'
        );
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('containers')
                .delete()
                .eq('id', containerId);

            if (error) throw error;

            toast.success(isRTL ? 'تم حذف الكونتينر' : 'Container deleted');
            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
            // Close the sheet
            if (typeof onClose === 'function') onClose();
        } catch (err: any) {
            toast.error(isRTL ? 'خطأ في الحذف: ' + err.message : 'Delete error: ' + err.message);
        }
    };

    // ── Filter Options ──
    const filterOptions = useMemo(() => {
        const suppliers = new Map<string, string>();
        const invoices = new Map<string, string>();
        const materials = new Map<string, string>();
        const colors = new Map<string, string>();

        items.forEach((item: ShipmentItem) => {
            if (item.supplier_id && item.supplier_name) {
                suppliers.set(item.supplier_id, item.supplier_name);
            }
            if (item.purchase_invoice_id && item.invoice_number) {
                invoices.set(item.purchase_invoice_id, item.invoice_number);
            }
            if (item.material_id && item.item_description) {
                materials.set(item.material_id, item.item_description);
            }
            if (item.color_id && item.color_name) {
                colors.set(item.color_id, item.color_name);
            }
        });

        return {
            suppliers: Array.from(suppliers.entries()),
            invoices: Array.from(invoices.entries()),
            materials: Array.from(materials.entries()),
            colors: Array.from(colors.entries()),
        };
    }, [items]);

    // ── Filtered Items ──
    const filteredItems = useMemo(() => {
        return items.filter((item: ShipmentItem) => {
            // Search filter
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const matchesSearch =
                    (item.item_description || '').toLowerCase().includes(q) ||
                    (item.material_code || '').toLowerCase().includes(q) ||
                    (item.color_name || '').toLowerCase().includes(q) ||
                    (item.supplier_name || '').toLowerCase().includes(q) ||
                    (item.invoice_number || '').toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }

            if (filters.supplier !== 'all' && item.supplier_id !== filters.supplier) return false;
            if (filters.invoice !== 'all' && item.purchase_invoice_id !== filters.invoice) return false;
            if (filters.material !== 'all' && item.material_id !== filters.material) return false;
            if (filters.color !== 'all' && item.color_id !== filters.color) return false;

            return true;
        });
    }, [items, filters]);

    // ── Grouped Data ──
    const groupedBySupplier = useMemo(() => {
        const groups: Record<string, { name: string; items: ShipmentItem[]; totalValue: number }> = {};
        filteredItems.forEach((item: ShipmentItem) => {
            const key = item.supplier_id || 'unknown';
            if (!groups[key]) {
                groups[key] = {
                    name: item.supplier_name || (isRTL ? 'مورد غير محدد' : 'Unknown Supplier'),
                    items: [],
                    totalValue: 0,
                };
            }
            groups[key].items.push(item);
            groups[key].totalValue += item.total_price || 0;
        });
        return groups;
    }, [filteredItems, isRTL]);

    const groupedByInvoice = useMemo(() => {
        const groups: Record<string, { number: string; supplier: string; items: ShipmentItem[]; totalValue: number }> = {};
        filteredItems.forEach((item: ShipmentItem) => {
            const key = item.purchase_invoice_id || 'unknown';
            if (!groups[key]) {
                groups[key] = {
                    number: item.invoice_number || (isRTL ? 'بدون فاتورة' : 'No Invoice'),
                    supplier: item.supplier_name || '',
                    items: [],
                    totalValue: 0,
                };
            }
            groups[key].items.push(item);
            groups[key].totalValue += item.total_price || 0;
        });
        return groups;
    }, [filteredItems, isRTL]);

    // ── Summary Stats ──
    const summary = useMemo(() => {
        const totalItems = filteredItems.length;
        const totalQty = filteredItems.reduce((s: number, i: ShipmentItem) => s + (i.expected_quantity || 0), 0);
        const totalReserved = filteredItems.reduce((s: number, i: ShipmentItem) => s + (i.reserved_quantity || 0), 0);
        const totalAvailable = filteredItems.reduce((s: number, i: ShipmentItem) => s + (i.available_quantity || 0), 0);
        const totalValue = filteredItems.reduce((s: number, i: ShipmentItem) => s + (i.total_price || 0), 0);
        const totalProvCost = filteredItems.reduce((s: number, i: ShipmentItem) => s + (i.total_provisional_cost || 0), 0);
        return { totalItems, totalQty, totalReserved, totalAvailable, totalValue, totalProvCost };
    }, [filteredItems]);

    const hasActiveFilters = filters.search || filters.supplier !== 'all' || filters.invoice !== 'all' || filters.material !== 'all' || filters.color !== 'all';

    const clearFilters = () => {
        setFilters({ search: '', supplier: 'all', invoice: 'all', material: 'all', color: 'all' });
    };

    const toggleGroup = (key: string) => {
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const fmt = (n: number) => n?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || '0';

    // ═══════════════════════════════════════════════════════════════
    // Render — Summary Stats Bar
    // ═══════════════════════════════════════════════════════════════
    const renderSummary = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 rounded-lg p-3 border border-blue-200/50">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {isRTL ? 'عدد البنود' : 'Total Items'}
                </div>
                <div className="text-xl font-bold text-blue-800 dark:text-blue-200 font-mono">
                    {summary.totalItems}
                </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 rounded-lg p-3 border border-emerald-200/50">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {isRTL ? 'الكمية المتوقعة' : 'Expected Qty'}
                </div>
                <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 font-mono">
                    {fmt(summary.totalQty)}
                </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 rounded-lg p-3 border border-amber-200/50">
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {isRTL ? 'المحجوز' : 'Reserved'}
                </div>
                <div className="text-xl font-bold text-amber-800 dark:text-amber-200 font-mono">
                    {fmt(summary.totalReserved)}
                </div>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/50 dark:to-cyan-900/30 rounded-lg p-3 border border-cyan-200/50">
                <div className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    {isRTL ? 'المتاح' : 'Available'}
                </div>
                <div className="text-xl font-bold text-cyan-800 dark:text-cyan-200 font-mono">
                    {fmt(summary.totalAvailable)}
                </div>
            </div>
            {permissions.canSeeCostPrice && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 rounded-lg p-3 border border-purple-200/50">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {isRTL ? 'قيمة البضاعة' : 'Goods Value'}
                    </div>
                    <div className="text-xl font-bold text-purple-800 dark:text-purple-200 font-mono">
                        {fmt(summary.totalValue)}
                    </div>
                </div>
            )}
            {permissions.canSeeCostPrice && (
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 rounded-lg p-3 border border-rose-200/50">
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {isRTL ? 'التكلفة المتوقعة' : 'Est. Cost'}
                    </div>
                    <div className="text-xl font-bold text-rose-800 dark:text-rose-200 font-mono">
                        {fmt(summary.totalProvCost)}
                    </div>
                </div>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════
    // Render — View Mode Switcher + Filter Bar
    // ═══════════════════════════════════════════════════════════════
    const renderToolbar = () => (
        <div className="space-y-3 mb-4">
            {/* Row 1: View mode + search + actions */}
            <div className="flex flex-wrap items-center gap-2">
                {/* View mode buttons */}
                <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                    <Button
                        variant={viewMode === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        onClick={() => setViewMode('table')}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        {isRTL ? 'جدول' : 'Table'}
                    </Button>
                    {permissions.canSeeSupplierInfo && (
                        <Button
                            variant={viewMode === 'by_supplier' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1"
                            onClick={() => setViewMode('by_supplier')}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            {isRTL ? 'بالمورد' : 'Supplier'}
                        </Button>
                    )}
                    {permissions.canSeeSupplierInfo && (
                        <Button
                            variant={viewMode === 'by_invoice' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1"
                            onClick={() => setViewMode('by_invoice')}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {isRTL ? 'بالفاتورة' : 'Invoice'}
                        </Button>
                    )}
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? 'right-2.5' : 'left-2.5')} />
                    <Input
                        placeholder={isRTL ? 'بحث بالاسم، الكود، اللون، المورد...' : 'Search by name, code, color, supplier...'}
                        value={filters.search}
                        onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                        className={cn("h-8 text-sm", isRTL ? 'pr-8' : 'pl-8')}
                    />
                </div>

                {/* Filter toggle */}
                <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-3.5 h-3.5" />
                    {isRTL ? 'فلاتر' : 'Filters'}
                    {hasActiveFilters && (
                        <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                            !
                        </Badge>
                    )}
                </Button>

                {/* Refresh */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                    <RefreshCw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Row 2: Filter dropdowns (collapsible) */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2 duration-200">
                    {permissions.canSeeSupplierInfo && filterOptions.suppliers.length > 0 && (
                        <Select value={filters.supplier} onValueChange={(v) => setFilters(p => ({ ...p, supplier: v }))}>
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <SelectValue placeholder={isRTL ? 'المورد' : 'Supplier'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isRTL ? 'كل الموردين' : 'All Suppliers'}</SelectItem>
                                {filterOptions.suppliers.map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {permissions.canSeeSupplierInfo && filterOptions.invoices.length > 0 && (
                        <Select value={filters.invoice} onValueChange={(v) => setFilters(p => ({ ...p, invoice: v }))}>
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <FileText className="w-3 h-3 shrink-0" />
                                <SelectValue placeholder={isRTL ? 'الفاتورة' : 'Invoice'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isRTL ? 'كل الفواتير' : 'All Invoices'}</SelectItem>
                                {filterOptions.invoices.map(([id, num]) => (
                                    <SelectItem key={id} value={id}>{num}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {filterOptions.materials.length > 0 && (
                        <Select value={filters.material} onValueChange={(v) => setFilters(p => ({ ...p, material: v }))}>
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <Package className="w-3 h-3 shrink-0" />
                                <SelectValue placeholder={isRTL ? 'المادة' : 'Material'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isRTL ? 'كل المواد' : 'All Materials'}</SelectItem>
                                {filterOptions.materials.map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {filterOptions.colors.length > 0 && (
                        <Select value={filters.color} onValueChange={(v) => setFilters(p => ({ ...p, color: v }))}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder={isRTL ? 'اللون' : 'Color'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isRTL ? 'كل الألوان' : 'All Colors'}</SelectItem>
                                {filterOptions.colors.map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive" onClick={clearFilters}>
                            <X className="w-3.5 h-3.5" />
                            {isRTL ? 'مسح' : 'Clear'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════
    // Render — Table Headers (reusable)
    // ═══════════════════════════════════════════════════════════════
    const renderTableHeaders = (compact = false) => (
        <TableRow className="bg-muted/50">
            <TableHead className={cn("text-xs font-semibold", isRTL ? "text-right" : "text-left")}>
                {isRTL ? 'المادة' : 'Material'}
            </TableHead>
            {!compact && (
                <TableHead className={cn("text-xs font-semibold", isRTL ? "text-right" : "text-left")}>
                    {isRTL ? 'الكود' : 'Code'}
                </TableHead>
            )}
            <TableHead className={cn("text-xs font-semibold", isRTL ? "text-right" : "text-left")}>
                {isRTL ? 'اللون' : 'Color'}
            </TableHead>
            <TableHead className="text-xs font-semibold text-center">
                {isRTL ? 'الوحدة' : 'Unit'}
            </TableHead>
            <TableHead className="text-xs font-semibold text-center">
                {isRTL ? 'الكمية' : 'Qty'}
            </TableHead>
            <TableHead className="text-xs font-semibold text-center">
                {isRTL ? 'محجوز' : 'Reserved'}
            </TableHead>
            <TableHead className="text-xs font-semibold text-center">
                {isRTL ? 'متاح' : 'Available'}
            </TableHead>
            {permissions.canSeeClientPrice && (
                <TableHead className="text-xs font-semibold text-center">
                    {isRTL ? 'سعر البيع' : 'Sell Price'}
                </TableHead>
            )}
            {permissions.canSeeCostPrice && (
                <>
                    <TableHead className="text-xs font-semibold text-center">
                        {isRTL ? 'سعر المورد' : 'Cost'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                        {isRTL ? 'التكلفة الأولية' : 'Prel. Cost'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                        {isRTL ? 'التكلفة النهائية' : 'Final Cost'}
                    </TableHead>
                    {totalActualTax > 0 && (
                        <TableHead className="text-xs font-semibold text-center">
                            {isRTL ? 'الضريبة' : 'Tax'}
                        </TableHead>
                    )}
                </>
            )}
            {permissions.canSeeSupplierInfo && !compact && (
                <TableHead className={cn("text-xs font-semibold", isRTL ? "text-right" : "text-left")}>
                    {isRTL ? 'المورد' : 'Supplier'}
                </TableHead>
            )}
            {permissions.canCreateReservation && (
                <TableHead className="text-xs font-semibold text-center w-[70px]">
                    {isRTL ? 'حجز' : 'Reserve'}
                </TableHead>
            )}
            {effectiveMode === 'edit' && !isContainerLocked && (
                <TableHead className="text-xs font-semibold text-center w-[50px]">
                    <Trash2 className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                </TableHead>
            )}
        </TableRow>
    );

    // ═══════════════════════════════════════════════════════════════
    // Render — Table Row (reusable)
    // ═══════════════════════════════════════════════════════════════
    const renderItemRow = (item: ShipmentItem, compact = false) => {
        const availableQty = item.available_quantity || 0;
        const isLowStock = availableQty > 0 && availableQty < (item.expected_quantity || 1) * 0.1;
        const isSoldOut = availableQty <= 0;

        return (
            <TableRow key={item.id} className={cn(
                "hover:bg-muted/30 transition-colors",
                isSoldOut && "opacity-60"
            )}>
                <TableCell className="font-medium text-sm">
                    {item.item_description || '-'}
                </TableCell>
                {!compact && (
                    <TableCell className="text-xs text-muted-foreground font-mono">
                        {item.material_code || '-'}
                    </TableCell>
                )}
                <TableCell className="text-sm">
                    {item.color_name ? (
                        <Badge variant="outline" className="text-xs font-normal">
                            {item.color_name}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                    {item.unit || 'm'}
                </TableCell>
                <TableCell className="text-center font-mono text-sm font-medium">
                    {fmt(item.expected_quantity)}
                </TableCell>
                <TableCell className="text-center">
                    {(item.reserved_quantity || 0) > 0 ? (
                        <Badge variant="secondary" className="text-xs font-mono">
                            {fmt(item.reserved_quantity)}
                        </Badge>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="text-center">
                    <Badge
                        variant={isSoldOut ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                        className={cn(
                            "text-xs font-mono",
                            !isSoldOut && !isLowStock && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        )}
                    >
                        {fmt(availableQty)}
                    </Badge>
                </TableCell>
                {permissions.canSeeClientPrice && (
                    <TableCell className="text-center font-mono text-sm">
                        {item.expected_sell_price ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{fmt(item.expected_sell_price)}</span>
                        ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                        )}
                    </TableCell>
                )}
                {permissions.canSeeCostPrice && (
                    <>
                        {/* سعر المورد */}
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">
                            {fmt(item.unit_price)}
                        </TableCell>
                        {/* التكلفة الأولية (من المصاريف الأولية) */}
                        <TableCell className="text-center font-mono text-sm font-medium">
                            {item.provisional_unit_cost ? (
                                <span className="text-amber-700 dark:text-amber-400" title={isRTL ? 'تكلفة أولية' : 'Preliminary cost'}>
                                    {fmt(item.provisional_unit_cost)}
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                            )}
                        </TableCell>
                        {/* التكلفة النهائية (من المصاريف الفعلية) */}
                        <TableCell className="text-center font-mono text-sm font-medium">
                            {item.final_unit_cost ? (
                                <span className="text-emerald-700 dark:text-emerald-400" title={isRTL ? 'التكلفة النهائية المثبتة' : 'Finalized cost'}>
                                    {fmt(item.final_unit_cost)}
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                            )}
                        </TableCell>
                        {totalActualTax > 0 && (
                            <TableCell className="text-center font-mono text-sm font-medium">
                                {itemTaxMap[item.id] ? (
                                    <span className="text-rose-600 dark:text-rose-400" title={isRTL ? `ضريبة موزعة حسب القيمة` : `Tax allocated by value`}>
                                        {fmt(itemTaxMap[item.id])}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                )}
                            </TableCell>
                        )}
                    </>
                )}
                {permissions.canSeeSupplierInfo && !compact && (
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {item.supplier_name || '-'}
                    </TableCell>
                )}
                {permissions.canCreateReservation && (
                    <TableCell className="text-center">
                        {isSoldOut ? (
                            <span className="text-xs text-muted-foreground">—</span>
                        ) : transitCart.isInCart(item.id) ? (
                            <Badge
                                variant="secondary"
                                className="text-[10px] gap-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 cursor-pointer"
                                onClick={() => transitCart.setIsOpen(true)}
                            >
                                <Check className="w-3 h-3" />
                                {isRTL ? 'في السلة' : 'In Cart'}
                            </Badge>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                onClick={() => {
                                    transitCart.addItem({
                                        shipmentItemId: item.id,
                                        itemDescription: item.item_description,
                                        materialCode: item.material_code,
                                        colorName: item.color_name || null,
                                        unit: item.unit || 'm',
                                        availableQuantity: availableQty,
                                        reservedQuantity: Math.min(availableQty, 100),
                                        unitPrice: item.expected_sell_price || 0,
                                        materialId: item.material_id,
                                        colorId: item.color_id || null,
                                        productId: item.product_id,
                                    });
                                }}
                            >
                                <Plus className="w-3 h-3" />
                                <ShoppingCart className="w-3 h-3" />
                            </Button>
                        )}
                    </TableCell>
                )}
                {effectiveMode === 'edit' && !isContainerLocked && (
                    <TableCell className="text-center">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title={isRTL ? 'حذف البند' : 'Delete item'}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </TableCell>
                )}
            </TableRow>
        );
    };

    // ═══════════════════════════════════════════════════════════════
    // Render — Flat Table View
    // ═══════════════════════════════════════════════════════════════
    const renderTableView = () => (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
                <TableHeader>
                    {renderTableHeaders(false)}
                </TableHeader>
                <TableBody>
                    {filteredItems.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={15}
                                className="text-center py-12 text-muted-foreground"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Package className="w-10 h-10 opacity-30" />
                                    <span>{isRTL ? 'لا توجد بنود في هذا الكونتينر' : 'No items in this container'}</span>
                                    {hasActiveFilters && (
                                        <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">
                                            {isRTL ? 'إزالة الفلاتر' : 'Clear filters'}
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredItems.map((item: ShipmentItem) => renderItemRow(item, false))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════
    // Render — Grouped View (Accordion)
    // ═══════════════════════════════════════════════════════════════
    const renderGroupedView = (
        groups: Record<string, { name?: string; number?: string; supplier?: string; items: ShipmentItem[]; totalValue: number }>,
        type: 'supplier' | 'invoice'
    ) => (
        <div className="space-y-2">
            {Object.keys(groups).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 opacity-30 mx-auto mb-2" />
                    <span>{isRTL ? 'لا توجد بنود' : 'No items found'}</span>
                </div>
            ) : (
                Object.entries(groups).map(([key, group]) => {
                    const isOpen = openGroups[key] ?? true;
                    const itemCount = group.items.length;
                    const groupAvailable = group.items.reduce((s, i) => s + (i.available_quantity || 0), 0);

                    return (
                        <Collapsible key={key} open={isOpen} onOpenChange={() => toggleGroup(key)}>
                            <CollapsibleTrigger asChild>
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                    "hover:bg-muted/50",
                                    isOpen ? "bg-muted/30 border-primary/20" : "bg-background"
                                )}>
                                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}

                                    {type === 'supplier' ? (
                                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-sm">
                                            {type === 'supplier' ? group.name : group.number}
                                        </span>
                                        {type === 'invoice' && group.supplier && (
                                            <span className="text-xs text-muted-foreground mx-2">
                                                ({group.supplier})
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 text-xs">
                                        <Badge variant="outline" className="font-mono">
                                            {itemCount} {isRTL ? 'صنف' : 'items'}
                                        </Badge>
                                        <Badge variant="secondary" className="font-mono">
                                            {isRTL ? 'متاح' : 'Avail'}: {fmt(groupAvailable)}
                                        </Badge>
                                        {permissions.canSeeCostPrice && (
                                            <Badge className="font-mono bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                {fmt(group.totalValue)} {companyCurrency}
                                            </Badge>
                                        )}
                                        {type === 'invoice' && effectiveMode === 'edit' && !isContainerLocked && key !== 'none' && (
                                            <div className="flex items-center gap-1">
                                                {/* فك ارتباط الفاتورة */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUnlinkInvoice(key, group.number || key);
                                                    }}
                                                    className="h-7 w-7 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    title={isRTL ? 'فك ارتباط الفاتورة من الكونتينر' : 'Unlink invoice from container'}
                                                >
                                                    <Unlink className="w-3.5 h-3.5" />
                                                </Button>
                                                {/* حذف كل بنود الفاتورة */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteInvoiceItems(key, group.number || key);
                                                    }}
                                                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title={isRTL ? 'حذف كل بنود الفاتورة' : 'Delete all invoice items'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="border-x border-b rounded-b-lg overflow-x-auto -mt-[1px]">
                                    <Table>
                                        <TableHeader>
                                            {renderTableHeaders(true)}
                                        </TableHeader>
                                        <TableBody>
                                            {group.items.map((item) => renderItemRow(item, true))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    );
                })
            )}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════
    // Main Render
    // ═══════════════════════════════════════════════════════════════
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Import from Invoice Button — only in edit/create mode */}
            {/* Container Lock Banner */}
            {isContainerLocked && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>
                        {isRTL
                            ? 'الكونتينر مقفل — لا يمكن التعديل بعد الاستلام أو الإغلاق'
                            : 'Container is locked — no edits after receiving or closing'}
                    </span>
                </div>
            )}

            {/* Action Buttons */}
            {(effectiveMode === 'edit' || effectiveMode === 'create') && containerId && (
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        {/* Delete Container (only when empty) */}
                        {items.length === 0 && mode === 'edit' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDeleteContainer}
                                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isRTL ? 'حذف الكونتينر' : 'Delete Container'}
                            </Button>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowImportDialog(true)}
                        className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                    >
                        <Plus className="w-4 h-4" />
                        <FileText className="w-4 h-4" />
                        {isRTL ? 'استيراد من فاتورة دولية' : 'Import from Invoice'}
                    </Button>
                </div>
            )}

            {/* Summary Statistics */}
            {renderSummary()}

            {/* Toolbar: view mode + search + filters */}
            {renderToolbar()}

            {/* Active filters summary */}
            {hasActiveFilters && (
                <div className="text-xs text-muted-foreground">
                    {isRTL
                        ? `عرض ${filteredItems.length} من ${items.length} بنود`
                        : `Showing ${filteredItems.length} of ${items.length} items`
                    }
                </div>
            )}

            {/* Content based on view mode */}
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'by_supplier' && renderGroupedView(groupedBySupplier, 'supplier')}
            {viewMode === 'by_invoice' && renderGroupedView(groupedByInvoice, 'invoice')}

            {/* 🛒 Transit Cart Drawer — only in view mode for sales reservations */}
            {mode === 'view' && items.length > 0 && permissions.canCreateReservation && (
                <TransitCartDrawer
                    cart={transitCart}
                    shipmentNumber={data?.shipment_number || data?.container_number}
                />
            )}

            {/* ═══ Import from Invoice Dialog ═══ */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            {isRTL ? 'استيراد بنود من فاتورة دولية' : 'Import Items from International Invoice'}
                        </DialogTitle>
                    </DialogHeader>

                    {loadingInvoices ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : availableInvoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>{isRTL ? 'لا توجد فواتير دولية مؤكدة' : 'No confirmed international invoices found'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {isRTL
                                    ? 'اختر فاتورة لاستيراد بنودها إلى هذا الكونتينر:'
                                    : 'Select an invoice to import its items into this container:'}
                            </p>
                            {availableInvoices.map((inv: any) => {
                                const s = Array.isArray(inv.supplier) ? inv.supplier?.[0] : inv.supplier;
                                const supplierName = isRTL
                                    ? s?.name_ar || s?.name_en || ''
                                    : s?.name_en || s?.name_ar || '';
                                const invoiceNum = inv.invoice_no || inv.id?.substring(0, 8);
                                const isImporting = importingInvoiceId === inv.id;

                                return (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">
                                                {invoiceNum}
                                                <Badge variant="secondary" className="mx-2 text-xs">
                                                    {inv.stage}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                {supplierName && <span>📦 {supplierName}</span>}
                                                {(inv.invoice_date || inv.doc_date) && <span>📅 {new Date(inv.invoice_date || inv.doc_date).toLocaleDateString()}</span>}
                                                {inv.total_amount && <span>💰 {Number(inv.total_amount).toLocaleString()} {inv.currency || ''}</span>}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleImportFromInvoice(inv.id)}
                                            disabled={isImporting}
                                            className="gap-1 bg-blue-500 hover:bg-blue-600 text-white"
                                        >
                                            {isImporting ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Plus className="w-3.5 h-3.5" />
                                            )}
                                            {isRTL ? 'استيراد' : 'Import'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
