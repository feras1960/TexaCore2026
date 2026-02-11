/**
 * useAutoLayout — خطاف الترتيب التلقائي مع ELK
 * يحسب مواقع العقد والأسهم تلقائياً بشكل ذكي
 */

import { useCallback } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

/** خيارات التخطيط */
export interface LayoutOptions {
    direction?: 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';
    spacing?: number;
    layerSpacing?: number;
    algorithm?: 'layered' | 'stress' | 'mrtree' | 'force';
}

const DEFAULT_OPTIONS: LayoutOptions = {
    direction: 'DOWN',
    spacing: 60,
    layerSpacing: 80,
    algorithm: 'layered',
};

/** حساب عرض وارتفاع العقدة */
function getNodeDimensions(node: Node): { width: number; height: number } {
    // أحجام افتراضية حسب نوع العقدة
    const type = node.type || 'default';
    switch (type) {
        case 'statusNode':
            return { width: 200, height: 90 };
        case 'actionNode':
            return { width: 220, height: 100 };
        case 'conditionNode':
            return { width: 180, height: 80 };
        case 'triggerNode':
            return { width: 200, height: 70 };
        default:
            return { width: 200, height: 80 };
    }
}

export function useAutoLayout() {
    const getLayoutedElements = useCallback(
        async (
            nodes: Node[],
            edges: Edge[],
            options: LayoutOptions = {}
        ): Promise<{ nodes: Node[]; edges: Edge[] }> => {
            const opts = { ...DEFAULT_OPTIONS, ...options };

            if (nodes.length === 0) {
                return { nodes, edges };
            }

            const elkGraph = {
                id: 'root',
                layoutOptions: {
                    'elk.algorithm': opts.algorithm === 'layered' ? 'org.eclipse.elk.layered' : `org.eclipse.elk.${opts.algorithm}`,
                    'elk.direction': opts.direction,
                    'elk.spacing.nodeNode': String(opts.spacing),
                    'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
                    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
                    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
                    'elk.edgeRouting': 'SPLINES',
                },
                children: nodes.map((node) => {
                    const dims = getNodeDimensions(node);
                    return {
                        id: node.id,
                        width: dims.width,
                        height: dims.height,
                    };
                }),
                edges: edges.map((edge) => ({
                    id: edge.id,
                    sources: [edge.source],
                    targets: [edge.target],
                })),
            };

            try {
                const layouted = await elk.layout(elkGraph);

                const layoutedNodes = nodes.map((node) => {
                    const elkNode = layouted.children?.find((n) => n.id === node.id);
                    if (!elkNode) return node;

                    return {
                        ...node,
                        position: {
                            x: elkNode.x ?? 0,
                            y: elkNode.y ?? 0,
                        },
                    };
                });

                return { nodes: layoutedNodes, edges };
            } catch (error) {
                console.error('ELK layout error:', error);
                // Fallback: ترتيب بسيط في حالة فشل ELK
                const fallbackNodes = nodes.map((node, i) => ({
                    ...node,
                    position: {
                        x: 100 + (i % 3) * 250,
                        y: 50 + Math.floor(i / 3) * 150,
                    },
                }));
                return { nodes: fallbackNodes, edges };
            }
        },
        []
    );

    return { getLayoutedElements };
}
