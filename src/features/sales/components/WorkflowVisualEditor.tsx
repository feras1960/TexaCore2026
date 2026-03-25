/**
 * WorkflowVisualEditor — محرر مرئي تفاعلي لسير العمل
 * 
 * ✅ عقد (Nodes) قابلة للسحب مع ألوان وأيقونات
 * ✅ أسهم (Edges) ذكية بين المراحل مع metadata
 * ✅ لوحة تفاصيل عند الضغط على أي عقدة
 * ✅ تكبير/تصغير وتحريك (Zoom + Pan)
 * ✅ خريطة مصغرة (Minimap)
 * ✅ دعم RTL
 * ✅ رسوم متحركة سلسة
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { STATUS_COLORS, StatusColor, CustomStatus, StatusTransition } from '@/services/statusService';
import { cn } from '@/lib/utils';
import {
    CheckCircle2, XCircle, Circle, Lock, MessageSquare,
    Shield, Users, ShoppingCart, Receipt, Package, UserCheck,
    ZoomIn, ZoomOut, Maximize2, Move, Info, ArrowRight,
    ChevronRight, Settings2, Eye, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ──────────────────────────────────────────────────────────────
interface NodePosition {
    x: number;
    y: number;
}

interface WorkflowVisualEditorProps {
    statuses: CustomStatus[];
    transitions: StatusTransition[];
    isRTL: boolean;
    onStatusClick?: (status: CustomStatus) => void;
    onTransitionClick?: (transition: StatusTransition) => void;
}

// ─── Role Config ────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { icon: React.ElementType; color: string; labelAr: string; labelEn: string }> = {
    admin: { icon: Shield, labelAr: 'مدير', labelEn: 'Admin', color: 'text-red-500' },
    owner: { icon: Lock, labelAr: 'مالك', labelEn: 'Owner', color: 'text-purple-500' },
    manager: { icon: UserCheck, labelAr: 'مدير عام', labelEn: 'Manager', color: 'text-blue-500' },
    sales: { icon: ShoppingCart, labelAr: 'مبيعات', labelEn: 'Sales', color: 'text-green-500' },
    accountant: { icon: Receipt, labelAr: 'محاسب', labelEn: 'Accountant', color: 'text-amber-500' },
    warehouse: { icon: Package, labelAr: 'مستودع', labelEn: 'Warehouse', color: 'text-cyan-500' },
    user: { icon: Users, labelAr: 'مستخدم', labelEn: 'User', color: 'text-gray-500' },
};

// ─── Layout Engine ──────────────────────────────────────────────────────
function calculateNodePositions(statuses: CustomStatus[], transitions: StatusTransition[]): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();
    if (statuses.length === 0) return positions;

    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 100;
    const H_GAP = 100;
    const V_GAP = 80;

    // Separate initial, middle, and final statuses
    const initial = statuses.filter(s => s.is_initial);
    const final = statuses.filter(s => s.is_final);
    const middle = statuses.filter(s => !s.is_initial && !s.is_final);

    // Calculate total width needed
    const maxInRow = Math.max(initial.length, middle.length, final.length, 1);
    const totalWidth = maxInRow * (NODE_WIDTH + H_GAP);

    // Row 0: Initial statuses (centered)
    const initialStartX = (totalWidth - initial.length * (NODE_WIDTH + H_GAP)) / 2 + 60;
    initial.forEach((s, i) => {
        positions.set(s.id, {
            x: initialStartX + i * (NODE_WIDTH + H_GAP),
            y: 40,
        });
    });

    // Row 1+: Middle statuses (auto-layout based on transitions)
    const middleRows: CustomStatus[][] = [];
    const placed = new Set<string>();
    initial.forEach(s => placed.add(s.id));
    final.forEach(s => placed.add(s.id));

    // BFS from initial nodes
    let currentLayer = initial.map(s => s.id);
    while (currentLayer.length > 0) {
        const nextLayer: string[] = [];
        currentLayer.forEach(fromId => {
            transitions
                .filter(t => t.from_status_id === fromId)
                .forEach(t => {
                    if (!placed.has(t.to_status_id)) {
                        const target = middle.find(s => s.id === t.to_status_id);
                        if (target) {
                            nextLayer.push(t.to_status_id);
                            placed.add(t.to_status_id);
                        }
                    }
                });
        });
        if (nextLayer.length > 0) {
            const layerStatuses = nextLayer.map(id => middle.find(s => s.id === id)!).filter(Boolean);
            middleRows.push(layerStatuses);
        }
        currentLayer = nextLayer;
    }

    // Place unplaced middle statuses
    const unplaced = middle.filter(s => !placed.has(s.id));
    if (unplaced.length > 0) middleRows.push(unplaced);

    middleRows.forEach((row, rowIdx) => {
        const startX = (totalWidth - row.length * (NODE_WIDTH + H_GAP)) / 2 + 60;
        row.forEach((s, i) => {
            positions.set(s.id, {
                x: startX + i * (NODE_WIDTH + H_GAP),
                y: 40 + (rowIdx + 1) * (NODE_HEIGHT + V_GAP),
            });
        });
    });

    // Last row: Final statuses
    const finalRow = middleRows.length + 1;
    const finalStartX = (totalWidth - final.length * (NODE_WIDTH + H_GAP)) / 2 + 60;
    final.forEach((s, i) => {
        positions.set(s.id, {
            x: finalStartX + i * (NODE_WIDTH + H_GAP),
            y: 40 + finalRow * (NODE_HEIGHT + V_GAP),
        });
    });

    return positions;
}

// ─── Edge Path Calculator ───────────────────────────────────────────────
function getEdgePath(from: NodePosition, to: NodePosition, offset: number = 0): string {
    const NODE_W = 180;
    const NODE_H = 90;

    const fromCx = from.x + NODE_W / 2;
    const fromCy = from.y + NODE_H / 2;
    const toCx = to.x + NODE_W / 2;
    const toCy = to.y + NODE_H / 2;

    // Calculate direction
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    let startX: number, startY: number, endX: number, endY: number;

    if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical connection
        if (dy > 0) {
            startX = fromCx + offset * 20;
            startY = from.y + NODE_H;
            endX = toCx + offset * 20;
            endY = to.y;
        } else {
            startX = fromCx + offset * 20;
            startY = from.y;
            endX = toCx + offset * 20;
            endY = to.y + NODE_H;
        }
    } else {
        // Horizontal connection
        if (dx > 0) {
            startX = from.x + NODE_W;
            startY = fromCy + offset * 15;
            endX = to.x;
            endY = toCy + offset * 15;
        } else {
            startX = from.x;
            startY = fromCy + offset * 15;
            endX = to.x + NODE_W;
            endY = toCy + offset * 15;
        }
    }

    // Bezier curve
    const cpOffset = Math.min(Math.abs(endY - startY), Math.abs(endX - startX)) * 0.5 + 30;
    const cp1x = startX + (Math.abs(dy) > Math.abs(dx) ? 0 : cpOffset * Math.sign(dx));
    const cp1y = startY + (Math.abs(dy) > Math.abs(dx) ? cpOffset * Math.sign(dy) : 0);
    const cp2x = endX - (Math.abs(dy) > Math.abs(dx) ? 0 : cpOffset * Math.sign(dx));
    const cp2y = endY - (Math.abs(dy) > Math.abs(dx) ? cpOffset * Math.sign(dy) : 0);

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}

// ─── Arrow Marker ───────────────────────────────────────────────────────
function ArrowMarkerDefs() {
    return (
        <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 12 4 L 0 8 Z" fill="#6366f1" opacity="0.8" />
            </marker>
            <marker id="arrowhead-active" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 14 5 L 0 10 Z" fill="#4f46e5" />
            </marker>
            <marker id="arrowhead-approval" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 12 4 L 0 8 Z" fill="#f59e0b" opacity="0.9" />
            </marker>
            {/* Glow filter */}
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
            {/* Shadow filter */}
            <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
            </filter>
            {/* Selected shadow */}
            <filter id="selectedShadow" x="-15%" y="-15%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.25" />
            </filter>
        </defs>
    );
}

