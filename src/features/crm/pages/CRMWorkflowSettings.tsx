/**
 * CRM Workflow Settings — إعدادات سير عمل CRM والاتصالات
 * 
 * يستخدم المكون العام WorkflowSettings مع تكوين CRM_WORKFLOW_CONFIG
 */

import { WorkflowSettings } from '@/features/sales/pages/SalesWorkflowSettings';
import { CRM_WORKFLOW_CONFIG } from '@/components/workflow/workflowConfigs';

export default function CRMWorkflowSettings() {
    return <WorkflowSettings config={CRM_WORKFLOW_CONFIG} />;
}
