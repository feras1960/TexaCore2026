/**
 * Plan Activity Tab - سجل نشاط الباقة
 */

import React, { useState, useEffect } from 'react';
import { TabComponentProps } from '@/components/shared/sheets/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, Loader2, User, Clock,
  Edit, CheckCircle2, XCircle, Archive, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export const PlanActivityTab: React.FC<TabComponentProps> = ({ 
  data, 
  language, 
  t 
}) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = language === 'ar' ? ar : enUS;

  useEffect(() => {
    loadActivities();
  }, [data.id]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // For now, we'll create activity log from plan data
      // In production, you'd have a separate activity_log table
      const activityLog = [];

      // Created
      activityLog.push({
        id: 'created',
        type: 'created',
        timestamp: data.created_at,
        user: 'System',
        description: t('saas.activity.planCreated'),
      });

      // Updated
      if (data.updated_at && data.updated_at !== data.created_at) {
        activityLog.push({
          id: 'updated',
          type: 'updated',
          timestamp: data.updated_at,
          user: 'System',
          description: t('saas.activity.planUpdated'),
        });
      }

      // Archived
      if (data.is_archived && data.archived_at) {
        activityLog.push({
          id: 'archived',
          type: 'archived',
          timestamp: data.archived_at,
          user: 'System',
          description: t('saas.activity.planArchived'),
        });
      }

      // Status changes
      if (data.is_active) {
        activityLog.push({
          id: 'activated',
          type: 'activated',
          timestamp: data.created_at,
          user: 'System',
          description: t('saas.activity.planActivated'),
        });
      }

      // Popular flag
      if (data.is_popular) {
        activityLog.push({
          id: 'popular',
          type: 'popular',
          timestamp: data.updated_at || data.created_at,
          user: 'System',
          description: t('saas.activity.planSetPopular'),
        });
      }

      // Sort by timestamp desc
      activityLog.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityLog);
    } catch (error: any) {
      console.error('Error loading activities:', error);
      toast.error(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      created: CheckCircle2,
      updated: Edit,
      activated: CheckCircle2,
      deactivated: XCircle,
      archived: Archive,
      popular: Star,
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      created: 'text-green-600',
      updated: 'text-blue-600',
      activated: 'text-green-600',
      deactivated: 'text-red-600',
      archived: 'text-gray-600',
      popular: 'text-yellow-600',
    };
    return colors[type] || 'text-gray-600';
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t('common.activity')}</h3>
        <Badge variant="secondary">{activities.length}</Badge>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('common.noActivity')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const color = getActivityColor(activity.type);

            return (
              <div key={activity.id} className="relative">
                {/* Timeline line */}
                {index < activities.length - 1 && (
                  <div className="absolute start-5 top-12 bottom-0 w-px bg-border/50" />
                )}

                <Card className="p-4">
                  <div className="flex gap-3">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full bg-muted shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {format(new Date(activity.timestamp), 'PP', { locale })}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{activity.user}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(activity.timestamp), 'p', { locale })}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
