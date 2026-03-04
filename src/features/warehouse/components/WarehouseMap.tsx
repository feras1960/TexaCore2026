/**
 * ════════════════════════════════════════════════════════════════
 * 🏭 WarehouseMap v2 — خريطة المستودع التفاعلية
 * ════════════════════════════════════════════════════════════════
 *
 * الميزات:
 * ─ تحديد صف كامل (كليك على تسمية الصف)
 * ─ تحديد عمود كامل (كليك على رأس العمود)
 * ─ تحديد خلية فردية
 * ─ سحب الصفوف لإعادة ترتيبها (drag-and-drop)
 * ─ تبديل اتجاه الصف: أفقي ↔ عمودي
 * ─ حفظ الترتيب والاتجاهات في localStorage
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    X, Layers, Package, ChevronRight, ArrowRight,
    Info, MapPin, GripVertical, RotateCcw, Square,
    CheckSquare, Columns, Rows,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────
export interface BinLocation {
    id: string;
    code: string;
    name_ar?: string;
    name_en?: string;
    row_code?: string;
    column_code?: string;
    shelf_code?: string;
    capacity_rolls?: number;
    current_rolls_count?: number;
    is_active?: boolean;
}

type Direction = 'H' | 'V'; // Horizontal aisle / Vertical aisle

interface WarehouseMapProps {
    bins: BinLocation[];
    isRTL?: boolean;
    onSelectBin?: (bin: BinLocation) => void;
    warehouseName?: string;
    warehouseId?: string; // used as localStorage key
    /** Called when user double-clicks a cell to open detail sheet */
    onCellSelect?: (row: string, col: string) => void;
    /** Called when user clicks a row label to open row detail */
    onRowSelect?: (row: string) => void;
    /** Called when user clicks a column header to open col detail */
    onColSelect?: (col: string) => void;
}

// ─── Occupancy helpers ──────────────────────────────────────────
function getOccPct(used: number, cap: number | null): number | null {
    if (!cap || cap === 0) return null;
    return Math.min((used / cap) * 100, 100);
}

