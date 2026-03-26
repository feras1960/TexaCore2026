/**
 * ════════════════════════════════════════════════════════════════
 * 🛡️ UsersPermissionsSettingsTab - تبويب المستخدمين والصلاحيات
 * ════════════════════════════════════════════════════════════════
 * 
 * Wrapper component that renders Users & Permissions as sub-tabs
 * within the main System Settings page.
 * 
 * Pattern: Uses MainTabsBar (underline variant) — same as the
 * main tabs, for visual consistency.
 * 
 * Sub-tabs:
 * - User Groups (مجموعات المستخدمين)
 * - Users Management (المستخدمين)
 * - Branches (الفروع)
 * - Audit Log (سجل التدقيق)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { MainTabsBar } from '@/components/shared/tabs/MainTabsBar';
import { Shield, Users, GitBranch, ClipboardList } from 'lucide-react';

// Sub-tab components (reuse existing)
import UserGroupsSection from '@/features/users-permissions/components/UserGroupsSection';
import UsersManagementTab from '@/features/settings/components/UsersManagementTab';
import BranchesManagementTab from '@/features/settings/components/BranchesManagementTab';
import AuditLogTab from '@/features/users-permissions/components/AuditLogTab';

// ─── Sub-tab config ─────────────────────────────────────────────────────
const SUB_TABS = [
  {
    id: 'groups',
    labelKey: 'usersPermissions.tabs.roles',
    icon: Shield,
    component: UserGroupsSection,
  },
  {
    id: 'users',
    labelKey: 'usersPermissions.tabs.users',
    icon: Users,
    component: UsersManagementTab,
  },
  {
    id: 'branches',
    labelKey: 'usersPermissions.tabs.branches',
    icon: GitBranch,
    component: BranchesManagementTab,
  },
  {
    id: 'audit',
    labelKey: 'usersPermissions.tabs.auditLog',
    icon: ClipboardList,
    component: AuditLogTab,
  },
];

export default function UsersPermissionsSettingsTab() {
  const { direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('groups');

  // ⚡ PERFORMANCE: Only mount tabs when first visited
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['groups']));

  const tabsForBar = useMemo(() =>
    SUB_TABS.map(({ id, labelKey, icon }) => ({ id, labelKey, icon })),
    []
  );

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setVisitedTabs(prev => {
        if (prev.has(tabId)) return prev;
        return new Set(prev).add(tabId);
      });
    }
  }, [activeTab]);

  return (
    <div className="space-y-6" dir={direction}>
      {/* Sub-tabs bar — underline variant, same as main tabs */}
      <MainTabsBar
        tabs={tabsForBar}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="underline"
      />

      {/* Tab panels — Keep Visited Mounted pattern */}
      <div className="relative">
        {SUB_TABS.map((tab) => {
          const TabComponent = tab.component;
          const isActive = activeTab === tab.id;
          const wasVisited = visitedTabs.has(tab.id);

          if (!wasVisited) return null;

          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              aria-hidden={!isActive}
              className={isActive ? 'block' : 'hidden'}
              style={{
                contain: isActive ? 'none' : 'strict',
                contentVisibility: isActive ? 'visible' : 'hidden',
              }}
            >
              <TabComponent />
            </div>
          );
        })}
      </div>
    </div>
  );
}
