/**
 * CRM Settings — إعدادات CRM والاتصالات
 * 
 * يعرض محرر سير العمل العام مع تكوين CRM
 */

import { WorkflowSettings } from '@/features/sales/pages/SalesWorkflowSettings';
import { CRM_WORKFLOW_CONFIG } from '@/components/workflow/workflowConfigs';

export default function CRMSettings() {
    return (
        <div className="animate-in fade-in duration-500">
            <WorkflowSettings config={CRM_WORKFLOW_CONFIG} />
        </div>
    );
}
