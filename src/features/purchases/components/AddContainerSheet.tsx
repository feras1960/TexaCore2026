import { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Ship,
    Save,
    X,
    FileText,
    Building2,
    Calendar,
    Anchor,
    MapPin,
    Box,
    DollarSign
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SectionLoader from '@/components/common/SectionLoader';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';

interface AddContainerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddContainerSheet({ open, onOpenChange, onSuccess }: AddContainerSheetProps) {
    const { t, direction, language } = useLanguage();
    const { companyId } = useCompany();
    const isRTL = direction === 'rtl';
    const queryClient = useQueryClient();
    const { currencyCode: companyCurrency } = useCompanyCurrency();

    const [formData, setFormData] = useState({
        containerNumber: '',
        shipmentNumber: '', // Auto-generated or manual
        billOfLading: '', // B/L Number
        supplierId: '',
        originCountry: '',
        portOfLoading: '',
        portOfDischarge: '',
        shippingLine: '',
        vesselName: '',
        etd: '',
        eta: '',
        containerSize: '40ft',
        containerType: 'dry',
        status: 'draft',
        notes: '',
    });

    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

    // Fetch Suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers_list', companyId],
        queryFn: async () => {
            const { data } = await supabase.from('suppliers').select('id, name_ar, name_en').eq('company_id', companyId);
            return data || [];
        },
        enabled: open && !!companyId,
        staleTime: 60_000,
    });

    // Fetch Available Invoices for Selected Supplier
    const { data: availableInvoices = [], isLoading: isLoadingInvoices } = useQuery({
        queryKey: ['available_invoices_for_container', formData.supplierId],
        queryFn: async () => {
            if (!formData.supplierId) return [];
            const { data } = await supabase
                .from('purchase_transactions')
                .select('*')
                .eq('company_id', companyId)
                .eq('supplier_id', formData.supplierId)
                .eq('receipt_mode', 'international') // Only international purchases
                .in('stage', ['posted', 'partial_paid', 'paid']) // Only posted invoices can be linked to containers
                .is('container_id', null) // Not yet assigned to a container
                .order('doc_date', { ascending: false });
            return data || [];
        },
        enabled: open && !!formData.supplierId,
        staleTime: 30_000,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'supplierId') {
            setSelectedInvoices([]); // Reset selection on supplier change
        }
    };

    const toggleInvoice = (id: string) => {
        setSelectedInvoices(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const createMutation = useMutation({
        mutationFn: async () => {
            const tenantId = (await supabase.from('companies').select('tenant_id').eq('id', companyId).single()).data?.tenant_id;

            // 1. Create Container (the ONLY record — unified, no shipments needed)
            const { data: container, error: containerError } = await supabase
                .from('containers')
                .insert({
                    tenant_id: tenantId,
                    company_id: companyId,
                    container_number: formData.containerNumber,
                    container_name: formData.containerNumber,
                    shipment_number: formData.shipmentNumber || `SHP-${Date.now().toString().slice(-6)}`,
                    bill_of_lading: formData.billOfLading,
                    supplier_id: formData.supplierId || null,
                    origin_country: formData.originCountry,
                    port_of_loading: formData.portOfLoading,
                    port_of_discharge: formData.portOfDischarge,
                    shipping_company: formData.shippingLine,
                    shipping_line: formData.shippingLine,
                    vessel_name: formData.vesselName,
                    departure_date: formData.etd || null,
                    expected_arrival_date: formData.eta || null,
                    container_size: formData.containerSize,
                    container_type: formData.containerType,
                    status: 'draft',
                    notes: formData.notes,
                    goods_currency: companyCurrency || undefined,
                })
                .select()
                .single();

            if (containerError) throw containerError;

            // 2. Link Invoices directly to the container (unified — no shipments)
            if (selectedInvoices.length > 0) {
                const { error: invoiceError } = await supabase
                    .from('purchase_transactions')
                    .update({ container_id: container.id })
                    .in('id', selectedInvoices);

                if (invoiceError) throw invoiceError;

                // ✅ Auto-advance: draft → booked when invoices are linked at creation
                await supabase
                    .from('containers')
                    .update({ status: 'booked' })
                    .eq('id', container.id);

                // 🔑 ACCOUNTING: Create transit → container transfer entries
                // For each posted international invoice, move from Transit (1145) to Container Account
                const { default: purchaseAccountingService } = await import('@/services/purchaseAccountingService');
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id || 'system';

                for (const invoiceId of selectedInvoices) {
                    try {
                        const result = await purchaseAccountingService.transferToContainerAccount(
                            invoiceId, container.id, userId
                        );
                        if (!result.success && result.error) {
                            console.warn(`⚠️ [Container Link] Transfer failed for invoice ${invoiceId}:`, result.error);
                        }
                    } catch (err: any) {
                        console.warn(`⚠️ [Container Link] Transfer error for invoice ${invoiceId}:`, err.message);
                    }
                }
            }

            return container;
        },
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء الكونتينر بنجاح' : 'Container created successfully');
            queryClient.invalidateQueries({ queryKey: ['containers_list'] });
            onSuccess?.();
            onOpenChange(false);
            setFormData({ // Reset form
                containerNumber: '',
                shipmentNumber: '',
                billOfLading: '',
                supplierId: '',
                originCountry: '',
                portOfLoading: '',
                portOfDischarge: '',
                shippingLine: '',
                vesselName: '',
                etd: '',
                eta: '',
                containerSize: '40ft',
                containerType: 'dry',
                status: 'draft',
                notes: '',
            });
            setSelectedInvoices([]);
        },
        onError: (error: any) => {
            toast.error(isRTL ? `حدث خطأ: ${error.message}` : `Error: ${error.message}`);
        }
    });

    const handleSubmit = () => {
        if (!formData.containerNumber) {
            toast.error(isRTL ? 'يرجى إدخال رقم الكونتينر' : 'Please enter Container Number');
            return;
        }
        createMutation.mutate();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={isRTL ? 'left' : 'right'}
                className="w-full sm:max-w-[600px] p-0 flex flex-col bg-gray-50/50"
                dir={direction}
            >
                <SheetHeader className="p-6 bg-white border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Ship className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold font-cairo">
                                {isRTL ? 'إضافة كونتينر جديد' : 'New Container'}
                            </SheetTitle>
                            <SheetDescription>
                                {isRTL ? 'أدخل تفاصيل الشحنة واربط الفواتير' : 'Enter shipment details and link invoices'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">

                        {/* 1. Basic Info */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                                <Box className="w-4 h-4" />
                                {isRTL ? 'بيانات الكونتينر' : 'Container Details'}
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'رقم الكونتينر' : 'Container Number'} *</Label>
                                    <Input
                                        value={formData.containerNumber}
                                        onChange={(e) => handleInputChange('containerNumber', e.target.value.toUpperCase())}
                                        placeholder="MSKU1234567"
                                        className="font-mono uppercase"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'رقم البوليصة (B/L)' : 'Bill of Lading'}</Label>
                                    <Input
                                        value={formData.billOfLading}
                                        onChange={(e) => handleInputChange('billOfLading', e.target.value)}
                                        className="font-mono uppercase"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>{isRTL ? 'المورد' : 'Supplier'}</Label>
                                    <Select value={formData.supplierId} onValueChange={(v) => handleInputChange('supplierId', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('common.select')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s: any) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {language === 'ar' ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* 2. Shipping Details */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                                <Anchor className="w-4 h-4" />
                                {isRTL ? 'تفاصيل الشحن' : 'Shipping Details'}
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'خط الشحن' : 'Shipping Line'}</Label>
                                    <Input
                                        value={formData.shippingLine}
                                        onChange={(e) => handleInputChange('shippingLine', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'اسم السفينة' : 'Vessel Name'}</Label>
                                    <Input
                                        value={formData.vesselName}
                                        onChange={(e) => handleInputChange('vesselName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'ميناء التحميل' : 'Port of Loading'}</Label>
                                    <Input
                                        value={formData.portOfLoading}
                                        onChange={(e) => handleInputChange('portOfLoading', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isRTL ? 'ميناء الوصول' : 'Port of Discharge'}</Label>
                                    <Input
                                        value={formData.portOfDischarge}
                                        onChange={(e) => handleInputChange('portOfDischarge', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ETD</Label>
                                    <Input
                                        type="date"
                                        value={formData.etd}
                                        onChange={(e) => handleInputChange('etd', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ETA</Label>
                                    <Input
                                        type="date"
                                        value={formData.eta}
                                        onChange={(e) => handleInputChange('eta', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Link Invoices (Contents) */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                                <FileText className="w-4 h-4" />
                                {isRTL ? 'محتويات الكونتينر (الفواتير)' : 'Container Contents (Purchase Invoices)'}
                            </h3>

                            {!formData.supplierId ? (
                                <div className="text-center p-4 text-gray-500 text-sm italic bg-gray-50 rounded border border-dashed">
                                    {isRTL ? 'يرجى اختيار مورد أولاً لعرض الفواتير المتاحة' : 'Please select a supplier to view available invoices'}
                                </div>
                            ) : isLoadingInvoices ? (
                                <SectionLoader className="h-20" />
                            ) : availableInvoices.length === 0 ? (
                                <div className="text-center p-4 text-gray-500 text-sm bg-gray-50 rounded border border-dashed">
                                    {isRTL ? 'لا توجد فواتير مرحلة متاحة لهذا المورد' : 'No posted invoices available for this supplier'}
                                </div>
                            ) : (
                                <div className="space-y-2 border rounded-md divide-y max-h-60 overflow-y-auto">
                                    {availableInvoices.map((inv: any) => (
                                        <div key={inv.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer" onClick={() => toggleInvoice(inv.id)}>
                                            <Checkbox
                                                checked={selectedInvoices.includes(inv.id)}
                                                onCheckedChange={() => toggleInvoice(inv.id)}
                                            />
                                            <div className="mx-3 flex-1 grid grid-cols-3 gap-2 text-sm">
                                                <span className="font-mono font-medium text-indigo-600">{inv.invoice_no}</span>
                                                <span className="text-gray-500">{new Date(inv.doc_date).toLocaleDateString()}</span>
                                                <span className="font-bold text-end">{Number(inv.total_amount).toLocaleString()} {inv.currency}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedInvoices.length > 0 && (
                                <div className="text-xs text-green-600 font-medium px-1">
                                    {isRTL ? `تم اختيار ${selectedInvoices.length} فواتير` : `${selectedInvoices.length} invoices selected`}
                                </div>
                            )}
                        </div>

                        {/* 4. Estimated Expenses (Placeholder) */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2 text-sm text-gray-500 uppercase tracking-wider">
                                    <DollarSign className="w-4 h-4" />
                                    {isRTL ? 'المصاريف التقديرية' : 'Estimated Expenses'}
                                </h3>
                            </div>
                            <div className="p-4 bg-gray-50 rounded border border-dashed text-center text-sm text-gray-400">
                                {isRTL ? 'يمكن إضافة تفاصيل المصاريف لاحقاً في صفحة التفاصيل' : 'Expenses details can be added later in details view'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{isRTL ? 'ملاحظات' : 'Notes'}</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={3}
                            />
                        </div>

                    </div>
                </ScrollArea>

                <SheetFooter className="p-4 bg-white border-t sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                        {createMutation.isPending ? t('common.saving') : (isRTL ? 'حفظ الكونتينر' : 'Save Container')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
