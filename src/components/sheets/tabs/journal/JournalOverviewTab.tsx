/**
 * Journal Entry Overview Tab
 * تبويب نظرة عامة على القيد المحاسبي
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  User,
  Building2,
  Hash,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  BookOpen,
  Target,
  Folder,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalOverviewTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'posted':
      return { 
        icon: CheckCircle2, 
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        label: { ar: 'مرحّل', en: 'Posted' }
      };
    case 'cancelled':
      return { 
        icon: XCircle, 
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        label: { ar: 'ملغي', en: 'Cancelled' }
      };
    default:
      return { 
        icon: Clock, 
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        label: { ar: 'مسودة', en: 'Draft' }
      };
  }
};

const getVoucherTypeLabel = (type: string, lang: string) => {
  const labels: Record<string, { ar: string; en: string }> = {
    journal: { ar: 'قيد محاسبي', en: 'Journal Entry' },
    payment: { ar: 'سند صرف', en: 'Payment Voucher' },
    receipt: { ar: 'سند قبض', en: 'Receipt Voucher' },
    transfer: { ar: 'قيد تحويل', en: 'Transfer Entry' },
    opening: { ar: 'قيد افتتاحي', en: 'Opening Entry' },
    sales: { ar: 'قيد مبيعات', en: 'Sales Entry' },
    purchase: { ar: 'قيد مشتريات', en: 'Purchase Entry' },
    expense: { ar: 'قيد مصروفات', en: 'Expense Entry' },
    payroll: { ar: 'قيد رواتب', en: 'Payroll Entry' },
    adjustment: { ar: 'قيد تسوية', en: 'Adjustment Entry' },
    mixed: { ar: 'قيد مختلف', en: 'Mixed Entry' },
  };
  return labels[type]?.[lang as 'ar' | 'en'] || type;
};

export function JournalOverviewTab({ data, language, onAction }: JournalOverviewTabProps) {
  const isRTL = language === 'ar';
  
  // Calculate totals
  const totalDebit = data.totalDebit || data.lines?.reduce((sum: number, line: any) => sum + (line.debit || 0), 0) || 0;
  const totalCredit = data.totalCredit || data.lines?.reduce((sum: number, line: any) => sum + (line.credit || 0), 0) || 0;
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const linesCount = data.lines?.length || 0;
  
  const statusConfig = getStatusConfig(data.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4 p-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Debit */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {isRTL ? 'إجمالي المدين' : 'Total Debit'}
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {totalDebit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Credit */}
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {isRTL ? 'إجمالي الدائن' : 'Total Credit'}
                </p>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
                  {totalCredit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lines Count */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {isRTL ? 'عدد البنود' : 'Lines'}
                </p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {linesCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Status */}
        <Card className={cn(
          "border",
          isBalanced 
            ? "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800"
            : "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                isBalanced ? "bg-green-500" : "bg-red-500"
              )}>
                {isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className={cn(
                  "text-xs",
                  isBalanced ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isRTL ? 'الحالة' : 'Status'}
                </p>
                <p className={cn(
                  "text-sm font-bold",
                  isBalanced ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                )}>
                  {isBalanced 
                    ? (isRTL ? 'متوازن' : 'Balanced') 
                    : (isRTL ? 'غير متوازن' : 'Unbalanced')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Details */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {isRTL ? 'تفاصيل القيد' : 'Entry Details'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Voucher Number */}
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'رقم السند' : 'Voucher No'}</p>
                <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                  {data.voucherNo || data.entry_number || '-'}
                </p>
              </div>
            </div>

            {/* Voucher Type */}
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'نوع القيد' : 'Entry Type'}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {getVoucherTypeLabel(data.voucherType || data.entry_type || 'journal', language)}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'التاريخ' : 'Date'}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {data.date ? new Date(data.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <StatusIcon className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'الحالة' : 'Status'}</p>
                <Badge className={statusConfig.color}>
                  {statusConfig.label[isRTL ? 'ar' : 'en']}
                </Badge>
              </div>
            </div>

            {/* Reference */}
            {data.reference && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'المرجع' : 'Reference'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {data.reference}
                  </p>
                </div>
              </div>
            )}

            {/* Cost Center */}
            {data.costCenter && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'مركز التكلفة' : 'Cost Center'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {isRTL ? data.costCenterAr || data.costCenter : data.costCenter}
                  </p>
                </div>
              </div>
            )}

            {/* Project */}
            {data.project && (
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'المشروع' : 'Project'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {data.project}
                  </p>
                </div>
              </div>
            )}

            {/* Created By */}
            {data.createdBy && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'أنشأ بواسطة' : 'Created By'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {data.createdBy}
                  </p>
                </div>
              </div>
            )}

            {/* Company */}
            {(data.company || data.companyAr) && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'الشركة' : 'Company'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {isRTL ? data.companyAr || data.company : data.company}
                  </p>
                </div>
              </div>
            )}

            {/* Currency */}
            {data.currency && data.currency !== 'SAR' && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'العملة' : 'Currency'}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {data.currency}
                    {data.exchangeRate && data.exchangeRate !== 1 && (
                      <span className="text-xs text-gray-400 ms-1">
                        ({isRTL ? 'سعر الصرف:' : 'Rate:'} {data.exchangeRate})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description / Remarks */}
      {(data.description || data.descriptionAr || data.remarks) && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isRTL ? 'الوصف / الملاحظات' : 'Description / Remarks'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? data.descriptionAr || data.description : data.description}
            </p>
            {data.remarks && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 border-t pt-2">
                {data.remarks}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
