/**
 * StatusNode — عقدة الحالة في المحرر المرئي
 * تمثل حالة واحدة في دورة حياة المستند (مسودة، مؤكد، مكتمل...)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
    Play,
    CheckCircle2,
    XCircle,
    Circle,
    FileText,
    Send,
    ThumbsUp,
    ThumbsDown,
    Clock,
    Ban,
    Package,
    CreditCard,
    RotateCcw,
    Truck,
    Eye
} from 'lucide-react';

/** خريطة الألوان */
const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    gray: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    green: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    red: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    yellow: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
};

/** خريطة الأيقونات حسب الكود */
const CODE_ICON_MAP: Record<string, typeof Circle> = {
    draft: FileText,
    sent: Send,
    confirmed: ThumbsUp,
    approved: ThumbsUp,
    rejected: ThumbsDown,
    cancelled: Ban,
    expired: Clock,
    completed: CheckCircle2,
    closed: XCircle,
    delivered: Truck,
    paid: CreditCard,
    returned: RotateCcw,
    packed: Package,
    review: Eye,
};

function StatusNodeComponent({ data, selected }: NodeProps) {
    const nodeData = data as Record<string, unknown>;
    const color = (nodeData.color as string) || 'gray';
    const isInitial = nodeData.isInitial as boolean;
    const isFinal = nodeData.isFinal as boolean;
    const code = (nodeData.code as string) || '';
    const label = (nodeData.label as string) || '';
    const labelEn = (nodeData.labelEn as string) || code;

    const colors = COLOR_MAP[color] || COLOR_MAP.gray;
    const IconComponent = CODE_ICON_MAP[code] || Circle;

    return (
        <div
            className={cn(
                'relative px-5 py-3.5 rounded-2xl border-2 min-w-[180px] max-w-[220px]',
                'transition-all duration-200 cursor-pointer',
                'shadow-sm hover:shadow-md',
                colors.bg, colors.border,
                selected && 'ring-2 ring-offset-2 ring-indigo-500 shadow-lg scale-[1.02]',
            )}
        >
            {/* Handle العلوي (Target) */}
            <Handle
                type="target"
                position={Position.Top}
                className={cn(
                    '!w-3 !h-3 !border-2 !border-white dark:!border-gray-900 !rounded-full',
                    '!bg-gray-400 dark:!bg-gray-500',
                    'hover:!bg-indigo-500 transition-colors'
                )}
            />

            {/* المحتوى */}
            <div className="flex items-center gap-3">
                {/* الأيقونة */}
                <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    isInitial && 'bg-green-100 dark:bg-green-900/50',
                    isFinal && 'bg-red-100 dark:bg-red-900/50',
                    !isInitial && !isFinal && `${colors.bg}`,
                )}>
                    {isInitial ? (
                        <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : isFinal ? (
                        <CheckCircle2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                        <IconComponent className={cn('w-4 h-4', colors.text)} />
                    )}
                </div>

                {/* النصوص */}
                <div className="min-w-0 flex-1">
                    <p className={cn('font-bold text-sm truncate', colors.text)}>
                        {label}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate">
                        {labelEn || code}
                    </p>
                </div>
            </div>

            {/* شارات الحالة */}
            <div className="flex items-center gap-1.5 mt-2">
                {isInitial && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        ابتدائية
                    </span>
                )}
                {isFinal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        نهائية
                    </span>
                )}
            </div>

            {/* Handle السفلي (Source) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className={cn(
                    '!w-3 !h-3 !border-2 !border-white dark:!border-gray-900 !rounded-full',
                    colors.dot,
                    'hover:!bg-indigo-500 transition-colors'
                )}
            />
        </div>
    );
}

export const StatusNode = memo(StatusNodeComponent);
export default StatusNode;
