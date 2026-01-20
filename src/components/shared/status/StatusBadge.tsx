/**
 * Status Badge Component
 * مكون شارة الحالة
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Circle,
  ArrowRight,
  Ban,
  Pause,
  Play,
  FileText,
  Send,
  DollarSign,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, type StatusColor, type CustomStatus } from '@/services/statusService';

interface StatusBadgeProps {
  status: CustomStatus | string;
  color?: StatusColor;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

// Icon mapping for common status codes
const STATUS_ICONS: Record<string, React.ComponentType<any>> = {
  draft: FileText,
  new: Circle,
  pending: Clock,
  in_progress: Loader2,
  active: Play,
  sent: Send,
  approved: CheckCircle2,
  completed: CheckCircle2,
  paid: DollarSign,
  delivered: Truck,
  cancelled: XCircle,
  rejected: Ban,
  suspended: Pause,
  expired: AlertCircle,
  overdue: AlertCircle,
};

export function StatusBadge({
  status,
  color,
  size = 'md',
  showIcon = true,
  className,
  onClick,
}: StatusBadgeProps) {
  const { language } = useLanguage();

  // Handle both string and CustomStatus
  const statusData = typeof status === 'string' 
    ? { code: status, name_ar: status, name_en: status, color: color || 'gray' }
    : status;

  const statusColor = (statusData.color || color || 'gray') as StatusColor;
  const colorConfig = STATUS_COLORS[statusColor] || STATUS_COLORS.gray;

  // Get icon based on status code
  const Icon = STATUS_ICONS[statusData.code] || Circle;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const label = language === 'ar' ? statusData.name_ar : (statusData.name_en || statusData.name_ar);

  return (
    <Badge
      className={cn(
        'inline-flex items-center font-medium rounded-full border-0 transition-all',
        colorConfig.bg,
        colorConfig.text,
        colorConfig.dark,
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
    >
      {showIcon && (
        <Icon className={cn(
          iconSizes[size],
          statusData.code === 'in_progress' && 'animate-spin'
        )} />
      )}
      <span>{label}</span>
    </Badge>
  );
}

// Variant with dropdown indicator
interface StatusBadgeWithArrowProps extends StatusBadgeProps {
  showArrow?: boolean;
}

export function StatusBadgeWithArrow({
  showArrow = true,
  ...props
}: StatusBadgeWithArrowProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <StatusBadge {...props} />
      {showArrow && props.onClick && (
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
      )}
    </div>
  );
}

export default StatusBadge;
