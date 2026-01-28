/**
 * Plan Subscribers Tab - المشتركين في الباقة
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Search, Loader2, Calendar, 
  CheckCircle2, XCircle, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
      
      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            is_active
          )
        `)
        .eq('plan_id', data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubscribers(subs || []);
    } catch (error: any) {
      console.error('Error loading subscribers:', error);
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

      {/* List */}
      {filteredSubscribers.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchTerm ? t('common.noResults') : t('saas.plan.noSubscribers')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSubscribers.map((sub) => (
            <Card key={sub.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-sm mb-1">
                    {sub.tenants?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sub.tenants?.email}
                  </div>
                </div>
                {getStatusBadge(sub.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">
                    {t('saas.subscription.startDate')}
                  </div>
                  <div className="font-medium">
                    {format(new Date(sub.start_date), 'PP', { locale })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">
                    {t('saas.subscription.endDate')}
                  </div>
                  <div className="font-medium">
                    {format(new Date(sub.end_date), 'PP', { locale })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
