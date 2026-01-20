/**
 * AgentWithdrawalsTab - تبويب سحوبات الوكيل
 * يعرض قائمة طلبات السحب والتحويلات
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Calendar,
} from 'lucide-react';
import { type TabComponentProps, type DocType } from '../../configs/sheet.types';

// Withdrawal Interface
interface Withdrawal {
  id: string;
  date: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  method: 'bank_transfer' | 'paypal' | 'cash' | 'other';
  bank_name?: string;
  account_number?: string;
  notes?: string;
  processed_at?: string;
  rejection_reason?: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; labelAr: string; labelEn: string }> = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', labelAr: 'معلق', labelEn: 'Pending' },
  approved: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', labelAr: 'موافق', labelEn: 'Approved' },
  processing: { icon: AlertCircle, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', labelAr: 'قيد التنفيذ', labelEn: 'Processing' },
  completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', labelAr: 'مكتمل', labelEn: 'Completed' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', labelAr: 'مرفوض', labelEn: 'Rejected' },
};

const METHOD_LABELS: Record<string, { ar: string; en: string; icon: any }> = {
  bank_transfer: { ar: 'تحويل بنكي', en: 'Bank Transfer', icon: Building },
  paypal: { ar: 'PayPal', en: 'PayPal', icon: CreditCard },
  cash: { ar: 'نقدي', en: 'Cash', icon: Wallet },
  other: { ar: 'أخرى', en: 'Other', icon: CreditCard },
};

// Withdrawal Card Component
function WithdrawalCard({ 
  withdrawal, 
  language, 
  onClick 
}: { 
  withdrawal: Withdrawal; 
  language: string;
  onClick?: () => void;
}) {
  const isArabic = language === 'ar';
  const statusConfig = STATUS_CONFIG[withdrawal.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const methodInfo = METHOD_LABELS[withdrawal.method] || METHOD_LABELS.other;
  const MethodIcon = methodInfo.icon;

  return (
    <div 
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-erp-teal/50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            withdrawal.status === 'completed' 
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-gray-100 dark:bg-gray-900/30'
          )}>
            <ArrowUpRight className={cn(
              'w-5 h-5',
              withdrawal.status === 'completed' 
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-500">{withdrawal.reference}</span>
              <Badge className={cn('text-xs', statusConfig.color)}>
                <StatusIcon className="w-3 h-3 me-1" />
                {isArabic ? statusConfig.labelAr : statusConfig.labelEn}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {new Date(withdrawal.date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Amount */}
        <div className="text-end">
          <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">
            {withdrawal.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500">{withdrawal.currency}</div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="flex items-center justify-between text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex items-center gap-2 text-gray-500">
          <MethodIcon className="w-4 h-4" />
          <span>{isArabic ? methodInfo.ar : methodInfo.en}</span>
          {withdrawal.bank_name && (
            <span className="text-gray-400">• {withdrawal.bank_name}</span>
          )}
        </div>
        {withdrawal.account_number && (
          <span className="font-mono text-gray-400">
            ****{withdrawal.account_number.slice(-4)}
          </span>
        )}
      </div>

      {/* Rejection Reason */}
      {withdrawal.status === 'rejected' && withdrawal.rejection_reason && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
          <span className="font-medium">{isArabic ? 'سبب الرفض:' : 'Reason:'}</span> {withdrawal.rejection_reason}
        </div>
      )}

      {/* Processed Date */}
      {withdrawal.processed_at && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {isArabic ? 'تم التنفيذ:' : 'Processed:'} {new Date(withdrawal.processed_at).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
        </div>
      )}
    </div>
  );
}

export function AgentWithdrawalsTab({ data, docType, language, t, onRowClick, onRefresh }: TabComponentProps) {
  const isArabic = language === 'ar';

  // Get withdrawals from data
  const withdrawals: Withdrawal[] = useMemo(() => {
    if (data.withdrawals && Array.isArray(data.withdrawals)) {
      return data.withdrawals;
    }
    if (data.withdrawal_requests && Array.isArray(data.withdrawal_requests)) {
      return data.withdrawal_requests;
    }
    return [];
  }, [data]);

  // Stats
  const stats = useMemo(() => ({
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending' || w.status === 'approved' || w.status === 'processing').length,
    completed: withdrawals.filter(w => w.status === 'completed').length,
    totalAmount: withdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0),
    pendingAmount: withdrawals.filter(w => w.status !== 'completed' && w.status !== 'rejected').reduce((sum, w) => sum + w.amount, 0),
  }), [withdrawals]);

  // Available balance
  const availableBalance = data.current_balance || 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-erp-teal" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'السحوبات' : 'Withdrawals'}
            </h3>
            <Badge variant="secondary">{withdrawals.length}</Badge>
          </div>
          <Button size="sm" disabled={availableBalance <= 0}>
            <Plus className="w-4 h-4 me-1" />
            {isArabic ? 'طلب سحب' : 'Request Withdrawal'}
          </Button>
        </div>

        {/* Available Balance Card */}
        <div className="bg-gradient-to-br from-erp-navy to-erp-teal rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">
                {isArabic ? 'الرصيد المتاح للسحب' : 'Available Balance'}
              </div>
              <div className="text-2xl font-bold font-mono mt-1">
                {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal ms-1">{data.currency || 'SAR'}</span>
              </div>
            </div>
            <Wallet className="w-10 h-10 text-white/30" />
          </div>
          {stats.pendingAmount > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/70">
              {isArabic ? 'قيد المعالجة:' : 'Processing:'} {stats.pendingAmount.toLocaleString()} {data.currency || 'SAR'}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              {isArabic ? 'معلق' : 'Pending'}
            </div>
            <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {stats.pending}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400">
              {isArabic ? 'مكتمل' : 'Completed'}
            </div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300">
              {stats.completed}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {isArabic ? 'إجمالي المسحوب' : 'Total Withdrawn'}
            </div>
            <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">
              {stats.totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Withdrawals List */}
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <WithdrawalCard
              key={withdrawal.id}
              withdrawal={withdrawal}
              language={language}
              onClick={onRowClick ? () => onRowClick(withdrawal, 'payment') : undefined}
            />
          ))}
        </div>

        {withdrawals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            {isArabic ? 'لا توجد سحوبات' : 'No withdrawals'}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default AgentWithdrawalsTab;
