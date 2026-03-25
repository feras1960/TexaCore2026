/**
 * Plan Ledger Tab - كشف حساب الباقة
 * ✨ جدول الفواتير والمقبوضات
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Loader2, DollarSign, 
  TrendingUp, TrendingDown, CreditCard,
  Building2, Receipt, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const PlanLedgerTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t 
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    avgPayment: 0,
  });
  const locale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    loadPayments();
  }, [data.id]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading payments for plan:', data.id);
      
      const { data: pmts, error } = await supabase
        .from('saas_payments')
        .select(`
          *,
          subscriptions:subscription_id (
            id,
            tenants:tenant_id (
              name,
              email
            )
          )
        `)
        .eq('plan_id', data.id)
        .order('collection_date', { ascending: false });

      if (error) throw error;

      console.log('✅ Payments loaded:', pmts?.length || 0);
      setPayments(pmts || []);

      // Calculate stats
      const total = pmts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const count = pmts?.length || 0;
      setStats({
        totalRevenue: total,
        totalPayments: count,
        avgPayment: count > 0 ? total / count : 0,
      });
    } catch (error: any) {
      console.error('❌ Error loading payments:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-green-50 dark:bg-green-900/20">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {stats.totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('saas.payment.totalRevenue')}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalPayments}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('saas.payment.totalPayments')}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-900/20">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.avgPayment.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('saas.payment.avgPayment')}
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">
              {language === 'ar' ? 'لا توجد مدفوعات' : 'No Payments'}
            </p>
            <p className="text-xs">
              {language === 'ar' ? 'لم يتم تسجيل أي مدفوعات لهذه الباقة بعد' : 'No payments recorded for this plan yet'}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-right' : 'text-left'
                  )}>
                    {language === 'ar' ? 'المشترك' : 'Subscriber'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-right' : 'text-left'
                  )}>
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-right' : 'text-left'
                  )}>
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-left' : 'text-right'
                  )}>
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="py-3 px-4 text-sm font-semibold text-center">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr 
                    key={payment.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {payment.subscriptions?.tenants?.name || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.subscriptions?.tenants?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {payment.payment_date ? format(new Date(payment.payment_date), 'PP', { locale }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize">{payment.payment_method || '-'}</span>
                      </div>
                      {payment.transaction_id && (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {payment.transaction_id}
                        </div>
                      )}
                    </td>
                    <td className={cn(
                      "py-3 px-4",
                      language === 'ar' ? 'text-left' : 'text-right'
                    )}>
                      <div className="font-bold text-green-600">
                        {Number(payment.amount).toLocaleString()} {payment.currency}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge 
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        <CheckCircle2 className="h-3 w-3 me-1" />
                        {language === 'ar' ? 'مدفوع' : 'Paid'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
