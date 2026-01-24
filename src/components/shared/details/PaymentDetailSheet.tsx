import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TableFooter,
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
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Phone,
  Receipt,
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

export interface PaymentReference {
  id: string | number;
  documentType: 'invoice' | 'credit_note' | 'debit_note' | 'advance';
  documentNo: string;
  date?: string;
  originalAmount: number;
  allocatedAmount: number;
  balance?: number;
}

export interface PaymentAccountingEntry {
  id: string | number;
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PaymentData {
  id: string;
  voucherNo: string;
  voucherType: 'receipt' | 'payment' | 'transfer';
  date: string;
  status: 'draft' | 'posted' | 'cancelled';
  
  // Payment Info
  paymentType: 'receive' | 'pay';
  amount: number;
  currency: string;
  exchangeRate?: number;
  
  // Party Info
  partyId?: string;
  partyName: string;
  partyNameAr?: string;
  partyType: 'customer' | 'supplier' | 'employee';
  partyPhone?: string;
  
  // Payment Method
  paymentMethod: 'cash' | 'bank' | 'check' | 'transfer' | 'card';
  paymentAccount?: string;
  paymentAccountName?: string;
  checkNo?: string;
  checkDate?: string;
  bankName?: string;
  
  // Description
  description?: string;
  descriptionAr?: string;
  reference?: string;
  
  // Allocations
  references?: PaymentReference[];
  
  // Accounting Entry
  accountingEntries?: PaymentAccountingEntry[];
  
  // Metadata
  createdBy?: string;
  createdAt?: string;
  remarks?: string;
}

interface PaymentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentData | null;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onAccountClick?: (accountCode: string, accountName: string) => void;
  onPartyClick?: (partyId: string, partyName: string) => void;
  onDocumentClick?: (docType: string, docNo: string) => void;
  isEditable?: boolean;
  isDeletable?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'posted':
      return { 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-700 border-green-200',
        labelAr: 'مرحّل',
        labelEn: 'Posted'
      };
    case 'cancelled':
      return { 
        icon: XCircle, 
        color: 'bg-red-100 text-red-700 border-red-200',
        labelAr: 'ملغي',
        labelEn: 'Cancelled'
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

const getPaymentTypeConfig = (_type: string, paymentType: string) => {
  if (paymentType === 'receive') {
    return { 
      labelAr: 'سند قبض', 
      labelEn: 'Receipt Voucher', 
      color: 'bg-emerald-600',
      icon: ArrowDownRight,
      textColor: 'text-emerald-600'
    };
  }
  return { 
    labelAr: 'سند صرف', 
    labelEn: 'Payment Voucher', 
    color: 'bg-orange-600',
    icon: ArrowUpRight,
    textColor: 'text-orange-600'
  };
};

const getPaymentMethodConfig = (method: string) => {
  const config: Record<string, { labelAr: string; labelEn: string; icon: any }> = {
    cash: { labelAr: 'نقدي', labelEn: 'Cash', icon: Banknote },
    bank: { labelAr: 'بنكي', labelEn: 'Bank', icon: Building2 },
    check: { labelAr: 'شيك', labelEn: 'Check', icon: Receipt },
    transfer: { labelAr: 'تحويل', labelEn: 'Transfer', icon: ArrowUpRight },
    card: { labelAr: 'بطاقة', labelEn: 'Card', icon: CreditCard },
  };
  return config[method] || config.cash;
};

export function PaymentDetailSheet({
  open,
  onOpenChange,
  payment,
  onEdit,
  onPrint,
  onDownload,
  onDelete,
  onAccountClick,
  onPartyClick,
  onDocumentClick,
  isEditable = true,
  isDeletable = true,
}: PaymentDetailSheetProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';

  if (!payment) return null;

  const statusConfig = getStatusConfig(payment.status);
  const paymentTypeConfig = getPaymentTypeConfig(payment.voucherType, payment.paymentType);
  const paymentMethodConfig = getPaymentMethodConfig(payment.paymentMethod);
  const StatusIcon = statusConfig.icon;
  const PaymentIcon = paymentTypeConfig.icon;
  const MethodIcon = paymentMethodConfig.icon;

  const totalAllocated = payment.references?.reduce((sum, ref) => sum + ref.allocatedAmount, 0) || 0;
  const unallocated = payment.amount - totalAllocated;

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
              <div className={cn('px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1', paymentTypeConfig.color)}>
                <PaymentIcon className="w-3.5 h-3.5" />
                {isArabic ? paymentTypeConfig.labelAr : paymentTypeConfig.labelEn}
              </div>
              <div>
                <SheetTitle className="text-white text-lg font-bold">
                  {payment.voucherNo}
                </SheetTitle>
                <p className="text-white/70 text-sm">{payment.date}</p>
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
                          ? `هل أنت متأكد من حذف السند رقم ${payment.voucherNo}؟ لا يمكن التراجع عن هذا الإجراء.`
                          : `Are you sure you want to delete voucher ${payment.voucherNo}? This action cannot be undone.`
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
            {/* Amount Card */}
            <Card className={cn(
              'border-2',
              payment.paymentType === 'receive' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'border-orange-200 bg-orange-50 dark:bg-orange-900/20'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      payment.paymentType === 'receive' ? 'bg-emerald-100' : 'bg-orange-100'
                    )}>
                      <PaymentIcon className={cn('w-6 h-6', paymentTypeConfig.textColor)} />
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">{isArabic ? 'المبلغ' : 'Amount'}</span>
                      <p className={cn('text-2xl font-bold font-mono', paymentTypeConfig.textColor)}>
                        {payment.amount.toLocaleString()} {payment.currency}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn('text-xs', statusConfig.color)}>
                    <StatusIcon className="w-3 h-3 me-1" />
                    {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'رقم السند' : 'Voucher No'}</span>
                  </div>
                  <p className="font-mono font-bold text-sm">{payment.voucherNo}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'التاريخ' : 'Date'}</span>
                  </div>
                  <p className="font-mono font-bold text-sm">{payment.date}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <MethodIcon className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</span>
                  </div>
                  <p className="font-bold text-sm">{isArabic ? paymentMethodConfig.labelAr : paymentMethodConfig.labelEn}</p>
                </CardContent>
              </Card>
            </div>

