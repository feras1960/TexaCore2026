/**
 * Fund Overview Tab
 * تبويب نظرة عامة على الصندوق
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Hash,
  CreditCard,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundOverviewTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
}

// Currency configuration
const currencyInfo: Record<string, { symbol: string; flag: string; name: { ar: string; en: string } }> = {
  SAR: { symbol: 'ر.س', flag: '🇸🇦', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  USD: { symbol: '$', flag: '🇺🇸', name: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  EUR: { symbol: '€', flag: '🇪🇺', name: { ar: 'يورو', en: 'Euro' } },
  GBP: { symbol: '£', flag: '🇬🇧', name: { ar: 'جنيه إسترليني', en: 'British Pound' } },
  AED: { symbol: 'د.إ', flag: '🇦🇪', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } }
};

export function FundOverviewTab({ data, language, onAction: _onAction }: FundOverviewTabProps) {
  const isRTL = language === 'ar';

  // Get balances (support both formats)
  const balances = data.balances || [
    {
      currency: data.currency || data.defaultCurrency || '',
      balance: data.balance || data.current_balance || 0,
      totalDeposits: data.totalDeposits || data.total_deposits || 0,
      totalWithdrawals: data.totalWithdrawals || data.total_withdrawals || 0,
      todayChange: data.todayChange || data.today_change || 0,
    }
  ];

  const _mainBalance = balances[0];
  const totalBalance = balances.reduce((sum: number, b: any) => sum + (b.balance || 0), 0);
  const totalDeposits = balances.reduce((sum: number, b: any) => sum + (b.totalDeposits || 0), 0);
  const totalWithdrawals = balances.reduce((sum: number, b: any) => sum + (b.totalWithdrawals || 0), 0);
  const todayChange = balances.reduce((sum: number, b: any) => sum + (b.todayChange || 0), 0);

  const isCash = data.type === 'cash';

  return (
    <div className="space-y-4 p-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current Balance */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                {isCash ? (
                  <Wallet className="w-4 h-4 text-white" />
                ) : (
                  <Landmark className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {isRTL ? 'الرصيد الحالي' : 'Current Balance'}
                </p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Deposits */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <ArrowDownRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {isRTL ? 'إجمالي الإيداعات' : 'Total Deposits'}
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {totalDeposits.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Withdrawals */}
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 border-rose-200 dark:border-rose-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {isRTL ? 'إجمالي السحوبات' : 'Total Withdrawals'}
                </p>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono">
                  {totalWithdrawals.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Change */}
        <Card className={cn(
          "border",
          todayChange >= 0
            ? "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800"
            : "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                todayChange >= 0 ? "bg-green-500" : "bg-red-500"
              )}>
                {todayChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-white" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className={cn(
                  "text-xs",
                  todayChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isRTL ? 'حركة اليوم' : "Today's Change"}
                </p>
                <p className={cn(
                  "text-lg font-bold font-mono",
                  todayChange >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                )}>
                  {todayChange >= 0 ? '+' : ''}{todayChange.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Currency Balances */}
      {balances.length > 1 && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isRTL ? 'أرصدة العملات' : 'Currency Balances'}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {balances.map((bal: any, index: number) => (
                <div
                  key={bal.currency || index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{currencyInfo[bal.currency]?.flag || '💰'}</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {bal.currency}
                    </span>
                  </div>
                  <p className="text-xl font-bold font-mono text-gray-800 dark:text-gray-200">
                    {bal.balance.toLocaleString()}
                  </p>
                  {bal.todayChange !== 0 && (
                    <p className={cn(
                      "text-xs font-mono mt-1",
                      bal.todayChange >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {bal.todayChange >= 0 ? '+' : ''}{bal.todayChange.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fund Details */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {isRTL ? 'تفاصيل الصندوق' : 'Fund Details'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Fund Name */}
            <div className="flex items-center gap-2">
              {isCash ? (
                <Wallet className="w-4 h-4 text-gray-400" />
              ) : (
                <Landmark className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'الاسم' : 'Name'}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {data.name || '-'}
                </p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'النوع' : 'Type'}</p>
                <Badge variant={isCash ? 'default' : 'secondary'}>
                  {isCash ? (isRTL ? 'صندوق نقدي' : 'Cash') : (isRTL ? 'حساب بنكي' : 'Bank')}
                </Badge>
              </div>
            </div>

            {/* Account Number (for banks) */}
            {!isCash && data.accountNumber && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'رقم الحساب' : 'Account No.'}</p>
                  <p className="font-mono text-sm text-gray-800 dark:text-gray-200">
                    {data.accountNumber}
                  </p>
                </div>
              </div>
            )}

            {/* Default Currency */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'العملة الأساسية' : 'Default Currency'}</p>
                <div className="flex items-center gap-1">
                  <span>{currencyInfo[data.defaultCurrency || data.currency]?.flag}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {data.defaultCurrency || data.currency || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Count */}
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'عدد العمليات' : 'Transactions'}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  {data.transactionCount || data.transaction_count || 0}
                </p>
              </div>
            </div>

            {/* Last Activity */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">{isRTL ? 'آخر نشاط' : 'Last Activity'}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {data.lastActivity || data.last_activity || '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Summary */}
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {isRTL ? 'ملخص التدفق النقدي' : 'Cash Flow Summary'}
          </h3>
          <div className="space-y-3">
            {/* Deposits Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{isRTL ? 'الإيداعات' : 'Deposits'}</span>
                <span className="font-mono text-emerald-600">+{totalDeposits.toLocaleString()}</span>
              </div>
              <Progress
                value={totalDeposits > 0 ? (totalDeposits / (totalDeposits + totalWithdrawals)) * 100 : 50}
                className="h-2 bg-gray-200"
              />
            </div>
            {/* Withdrawals Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{isRTL ? 'السحوبات' : 'Withdrawals'}</span>
                <span className="font-mono text-rose-600">-{totalWithdrawals.toLocaleString()}</span>
              </div>
              <Progress
                value={totalWithdrawals > 0 ? (totalWithdrawals / (totalDeposits + totalWithdrawals)) * 100 : 50}
                className="h-2 bg-gray-200 [&>div]:bg-rose-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
