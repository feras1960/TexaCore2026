/**
 * NexaDataTable Demo Page
 * صفحة عرض وتجريب مكون NexaDataTable مع ميزات التعديل
 */

import { useState, useMemo } from 'react';
import { NexaDataTable, EditableColumnConfig } from '@/components/ui/nexa-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { toast } from 'sonner';
import { DevLabNav } from '@/features/componentLab/DevLabNav';

// === Types ===
interface InvoiceLine {
    id: string;
    itemCode: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

interface AccountEntry {
    id: string;
    date: string;
    accountCode: string;
    accountName: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

// === Sample Data ===
const initialInvoiceLines: InvoiceLine[] = [
    { id: '1', itemCode: 'PRD-001', itemName: 'قماش قطني أبيض', quantity: 100, unitPrice: 25.00, discount: 5, total: 2375.00 },
    { id: '2', itemCode: 'PRD-002', itemName: 'قماش حرير أزرق', quantity: 50, unitPrice: 75.00, discount: 10, total: 3375.00 },
    { id: '3', itemCode: 'PRD-003', itemName: 'قماش صوف رمادي', quantity: 30, unitPrice: 120.00, discount: 0, total: 3600.00 },
    { id: '4', itemCode: 'PRD-004', itemName: 'قماش كتان بيج', quantity: 80, unitPrice: 45.00, discount: 8, total: 3312.00 },
];

const initialAccountEntries: AccountEntry[] = [
    { id: '1', date: '2024-01-15', accountCode: '1101', accountName: 'الصندوق الرئيسي', description: 'إيداع نقدي', debit: 125000, credit: 0, balance: 125000 },
    { id: '2', date: '2024-01-15', accountCode: '1102', accountName: 'بنك الراجحي', description: 'تحويل من العميل', debit: 450000, credit: 0, balance: 575000 },
    { id: '3', date: '2024-01-15', accountCode: '1103', accountName: 'بنك الأهلي', description: 'سداد مورد', debit: 0, credit: 320000, balance: 255000 },
    { id: '4', date: '2024-01-20', accountCode: '2101', accountName: 'الموردون', description: 'مشتريات بضاعة', debit: 0, credit: 85000, balance: 170000 },
    { id: '5', date: '2024-02-01', accountCode: '2102', accountName: 'القروض قصيرة الأجل', description: 'قسط شهري', debit: 0, credit: 200000, balance: -30000 },
    { id: '6', date: '2024-01-01', accountCode: '3101', accountName: 'رأس المال', description: 'رأس المال المدفوع', debit: 0, credit: 1000000, balance: -1030000 },
    { id: '7', date: '2024-01-15', accountCode: '4101', accountName: 'إيرادات المبيعات', description: 'مبيعات يناير', debit: 0, credit: 750000, balance: -1780000 },
];

// === Component ===
export default function NexaDataTableDemo() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    // === Invoice State ===
    const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>(initialInvoiceLines);

    // === Account Entries State ===
    const [accountEntries, setAccountEntries] = useState<AccountEntry[]>(initialAccountEntries);

