import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  X,
  Printer,
  Download,
  Edit2,
  FileText,
  Calendar,
  User,
  Building2,
  Hash,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface InvoiceLineItem {
  id: string | number;
  lineNo?: number;
  itemCode: string;
  itemName: string;
  itemNameAr?: string;
  description?: string;
  descriptionAr?: string;
  quantity: number;
  uom: string;
  uomAr?: string;
  unitPrice: number;
  discount?: number;
  discountPercent?: number;
  taxRate?: number;
  taxAmount?: number;
  lineTotal: number;
  warehouse?: string;
  warehouseAr?: string;
  serialNo?: string;
  batchNo?: string;
  currency?: string;
}

export interface InvoiceAccountingEntry {
  id: string | number;
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface InvoiceData {
  id: string;
  invoiceNo: string;
  invoiceType: 'sales' | 'purchase' | 'credit_note' | 'debit_note';
  date: string;
  dueDate?: string;
  status: 'draft' | 'submitted' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  
  // Party Info
  partyId?: string;
  partyName: string;
  partyNameAr?: string;
  partyType: 'customer' | 'supplier';
  partyPhone?: string;
  partyEmail?: string;
  partyAddress?: string;
  partyTaxId?: string;
  
  // Invoice Details
  currency: string;
  exchangeRate?: number;
  paymentTerms?: string;
  paymentMethod?: string;
  salesPerson?: string;
  branch?: string;
  warehouse?: string;
  
  // Totals
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  taxAmount?: number;
  taxRate?: number;
  shippingAmount?: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  
  // Line Items
  items: InvoiceLineItem[];
  
  // Accounting Entry
  accountingEntries?: InvoiceAccountingEntry[];
  
  // Metadata
  reference?: string;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}

interface InvoiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onAccountClick?: (accountCode: string, accountName: string) => void;
  onPartyClick?: (partyId: string, partyName: string) => void;
  isEditable?: boolean;
  isDeletable?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'paid':
      return { 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-700 border-green-200',
        labelAr: 'مدفوعة',
        labelEn: 'Paid'
      };
    case 'partial':
      return { 
        icon: Clock, 
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        labelAr: 'مدفوعة جزئياً',
        labelEn: 'Partially Paid'
      };
    case 'overdue':
      return { 
        icon: AlertTriangle, 
        color: 'bg-red-100 text-red-700 border-red-200',
        labelAr: 'متأخرة',
        labelEn: 'Overdue'
      };
    case 'cancelled':
      return { 
        icon: XCircle, 
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        labelAr: 'ملغاة',
        labelEn: 'Cancelled'
      };
    case 'submitted':
      return { 
        icon: FileText, 
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        labelAr: 'مقدمة',
        labelEn: 'Submitted'
      };
    default:
      return { 
        icon: Clock, 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        labelAr: 'مسودة',
        labelEn: 'Draft'
      };
  }
};

const getInvoiceTypeConfig = (type: string) => {
  const config: Record<string, { labelAr: string; labelEn: string; color: string }> = {
    sales: { labelAr: 'فاتورة مبيعات', labelEn: 'Sales Invoice', color: 'bg-green-600' },
    purchase: { labelAr: 'فاتورة مشتريات', labelEn: 'Purchase Invoice', color: 'bg-blue-600' },
    credit_note: { labelAr: 'إشعار دائن', labelEn: 'Credit Note', color: 'bg-orange-600' },
    debit_note: { labelAr: 'إشعار مدين', labelEn: 'Debit Note', color: 'bg-purple-600' },
  };
  return config[type] || config.sales;
};

