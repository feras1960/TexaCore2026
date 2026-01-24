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
  Building2,
  Hash,
  CheckCircle2,
  Clock,
  XCircle,
  Target,
  Trash2,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

export interface JournalEntryLine {
  id: string | number;
  lineNo?: number;
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  debit: number;
  credit: number;
  description?: string;
  descriptionAr?: string;
  costCenter?: string;
  costCenterAr?: string;
  currency?: string;
  exchangeRate?: number;
  party?: string;
  partyType?: 'customer' | 'supplier';
}

export interface JournalEntryData {
  id: string;
  voucherNo: string;
  voucherType: 'journal' | 'payment' | 'receipt' | 'transfer' | 'opening';
  date: string;
  postingDate?: string;
  status: 'draft' | 'posted' | 'cancelled';
  description: string;
  descriptionAr?: string;
  reference?: string;
  company?: string;
  companyAr?: string;
  financeBook?: string;
  costCenter?: string;
  project?: string;
  currency?: string;
  exchangeRate?: number;
  createdBy?: string;
  modifiedBy?: string;
  createdAt?: string;
  modifiedAt?: string;
  lines: JournalEntryLine[];
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
  remarks?: string;
  attachments?: string[];
}

interface JournalEntryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalEntryData | null;
  onEdit?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onAccountClick?: (accountCode: string, accountName: string) => void;
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

const getVoucherTypeConfig = (type: string) => {
  const config: Record<string, { labelAr: string; labelEn: string; color: string }> = {
    journal: { labelAr: 'قيد محاسبي', labelEn: 'Journal Entry', color: 'bg-blue-600' },
    payment: { labelAr: 'سند صرف', labelEn: 'Payment Voucher', color: 'bg-orange-600' },
    receipt: { labelAr: 'سند قبض', labelEn: 'Receipt Voucher', color: 'bg-emerald-600' },
    transfer: { labelAr: 'قيد تحويل', labelEn: 'Transfer Entry', color: 'bg-purple-600' },
    opening: { labelAr: 'قيد افتتاحي', labelEn: 'Opening Entry', color: 'bg-cyan-600' },
  };
  return config[type] || config.journal;
};