// ─── Status Node SVG Component ──────────────────────────────────────────
interface StatusNodeProps {
    status: CustomStatus;
    position: NodePosition;
    isSelected: boolean;
    isRTL: boolean;
    onSelect: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    incomingCount: number;
    outgoingCount: number;
}

function StatusNodeSVG({ status, position, isSelected, isRTL, onSelect, onDragStart, incomingCount, outgoingCount }: StatusNodeProps) {
    const colorConfig = STATUS_COLORS[status.color as StatusColor] || STATUS_COLORS.gray;
    const NODE_W = 180;
    const NODE_H = 90;

    // Color mapping for SVG
    const colorMap: Record<string, { fill: string; stroke: string; textFill: string; iconBg: string }> = {
        gray: { fill: '#f9fafb', stroke: '#d1d5db', textFill: '#6b7280', iconBg: '#f3f4f6' },
        blue: { fill: '#eff6ff', stroke: '#93c5fd', textFill: '#2563eb', iconBg: '#dbeafe' },
        green: { fill: '#f0fdf4', stroke: '#86efac', textFill: '#16a34a', iconBg: '#dcfce7' },
        red: { fill: '#fef2f2', stroke: '#fca5a5', textFill: '#dc2626', iconBg: '#fee2e2' },
        yellow: { fill: '#fefce8', stroke: '#fde047', textFill: '#ca8a04', iconBg: '#fef9c3' },
        orange: { fill: '#fff7ed', stroke: '#fdba74', textFill: '#ea580c', iconBg: '#fed7aa' },
        purple: { fill: '#faf5ff', stroke: '#c084fc', textFill: '#9333ea', iconBg: '#e9d5ff' },
        indigo: { fill: '#eef2ff', stroke: '#a5b4fc', textFill: '#4f46e5', iconBg: '#c7d2fe' },
        cyan: { fill: '#ecfeff', stroke: '#67e8f9', textFill: '#0891b2', iconBg: '#cffafe' },
        pink: { fill: '#fdf2f8', stroke: '#f9a8d4', textFill: '#db2777', iconBg: '#fce7f3' },
    };

    const colors = colorMap[status.color as string] || colorMap.gray;

    return (
        <g
            transform={`translate(${position.x}, ${position.y})`}
            onClick={onSelect}
            onMouseDown={onDragStart}
            style={{ cursor: 'grab' }}
            className="workflow-node"
        >
            {/* Node background */}
            <rect
                width={NODE_W}
                height={NODE_H}
                rx={16}
                ry={16}
                fill={isSelected ? '#eef2ff' : colors.fill}
                stroke={isSelected ? '#6366f1' : colors.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isSelected ? 'url(#selectedShadow)' : 'url(#dropShadow)'}
                className="transition-all"
            />

            {/* Status indicator line at top */}
            <rect
                x={20}
                y={0}
                width={NODE_W - 40}
                height={3}
                rx={1.5}
                fill={colors.textFill}
                opacity={0.6}
            />

            {/* Icon circle */}
            <circle
                cx={NODE_W / 2}
                cy={30}
                r={14}
                fill={colors.iconBg}
            />
            {/* Icon (using Unicode for simplicity in SVG) */}
            <text
                x={NODE_W / 2}
                y={35}
                textAnchor="middle"
                fontSize="14"
                fill={colors.textFill}
            >
                {status.is_initial ? '▶' : status.is_final ? '■' : '●'}
            </text>

            {/* Status name */}
            <text
                x={NODE_W / 2}
                y={58}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={isSelected ? '#4f46e5' : colors.textFill}
                fontFamily="inherit"
            >
                {isRTL ? status.name_ar : (status.name_en || status.name_ar)}
            </text>

            {/* Code badge */}
            <rect
                x={NODE_W / 2 - 25}
                y={66}
                width={50}
                height={16}
                rx={8}
                fill={colors.iconBg}
                opacity={0.7}
            />
            <text
                x={NODE_W / 2}
                y={77}
                textAnchor="middle"
                fontSize="9"
                fill={colors.textFill}
                fontFamily="monospace"
                opacity={0.7}
            >
                {status.code}
            </text>

            {/* Initial/Final badges */}
            {status.is_initial && (
                <>
                    <circle cx={NODE_W - 12} cy={12} r={8} fill="#22c55e" opacity={0.2} />
                    <circle cx={NODE_W - 12} cy={12} r={4} fill="#22c55e" />
                </>
            )}
            {status.is_final && (
                <>
                    <circle cx={NODE_W - 12} cy={12} r={8} fill="#ef4444" opacity={0.2} />
                    <rect x={NODE_W - 15} y={9} width={6} height={6} rx={1} fill="#ef4444" />
                </>
            )}

            {/* Transition count badges */}
            {outgoingCount > 0 && (
                <>
                    <circle cx={NODE_W} cy={NODE_H / 2} r={10} fill="#6366f1" opacity={0.15} />
                    <text x={NODE_W} y={NODE_H / 2 + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#6366f1">
                        {outgoingCount}
                    </text>
                </>
            )}
            {incomingCount > 0 && (
                <>
                    <circle cx={0} cy={NODE_H / 2} r={10} fill="#8b5cf6" opacity={0.15} />
                    <text x={0} y={NODE_H / 2 + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#8b5cf6">
                        {incomingCount}
                    </text>
                </>
            )}
        </g>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function WorkflowVisualEditor({
    statuses,
    transitions,
    isRTL,
    onStatusClick,
    onTransitionClick,
}: WorkflowVisualEditorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Calculate initial positions
    useEffect(() => {
        const positions = calculateNodePositions(statuses, transitions);
        setNodePositions(positions);
    }, [statuses, transitions]);

    // Selected status/transition details
    const selectedStatus = useMemo(() =>
        statuses.find(s => s.id === selectedNode), [statuses, selectedNode]
    );

    const selectedTransition = useMemo(() =>
        transitions.find(t => `${t.from_status_id}-${t.to_status_id}` === selectedEdge), [transitions, selectedEdge]
    );

    // Zoom handlers
    const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.15, 2.5)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.15, 0.3)), []);
    const handleFitView = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(z => Math.max(0.3, Math.min(2.5, z + delta)));
    }, []);

    // Pan handlers
    const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.target === svgRef.current || (e.target as Element).classList.contains('svg-bg')) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            setSelectedNode(null);
            setSelectedEdge(null);
        }
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        }
        if (dragging) {
            const svgRect = svgRef.current?.getBoundingClientRect();
            if (!svgRect) return;
            const x = (e.clientX - svgRect.left - pan.x) / zoom - dragOffset.x;
            const y = (e.clientY - svgRect.top - pan.y) / zoom - dragOffset.y;
            setNodePositions(prev => {
                const next = new Map(prev);
                next.set(dragging, { x, y });
                return next;
            });
        }
    }, [isPanning, panStart, dragging, pan, zoom, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setDragging(null);
    }, []);

    // Node drag
    const handleNodeDragStart = useCallback((statusId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const pos = nodePositions.get(statusId);
        if (!pos) return;
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        const mouseX = (e.clientX - svgRect.left - pan.x) / zoom;
        const mouseY = (e.clientY - svgRect.top - pan.y) / zoom;
        setDragOffset({ x: mouseX - pos.x, y: mouseY - pos.y });
        setDragging(statusId);
    }, [nodePositions, pan, zoom]);

    // Calculate SVG viewBox bounds
    const viewBounds = useMemo(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodePositions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + 180);
            maxY = Math.max(maxY, pos.y + 90);
        });
        if (!isFinite(minX)) return { width: 800, height: 400 };
        return {
            width: Math.max(maxX - minX + 200, 600),
            height: Math.max(maxY - minY + 200, 300),
        };
    }, [nodePositions]);

    if (statuses.length === 0) {
        return (
            <div className="flex items-center justify-center h-[400px] text-gray-400 text-sm">
                {isRTL ? 'لا توجد مراحل لعرضها' : 'No statuses to display'}
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            {/* ─── Toolbar ─── */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl border shadow-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono text-gray-500 min-w-[40px] text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitView} title="Fit View">
                    <Maximize2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Legend */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl border shadow-lg px-3 py-2 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {isRTL ? 'ابتدائية' : 'Initial'}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500 inline-block" /> {isRTL ? 'نهائية' : 'Final'}</span>
                <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-amber-500" /> {isRTL ? 'موافقة' : 'Approval'}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5 text-blue-400" /> {isRTL ? 'تعليق' : 'Comment'}</span>
            </div>

            {/* ─── SVG Canvas ─── */}
            <svg
                ref={svgRef}
                width="100%"
                height="500"
                className="bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/20 rounded-xl border border-gray-200 dark:border-gray-800 select-none"
                style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'default' }}
                onMouseDown={handleBackgroundMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <ArrowMarkerDefs />

                {/* Grid pattern background */}
                <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="15" cy="15" r="0.5" fill="#d1d5db" opacity="0.4" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" className="svg-bg" rx="12" />

                {/* Transformed group (zoom + pan) */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* ─── Edges ─── */}
                    {transitions.map((t, idx) => {
                        const fromPos = nodePositions.get(t.from_status_id);
                        const toPos = nodePositions.get(t.to_status_id);
                        if (!fromPos || !toPos) return null;

                        // Count parallel edges
                        const parallels = transitions.filter(
                            tt => (tt.from_status_id === t.from_status_id && tt.to_status_id === t.to_status_id) ||
                                (tt.from_status_id === t.to_status_id && tt.to_status_id === t.from_status_id)
                        );
                        const parallelIdx = parallels.indexOf(t);
                        const offset = parallels.length > 1 ? (parallelIdx - (parallels.length - 1) / 2) : 0;

                        const edgeId = `${t.from_status_id}-${t.to_status_id}`;
                        const isEdgeSelected = selectedEdge === edgeId;
                        const path = getEdgePath(fromPos, toPos, offset);

                        // Midpoint for label
                        const midX = (fromPos.x + 90 + toPos.x + 90) / 2;
                        const midY = (fromPos.y + 45 + toPos.y + 45) / 2;

                        return (
                            <g key={edgeId + idx}>
                                {/* Hover hitbox (wider invisible path) */}
                                <path
                                    d={path}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth={20}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEdge(edgeId);
                                        setSelectedNode(null);
                                    }}
                                />
                                {/* Visible edge */}
                                <path
                                    d={path}
                                    fill="none"
                                    stroke={t.requires_approval ? '#f59e0b' : isEdgeSelected ? '#4f46e5' : '#a5b4fc'}
                                    strokeWidth={isEdgeSelected ? 2.5 : 1.5}
                                    strokeDasharray={t.requires_approval ? '6 3' : 'none'}
                                    markerEnd={t.requires_approval ? 'url(#arrowhead-approval)' : isEdgeSelected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                                    opacity={isEdgeSelected ? 1 : 0.7}
                                    filter={isEdgeSelected ? 'url(#glow)' : undefined}
                                    className="transition-all"
                                />
                                {/* Edge labels */}
                                <g transform={`translate(${midX}, ${midY})`}>
                                    {t.requires_approval && (
                                        <>
                                            <rect x={-10} y={-10} width={20} height={20} rx={10} fill="white" stroke="#f59e0b" strokeWidth={1} />
                                            <text x={0} y={5} textAnchor="middle" fontSize="10" fill="#f59e0b">🔒</text>
                                        </>
                                    )}
                                    {t.requires_comment && !t.requires_approval && (
                                        <>
                                            <rect x={-10} y={-10} width={20} height={20} rx={10} fill="white" stroke="#60a5fa" strokeWidth={1} />
                                            <text x={0} y={5} textAnchor="middle" fontSize="10" fill="#60a5fa">💬</text>
                                        </>
                                    )}
                                    {t.requires_approval && t.requires_comment && (
                                        <>
                                            <rect x={8} y={-10} width={20} height={20} rx={10} fill="white" stroke="#60a5fa" strokeWidth={1} />
                                            <text x={18} y={5} textAnchor="middle" fontSize="10" fill="#60a5fa">💬</text>
                                        </>
                                    )}
                                </g>
                            </g>
                        );
                    })}

                    {/* ─── Nodes ─── */}
                    {statuses.map(status => {
                        const position = nodePositions.get(status.id);
                        if (!position) return null;
                        const incomingCount = transitions.filter(t => t.to_status_id === status.id).length;
                        const outgoingCount = transitions.filter(t => t.from_status_id === status.id).length;
                        return (
                            <StatusNodeSVG
                                key={status.id}
                                status={status}
                                position={position}
                                isSelected={selectedNode === status.id}
                                isRTL={isRTL}
                                onSelect={() => {
                                    setSelectedNode(status.id);
                                    setSelectedEdge(null);
                                }}
                                onDragStart={(e) => handleNodeDragStart(status.id, e)}
                                incomingCount={incomingCount}
                                outgoingCount={outgoingCount}
                            />
                        );
                    })}
                </g>
            </svg>

            {/* ─── Detail Panel ─── */}
            {(selectedStatus || selectedTransition) && (
                <div className={cn(
                    'absolute top-12 z-30 w-72 bg-white dark:bg-gray-900 rounded-xl border shadow-2xl overflow-hidden transition-all animate-in slide-in-from-right-3 duration-200',
                    isRTL ? 'left-3' : 'right-3'
                )}>
                    {/* Status Detail */}
                    {selectedStatus && (
                        <>
                            <div className={cn(
                                'px-4 py-3 border-b flex items-center justify-between',
                                `bg-${selectedStatus.color}-50 dark:bg-${selectedStatus.color}-900/20`
                            )} style={{ background: `${(STATUS_COLORS[selectedStatus.color as StatusColor] || STATUS_COLORS.gray).bg.includes('bg-') ? '' : ''}` }}>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        'w-8 h-8 rounded-lg flex items-center justify-center',
                                        STATUS_COLORS[selectedStatus.color as StatusColor]?.bg || 'bg-gray-100'
                                    )}>
                                        {selectedStatus.is_initial ? <CheckCircle2 className={cn('w-4 h-4', STATUS_COLORS[selectedStatus.color as StatusColor]?.text)} /> :
                                            selectedStatus.is_final ? <XCircle className={cn('w-4 h-4', STATUS_COLORS[selectedStatus.color as StatusColor]?.text)} /> :
                                                <Circle className={cn('w-4 h-4', STATUS_COLORS[selectedStatus.color as StatusColor]?.text)} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{isRTL ? selectedStatus.name_ar : (selectedStatus.name_en || selectedStatus.name_ar)}</h4>
                                        <code className="text-[10px] text-gray-400 font-mono">{selectedStatus.code}</code>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Properties */}
                                <div className="flex gap-2">
                                    {selectedStatus.is_initial && (
                                        <Badge className="bg-green-100 text-green-700 text-[10px] border-0 gap-1">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> {isRTL ? 'ابتدائية' : 'Initial'}
                                        </Badge>
                                    )}
                                    {selectedStatus.is_final && (
                                        <Badge className="bg-red-100 text-red-700 text-[10px] border-0 gap-1">
                                            <XCircle className="w-2.5 h-2.5" /> {isRTL ? 'نهائية' : 'Final'}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                        {selectedStatus.color}
                                    </Badge>
                                </div>

                                {/* Outgoing transitions */}
                                {(() => {
                                    const outgoing = transitions.filter(t => t.from_status_id === selectedStatus.id);
                                    if (outgoing.length === 0) return null;
                                    return (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] text-gray-400 font-medium">{isRTL ? 'التحويلات الصادرة' : 'Outgoing Transitions'}</p>
                                            {outgoing.map(t => {
                                                const toStatus = statuses.find(s => s.id === t.to_status_id);
                                                if (!toStatus) return null;
                                                return (
                                                    <div key={t.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
                                                        <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                                                        <span className="font-medium">{isRTL ? toStatus.name_ar : (toStatus.name_en || toStatus.name_ar)}</span>
                                                        <div className="flex gap-1 ms-auto">
                                                            {t.requires_approval && <Lock className="w-3 h-3 text-amber-500" />}
                                                            {t.requires_comment && <MessageSquare className="w-3 h-3 text-blue-400" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Incoming transitions */}
                                {(() => {
                                    const incoming = transitions.filter(t => t.to_status_id === selectedStatus.id);
                                    if (incoming.length === 0) return null;
                                    return (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] text-gray-400 font-medium">{isRTL ? 'التحويلات الواردة' : 'Incoming Transitions'}</p>
                                            {incoming.map(t => {
                                                const fromStatus = statuses.find(s => s.id === t.from_status_id);
                                                if (!fromStatus) return null;
                                                return (
                                                    <div key={t.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs">
                                                        <ChevronRight className="w-3 h-3 text-purple-500 shrink-0 rotate-180" />
                                                        <span className="font-medium">{isRTL ? fromStatus.name_ar : (fromStatus.name_en || fromStatus.name_ar)}</span>
                                                        <div className="flex gap-1 ms-auto">
                                                            {t.requires_approval && <Lock className="w-3 h-3 text-amber-500" />}
                                                            {t.requires_comment && <MessageSquare className="w-3 h-3 text-blue-400" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Edit button */}
                                {onStatusClick && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 text-xs"
                                        onClick={() => onStatusClick(selectedStatus)}
                                    >
                                        <Settings2 className="w-3.5 h-3.5" />
                                        {isRTL ? 'تعديل هذه المرحلة' : 'Edit this status'}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Transition Detail */}
                    {selectedTransition && (
                        <>
                            <div className="px-4 py-3 border-b bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                                    <h4 className="font-bold text-sm">{isRTL ? 'تفاصيل التحويل' : 'Transition Details'}</h4>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEdge(null)}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* From → To */}
                                <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs">
                                        {(() => {
                                            const from = statuses.find(s => s.id === selectedTransition.from_status_id);
                                            return isRTL ? from?.name_ar : (from?.name_en || from?.name_ar);
                                        })()}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                    <Badge variant="outline" className="text-xs">
                                        {(() => {
                                            const to = statuses.find(s => s.id === selectedTransition.to_status_id);
                                            return isRTL ? to?.name_ar : (to?.name_en || to?.name_ar);
                                        })()}
                                    </Badge>
                                </div>

                                {/* Requirements */}
                                <div className="space-y-2">
                                    <div className={cn(
                                        'flex items-center gap-2 p-2 rounded-lg text-xs',
                                        selectedTransition.requires_approval ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
                                    )}>
                                        <Lock className={cn('w-3.5 h-3.5', selectedTransition.requires_approval ? 'text-amber-500' : 'text-gray-300')} />
                                        <span>{isRTL ? 'يتطلب موافقة' : 'Requires Approval'}</span>
                                        <span className="ms-auto font-mono text-[10px]">{selectedTransition.requires_approval ? '✓' : '✗'}</span>
                                    </div>
                                    <div className={cn(
                                        'flex items-center gap-2 p-2 rounded-lg text-xs',
                                        selectedTransition.requires_comment ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
                                    )}>
                                        <MessageSquare className={cn('w-3.5 h-3.5', selectedTransition.requires_comment ? 'text-blue-500' : 'text-gray-300')} />
                                        <span>{isRTL ? 'يتطلب تعليق' : 'Requires Comment'}</span>
                                        <span className="ms-auto font-mono text-[10px]">{selectedTransition.requires_comment ? '✓' : '✗'}</span>
                                    </div>
                                </div>

                                {/* Allowed Roles */}
                                {selectedTransition.allowed_roles && selectedTransition.allowed_roles.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-gray-400 font-medium">{isRTL ? 'الأدوار المسموحة' : 'Allowed Roles'}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedTransition.allowed_roles.map(roleId => {
                                                const role = ROLE_CONFIG[roleId];
                                                if (!role) return <Badge key={roleId} variant="outline" className="text-[10px]">{roleId}</Badge>;
                                                const RIcon = role.icon;
                                                return (
                                                    <Badge key={roleId} variant="outline" className={cn('text-[10px] gap-1', role.color)}>
                                                        <RIcon className="w-2.5 h-2.5" />
                                                        {isRTL ? role.labelAr : role.labelEn}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── Minimap ─── */}
            <div className="absolute bottom-3 left-3 z-20 w-32 h-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
                <svg width="100%" height="100%" viewBox={`-10 -10 ${viewBounds.width + 20} ${viewBounds.height + 20}`}>
                    {/* Mini nodes */}
                    {statuses.map(s => {
                        const pos = nodePositions.get(s.id);
                        if (!pos) return null;
                        const colors = STATUS_COLORS[s.color as StatusColor] || STATUS_COLORS.gray;
                        return (
                            <rect
                                key={s.id}
                                x={pos.x}
                                y={pos.y}
                                width={20}
                                height={10}
                                rx={3}
                                fill={s.id === selectedNode ? '#6366f1' : '#94a3b8'}
                                opacity={s.id === selectedNode ? 1 : 0.5}
                            />
                        );
                    })}
                    {/* Mini edges */}
                    {transitions.map((t, i) => {
                        const from = nodePositions.get(t.from_status_id);
                        const to = nodePositions.get(t.to_status_id);
                        if (!from || !to) return null;
                        return (
                            <line
                                key={i}
                                x1={from.x + 10}
                                y1={from.y + 5}
                                x2={to.x + 10}
                                y2={to.y + 5}
                                stroke="#a5b4fc"
                                strokeWidth={1}
                                opacity={0.4}
                            />
                        );
                    })}
                </svg>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 text-[10px] text-gray-400">
                <Move className="w-3 h-3" /> {isRTL ? 'اسحب للتحريك | عجلة للتكبير | اضغط على عقدة للتفاصيل' : 'Drag to pan | Scroll to zoom | Click node for details'}
            </div>
        </div>
    );
}
