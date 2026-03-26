/**
 * Reservations Tab - تبويب الحجوزات
 * يعرض الحجوزات المرتبطة بالعميل/المشترك/الحساب
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
} from 'lucide-react';

interface ReservationsTabProps {
  data: any;
  language: string;
  onAction?: (actionId: string, data?: any) => void;
  onRowClick?: (row: any) => void;
}

const getStatusConfig = (status: string, isRTL: boolean) => {
  const configs: Record<string, { icon: any; color: string; label: string }> = {
    confirmed: { 
      icon: CheckCircle2, 
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      label: isRTL ? 'مؤكد' : 'Confirmed'
    },
    pending: { 
      icon: Clock, 
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      label: isRTL ? 'قيد الانتظار' : 'Pending'
    },
    cancelled: { 
      icon: XCircle, 
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      label: isRTL ? 'ملغي' : 'Cancelled'
    },
    completed: { 
      icon: CheckCircle2, 
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      label: isRTL ? 'مكتمل' : 'Completed'
    },
    no_show: { 
      icon: AlertCircle, 
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      label: isRTL ? 'لم يحضر' : 'No Show'
    },
  };
  return configs[status] || configs.pending;
};

export function ReservationsTab({ data, language, onAction, onRowClick }: ReservationsTabProps) {
  const isRTL = language === 'ar';
  const reservations = data.reservations || [];

  // Stats
  const stats = {
    total: reservations.length,
    confirmed: reservations.filter((r: any) => r.status === 'confirmed').length,
    pending: reservations.filter((r: any) => r.status === 'pending').length,
    completed: reservations.filter((r: any) => r.status === 'completed').length,
  };

  if (reservations.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {isRTL ? 'لا توجد حجوزات' : 'No reservations found'}
        </p>
        <Button variant="outline" size="sm" onClick={() => onAction?.('create_reservation')}>
          <Plus className="w-4 h-4 me-2" />
          {isRTL ? 'إضافة حجز' : 'Add Reservation'}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">{isRTL ? 'الإجمالي' : 'Total'}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.confirmed}</p>
            <p className="text-xs text-green-600 dark:text-green-400">{isRTL ? 'مؤكد' : 'Confirmed'}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{stats.completed}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{isRTL ? 'مكتمل' : 'Completed'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      <div className="space-y-2">
        {reservations.map((reservation: any, index: number) => {
          const statusConfig = getStatusConfig(reservation.status, isRTL);
          const StatusIcon = statusConfig.icon;
          
          return (
            <Card 
              key={reservation.id || index}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onRowClick?.(reservation)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 me-1" />
                        {statusConfig.label}
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono">
                        #{reservation.code || reservation.id}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {reservation.title || reservation.service || (isRTL ? 'حجز' : 'Reservation')}
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {reservation.date ? new Date(reservation.date).toLocaleDateString(isRTL ? 'ar-u-nu-latn' : 'en-US') : '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {reservation.time || '-'}
                      </span>
                      {reservation.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {reservation.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
