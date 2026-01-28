/**
 * Plan Ledger Tab - كشف حساب الباقة
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Loader2, DollarSign, 
  TrendingUp, TrendingDown 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
      
      const { data: pmts, error } = await supabase
        .from('saas_payments')
        .select(`
          *,
          subscriptions:subscription_id (
            id,
            tenants:tenant_id (
              name
            )
          )
        `)
        .eq('plan_id', data.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

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
      console.error('Error loading payments:', error);
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

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('saas.payment.noPayments')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm">
                    {payment.subscriptions?.tenants?.name || t('common.unknown')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(payment.payment_date), 'PPp', { locale })}
                  </div>
                </div>
                <Badge 
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {Number(payment.amount).toFixed(2)} {payment.currency}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{payment.payment_method}</span>
                {payment.transaction_id && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{payment.transaction_id}</span>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
