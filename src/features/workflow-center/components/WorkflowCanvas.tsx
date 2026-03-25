/**
 * WorkflowCanvas — المحرر المرئي الأساسي
 * يستخدم React Flow مع ELK للترتيب التلقائي
 * يعرض مسار سير العمل كرسم بياني تفاعلي
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    LayoutGrid,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Undo2,
    Redo2,
    Save,
    Plus,
    Trash2,
    ArrowDown,
    ArrowLeft as ArrowRight, // RTL
    Lock,
    Unlock,
} from 'lucide-react';
import { StatusNode } from './nodes/StatusNode';
import { WorkflowEdge } from './edges/WorkflowEdge';
import { useAutoLayout } from '../hooks/useAutoLayout';

// ========== أنواع Props ==========

interface WorkflowCanvasProps {
    /** العقد الأولية */
    initialNodes?: Node[];
    /** الأسهم الأولية */
    initialEdges?: Edge[];
    /** عند تغير العقد / الأسهم */
    onChange?: (nodes: Node[], edges: Edge[]) => void;
    /** عند اختيار عقدة */
    onNodeSelect?: (nodeId: string | null) => void;
    /** عند اختيار سهم */
    onEdgeSelect?: (edgeId: string | null) => void;
    /** وضع القراءة فقط */
    readOnly?: boolean;
    /** العنوان */
    title?: string;
    /** اتجاه التخطيط */
    layoutDirection?: 'DOWN' | 'RIGHT';
    /** CSS classes */
    className?: string;
}

// ========== تسجيل أنواع العقد والأسهم ==========

const nodeTypes = {
    statusNode: StatusNode,
};

const edgeTypes = {
    workflowEdge: WorkflowEdge,
};

// ========== خيارات اتصال افتراضية ==========

const defaultEdgeOptions = {
    type: 'workflowEdge',
    animated: false,
    markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: '#94a3b8',
    },
    style: {
        strokeWidth: 2,
        stroke: '#94a3b8',
    },
};

// ========== المحرر الداخلي (يحتاج ReactFlowProvider) ==========