            {/* Party Info */}
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {payment.partyType === 'customer' 
                    ? (isArabic ? 'بيانات العميل' : 'Customer Info')
                    : payment.partyType === 'supplier'
                    ? (isArabic ? 'بيانات المورد' : 'Supplier Info')
                    : (isArabic ? 'بيانات الموظف' : 'Employee Info')
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    {onPartyClick && payment.partyId ? (
                      <button
                        onClick={() => onPartyClick(payment.partyId!, payment.partyName)}
                        className="text-blue-600 hover:underline font-semibold text-sm"
                      >
                        {isArabic && payment.partyNameAr ? payment.partyNameAr : payment.partyName}
                      </button>
                    ) : (
                      <span className="font-semibold text-sm">{isArabic && payment.partyNameAr ? payment.partyNameAr : payment.partyName}</span>
                    )}
                    {payment.partyPhone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {payment.partyPhone}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Account & Check Info */}
            {(payment.paymentAccountName || payment.checkNo) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payment.paymentAccountName && (
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Wallet className="w-4 h-4" />
                        <span className="text-xs">{isArabic ? 'الحساب' : 'Account'}</span>
                      </div>
                      <p className="text-sm">
                        <span className="font-mono text-slate-400">{payment.paymentAccount}</span>
                        <span className="ms-2">{payment.paymentAccountName}</span>
                      </p>
                    </CardContent>
                  </Card>
                )}
                {payment.checkNo && (
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Receipt className="w-4 h-4" />
                        <span className="text-xs">{isArabic ? 'رقم الشيك' : 'Check No'}</span>
                      </div>
                      <p className="font-mono text-sm">{payment.checkNo}</p>
                      {payment.checkDate && (
                        <p className="text-xs text-slate-400 mt-1">{isArabic ? 'التاريخ:' : 'Date:'} {payment.checkDate}</p>
                      )}
                      {payment.bankName && (
                        <p className="text-xs text-slate-400">{isArabic ? 'البنك:' : 'Bank:'} {payment.bankName}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Description */}
            {payment.description && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {isArabic ? 'البيان' : 'Description'}
                  </div>
                  <p className="text-sm">{isArabic && payment.descriptionAr ? payment.descriptionAr : payment.description}</p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Allocated References */}
            {payment.references && payment.references.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3 bg-slate-100 dark:bg-slate-800">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {isArabic ? 'المستندات المرتبطة' : 'Allocated Documents'}
                    <Badge className="bg-slate-200 text-slate-700 text-xs ms-auto">
                      {payment.references.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '200px' }}>
                    <Table className="border-collapse w-full" dir={direction}>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'المستند' : 'Document'}</TableHead>
                          <TableHead className="w-[90px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'المبلغ الأصلي' : 'Original'}</TableHead>
                          <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">{isArabic ? 'المخصص' : 'Allocated'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payment.references.map((ref) => (
                          <TableRow key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                              {onDocumentClick ? (
                                <button
                                  onClick={() => onDocumentClick(ref.documentType, ref.documentNo)}
                                  className="text-blue-600 hover:underline font-mono"
                                >
                                  {ref.documentNo}
                                </button>
                              ) : (
                                <span className="font-mono">{ref.documentNo}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">
                              {ref.date || '-'}
                            </TableCell>
                            <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">
                              {ref.originalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono font-bold text-green-600">
                              {ref.allocatedAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-slate-100">
                          <TableCell colSpan={3} className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-bold text-end">
                            {isArabic ? 'إجمالي المخصص' : 'Total Allocated'}
                          </TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-mono font-bold text-green-600">
                            {totalAllocated.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        {unallocated > 0 && (
                          <TableRow className="bg-amber-50">
                            <TableCell colSpan={3} className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-bold text-end text-amber-600">
                              {isArabic ? 'غير مخصص' : 'Unallocated'}
                            </TableCell>
                            <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-mono font-bold text-amber-600">
                              {unallocated.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accounting Entry */}
            {payment.accountingEntries && payment.accountingEntries.length > 0 && (
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
                        {payment.accountingEntries.map((entry) => (
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
            )}

            {/* Remarks */}
            {payment.remarks && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                    {isArabic ? 'ملاحظات' : 'Remarks'}
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{payment.remarks}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-erp-navy text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PaymentIcon className={cn('w-5 h-5', payment.paymentType === 'receive' ? 'text-emerald-400' : 'text-orange-400')} />
              <span className="text-white/70 text-sm">
                {payment.paymentType === 'receive' 
                  ? (isArabic ? 'إجمالي المقبوض' : 'Total Received')
                  : (isArabic ? 'إجمالي المصروف' : 'Total Paid')
                }
              </span>
            </div>
            <span className={cn(
              'font-mono font-bold text-xl',
              payment.paymentType === 'receive' ? 'text-emerald-400' : 'text-orange-400'
            )}>
              {payment.amount.toLocaleString()} {payment.currency}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PaymentDetailSheet;