    // === Invoice Columns ===
    const invoiceColumns = useMemo<ColumnDef<InvoiceLine>[]>(() => [
        {
            accessorKey: 'itemCode',
            header: isRTL ? 'كود الصنف' : 'Item Code',
            size: 120,
        },
        {
            accessorKey: 'itemName',
            header: isRTL ? 'اسم الصنف' : 'Item Name',
            size: 200,
        },
        {
            accessorKey: 'quantity',
            header: isRTL ? 'الكمية' : 'Quantity',
            size: 100,
            cell: ({ getValue }) => (
                <span className="font-mono text-center block">{(getValue() as number).toLocaleString('en-US')}</span>
            ),
        },
        {
            accessorKey: 'unitPrice',
            header: isRTL ? 'سعر الوحدة' : 'Unit Price',
            size: 120,
            cell: ({ getValue }) => (
                <span className="font-mono text-emerald-600">{(getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            ),
        },
        {
            accessorKey: 'discount',
            header: isRTL ? 'الخصم %' : 'Discount %',
            size: 100,
            cell: ({ getValue }) => (
                <span className="font-mono text-amber-600">{getValue() as number}%</span>
            ),
        },
        {
            accessorKey: 'total',
            header: isRTL ? 'الإجمالي' : 'Total',
            size: 140,
            cell: ({ getValue }) => (
                <span className="font-mono font-bold text-blue-600">{(getValue() as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            ),
        },
    ], [isRTL]);

    // === Editable Columns Config ===
    const invoiceEditableColumns: EditableColumnConfig[] = [
        { key: 'itemCode', type: 'text', placeholder: 'PRD-XXX' },
        { key: 'itemName', type: 'text', placeholder: isRTL ? 'اسم الصنف...' : 'Item name...' },
        { key: 'quantity', type: 'number', min: 1 },
        { key: 'unitPrice', type: 'number', min: 0 },
        { key: 'discount', type: 'number', min: 0, max: 100 },
    ];

    // === Account Columns ===
    const accountColumns = useMemo<ColumnDef<AccountEntry>[]>(() => [
        {
            accessorKey: 'date',
            header: isRTL ? 'التاريخ' : 'Date',
            size: 120,
        },
        {
            accessorKey: 'accountCode',
            header: isRTL ? 'رمز الحساب' : 'Account Code',
            size: 120,
        },
        {
            accessorKey: 'accountName',
            header: isRTL ? 'اسم الحساب' : 'Account Name',
            size: 180,
        },
        {
            accessorKey: 'description',
            header: isRTL ? 'البيان' : 'Description',
            size: 200,
        },
        {
            accessorKey: 'debit',
            header: isRTL ? 'مدين' : 'Debit',
            size: 130,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                return value > 0 ? (
                    <span className="font-mono text-emerald-600">{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                ) : <span className="text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: 'credit',
            header: isRTL ? 'دائن' : 'Credit',
            size: 130,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                return value > 0 ? (
                    <span className="font-mono text-rose-600">{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                ) : <span className="text-muted-foreground">-</span>;
            },
        },
        {
            accessorKey: 'balance',
            header: isRTL ? 'الرصيد' : 'Balance',
            size: 140,
            cell: ({ getValue }) => {
                const value = getValue() as number;
                return (
                    <span className={`font-mono font-bold ${value >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                );
            },
        },
    ], [isRTL]);

    // === Handlers ===
    const handleInvoiceSave = async (data: InvoiceLine[]) => {
        // Recalculate totals
        const updatedData = data.map(line => ({
            ...line,
            total: line.quantity * line.unitPrice * (1 - line.discount / 100)
        }));
        setInvoiceLines(updatedData);
        toast.success(isRTL ? 'تم حفظ الفاتورة بنجاح ✅' : 'Invoice saved successfully ✅');
    };

    const handleAddInvoiceLine = (): InvoiceLine => {
        const newId = String(Date.now());
        return {
            id: newId,
            itemCode: '',
            itemName: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0,
        };
    };

    const handleDeleteInvoiceLine = (line: InvoiceLine, index: number) => {
        toast.info(isRTL ? `تم حذف الصنف: ${line.itemName || 'صف جديد'}` : `Deleted: ${line.itemName || 'New row'}`);
    };

    return (
        <div className="container mx-auto py-8 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-primary mb-2">
                    {isRTL ? '🎯 NexaDataTable - جدول البيانات المتقدم' : '🎯 NexaDataTable - Advanced Data Table'}
                </h1>
                <p className="text-muted-foreground">
                    {isRTL
                        ? 'مبني على TanStack Table - جرب السحب والإفلات وتغيير حجم الأعمدة والتصفح والفرز والتعديل'
                        : 'Built on TanStack Table - Try drag & drop, column resize, pagination, sorting, and editing'
                    }
                </p>
            </div>

            {/* ─── Lab Sub-Navigation ─── */}
            <div className="mb-6">
                <DevLabNav currentLabId="nexa-table" />
            </div>

            <Tabs defaultValue="invoice" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="invoice" className="gap-2">
                        📄 {isRTL ? 'نموذج فاتورة' : 'Invoice Demo'}
                    </TabsTrigger>
                    <TabsTrigger value="ledger" className="gap-2">
                        📊 {isRTL ? 'دفتر الأستاذ' : 'Ledger Demo'}
                    </TabsTrigger>
                </TabsList>

                {/* Invoice Demo */}
                <TabsContent value="invoice">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        📄 {isRTL ? 'فاتورة مبيعات' : 'Sales Invoice'}
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                            {isRTL ? 'قابلة للتعديل' : 'Editable'}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {isRTL
                                            ? 'اضغط على زر "تعديل" لتفعيل وضع التعديل - يمكنك إضافة وحذف وتعديل الأصناف'
                                            : 'Click "Edit" button to enable edit mode - You can add, delete, and modify items'
                                        }
                                    </CardDescription>
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                    {isRTL ? 'INV-2024-001' : 'INV-2024-001'}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <NexaDataTable
                                data={invoiceLines}
                                columns={invoiceColumns}
                                isRTL={isRTL}
                                enableSequenceNumber={true}
                                enableColumnResizing={true}
                                enableColumnReordering={true}
                                enableSearch={true}
                                enableExport={true}
                                enablePagination={false}
                                enableExcelMode={true}
                                maxHeight="400px"
                                showTotalsFooter={true}
                                debitKey="total"
                                creditKey="discount"
                                showAmountInWords={true}

                                // === Edit Mode ===
                                enableEditMode={true}
                                editableColumns={invoiceEditableColumns}
                                onSave={handleInvoiceSave}
                                onAddRow={handleAddInvoiceLine}
                                onDeleteRow={handleDeleteInvoiceLine}
                                canDeleteRows={true}

                                // === Auto-Rows (NEW) ===
                                editModeExtraRows={10}
                                emptyRowsThreshold={5}
                                autoAddRowsCount={5}
                                cleanEmptyRowsOnSave={true}

                                // === Keyboard Help (NEW) ===
                                showKeyboardHelp={true}

                                exportFilename="invoice-001"
                                exportTitle={isRTL ? 'فاتورة مبيعات' : 'Sales Invoice'}
                                companyInfo={{
                                    name: isRTL ? 'شركة تيكسا كور' : 'TexaCore Company',
                                    nameEn: 'TexaCore International',
                                    address: isRTL ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia',
                                    phone: '+966 11 123 4567',
                                    email: 'info@texacore.com',
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Ledger Demo */}
                <TabsContent value="ledger">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                📊 {isRTL ? 'دفتر الأستاذ العام' : 'General Ledger'}
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                    {isRTL ? 'عرض فقط' : 'View Only'}
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                {isRTL
                                    ? 'مثال على دفتر الأستاذ مع ميزة التعليم بالألوان والتصدير والطباعة'
                                    : 'Ledger example with marker feature, export and print'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NexaDataTable
                                data={accountEntries}
                                columns={accountColumns}
                                isRTL={isRTL}
                                enableSequenceNumber={true}
                                enableMarker={true}
                                enableColumnResizing={true}
                                enableColumnReordering={true}
                                enableSearch={true}
                                enableExport={true}
                                enablePagination={true}
                                pageSize={10}
                                showTotalsFooter={true}
                                showSummaryHeader={true}
                                openingBalance={0}
                                debitKey="debit"
                                creditKey="credit"
                                balanceKey="balance"
                                showAmountInWords={true}

                                exportFilename="general-ledger"
                                exportTitle={isRTL ? 'دفتر الأستاذ العام' : 'General Ledger'}
                                companyInfo={{
                                    name: isRTL ? 'شركة تيكسا كور' : 'TexaCore Company',
                                    nameEn: 'TexaCore International',
                                    address: isRTL ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia',
                                    phone: '+966 11 123 4567',
                                    email: 'info@texacore.com',
                                    taxNumber: '300123456789',
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Features List */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>✨ {isRTL ? 'الميزات المتاحة' : 'Available Features'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: '✏️', label: isRTL ? 'تعديل مباشر' : 'Inline Edit' },
                            { icon: '➕', label: isRTL ? 'إضافة صفوف' : 'Add Rows' },
                            { icon: '🗑️', label: isRTL ? 'حذف صفوف' : 'Delete Rows' },
                            { icon: '💾', label: isRTL ? 'حفظ التغييرات' : 'Save Changes' },
                            { icon: '🔄', label: isRTL ? 'سحب وإفلات' : 'Drag & Drop' },
                            { icon: '📏', label: isRTL ? 'تغيير حجم الأعمدة' : 'Resize Columns' },
                            { icon: '🎨', label: isRTL ? 'تعليم بالألوان' : 'Color Markers' },
                            { icon: '📊', label: isRTL ? 'تصدير Excel/PDF' : 'Export Excel/PDF' },
                            { icon: '🖨️', label: isRTL ? 'طباعة احترافية' : 'Professional Print' },
                            { icon: '🔢', label: isRTL ? 'ترقيم تسلسلي' : 'Sequence Numbers' },
                            { icon: '💰', label: isRTL ? 'تفقيط المبالغ' : 'Amount in Words' },
                            { icon: '📱', label: isRTL ? 'دعم RTL كامل' : 'Full RTL Support' },
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                <span className="text-xl">{feature.icon}</span>
                                <span className="text-sm font-medium">{feature.label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
