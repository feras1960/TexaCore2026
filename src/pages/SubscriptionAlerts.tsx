import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Calendar,
  DollarSign,
  Eye,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Alert {
  id: string;
  tenant_id: string;
  subscription_id: string;
  alert_type: string;
  alert_date: string;
  days_remaining: number | null;
  amount_due: number | null;
  message_ar: string;
  message_en: string;
  status: string;
  sent_at: string | null;
  sent_to: string | null;
  created_at: string;
  tenants: {
    name: string;
    code: string;
  };
}

export default function SubscriptionAlerts() {
  const { language, t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('pending');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('subscription_alerts')
        .select(`
          *,
          tenants (name, code)
        `)
        .order('alert_date', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل التنبيهات' : 'Error loading alerts');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_alerts')
        .update({ status: 'dismissed' })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تم تجاهل التنبيه' : 'Alert dismissed');
      loadAlerts();
    } catch (error: any) {
      console.error('Error dismissing alert:', error);
      toast.error(language === 'ar' ? 'خطأ في تحديث التنبيه' : 'Error updating alert');
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expiry_warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'payment_due':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'renewed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'expiry_warning':
        return 'border-amber-200 bg-amber-50';
      case 'expired':
        return 'border-red-200 bg-red-50';
      case 'payment_due':
        return 'border-blue-200 bg-blue-50';
      case 'renewed':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{language === 'ar' ? 'معلق' : 'Pending'}</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">{language === 'ar' ? 'مُرسل' : 'Sent'}</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">{language === 'ar' ? 'تم التجاهل' : 'Dismissed'}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700">{language === 'ar' ? 'فشل' : 'Failed'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? '🔔 تنبيهات الاشتراكات' : '🔔 Subscription Alerts'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إشعارات انتهاء الاشتراكات والدفعات المستحقة' 
              : 'Subscription expiry and payment due notifications'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          {language === 'ar' ? 'معلقة' : 'Pending'}
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          onClick={() => setFilter('sent')}
        >
          {language === 'ar' ? 'مُرسلة' : 'Sent'}
        </Button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد تنبيهات' : 'No Alerts'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'لا توجد تنبيهات في الوقت الحالي' 
                : 'No alerts at the moment'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`border-l-4 ${getAlertColor(alert.alert_type)} transition-all hover:shadow-md`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-1">
                    {getAlertIcon(alert.alert_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    {/* Tenant & Status */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {alert.tenants?.name || 'Unknown'}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {alert.tenants?.code || ''}
                        </Badge>
                      </div>
                      {getStatusBadge(alert.status)}
                    </div>

                    {/* Message */}
                    <p className="text-base">
                      {language === 'ar' ? alert.message_ar : alert.message_en}
                    </p>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(alert.alert_date), 'PPP', {
                            locale: language === 'ar' ? ar : undefined
                          })}
                        </span>
                      </div>

                      {alert.days_remaining !== null && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">
                            {alert.days_remaining} {language === 'ar' ? 'يوم متبقي' : 'days remaining'}
                          </span>
                        </div>
                      )}

                      {alert.amount_due && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">
                            {alert.amount_due.toLocaleString()} USD
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {alert.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(alert.id)}
                        >
                          <X className="h-4 w-4 me-2" />
                          {language === 'ar' ? 'تجاهل' : 'Dismiss'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
