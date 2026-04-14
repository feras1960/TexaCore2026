import React, { useMemo, useState, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    defaultDropAnimationSideEffects,
    closestCorners,
    type DropAnimation,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { NexaKanbanColumn } from './NexaKanbanColumn';

// ─── Types ─────────────────────────────────────────────────────────
export interface KanbanItem {
    id: string;
    columnId: string;
    content: Record<string, any>;
}

export interface KanbanColumnDef {
    id: string;
    title: string;
    color: string;        // Tailwind border color class, e.g. 'border-purple-500'
    bgColor: string;      // Tailwind bg color class, e.g. 'bg-purple-50'
    accentHex: string;    // Hex color for accents, e.g. '#9333ea'
    icon?: React.ReactNode;
    /** If true, cards in this column cannot be dragged out */
    locked?: boolean;
}

export interface NexaKanbanBoardProps {
    /** Column definitions */
    columns: KanbanColumnDef[];
    /** Items to display */
    items: KanbanItem[];
    /** Render function for each card — receives the item's `content` */
    renderCard: (content: Record<string, any>, columnId: string) => React.ReactNode;
    /** Called when a card is dropped into a new column */
    onCardMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
    /** Called on any drag end */
    onDragEnd?: (event: DragEndEvent) => void;
    /** Loading state */
    isLoading?: boolean;
    /** Direction for RTL support */
    direction?: 'rtl' | 'ltr';
    /** Currency label for totals */
    currency?: string;
    /** Function to extract monetary value from content for column totals */
    getItemValue?: (content: Record<string, any>) => number;
    /** Empty state text */
    emptyText?: string;
    /** Custom class for the board container */
    className?: string;
}

// ─── Component ─────────────────────────────────────────────────────
export function NexaKanbanBoard({
    columns,
    items,
    renderCard,
    onCardMove,
    onDragEnd: externalOnDragEnd,
    isLoading = false,
    direction = 'ltr',
    currency = '',
    getItemValue,
    emptyText,
    className = '',
}: NexaKanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    // ─── Sensors (Pointer + Touch + Keyboard for accessibility)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // ─── Derive active item for overlay
    const activeItem = useMemo(
        () => items.find((item) => item.id === activeId),
        [activeId, items]
    );

    // ─── Column totals
    const columnTotals = useMemo(() => {
        if (!getItemValue) return {};
        const totals: Record<string, number> = {};
        columns.forEach((col) => {
            totals[col.id] = items
                .filter((item) => item.columnId === col.id)
                .reduce((sum, item) => sum + (getItemValue(item.content) || 0), 0);
        });
        return totals;
    }, [columns, items, getItemValue]);

    // ─── Column item counts
    const columnCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        columns.forEach((col) => {
            counts[col.id] = items.filter((item) => item.columnId === col.id).length;
        });
        return counts;
    }, [columns, items]);

    // ─── Drag Handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        // Future: reordering within column
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);

            if (!over) return;

            const activeItem = items.find((i) => i.id === active.id);
            if (!activeItem) return;

            // Determine the target column
            const overItem = items.find((i) => i.id === over.id);
            const targetColumnId = overItem ? overItem.columnId : (over.id as string);

            // Only call if actually moved to a different column
            if (activeItem.columnId !== targetColumnId && columns.some((c) => c.id === targetColumnId)) {
                onCardMove?.(activeItem.id, activeItem.columnId, targetColumnId);
            }

            externalOnDragEnd?.(event);
        },
        [items, columns, onCardMove, externalOnDragEnd]
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);

    // ─── Drop animation
    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.4' } },
        }),
    };

    // ─── Loading skeleton
    if (isLoading) {
        return (
            <div className={`flex h-full gap-4 p-4 overflow-x-auto ${className}`} dir={direction}>
                {columns.map((col) => (
                    <div key={col.id} className="flex-shrink-0 w-[280px] animate-pulse">
                        <div className={`h-16 rounded-t-xl border-t-4 ${col.color} bg-white dark:bg-gray-900 mb-3`} />
                        <div className={`${col.bgColor} rounded-xl p-3 space-y-3 min-h-[300px]`}>
                            {[1, 2].map((i) => (
                                <div key={i} className="h-28 bg-white/60 dark:bg-gray-800/60 rounded-lg" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {/* Board wrapper — position:relative + absolute child guarantees full-height fill */}
            <div className={`relative h-full w-full ${className}`}>
                <div
                    className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                    dir={direction}
                >
                    {/* Inner flex container — min-width forces all columns visible & scrollable */}
                    <div
                        className="flex h-full gap-3 pb-2 px-3 pt-3"
                        style={{ minWidth: `${columns.length * 280 + (columns.length - 1) * 12 + 24}px` }}
                    >
                        {columns.map((col) => (
                            <NexaKanbanColumn
                                key={col.id}
                                column={col}
                                items={items.filter((item) => item.columnId === col.id)}
                                itemCount={columnCounts[col.id] || 0}
                                totalValue={columnTotals[col.id]}
                                currency={currency}
                                renderCard={renderCard}
                                direction={direction}
                                emptyText={emptyText}
                                activeId={activeId}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeId && activeItem ? (
                        <div className="transform rotate-[2deg] scale-[1.03] cursor-grabbing">
                            <div className="shadow-2xl rounded-xl ring-2 ring-indigo-400/50 bg-white dark:bg-gray-900">
                                {renderCard(activeItem.content, activeItem.columnId)}
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