function pctToStyle(pct: number | null): { bg: string; bar: string } {
    if (pct === null) return { bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-400', bar: 'bg-blue-500' };
    if (pct === 0) return { bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600', bar: 'bg-slate-400' };
    if (pct < 50) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400', bar: 'bg-emerald-500' };
    if (pct < 80) return { bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-400', bar: 'bg-amber-500' };
    if (pct < 100) return { bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-400', bar: 'bg-orange-500' };
    return { bg: 'bg-red-100 dark:bg-red-900/30 border-red-500', bar: 'bg-red-500' };
}

// ─── Single rack slot ───────────────────────────────────────────
function RackSlot({
    colCode, shelves, isSelected, isRowSelected, isColSelected,
    onClick, isRTL,
}: {
    colCode: string;
    shelves: BinLocation[];
    isSelected: boolean;
    isRowSelected: boolean;
    isColSelected: boolean;
    onClick: () => void;
    isRTL: boolean;
}) {
    const used = shelves.reduce((s, b) => s + (b.current_rolls_count || 0), 0);
    const cap = shelves.reduce((s, b) => s + (b.capacity_rolls || 0), 0);
    const pct = getOccPct(used, cap || null);
    const { bg, bar } = pctToStyle(pct);
    const highlight = isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-20 scale-110 shadow-lg' :
        isRowSelected ? 'ring-1 ring-blue-400 ring-offset-1 z-10 scale-105' :
            isColSelected ? 'ring-1 ring-purple-400 ring-offset-1 z-10 scale-105' : '';

    const levelBins = [...shelves].sort((a, b) =>
        (b.shelf_code || '').localeCompare(a.shelf_code || ''));

    return (
        <button
            onClick={onClick}
            title={`${colCode} | ${used}/${cap || '∞'} | ${shelves.length} ${isRTL ? 'رف' : 'shelves'}`}
            className={cn(
                'w-11 flex flex-col gap-px rounded-sm overflow-hidden border-2 transition-all duration-150 hover:scale-110 hover:z-20 relative',
                bg, highlight
            )}
        >
            {levelBins.slice(0, 4).map((shelf, i) => {
                const sp = getOccPct(shelf.current_rolls_count || 0, shelf.capacity_rolls || null);
                const sc = pctToStyle(sp);
                return (
                    <div key={shelf.id} className={cn('h-3 w-full', sc.bg.split(' ')[0],
                        i === 0 && 'rounded-t-sm',
                        i === levelBins.length - 1 && 'rounded-b-sm',
                    )} />
                );
            })}
            {levelBins.length === 0 && (
                <div className="h-12 w-full bg-gray-100 dark:bg-gray-800 border-dashed border-gray-300" />
            )}
            <div className="text-[8px] font-mono font-bold text-center py-0.5 w-full bg-white/20 dark:bg-black/20 text-gray-700 dark:text-gray-200">
                {colCode}
            </div>
            {/* Mini occupancy bar */}
            {pct !== null && (
                <div className="absolute bottom-4 left-0 right-0 h-0.5 bg-black/10">
                    <div className={cn('h-full', bar)} style={{ width: `${pct}%` }} />
                </div>
            )}
        </button>
    );
}

// ─── Shelf detail panel ─────────────────────────────────────────
function ShelfPanel({ row, col, shelves, onClose, onSelectBin, isRTL }:
    { row: string; col: string; shelves: BinLocation[]; onClose: () => void; onSelectBin?: (b: BinLocation) => void; isRTL: boolean; }
) {
    const T = (ar: string, en: string) => (isRTL ? ar : en);
    const sorted = [...shelves].sort((a, b) => (b.shelf_code || '').localeCompare(a.shelf_code || ''));

    return (
        <div className="bg-white dark:bg-gray-900 border-2 border-blue-300 dark:border-blue-700 rounded-2xl shadow-2xl p-5 w-64 flex-shrink-0 animate-in slide-in-from-right-3 duration-200">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">{row}-{col}</div>
                        <div className="text-[10px] text-gray-400">{sorted.length} {T('طابق', 'levels')}</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="border-x-2 border-gray-400 dark:border-gray-500 divide-y divide-gray-200 dark:divide-gray-700 rounded-none overflow-hidden">
                {sorted.map((shelf) => {
                    const sp = getOccPct(shelf.current_rolls_count || 0, shelf.capacity_rolls || null);
                    const sc = pctToStyle(sp);
                    return (
                        <button key={shelf.id} onClick={() => onSelectBin?.(shelf)}
                            className={cn('w-full flex items-center justify-between px-2 py-1.5 text-xs transition-colors', sc.bg.split(' ')[0], 'hover:brightness-95')}>
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                                {T('رف', 'L')}{shelf.shelf_code || '?'}
                            </span>
                            <div className="flex items-center gap-1.5">
                                {sp !== null && (
                                    <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full">
                                        <div className={cn('h-full rounded-full', sc.bar)} style={{ width: `${sp}%` }} />
                                    </div>
                                )}
                                <span className="font-mono text-[11px] font-bold text-gray-700 dark:text-gray-200">
                                    {shelf.current_rolls_count || 0}{shelf.capacity_rolls ? `/${shelf.capacity_rolls}` : ''}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className="h-1 bg-gray-400 dark:bg-gray-500 mt-px" />
            <div className="text-center text-[9px] text-gray-400 mt-0.5">▼ {T('الأرض', 'Floor')}</div>
        </div>
    );
}

// ─── Main WarehouseMap ──────────────────────────────────────────
export function WarehouseMap({ bins, isRTL = false, onSelectBin, warehouseName, warehouseId, onCellSelect, onRowSelect, onColSelect }: WarehouseMapProps) {
    const T = (ar: string, en: string) => (isRTL ? ar : en);
    const storageKey = `wh_map_${warehouseId || 'default'}`;

    // ─── Build structure ────────────────────────────────────────
    const { defaultRows, columns, structure } = useMemo(() => {
        const rowSet = new Set<string>();
        const colSet = new Set<string>();
        const struct: Record<string, Record<string, BinLocation[]>> = {};
        bins.forEach(bin => {
            const r = bin.row_code || '?';
            const c = bin.column_code || '?';
            rowSet.add(r);
            colSet.add(c);
            if (!struct[r]) struct[r] = {};
            if (!struct[r][c]) struct[r][c] = [];
            struct[r][c].push(bin);
        });
        return {
            defaultRows: [...rowSet].sort(),
            columns: [...colSet].sort(),
            structure: struct,
        };
    }, [bins]);

    // ─── State: row order & directions (persisted) ──────────────
    const [rowOrder, setRowOrder] = useState<string[]>(() => {
        try { const s = localStorage.getItem(storageKey + '_order'); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [rowDirs, setRowDirs] = useState<Record<string, Direction>>(() => {
        try { const s = localStorage.getItem(storageKey + '_dirs'); return s ? JSON.parse(s) : {}; } catch { return {}; }
    });

    // Sync row order with actual data
    const rows = useMemo(() => {
        const defined = rowOrder.filter(r => defaultRows.includes(r));
        const newRows = defaultRows.filter(r => !defined.includes(r));
        return [...defined, ...newRows];
    }, [rowOrder, defaultRows]);

    // Persist
    useEffect(() => { try { localStorage.setItem(storageKey + '_order', JSON.stringify(rowOrder)); } catch { } }, [rowOrder, storageKey]);
    useEffect(() => { try { localStorage.setItem(storageKey + '_dirs', JSON.stringify(rowDirs)); } catch { } }, [rowDirs, storageKey]);

    // ─── Selection state ────────────────────────────────────────
    const [selectedCell, setSelectedCell] = useState<string | null>(null); // 'row::col'
    const [highlightRow, setHighlightRow] = useState<string | null>(null);
    const [highlightCol, setHighlightCol] = useState<string | null>(null);

    const handleCellClick = useCallback((row: string, col: string) => {
        const key = `${row}::${col}`;
        if (selectedCell === key) { setSelectedCell(null); return; }
        setSelectedCell(key);
        setHighlightRow(null);
        setHighlightCol(null);
    }, [selectedCell]);

    const handleRowLabelClick = useCallback((row: string) => {
        setSelectedCell(null);
        setHighlightRow(prev => prev === row ? null : row);
        setHighlightCol(null);
        // Open detail sheet if callback provided
        if (onRowSelect) onRowSelect(row);
    }, [onRowSelect]);

    const handleColHeaderClick = useCallback((col: string) => {
        setSelectedCell(null);
        setHighlightCol(prev => prev === col ? null : col);
        setHighlightRow(null);
        // Open detail sheet if callback provided
        if (onColSelect) onColSelect(col);
    }, [onColSelect]);

    // Toggle row direction
    const toggleDir = useCallback((row: string) => {
        setRowDirs(prev => ({ ...prev, [row]: prev[row] === 'V' ? 'H' : 'V' }));
    }, []);

    // ─── Drag-and-drop ──────────────────────────────────────────
    const [dragRow, setDragRow] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);

    const onDragStart = (row: string) => setDragRow(row);
    const onDragEnd = () => { setDragRow(null); setDragOver(null); };
    const onDragOver = (e: React.DragEvent, row: string) => { e.preventDefault(); setDragOver(row); };
    const onDrop = (e: React.DragEvent, targetRow: string) => {
        e.preventDefault();
        if (!dragRow || dragRow === targetRow) { setDragRow(null); setDragOver(null); return; }
        const current = [...rows];
        const fromIdx = current.indexOf(dragRow);
        const toIdx = current.indexOf(targetRow);
        current.splice(fromIdx, 1);
        current.splice(toIdx, 0, dragRow);
        setRowOrder(current);
        setDragRow(null);
        setDragOver(null);
    };

    // ─── Selection stats ────────────────────────────────────────
    const selectionInfo = useMemo(() => {
        if (selectedCell) {
            const [r, c] = selectedCell.split('::');
            const shelves = structure[r]?.[c] || [];
            return { type: 'cell', row: r, col: c, shelves };
        }
        if (highlightRow) {
            const shelves = columns.flatMap(c => structure[highlightRow]?.[c] || []);
            return { type: 'row', row: highlightRow, col: null, shelves };
        }
        if (highlightCol) {
            const shelves = rows.flatMap(r => structure[r]?.[highlightCol] || []);
            return { type: 'col', row: null, col: highlightCol, shelves };
        }
        return null;
    }, [selectedCell, highlightRow, highlightCol, structure, columns, rows]);

    if (!bins.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <MapPin className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">{T('لا توجد مواقع لعرض الخريطة', 'No locations to display')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500">{T('خريطة المستودع', 'Warehouse Map')}</span>
                {warehouseName && <Badge variant="outline" className="text-xs">{warehouseName}</Badge>}

                {/* Selection badge */}
                {selectionInfo && (
                    <div className="flex items-center gap-1.5 ms-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-2 py-1">
                        {selectionInfo.type === 'row' && <Rows className="w-3 h-3 text-blue-500" />}
                        {selectionInfo.type === 'col' && <Columns className="w-3 h-3 text-purple-500" />}
                        {selectionInfo.type === 'cell' && <CheckSquare className="w-3 h-3 text-blue-500" />}
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            {selectionInfo.type === 'row' && T(`صف ${selectionInfo.row} محدد • ${selectionInfo.shelves.length} ${T('موقع', 'locations')}`, `Row ${selectionInfo.row} selected • ${selectionInfo.shelves.length} locations`)}
                            {selectionInfo.type === 'col' && T(`عمود ${selectionInfo.col} محدد • ${selectionInfo.shelves.length} موقع`, `Col ${selectionInfo.col} selected • ${selectionInfo.shelves.length} locations`)}
                            {selectionInfo.type === 'cell' && T(`${selectionInfo.row}-${selectionInfo.col} • ${selectionInfo.shelves.length} رف`, `${selectionInfo.row}-${selectionInfo.col} • ${selectionInfo.shelves.length} shelves`)}
                        </span>
                        <button onClick={() => { setSelectedCell(null); setHighlightRow(null); setHighlightCol(null); }} className="text-blue-400 hover:text-blue-600">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Reset order */}
                <button
                    onClick={() => { setRowOrder([]); setRowDirs({}); }}
                    className="ms-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
                    title={T('إعادة تعيين الترتيب', 'Reset order')}
                >
                    <RotateCcw className="w-3 h-3" />
                    {T('إعادة الترتيب', 'Reset')}
                </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-400">
                <span className="font-medium">{T('إشغال:', 'Occupancy:')}</span>
                {[
                    { bg: 'bg-slate-200', l: T('فارغ', 'Empty') },
                    { bg: 'bg-emerald-200', l: T('< 50%', '< 50%') },
                    { bg: 'bg-amber-200', l: T('50-80%', '50-80%') },
                    { bg: 'bg-orange-300', l: T('80-100%', '80-100%') },
                    { bg: 'bg-red-300', l: T('ممتلئ', 'Full') },
                ].map(x => (
                    <span key={x.l} className="flex items-center gap-1">
                        <span className={cn('w-3 h-3 rounded-sm', x.bg)} />{x.l}
                    </span>
                ))}
                <span className="ms-3 text-gray-300">|</span>
                <span className="flex items-center gap-1 text-blue-400"><Square className="w-3 h-3" /> {T('كليك على الصف/العمود للتحديد', 'Click row/col label to select')}</span>
                <span className="flex items-center gap-1 text-gray-400"><GripVertical className="w-3 h-3" /> {T('اسحب للترتيب', 'Drag to reorder')}</span>
            </div>

            {/* Map + detail */}
            <div className="flex gap-4 items-start">
                {/* Floor plan */}
                <div className="flex-1 min-w-0 overflow-x-auto border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-3 bg-gray-50/50 dark:bg-gray-900/30">

                    {/* ─── Column headers ─── */}
                    <div className="flex items-center gap-1 mb-1 ms-14">
                        {columns.map(col => (
                            <button
                                key={col}
                                onClick={() => handleColHeaderClick(col)}
                                className={cn(
                                    'w-11 text-center text-[9px] font-mono font-bold rounded-md py-1 transition-colors',
                                    highlightCol === col
                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                )}
                                title={T(`تحديد عمود ${col}`, `Select column ${col}`)}
                            >
                                {col}
                                {highlightCol === col && <div className="w-full h-0.5 bg-purple-400 rounded mt-0.5" />}
                            </button>
                        ))}
                    </div>

                    {/* ─── Rows ─── */}
                    <div className="space-y-0">
                        {rows.map((row, rIdx) => {
                            const dir: Direction = rowDirs[row] || 'H';
                            const isRowHL = highlightRow === row;
                            const isDraggingOver = dragOver === row;

                            return (
                                <div key={row}>
                                    {/* Drop indicator */}
                                    {isDraggingOver && dragRow !== row && (
                                        <div className="h-1 bg-blue-400 rounded-full mx-2 my-0.5" />
                                    )}

                                    <div
                                        className={cn(
                                            'flex gap-1 items-start transition-opacity',
                                            dragRow === row && 'opacity-40',
                                            dir === 'V' && 'flex-col',
                                        )}
                                        onDragOver={e => onDragOver(e, row)}
                                        onDrop={e => onDrop(e, row)}
                                    >
                                        {/* Row label + controls */}
                                        <div className={cn(
                                            'flex items-center gap-1 flex-shrink-0',
                                            dir === 'V' && 'flex-row',
                                        )}>
                                            {/* Drag handle */}
                                            <div
                                                draggable
                                                onDragStart={() => onDragStart(row)}
                                                onDragEnd={onDragEnd}
                                                className="p-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                                            >
                                                <GripVertical className="w-3 h-3" />
                                            </div>

                                            {/* Row label button */}
                                            <button
                                                onClick={() => handleRowLabelClick(row)}
                                                className={cn(
                                                    'w-8 h-8 rounded-lg font-mono font-black text-xs transition-all border-2 flex-shrink-0',
                                                    isRowHL
                                                        ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                                                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                                                )}
                                                title={T(`تحديد صف ${row}`, `Select row ${row}`)}
                                            >
                                                {row}
                                            </button>

                                            {/* Direction toggle */}
                                            <button
                                                onClick={() => toggleDir(row)}
                                                className={cn(
                                                    'w-7 h-7 rounded-md flex items-center justify-center transition-colors border text-[9px] font-bold flex-shrink-0',
                                                    dir === 'V'
                                                        ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 text-purple-700'
                                                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-purple-300'
                                                )}
                                                title={T(dir === 'H' ? 'تحويل لعمودي' : 'تحويل لأفقي', dir === 'H' ? 'Switch to Vertical' : 'Switch to Horizontal')}
                                            >
                                                {dir === 'H' ? '↔' : '↕'}
                                            </button>
                                        </div>

                                        {/* ─── Rack slots ─── */}
                                        <div className={cn(
                                            'flex gap-1 flex-shrink-0',
                                            dir === 'V' && 'flex-col ms-10',
                                        )}>
                                            {columns.map(col => {
                                                const shelves = structure[row]?.[col] || [];
                                                const cellKey = `${row}::${col}`;
                                                const isCellSelected = selectedCell === cellKey;
                                                const isRowSel = highlightRow === row;
                                                const isColSel = highlightCol === col;

                                                if (dir === 'V' && shelves.length === 0) return null;

                                                return (
                                                    <RackSlot
                                                        key={col}
                                                        colCode={dir === 'V' ? `${col}` : col}
                                                        shelves={shelves}
                                                        isSelected={isCellSelected}
                                                        isRowSelected={isRowSel}
                                                        isColSelected={isColSel}
                                                        isRTL={isRTL}
                                                        onClick={() => {
                                                            if (shelves.length > 0) {
                                                                handleCellClick(row, col);
                                                                // Open detail sheet on click
                                                                onCellSelect?.(row, col);
                                                            }
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* Direction badge */}
                                        <div className={cn(
                                            'flex-shrink-0 self-center',
                                            dir === 'V' && 'ms-10',
                                        )}>
                                            <span className={cn(
                                                'text-[8px] px-1.5 py-0.5 rounded-full border font-mono whitespace-nowrap',
                                                dir === 'H'
                                                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                                    : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-purple-500'
                                            )}>
                                                {dir === 'H' ? T('← ممر أفقي →', '← H-Aisle →') : T('↕ ممر عمودي', '↕ V-Aisle')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Aisle separator */}
                                    {rIdx < rows.length - 1 && (
                                        <div className="flex items-center gap-1 my-2 ms-14">
                                            <div className="flex-1 h-4 rounded bg-gray-200/60 dark:bg-gray-700/40 flex items-center justify-center">
                                                <span className="text-[7px] text-gray-400 tracking-widest uppercase">
                                                    <ArrowRight className="w-2 h-2 inline" />
                                                    {T(' ممر', ' Aisle')}
                                                    <ArrowRight className="w-2 h-2 inline" />
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Entrance */}
                    <div className="flex justify-center mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">{T('مدخل المستودع', 'Warehouse Entry')}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* ─── Detail panel (single cell) ─── */}
                {selectedCell && (() => {
                    const [r, c] = selectedCell.split('::');
                    const shelves = structure[r]?.[c] || [];
                    return shelves.length > 0 ? (
                        <ShelfPanel
                            row={r} col={c}
                            shelves={shelves}
                            onClose={() => setSelectedCell(null)}
                            onSelectBin={onSelectBin}
                            isRTL={isRTL}
                        />
                    ) : null;
                })()}

                {/* ─── Row/Col summary panel ─── */}
                {(highlightRow || highlightCol) && selectionInfo && (
                    <div className="bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4 w-56 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {highlightRow
                                    ? T(`📍 إجمالي صف ${highlightRow}`, `📍 Row ${highlightRow} total`)
                                    : T(`📍 إجمالي عمود ${highlightCol}`, `📍 Col ${highlightCol} total`)}
                            </span>
                            <button onClick={() => { setHighlightRow(null); setHighlightCol(null); }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: T('إجمالي المواقع', 'Total locations'), val: selectionInfo.shelves.length },
                                {
                                    label: T('إجمالي الرولونات', 'Total rolls'),
                                    val: selectionInfo.shelves.reduce((s, b) => s + (b.current_rolls_count || 0), 0)
                                },
                                {
                                    label: T('الطاقة الكلية', 'Total capacity'),
                                    val: selectionInfo.shelves.reduce((s, b) => s + (b.capacity_rolls || 0), 0) || '∞'
                                },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400">{item.label}</span>
                                    <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-100">{item.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer stats */}
            <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                <span>{rows.length} {T('صفوف', 'rows')} × {columns.length} {T('أعمدة', 'cols')} = {bins.length} {T('خانة', 'bins')}</span>
                <span>•</span>
                <span className="text-blue-400">{T('كليك الخلية = شيت التفاصيل', 'Click cell = detail sheet')}</span>
                <span>•</span>
                <span className="text-blue-400">{T('كليك تسمية الصف/العمود = تفاصيل الصف/العمود', 'Click row/col = row/col sheet')}</span>
            </div>
        </div>
    );
}

export default WarehouseMap;
