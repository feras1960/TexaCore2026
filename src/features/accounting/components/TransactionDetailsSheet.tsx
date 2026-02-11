import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer,
  Download,
  Share2,
  Edit,
  Save,
  X,
  FileText,
  Calendar,
  Hash,
  User,
  Building,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string;
  amount: number;
  status: string;
  reference?: string;
  account?: string;
  counterAccount?: string;
  createdBy?: string;
  notes?: string;
  journalLines?: {
    account: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

interface TransactionDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSave?: (transaction: Transaction) => void;
}

export default function TransactionDetailsSheet({
  open,
  onOpenChange,
  transaction,
  onSave
}: TransactionDetailsSheetProps) {
  const { t, direction, language } = useLanguage();
  const { currencyCode: companyCurrency } = useCompanyCurrency();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);

  React.useEffect(() => {
    if (transaction) {
      setEditedTransaction({ ...transaction });
    }
    setIsEditing(false);
  }, [transaction]);

  if (!transaction || !editedTransaction) return null;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedTransaction({ ...transaction });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (onSave && editedTransaction) {
      onSave(editedTransaction);
    }
    setIsEditing(false);
  };

  const handleChange = (field: keyof Transaction, value: any) => {
    setEditedTransaction(prev => prev ? { ...prev, [field]: value } : null);
  };

  const isPayment = transaction.type === 'Payment' || transaction.type === 'Expense' || transaction.type === 'Bill';

  // Mock journal lines for the transaction
  const journalLines = editedTransaction.journalLines || [
    { account: '1101', accountName: language === 'ar' ? 'النقدية' : 'Cash', debit: isPayment ? 0 : transaction.amount, credit: isPayment ? transaction.amount : 0 },
    { account: '4101', accountName: language === 'ar' ? 'الإيرادات' : 'Revenue', debit: isPayment ? transaction.amount : 0, credit: isPayment ? 0 : transaction.amount },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 flex flex-col"
        dir={direction}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isPayment ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                {isPayment
                  ? <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                  : <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                }
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-erp-navy dark:text-white font-cairo">
                  {language === 'ar' ? 'تفاصيل الحركة' : 'Transaction Details'}
                </SheetTitle>
                <p className="text-sm text-gray-500 font-mono">{transaction.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`${transaction.status === 'posted'
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                  }`}
              >
                {transaction.status === 'posted' ? (
                  <CheckCircle className="w-3 h-3 ml-1" />
                ) : (
                  <Clock className="w-3 h-3 ml-1" />
                )}
                {t(transaction.status) || transaction.status}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Amount Display */}
          <div className={`p-6 rounded-xl border-2 ${isPayment ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center">
              {language === 'ar' ? 'المبلغ' : 'Amount'}
            </p>
            <p className={`text-4xl font-bold font-mono text-center ${isPayment ? 'text-red-600' : 'text-green-600'}`}>
              {isPayment ? '-' : '+'}{transaction.amount.toLocaleString()}
              <span className="text-lg text-gray-400 mr-2">{companyCurrency}</span>
            </p>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {language === 'ar' ? 'المرجع' : 'Reference'}
              </label>
              {isEditing ? (
                <Input
                  value={editedTransaction.id}
                  onChange={(e) => handleChange('id', e.target.value)}
                  className="h-9"
                  disabled
                />
              ) : (
                <p className="font-mono text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{transaction.id}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {language === 'ar' ? 'التاريخ' : 'Date'}
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedTransaction.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="h-9"
                />
              ) : (
                <p className="font-mono text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{transaction.date}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {language === 'ar' ? 'النوع' : 'Type'}
              </label>
              {isEditing ? (
                <Select value={editedTransaction.type} onValueChange={(v) => handleChange('type', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payment">{language === 'ar' ? 'دفعة' : 'Payment'}</SelectItem>
                    <SelectItem value="Invoice">{language === 'ar' ? 'فاتورة' : 'Invoice'}</SelectItem>
                    <SelectItem value="Expense">{language === 'ar' ? 'مصروف' : 'Expense'}</SelectItem>
                    <SelectItem value="Bill">{language === 'ar' ? 'فاتورة شراء' : 'Bill'}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{t(transaction.type) || transaction.type}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {language === 'ar' ? 'الحالة' : 'Status'}
              </label>
              {isEditing ? (
                <Select value={editedTransaction.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">{language === 'ar' ? 'مرحّل' : 'Posted'}</SelectItem>
                    <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{t(transaction.status) || transaction.status}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">
              {language === 'ar' ? 'الوصف' : 'Description'}
            </label>
            {isEditing ? (
              <Textarea
                value={editedTransaction.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
              />
            ) : (
              <p className="text-sm bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md">{transaction.description}</p>
            )}
          </div>

          <Separator />

          {/* Journal Entry Lines */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-erp-navy dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {language === 'ar' ? 'بنود القيد' : 'Journal Entry Lines'}
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '300px' }}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
                        {language === 'ar' ? 'الحساب' : 'Account'}
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300 w-24">
                        {language === 'ar' ? 'مدين' : 'Debit'}
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300 w-24">
                        {language === 'ar' ? 'دائن' : 'Credit'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalLines.map((line, idx) => (
                      <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-400">{line.account}</span>
                            <span className="text-gray-800 dark:text-gray-200">{line.accountName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {line.debit > 0 ? (
                            <span className="text-green-600">{line.debit.toLocaleString()}</span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {line.credit > 0 ? (
                            <span className="text-red-600">{line.credit.toLocaleString()}</span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <tr>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-green-600">
                        {journalLines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-red-600">
                        {journalLines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">
              {language === 'ar' ? 'ملاحظات' : 'Notes'}
            </label>
            {isEditing ? (
              <Textarea
                value={editedTransaction.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                placeholder={language === 'ar' ? 'أضف ملاحظات...' : 'Add notes...'}
              />
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md text-sm text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                {transaction.notes || (language === 'ar' ? 'لا توجد ملاحظات' : 'No notes')}
              </div>
            )}
          </div>

          {/* Audit Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>{language === 'ar' ? 'أنشئ بواسطة:' : 'Created by:'}</span>
              <span className="font-medium">{transaction.createdBy || 'Admin'}</span>
            </div>
            <div className="flex justify-between">
              <span>{language === 'ar' ? 'تاريخ الإنشاء:' : 'Created at:'}</span>
              <span className="font-mono">{transaction.date} 10:30 AM</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-gray-50 dark:bg-gray-900">
          {isEditing ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleCancel}>
                <X className="w-4 h-4" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button className="flex-1 gap-2 bg-erp-navy hover:bg-erp-navy/90" onClick={handleSave}>
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'طباعة' : 'Print'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'تصدير' : 'Export'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'مشاركة' : 'Share'}
                </Button>
              </div>
              <Button className="gap-2 bg-erp-navy hover:bg-erp-navy/90" onClick={handleEdit}>
                <Edit className="w-4 h-4" />
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
