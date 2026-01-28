/**
 * Plan Subscribers Tab - المشتركين في الباقة
 * ✨ مع جدول احترافي للمشتركين
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Search, Loader2, Calendar, 
  CheckCircle2, XCircle, AlertCircle,
  Mail, Building2, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const PlanSubscribersTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t 
}) => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const locale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    loadSubscribers();
  }, [data.id]);

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading subscribers for plan:', data.id);
      
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            phone,
            is_active
          )
        `)
        .eq('plan_id', data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Subscribers loaded:', subs?.length || 0);
      setSubscribers(subs || []);
    } catch (error: any) {
      console.error('❌ Error loading subscribers:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { 
        icon: CheckCircle2, 
        className: 'bg-green-50 text-green-700 border-green-200',
        label: t('common.active')
      },
      expired: { 
        icon: XCircle, 
        className: 'bg-red-50 text-red-700 border-red-200',
        label: t('saas.subscription.expired')
      },
      suspended: { 
        icon: AlertCircle, 
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        label: t('saas.subscription.suspended')
      },
      cancelled: { 
        icon: XCircle, 
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        label: t('saas.subscription.cancelled')
      },
    };

    const config = variants[status] || variants.cancelled;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 me-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredSubscribers = subscribers.filter(sub =>
    sub.tenants?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.tenants?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">
            {t('saas.plan.subscribers')}
          </h3>
          <Badge variant="secondary">{subscribers.length}</Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Table */}
      {filteredSubscribers.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchTerm ? t('common.noResults') : language === 'ar' ? 'لا يوجد مشتركين في هذه الباقة' : 'No subscribers for this plan'}
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
                    {language === 'ar' ? 'اسم المشترك' : 'Subscriber Name'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-right' : 'text-left'
                  )}>
                    {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold",
                    language === 'ar' ? 'text-right' : 'text-left'
                  )}>
                    {language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                  </th>
                  <th className={cn(
                    "py-3 px-4 text-sm font-semibold text-center"
                  )}>
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubscribers.map((sub, index) => (
                  <tr 
                    key={sub.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {sub.tenants?.name || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {sub.tenants?.email || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {sub.start_date ? format(new Date(sub.start_date), 'PP', { locale }) : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {sub.end_date ? format(new Date(sub.end_date), 'PP', { locale }) : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(sub.status)}
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