export function JournalEntryDetailSheet({
  open,
  onOpenChange,
  entry,
  onEdit,
  onPrint,
  onDownload,
  onDelete,
  onAccountClick,
  isEditable = true,
  isDeletable = true,
}: JournalEntryDetailSheetProps) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const direction = isArabic ? 'rtl' : 'ltr';

  if (!entry) return null;

  const statusConfig = getStatusConfig(entry.status);
  const voucherTypeConfig = getVoucherTypeConfig(entry.voucherType);
  const StatusIcon = statusConfig.icon;

  const totalDebit = entry.totalDebit ?? entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = entry.totalCredit ?? entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = entry.isBalanced ?? Math.abs(totalDebit - totalCredit) < 0.01;

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
              <div className={cn('px-3 py-1 rounded-full text-white text-xs font-medium', voucherTypeConfig.color)}>
                {isArabic ? voucherTypeConfig.labelAr : voucherTypeConfig.labelEn}
              </div>
              <div>
                <SheetTitle className="text-white text-lg font-bold">
                  {entry.voucherNo}
                </SheetTitle>
                <p className="text-white/70 text-sm">{entry.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onPrint && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrint}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDownload}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {isEditable && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  title={isArabic ? 'تعديل' : 'Edit'}
                >
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
                          ? `هل أنت متأكد من حذف القيد رقم ${entry.voucherNo}؟ لا يمكن التراجع عن هذا الإجراء.`
                          : `Are you sure you want to delete entry ${entry.voucherNo}? This action cannot be undone.`
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 space-y-4">
            {/* Entry Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'رقم القيد' : 'Entry No'}</span>
                  </div>
                  <p className="font-mono font-bold text-sm">{entry.voucherNo}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'التاريخ' : 'Date'}</span>
                  </div>
                  <p className="font-mono font-bold text-sm">{entry.date}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'النوع' : 'Type'}</span>
                  </div>
                  <p className="font-bold text-sm">{isArabic ? voucherTypeConfig.labelAr : voucherTypeConfig.labelEn}</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-xs">{isArabic ? 'الحالة' : 'Status'}</span>
                  </div>
                  <Badge className={cn('text-xs', statusConfig.color)}>
                    {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {isArabic ? 'البيان' : 'Description'}
                </div>
                <p className="text-sm">{isArabic && entry.descriptionAr ? entry.descriptionAr : entry.description}</p>
              </CardContent>
            </Card>

            {/* Reference & Additional Info */}
            {(entry.reference || entry.costCenter || entry.project) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {entry.reference && (
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                    <CardContent className="p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                        {isArabic ? 'المرجع' : 'Reference'}
                      </div>
                      <p className="font-mono text-sm">{entry.reference}</p>
                    </CardContent>
                  </Card>
                )}
                {entry.costCenter && (
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Target className="w-4 h-4" />
                        <span className="text-xs">{isArabic ? 'مركز التكلفة' : 'Cost Center'}</span>
                      </div>
                      <p className="text-sm">{entry.costCenter}</p>
                    </CardContent>
                  </Card>
                )}
                {entry.project && (
                  <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">{isArabic ? 'المشروع' : 'Project'}</span>
                      </div>
                      <p className="text-sm">{entry.project}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Entry Lines Table */}
            <Card>
              <CardHeader className="py-2 px-3 bg-slate-100 dark:bg-slate-800">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {isArabic ? 'بنود القيد' : 'Entry Lines'}
                  {isBalanced ? (
                    <Badge className="bg-green-100 text-green-700 text-xs ms-auto">
                      {isArabic ? 'متوازن ✓' : 'Balanced ✓'}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 text-xs ms-auto">
                      {isArabic ? 'غير متوازن' : 'Unbalanced'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '300px' }}>
                  <Table className="border-collapse w-full" dir={direction}>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          #
                        </TableHead>
                        <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold min-w-[180px]">
                          {isArabic ? 'الحساب' : 'Account'}
                        </TableHead>
                        <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          {isArabic ? 'مدين' : 'Debit'}
                        </TableHead>
                        <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          {isArabic ? 'دائن' : 'Credit'}
                        </TableHead>
                        <TableHead className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold min-w-[120px]">
                          {isArabic ? 'البيان' : 'Description'}
                        </TableHead>
                        <TableHead className="w-[90px] border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          {isArabic ? 'مركز التكلفة' : 'Cost Center'}
                        </TableHead>
                        <TableHead className="w-[60px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          {isArabic ? 'العملة' : 'Currency'}
                        </TableHead>
                        <TableHead className="w-[70px] text-center border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-semibold">
                          {isArabic ? 'س. الصرف' : 'Ex. Rate'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((line, index) => (
                        <TableRow key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                            {line.lineNo ?? index + 1}
                          </TableCell>
                          <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                            {onAccountClick ? (
                              <button
                                onClick={() => onAccountClick(line.accountCode, line.accountName)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                              >
                                <span className="font-mono text-slate-400">{line.accountCode}</span>
                                <span>{isArabic && line.accountNameAr ? line.accountNameAr : line.accountName}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-slate-400">{line.accountCode}</span>
                                <span>{isArabic && line.accountNameAr ? line.accountNameAr : line.accountName}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs",
                            line.debit > 0 && "text-green-600 font-semibold bg-green-50 dark:bg-green-900/20"
                          )}>
                            {line.debit > 0 ? line.debit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs",
                            line.credit > 0 && "text-rose-600 font-semibold bg-rose-50 dark:bg-rose-900/20"
                          )}>
                            {line.credit > 0 ? line.credit.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                            {isArabic && line.descriptionAr ? line.descriptionAr : line.description || '-'}
                          </TableCell>
                          <TableCell className="border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs">
                            {isArabic && line.costCenterAr ? line.costCenterAr : line.costCenter || '-'}
                          </TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">
                            {line.currency || 'SAR'}
                          </TableCell>
                          <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-mono">
                            {line.exchangeRate || '1.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-erp-navy text-white">
                        <TableCell colSpan={2} className="border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-bold">
                          {isArabic ? 'المجموع' : 'Total'}
                        </TableCell>
                        <TableCell className="text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-bold">
                          {totalDebit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center font-mono border border-slate-200 dark:border-slate-700 px-2 py-2 text-xs font-bold">
                          {totalCredit.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={4} className="border border-slate-200 dark:border-slate-700 px-2 py-2"></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            {entry.remarks && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                    {isArabic ? 'ملاحظات' : 'Remarks'}
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{entry.remarks}</p>
                </CardContent>
              </Card>
            )}

            {/* Audit Info */}
            {(entry.createdBy || entry.modifiedBy) && (
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-0">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {entry.createdBy && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isArabic ? 'أنشأه' : 'Created By'}:
                        </span>
                        <span className="ms-2 font-medium">{entry.createdBy}</span>
                        {entry.createdAt && (
                          <span className="text-slate-400 ms-1">({entry.createdAt})</span>
                        )}
                      </div>
                    )}
                    {entry.modifiedBy && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isArabic ? 'عدّله' : 'Modified By'}:
                        </span>
                        <span className="ms-2 font-medium">{entry.modifiedBy}</span>
                        {entry.modifiedAt && (
                          <span className="text-slate-400 ms-1">({entry.modifiedAt})</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer Totals */}
        <div className="shrink-0 border-t bg-erp-navy text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">{isArabic ? 'مجموع القيد' : 'Entry Total'}</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">{isArabic ? 'مدين:' : 'Debit:'}</span>
                <span className="font-mono font-bold text-green-400">{totalDebit.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">{isArabic ? 'دائن:' : 'Credit:'}</span>
                <span className="font-mono font-bold text-rose-400">{totalCredit.toLocaleString()}</span>
              </div>
              {isBalanced && (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default JournalEntryDetailSheet;
