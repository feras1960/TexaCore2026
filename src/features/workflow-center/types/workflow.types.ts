/**
 * Workflow Center — أنواع TypeScript
 * النظام الموحد لإدارة سير العمل
 */

import type { Node, Edge } from '@xyflow/react';

// ========================================
// أنواع العقد
// ========================================

/** بيانات عقدة الحالة (Status Node) */
export interface StatusNodeData {
    type: 'status';
    label: string;        // الاسم بالعربي
    labelEn: string;      // الاسم بالإنجليزي
    code: string;         // الكود (draft, confirmed...)
    color: string;        // اللون
    icon?: string;        // أيقونة اختيارية
    isInitial: boolean;   // حالة ابتدائية؟
    isFinal: boolean;     // حالة نهائية؟
    sortOrder: number;    // ترتيب
    [key: string]: unknown;
}

/** بيانات عقدة الإجراء (Action Node) */
export interface ActionNodeData {
    type: 'action';
    label: string;
    labelEn: string;
    actionType: 'notification' | 'email' | 'webhook' | 'function' | 'ai';
    config: Record<string, unknown>;
    [key: string]: unknown;
}

/** بيانات عقدة الشرط (Condition Node) */
export interface ConditionNodeData {
    type: 'condition';
    label: string;
    labelEn: string;
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: string | number;
    [key: string]: unknown;
}

/** بيانات عقدة المحفز (Trigger Node) */
export interface TriggerNodeData {
    type: 'trigger';
    label: string;
    labelEn: string;
    triggerType: 'on_create' | 'on_update' | 'on_status_change' | 'scheduled';
    config: Record<string, unknown>;
    [key: string]: unknown;
}

/** جميع أنواع بيانات العقد */
export type WorkflowNodeData = StatusNodeData | ActionNodeData | ConditionNodeData | TriggerNodeData;

/** أنواع العقد المستخدمة في React Flow */
export type WorkflowNode = Node<WorkflowNodeData>;

// ========================================
// أنواع الأسهم
// ========================================

/** بيانات السهم */
export interface WorkflowEdgeData {
    label?: string;
    requiresApproval?: boolean;
    requiresComment?: boolean;
    allowedRoles?: string[];
    conditionResult?: 'yes' | 'no';
    [key: string]: unknown;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

// ========================================
// تكوين الموديول
// ========================================

/** تعريف نوع مستند */
export interface DocTypeDefinition {
    id: string;
    nameAr: string;
    nameEn: string;
    icon: string;
    color: string;
    /** الحالات الافتراضية لهذا النوع */
    defaultStatuses: Array<{
        code: string;
        nameAr: string;
        nameEn: string;
        color: string;
        isInitial?: boolean;
        isFinal?: boolean;
    }>;
    /** التحويلات الافتراضية */
    defaultTransitions: Array<{
        from: string;
        to: string;
    }>;
}

/** تكوين موديول واحد */
export interface WorkflowModuleConfig {
    moduleId: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    icon: string;
    color: string;
    docTypes: DocTypeDefinition[];
}

// ========================================
// حالة مركز سير العمل
// ========================================

/** حالة المحرر */
export interface WorkflowEditorState {
    selectedModuleId: string | null;
    selectedDocTypeId: string | null;
    selectedNodeId: string | null;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    isDirty: boolean;
    isLoading: boolean;
}

/** سيناريو أتمتة */
export interface AutomationScenario {
    id: string;
    name: string;
    nameAr: string;
    moduleId: string;
    docTypeId: string;
    isActive: boolean;
    triggerType: string;
    actions: Array<{
        type: string;
        config: Record<string, unknown>;
    }>;
    createdAt: string;
    updatedAt: string;
}

/** إحصائيات الموديول */
export interface ModuleWorkflowStats {
    moduleId: string;
    docTypeCount: number;
    statusCount: number;
    transitionCount: number;
    scenarioCount: number;
    activeScenarioCount: number;
}