function WorkflowCanvasInner({
    initialNodes = [],
    initialEdges = [],
    onChange,
    onNodeSelect,
    onEdgeSelect,
    readOnly = false,
    title,
    layoutDirection = 'DOWN',
    className,
}: WorkflowCanvasProps) {
    const { isRTL, t } = useLanguage();
    const { fitView, zoomIn, zoomOut } = useReactFlow();
    const { getLayoutedElements } = useAutoLayout();

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isLayouting, setIsLayouting] = useState(false);
    const initialLayoutDone = useRef(false);

    // ========== ترتيب تلقائي ==========
    const applyLayout = useCallback(async (
        currentNodes: Node[],
        currentEdges: Edge[],
        direction: 'DOWN' | 'RIGHT' = 'DOWN'
    ) => {
        if (currentNodes.length === 0) return;
        setIsLayouting(true);

        try {
            const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(
                currentNodes,
                currentEdges,
                { direction, spacing: 70, layerSpacing: 100 }
            );
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            // Fit view بعد التخطيط
            requestAnimationFrame(() => {
                fitView({ padding: 0.2, duration: 500 });
            });
        } catch (err) {
            console.error('Layout error:', err);
        } finally {
            setIsLayouting(false);
        }
    }, [getLayoutedElements, setNodes, setEdges, fitView]);

    // ========== تطبيق الترتيب عند تحميل البيانات ==========
    useEffect(() => {
        if (initialNodes.length > 0 && !initialLayoutDone.current) {
            initialLayoutDone.current = true;
            applyLayout(initialNodes, initialEdges, layoutDirection);
        }
    }, [initialNodes, initialEdges, layoutDirection, applyLayout]);

    // ========== معالجة الاتصال الجديد ==========
    const onConnect = useCallback(
        (connection: Connection) => {
            if (readOnly) return;
            const newEdge = {
                ...connection,
                type: 'workflowEdge',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 16,
                    height: 16,
                    color: '#94a3b8',
                },
                data: {
                    requiresApproval: false,
                    requiresComment: false,
                },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, readOnly]
    );

    // ========== إبلاغ بالتغييرات ==========
    useEffect(() => {
        onChange?.(nodes, edges);
    }, [nodes, edges]);

    // ========== اختيار العقد ==========
    const onSelectionChange = useCallback(
        ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
            if (selectedNodes.length > 0) {
                onNodeSelect?.(selectedNodes[0].id);
                onEdgeSelect?.(null);
            } else if (selectedEdges.length > 0) {
                onEdgeSelect?.(selectedEdges[0].id);
                onNodeSelect?.(null);
            } else {
                onNodeSelect?.(null);
                onEdgeSelect?.(null);
            }
        },
        [onNodeSelect, onEdgeSelect]
    );

    // ========== ألوان Minimap ==========
    const minimapNodeColor = useCallback((node: Node) => {
        const data = node.data as Record<string, unknown>;
        const color = (data?.color as string) || 'gray';
        const colorMap: Record<string, string> = {
            gray: '#9ca3af', blue: '#3b82f6', green: '#10b981',
            red: '#ef4444', yellow: '#f59e0b', purple: '#8b5cf6',
            indigo: '#6366f1', teal: '#14b8a6', orange: '#f97316',
        };
        return colorMap[color] || '#9ca3af';
    }, []);

    return (
        <div className={cn('w-full h-full relative', className)}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={readOnly ? undefined : onNodesChange}
                onEdgesChange={readOnly ? undefined : onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                snapToGrid
                snapGrid={[15, 15]}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elementsSelectable={true}
                proOptions={{ hideAttribution: true }}
                className="bg-gray-50/50 dark:bg-gray-900/50"
            >
                {/* شبكة خلفية */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(0,0,0,0.06)"
                />

                {/* عناصر التحكم */}
                <Controls
                    showZoom={false}
                    showFitView={false}
                    showInteractive={false}
                    className="hidden"
                />

                {/* الخريطة المصغرة */}
                <MiniMap
                    nodeColor={minimapNodeColor}
                    nodeStrokeWidth={2}
                    zoomable
                    pannable
                    className={cn(
                        '!bg-white/90 dark:!bg-gray-800/90 !border !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg',
                        isRTL ? '!left-3 !right-auto' : '!right-3 !left-auto',
                        '!bottom-3'
                    )}
                    style={{ width: 160, height: 100 }}
                />

                {/* شريط الأدوات العلوي */}
                <Panel position={isRTL ? 'top-right' : 'top-left'} className="flex items-center gap-2">
                    {title && (
                        <Badge variant="outline" className="bg-white/90 dark:bg-gray-800/90 text-sm font-medium px-3 py-1.5 shadow-sm">
                            {title}
                        </Badge>
                    )}
                    {readOnly && (
                        <Badge variant="secondary" className="text-xs gap-1">
                            <Lock className="w-3 h-3" />
                            قراءة فقط
                        </Badge>
                    )}
                </Panel>

                {/* أزرار التحكم */}
                <Panel position={isRTL ? 'top-left' : 'top-right'} className="flex items-center gap-1.5">
                    {/* ترتيب تلقائي */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyLayout(nodes, edges, 'DOWN')}
                        disabled={isLayouting || nodes.length === 0}
                        className="bg-white/90 dark:bg-gray-800/90 shadow-sm h-8 gap-1.5 text-xs"
                        title="ترتيب عمودي"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyLayout(nodes, edges, 'RIGHT')}
                        disabled={isLayouting || nodes.length === 0}
                        className="bg-white/90 dark:bg-gray-800/90 shadow-sm h-8 gap-1.5 text-xs"
                        title="ترتيب أفقي"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-0.5" />

                    {/* تكبير / تصغير */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => zoomIn({ duration: 200 })}
                        className="bg-white/90 dark:bg-gray-800/90 shadow-sm h-8 w-8"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => zoomOut({ duration: 200 })}
                        className="bg-white/90 dark:bg-gray-800/90 shadow-sm h-8 w-8"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fitView({ padding: 0.2, duration: 300 })}
                        className="bg-white/90 dark:bg-gray-800/90 shadow-sm h-8 w-8"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                </Panel>

                {/* دليل الألوان */}
                <Panel position="bottom-right" className="flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 rounded-xl px-3 py-1.5 shadow-sm border border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        ابتدائية
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        نهائية
                    </span>
                    <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        موافقة
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        عادية
                    </span>
                </Panel>
            </ReactFlow>
        </div>
    );
}

// ========== المكون الخارجي مع Provider ==========

export function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}

export default WorkflowCanvas;
