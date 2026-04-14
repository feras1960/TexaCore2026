import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { KanbanItem } from './NexaKanbanBoard';

interface NexaKanbanCardProps {
    id: string;
    item: KanbanItem;
    renderCard: (content: Record<string, any>, columnId: string) => React.ReactNode;
    columnId: string;
    accentHex: string;
    direction?: 'rtl' | 'ltr';
    isDraggedAway?: boolean;
}

export function NexaKanbanCard({
    id,
    item,
    renderCard,
    columnId,
    accentHex,
    direction = 'ltr',
    isDraggedAway = false,
}: NexaKanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: { type: 'card', item, columnId },
    });

    const isRTL = direction === 'rtl';

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || isDraggedAway ? 0.35 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
        relative group touch-none
        cursor-grab active:cursor-grabbing
        rounded-xl overflow-hidden
        transition-shadow duration-200
        ${isDragging
                    ? 'shadow-2xl ring-2 ring-indigo-400/40'
                    : 'shadow-sm hover:shadow-md'
                }
      `}
        >
            {/* Accent Side Bar */}
            <div
                className={`absolute top-0 bottom-0 w-1 ${isRTL ? 'right-0' : 'left-0'}`}
                style={{ backgroundColor: accentHex }}
            />

            {/* Card Content (rendered by consumer) */}
            <div className="bg-white dark:bg-gray-900">
                {renderCard(item.content, columnId)}
            </div>
        </div>
    );
}