export function InvoiceDetailSheet({
  open,
  onOpenChange,
  invoice,
  onEdit,
  onPrint,
  onDownload,
  onDelete,
  onAccountClick,
  onPartyClick,
  isEditable = true,
  isDeletable = true,
}: InvoiceDetailSheetProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';

  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);
  const invoiceTypeConfig = getInvoiceTypeConfig(invoice.invoiceType);
  const StatusIcon = statusConfig.icon;

  const paymentProgress = invoice.grandTotal > 0 ? (invoice.paidAmount / invoice.grandTotal) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:w-[50vw] sm:max-w-[50vw] p-0 flex flex-col h-full overflow-hidden"
        dir={direction}
      >
        {/* Header */}
        <SheetHeader className="shrink-0 px-4 py-3 border-b bg-gradient-to-r from-erp-navy to-erp-navy/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('px-3 py-1 rounded-full text-white text-xs font-medium', invoiceTypeConfig.color)}>
                {isArabic ? invoiceTypeConfig.labelAr : invoiceTypeConfig.labelEn}
              </div>
              <div>
                <SheetTitle className="text-white text-lg font-bold">
                  {invoice.invoiceNo}
                </SheetTitle>
                <p className="text-white/70 text-sm">{invoice.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onPrint && (
                <Button variant="ghost" size="icon" onClick={onPrint} className="text-white/80 hover:text-white hover:bg-white/10">
                  <Printer className="w-4 h-4" />
                </Button>
              )}
              {onDownload && (
                <Button variant="ghost" size="icon" onClick={onDownload} className="text-white/80 hover:text-white hover:bg-white/10">
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {isEditable && onEdit && (
                <Button variant="ghost" size="icon" onClick={onEdit} className="text-white/80 hover:text-white hover:bg-white/10" title={isArabic ? 'تعديل' : 'Edit'}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {isDeletable && onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      title={isArabic ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={direction}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isArabic 
                          ? `هل أنت متأكد من حذف الفاتورة رقم ${invoice.invoiceNo}؟ لا يمكن التراجع عن هذا الإجراء.`
                          : `Are you sure you want to delete invoice ${invoice.invoiceNo}? This action cannot be undone.`
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={isArabic ? 'flex-row-reverse gap-2' : ''}>
                      <AlertDialogCancel>
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isArabic ? 'حذف' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white/80 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-4">
            {/* Status & Payment Progress */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn('text-xs', statusConfig.color)}>
                    <StatusIcon className="w-3 h-3 me-1" />
                    {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {isArabic ? 'حالة الدفع' : 'Payment Status'}
                  </span>
                </div>
                <Progress value={paymentProgress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">
                    {isArabic ? 'المدفوع:' : 'Paid:'} <span className="font-mono font-bold text-green-600">{invoice.paidAmount.toLocaleString()}</span>
                  </span>
                  <span className="text-slate-500">
                    {isArabic ? 'المتبقي:' : 'Balance:'} <span className="font-mono font-bold text-rose-600">{invoice.balance.toLocaleString()}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Party Info */}
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {invoice.partyType === 'customer' 
                    ? (isArabic ? 'بيانات العميل' : 'Customer Info')
                    : (isArabic ? 'بيانات المورد' : 'Supplier Info')
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {onPartyClick && invoice.partyId ? (
                      <button
                        onClick={() => onPartyClick(invoice.partyId!, invoice.partyName)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        {isArabic && invoice.partyNameAr ? invoice.partyNameAr : invoice.partyName}
                      </button>
                    ) : (
                      <span className="font-semibold">{isArabic && invoice.partyNameAr ? invoice.partyNameAr : invoice.partyName}</span>
                    )}
                  </div>
                  {invoice.partyPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{invoice.partyPhone}</span>
                    </div>
                  )}
                  {invoice.partyEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{invoice.partyEmail}</span>
                    </div>
                  )}
                  {invoice.partyAddress && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{invoice.partyAddress}</span>
                    </div>
                  )}
                  {invoice.partyTaxId && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Hash className="w-4 h-4 text-slate-400" />
                      <span className="font-mono">{isArabic ? 'الرقم الضريبي:' : 'Tax ID:'} {invoice.partyTaxId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'تاريخ الفاتورة' : 'Invoice Date'}</span>
                  </div>
                  <p className="font-mono font-bold text-sm">{invoice.date}</p>
                </CardContent>
              </Card>

              {invoice.dueDate && (
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
                    </div>
                    <p className="font-mono font-bold text-sm">{invoice.dueDate}</p>
                  </CardContent>
                </Card>
              )}

              {invoice.paymentMethod && (
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</span>
                    </div>
                    <p className="font-bold text-sm">{invoice.paymentMethod}</p>
                  </CardContent>
                </Card>
              )}

              {invoice.salesPerson && (
                <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs">{isArabic ? 'المسؤول' : 'Sales Person'}</span>
                    </div>
                    <p className="font-bold text-sm">{invoice.salesPerson}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Invoice Items Table */}
            <Card>
              <CardHeader className="py-2 px-3 bg-slate-100 dark:bg-slate-800">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {isArabic ? 'بنود الفاتورة' : 'Invoice Items'}
                  <Badge className="bg-slate-200 text-slate-700 text-xs ms-auto">
                    {invoice.items.length} {isArabic ? 'صنف' : 'items'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '250px' }}>
                  <Table className="border-collapse w-full" dir={direction}>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">#</TableHead>
                        <TableHead className="w-[70px] border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الكود' : 'Code'}</TableHead>
                        <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold min-w-[150px]">{isArabic ? 'المنتج' : 'Item'}</TableHead>
                        <TableHead className="w-[60px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-[50px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الوحدة' : 'UOM'}</TableHead>
                        <TableHead className="w-[80px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-[70px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الخصم' : 'Disc.'}</TableHead>
                        <TableHead className="w-[70px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الضريبة' : 'Tax'}</TableHead>
                        <TableHead className="w-[90px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'الإجمالي' : 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">{item.lineNo ?? index + 1}</TableCell>
                          <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">{item.itemCode}</TableCell>
                          <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                            <div>
                              <span className="font-medium">{isArabic && item.itemNameAr ? item.itemNameAr : item.itemName}</span>
                              {item.description && (
                                <p className="text-slate-400 text-[10px]">{isArabic && item.descriptionAr ? item.descriptionAr : item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">{item.quantity}</TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">{isArabic && item.uomAr ? item.uomAr : item.uom}</TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono text-orange-600">{item.discount ? item.discount.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">{item.taxAmount ? item.taxAmount.toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono font-bold">{item.lineTotal.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Totals */}
            <Card className="bg-slate-50 dark:bg-slate-800/50">
              <CardContent className="p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span className="font-mono">{invoice.subtotal.toLocaleString()}</span>
                  </div>
                  {invoice.discountAmount && invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>{isArabic ? 'الخصم' : 'Discount'} {invoice.discountPercent ? `(${invoice.discountPercent}%)` : ''}</span>
                      <span className="font-mono">-{invoice.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.taxAmount && invoice.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isArabic ? 'الضريبة' : 'Tax'} {invoice.taxRate ? `(${invoice.taxRate}%)` : ''}</span>
                      <span className="font-mono">+{invoice.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.shippingAmount && invoice.shippingAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isArabic ? 'الشحن' : 'Shipping'}</span>
                      <span className="font-mono">+{invoice.shippingAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>{isArabic ? 'الإجمالي' : 'Grand Total'}</span>
                    <span className="font-mono text-erp-navy">{invoice.grandTotal.toLocaleString()} {invoice.currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accounting Entry */}
            {invoice.accountingEntries && invoice.accountingEntries.length > 0 && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="py-2 px-3 bg-blue-50 dark:bg-blue-900/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                      {isArabic ? 'القيد المحاسبي' : 'Accounting Entry'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '200px' }}>
                      <Table className="border-collapse w-full" dir={direction}>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold min-w-[180px]">{isArabic ? 'الحساب' : 'Account'}</TableHead>
                            <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'مدين' : 'Debit'}</TableHead>
                            <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'دائن' : 'Credit'}</TableHead>
                            <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'البيان' : 'Description'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.accountingEntries.map((entry) => (
                            <TableRow key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                                {onAccountClick ? (
                                  <button
                                    onClick={() => onAccountClick(entry.accountCode, entry.accountName)}
                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                  >
                                    <span className="font-mono text-slate-400">{entry.accountCode}</span>
                                    <span>{isArabic && entry.accountNameAr ? entry.accountNameAr : entry.accountName}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-400">{entry.accountCode}</span>
                                    <span>{isArabic && entry.accountNameAr ? entry.accountNameAr : entry.accountName}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className={cn(
                                "text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs",
                                entry.debit > 0 && "text-green-600 font-semibold bg-green-50 dark:bg-green-900/20"
                              )}>
                                {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className={cn(
                                "text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs",
                                entry.credit > 0 && "text-rose-600 font-semibold bg-rose-50 dark:bg-rose-900/20"
                              )}>
                                {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                                {entry.description || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Remarks */}
            {invoice.remarks && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                    {isArabic ? 'ملاحظات' : 'Remarks'}
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{invoice.remarks}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer Totals */}
        <div className="shrink-0 border-t bg-erp-navy text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm">{isArabic ? 'إجمالي الفاتورة' : 'Invoice Total'}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-xs text-white/60 block">{isArabic ? 'الإجمالي' : 'Total'}</span>
                <span className="font-mono font-bold text-lg">{invoice.grandTotal.toLocaleString()}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-white/60 block">{isArabic ? 'المدفوع' : 'Paid'}</span>
                <span className="font-mono font-bold text-lg text-green-400">{invoice.paidAmount.toLocaleString()}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-white/60 block">{isArabic ? 'المتبقي' : 'Balance'}</span>
                <span className="font-mono font-bold text-lg text-rose-400">{invoice.balance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default InvoiceDetailSheet;
