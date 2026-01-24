/**
 * Account Overview Tab
 * تبويب نظرة عامة على الحساب
 */

import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  Calendar,
  DollarSign,
  Info,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabComponentProps } from '../../configs/sheet.types';

export function AccountOverviewTab({ data, language, t }: TabComponentProps) {
  // Calculate stats from data
  const totalDebit = data.total_debit || data.totalDebit || 0;
  const totalCredit = data.total_credit || data.totalCredit || 0;
  const currentBalance = data.current_balance || data.balance || (totalDebit - totalCredit);
  const transactionCount = data.transaction_count || data.transactionCount || 0;
  const lastActivityDate = data.last_activity || data.lastActivity || '-';
  
  // Credit limit calculation
  const creditLimit = data.credit_limit || 100000;
  const usedCredit = Math.abs(currentBalance < 0 ? currentBalance : 0);
  const creditUsagePercent = Math.min((usedCredit / creditLimit) * 100, 100);

  // Account type display
  const accountType = data.account_type || data.type || 'Asset';
  const accountTypeAr: Record<string, string> = {
    'Asset': 'أصول',
    'Liability': 'التزامات',
    'Equity': 'حقوق الملكية',
    'Revenue': 'إيرادات',
    'Expense': 'مصروفات',
    'Cost': 'تكاليف',
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Stats Grid - 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
              <span>{language === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <span>{language === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</span>
            </div>
            <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
              {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span>{language === 'ar' ? 'عدد العمليات' : 'Transactions'}</span>
            </div>
            <div className="text-xl font-bold font-mono text-gray-700 dark:text-gray-300">
              {transactionCount}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{language === 'ar' ? 'آخر نشاط' : 'Last Activity'}</span>
            </div>
            <div className="text-lg font-bold font-mono text-gray-700 dark:text-gray-300">
              {lastActivityDate}
            </div>
          </div>
        </div>

        {/* Credit Usage */}
        {(data.account_type === 'Liability' || accountType === 'customer' || accountType === 'supplier') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-erp-teal" />
                {language === 'ar' ? 'استخدام الائتمان' : 'Credit Usage'}
              </h3>
              <span className="text-sm text-gray-500">
                {language === 'ar' ? 'الحد الائتماني' : 'Credit Limit'}: {creditLimit.toLocaleString()} {t('currencies.SAR')}
              </span>
            </div>
            <Progress value={creditUsagePercent} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{language === 'ar' ? 'مستخدم' : 'Used'}: {creditUsagePercent.toFixed(0)}%</span>
              <span>{language === 'ar' ? 'متاح' : 'Available'}: {(100 - creditUsagePercent).toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Two columns: Account Info + Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'معلومات الحساب' : 'Account Info'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'رمز الحساب' : 'Account Code'}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{data.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'نوع الحساب' : 'Account Type'}</span>
                <Badge variant="outline" className="text-xs">
                  {language === 'ar' ? accountTypeAr[accountType] || accountType : accountType}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'العملة' : 'Currency'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{data.currency || 'SAR'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'المجموعة' : 'Group'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.parent?.name || data.parent_name || (language === 'ar' ? 'رئيسي' : 'Root')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</span>
                <Badge variant={data.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                  {data.is_active !== false 
                    ? (language === 'ar' ? 'نشط' : 'Active')
                    : (language === 'ar' ? 'غير نشط' : 'Inactive')
                  }
                </Badge>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {(data.opening_balance || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</span>
                <span className={cn(
                  "text-sm font-mono font-bold",
                  currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {currentBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'المتوسط الشهري' : 'Monthly Average'}</span>
                <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {(data.monthly_average || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.created_at ? new Date(data.created_at).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-erp-teal" />
              {language === 'ar' ? 'الوصف' : 'Description'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.description}
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default AccountOverviewTab;
