import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { NexaKanbanCard } from './NexaKanbanCard';
import type { KanbanColumnDef, KanbanItem } from './NexaKanbanBoard';
import { Inbox } from 'lucide-react';

interface NexaKanbanColumnProps {
    column: KanbanColumnDef;
    items: KanbanItem[];
    itemCount: number;
    totalValue?: number;
    currency?: string;
    renderCard: (content: Record<string, any>, columnId: string) => React.ReactNode;
    direction?: 'rtl' | 'ltr';
    emptyText?: string;
    activeId?: string | null;
}

export function NexaKanbanColumn({
    column,
    items,
    itemCount,
    totalValue,
    currency = '',
    renderCard,
    direction = 'ltr',
    emptyText,
    activeId,
}: NexaKanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    const isRTL = direction === 'rtl';

    return (
        <div
            ref={setNodeRef}
            className={`
        flex-shrink-0 w-[280px] flex flex-col h-full transition-all duration-200 rounded-xl
        ${isOver ? 'ring-2 ring-offset-2 ring-indigo-400/60 bg-indigo-50/20 dark:bg-indigo-950/20 scale-[1.01]' : ''}
      `}
        >
            {/* ─── Column Header ─── */}
            <div
                className={`
          p-3.5 rounded-t-xl bg-white dark:bg-gray-900 shadow-sm mb-2
          border-t-[4px] ${column.color}
        `}
            >
                <div className={`flex justify-between items-center mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3
                        className={`font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        {column.icon && (
                            <span className="opacity-80">{column.icon}</span>
                        )}
                        {column.title}
                    </h3>
                    <span
                        className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: `${column.accentHex}15`,
                            color: column.accentHex,
                        }}
                    >
                        {itemCount}
                    </span>
                </div>

                {/* Total Value */}
                {totalValue !== undefined && (
                    <div className={`text-xs text-gray-500 dark:text-gray-400 font-mono font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {totalValue.toLocaleString()}{' '}
                        <span className="text-[10px] text-gray-400">{currency}</span>
                    </div>
                )}
            </div>

            {/* ─── Cards Container ─── */}
            <div
                className={`
          flex-1 rounded-xl p-2.5 space-y-3 overflow-y-auto custom-scrollbar
          border border-gray-100/80 dark:border-gray-800/80
          ${column.bgColor}
        `}
            >
                <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map((item) => (
                        <NexaKanbanCard
                            key={item.id}
                            id={item.id}
                            item={item}
                            renderCard={renderCard}
                            columnId={column.id}
                            accentHex={column.accentHex}
                            direction={direction}
                            isDraggedAway={activeId === item.id}
                        />
                    ))}
                </SortableContext>

                {/* ─── Empty State ─── */}
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                        <Inbox className="w-8 h-8 opacity-30" />
                        <span className="text-xs font-medium">
                            {emptyText || (isRTL ? 'لا توجد عناصر' : 'No items')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
