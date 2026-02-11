/**
 * WorkflowEdge — سهم مخصص للمحرر المرئي
 * يعرض خط اتصال مع سهم، مع إمكانية عرض تسمية ورمز القفل للتحويلات المشروطة
 */

import { memo } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Lock, X } from 'lucide-react';

function WorkflowEdgeComponent({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeData = (data || {}) as Record<string, unknown>;
    const requiresApproval = edgeData.requiresApproval as boolean;
    const label = edgeData.label as string;

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: selected ? 3 : 2,
                    stroke: selected
                        ? '#6366f1'
                        : requiresApproval
                            ? '#f59e0b'
                            : '#94a3b8',
                    strokeDasharray: requiresApproval ? '5 3' : undefined,
                    transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
            />

            {/* تسمية السهم */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium',
                        'transition-all duration-200',
                        selected
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700',
                        'hover:shadow-md hover:scale-105 cursor-pointer',
                        'nodrag nopan'
                    )}
                >
                    {requiresApproval && (
                        <Lock className="w-3 h-3 text-amber-500" />
                    )}
                    {label && <span>{label}</span>}
                    {!label && !requiresApproval && (
                        <span className="text-gray-400">●</span>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export const WorkflowEdge = memo(WorkflowEdgeComponent);
export default WorkflowEdge;
