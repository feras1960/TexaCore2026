/**
 * 🏢 SupplierInfoTab — تبويب معلومات المورد
 * 
 * خاص بمستندات المشتريات فقط:
 * - معلومات المورد (اسم + رقم فاتورة المورد الأصلية)
 * - تاريخ فاتورة المورد
 * - شروط الدفع
 * - ملاحظات المورد
 */

import React, { useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText, Calendar, CreditCard, Phone, Mail, MapPin, Hash, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierInfoTabProps {
    data: any;
    mode: 'view' | 'edit' | 'create';
    onChange: (updates: any) => void;
}

export const SupplierInfoTab: React.FC<SupplierInfoTabProps> = ({ data, mode, onChange }) => {
    const { isRTL, t, language } = useLanguage();
    const { companyId } = useCompany();
    const isEditable = mode === 'create' || mode === 'edit';

    // Fetch supplier details if supplier_id exists
    const { data: supplierDetails } = useQuery({
        queryKey: ['supplier_details', data?.supplier_id],
        queryFn: async () => {
            if (!data?.supplier_id) return null;
            const { data: supplier, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', data.supplier_id)
                .single();
            if (error) return null;
            return supplier;
        },
        enabled: !!data?.supplier_id,
        staleTime: 60_000,
    });

    const supplierName = useMemo(() => {
        if (!supplierDetails) return data?.supplier_name || '-';
        return language === 'ar'
            ? (supplierDetails.name_ar || supplierDetails.name_en)
            : (supplierDetails.name_en || supplierDetails.name_ar);
    }, [supplierDetails, data?.supplier_name, language]);

    return (
        <div className="space-y-4 p-1">
            {/* ── بطاقة المورد ── */}
            <Card className="border-blue-100 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                        <Building2 className="w-4 h-4" />
                        {isRTL ? 'معلومات المورد' : 'Supplier Information'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Supplier Name (read-only — comes from header selection) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                {isRTL ? 'اسم المورد' : 'Supplier Name'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium">
                                {supplierName}
                            </div>
                        </div>

                        {/* Supplier Contact */}
                        {supplierDetails && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" />
                                    {isRTL ? 'التواصل' : 'Contact'}
                                </Label>
                                <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm space-y-1">
                                    {supplierDetails.phone && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Phone className="w-3 h-3" /> {supplierDetails.phone}
                                        </div>
                                    )}
                                    {supplierDetails.email && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Mail className="w-3 h-3" /> {supplierDetails.email}
                                        </div>
                                    )}
                                    {!supplierDetails.phone && !supplierDetails.email && (
                                        <span className="text-gray-400">{isRTL ? 'لا توجد بيانات' : 'No contact info'}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Supplier Tax Number */}
                    {supplierDetails?.tax_number && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <Hash className="w-3.5 h-3.5" />
                                {isRTL ? 'الرقم الضريبي' : 'Tax Number'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                                {supplierDetails.tax_number}
                            </div>
                        </div>
                    )}

                    {/* Address */}
                    {supplierDetails?.address && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {isRTL ? 'العنوان' : 'Address'}
                            </Label>
                            <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                                {supplierDetails.address}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── بطاقة فاتورة المورد الأصلية ── */}
            <Card className="border-amber-100 shadow-sm">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                        <FileText className="w-4 h-4" />
                        {isRTL ? 'بيانات فاتورة المورد' : 'Supplier Invoice Details'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Supplier Invoice Number */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <Hash className="w-3.5 h-3.5" />
                                {isRTL ? 'رقم فاتورة المورد' : 'Supplier Invoice #'}
                            </Label>
                            {isEditable ? (
                                <Input
                                    value={data?.supplier_invoice_number || ''}
                                    onChange={(e) => onChange({ supplier_invoice_number: e.target.value })}
                                    placeholder={isRTL ? 'رقم الفاتورة الأصلية...' : 'Original invoice number...'}
                                    className="text-sm"
                                />
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                                    {data?.supplier_invoice_number || '-'}
                                </div>
                            )}
                        </div>

                        {/* Supplier Invoice Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {isRTL ? 'تاريخ فاتورة المورد' : 'Supplier Invoice Date'}
                            </Label>
                            {isEditable ? (
                                <Input
                                    type="date"
                                    value={data?.supplier_invoice_date || ''}
                                    onChange={(e) => onChange({ supplier_invoice_date: e.target.value })}
                                    className="text-sm"
                                />
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                                    {data?.supplier_invoice_date
                                        ? new Date(data.supplier_invoice_date).toLocaleDateString()
                                        : '-'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5" />
                                {isRTL ? 'شروط الدفع' : 'Payment Terms'}
                            </Label>
                            {isEditable ? (
                                <Select
                                    value={data?.payment_terms || 'net_30'}
                                    onValueChange={(v) => onChange({ payment_terms: v })}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="immediate">{isRTL ? 'فوري' : 'Immediate'}</SelectItem>
                                        <SelectItem value="net_7">{isRTL ? 'صافي 7 أيام' : 'Net 7'}</SelectItem>
                                        <SelectItem value="net_15">{isRTL ? 'صافي 15 يوم' : 'Net 15'}</SelectItem>
                                        <SelectItem value="net_30">{isRTL ? 'صافي 30 يوم' : 'Net 30'}</SelectItem>
                                        <SelectItem value="net_45">{isRTL ? 'صافي 45 يوم' : 'Net 45'}</SelectItem>
                                        <SelectItem value="net_60">{isRTL ? 'صافي 60 يوم' : 'Net 60'}</SelectItem>
                                        <SelectItem value="net_90">{isRTL ? 'صافي 90 يوم' : 'Net 90'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm">
                                    <Badge variant="secondary" className="text-xs">
                                        {data?.payment_terms || 'net_30'}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                            </Label>
                            {isEditable ? (
                                <Input
                                    type="date"
                                    value={data?.due_date || ''}
                                    onChange={(e) => onChange({ due_date: e.target.value })}
                                    className="text-sm"
                                />
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                                    {data?.due_date
                                        ? new Date(data.due_date).toLocaleDateString()
                                        : '-'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            {isRTL ? 'ملاحظات' : 'Notes'}
                        </Label>
                        {isEditable ? (
                            <Textarea
                                value={data?.supplier_notes || ''}
                                onChange={(e) => onChange({ supplier_notes: e.target.value })}
                                placeholder={isRTL ? 'ملاحظات على المورد أو الفاتورة...' : 'Notes about supplier or invoice...'}
                                rows={3}
                                className="text-sm resize-none"
                            />
                        ) : (
                            <div className={cn(
                                "px-3 py-2 bg-gray-50 border rounded-md text-sm min-h-[60px]",
                                !data?.supplier_notes && "text-gray-400"
                            )}>
                                {data?.supplier_notes || (isRTL ? 'لا توجد ملاحظات' : 'No notes')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
