/**
 * Purchases Workflow Settings — إعدادات سير عمل المشتريات
 * 
 * يستخدم المكون العام WorkflowSettings مع تكوين PURCHASES_WORKFLOW_CONFIG
 */

import { WorkflowSettings } from '@/features/sales/pages/SalesWorkflowSettings';
import { PURCHASES_WORKFLOW_CONFIG } from '@/components/workflow/workflowConfigs';

export default function PurchasesWorkflowSettings() {
    return <WorkflowSettings config={PURCHASES_WORKFLOW_CONFIG} />;
}
