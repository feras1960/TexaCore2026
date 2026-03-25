# 📊 CRM & Call Center Analysis (Migration Plan)

> **Source Project**: `ERP-System-12-2025` (Port 5174)
> **Target Project**: `TexaCore ERP` (Port 5173)
> **Date**: 2026-02-09

This document outlines the migration plan for the CRM and Call Center modules from the legacy project to the new TexaCore architecture.

## 1. Structure Analysis

The legacy CRM module (`src/pages/CRM.tsx`) acts as a shell for multiple sub-modules, including a full Call Center (UCM) suite.

### 🏛️ Module Architecture
The new implementation will reside in `src/features/crm` and will use the **Standard Tabbed Layout** (`MainTabsBar`) to navigate between these sub-modules.

| Path | Legacy Component | New Component (Proposed) | Type |
| :--- | :--- | :--- | :--- |
| `/` | `CRMDashboard` | `CRMDashboard.tsx` | Dashboard |
| `/contacts` | `ContactsList` | `ContactsTable.tsx` | **NexaDataTable** |
| `/pipeline` | `SalesPipeline` | `PipelineBoard.tsx` | Kanban/Board |
| `/tasks` | `TasksList` | `TasksTable.tsx` | **NexaDataTable** |
| `/campaigns` | `MarketingCampaigns` | `CampaignsList.tsx` | List/Grid |
| `/activity-log` | `ActivityLog` | `ActivityFeed.tsx` | Feed |
| `/communications` | `ManagerDashboard` | `CallCenterDashboard.tsx` | Special Dashboard |
| `/settings` | `UCMSettingsPanel` | `CRMSettings.tsx` | Settings Form |

## 2. Key Features to Migrate

### 💼 CRM Core
1.  **Dashboard**: Revenue trends, Sales funnel (conversion rates), Top deals, Recent activity.
2.  **Contacts**: Managing customers/leads.
    *   *Standard*: Must be migrated to `NexaDataTable` with filtering/sorting.
3.  **Sales Pipeline**: Managing deals across stages (Qualified, Proposal, negotiation, etc.).
4.  **Tasks**: Follow-up tasks linked to clients.

### 📞 Call Center (UCM)
1.  **Manager Dashboard**: Real-time stats (Active calls, Missed, Avg duration).
2.  **Live Monitor**: Real-time visualization of active calls.
3.  **Call Logs**: History of all calls.
4.  **Call Details**: Detail sheet for individual calls.

## 3. Implementation Standards

### ✅ UI Standards
*   **Layout**: `MainTabsBar` (Underline variant) for top-level navigation.
*   **Data Tables**: Exclusively use `NexaDataTable` for all list views (Contacts, Logs, Tasks).
*   **Detail Views**: Use `UniversalDetailSheet` (The "Unified" pattern) for:
    *   Contact Details
    *   Deal Details
    *   Call Details

### 🛠️ Directory Structure (`src/features/crm`)
```
src/features/crm/
├── CRM.tsx                // Main Entry Point
├── components/            // Shared small components
├── tabs/
│   ├── CRMDashboard.tsx
│   ├── ContactsTable.tsx
│   ├── PipelineBoard.tsx
│   ├── TasksTable.tsx
│   ├── CallCenter/        // Grouping Call Center files
│   │   ├── CallCenterDashboard.tsx
│   │   ├── LiveMonitor.tsx
│   │   └── CallLogsTable.tsx
│   └── Settings/
└── types/                 // TypeScript definitions
```

## 4. Execution Plan
1.  ~~**Scaffold**: Create the directory structure and main `CRM.tsx`.~~ ✅
2.  ~~**Shells**: Create empty placeholder components for all tabs to ensure navigation works.~~ ✅
3.  **Detailed Implementation**:
    *   ~~Implement `ContactsTable` using `NexaDataTable`.~~ ✅
    *   ~~Implement `contactsService.ts` — Backend CRUD.~~ ✅
    *   ~~Implement `UnifiedAccountingSheet` for Contact (docType: 'contact').~~ ✅
    *   ~~Connect to Backend (Supabase) — RLS + Triggers + Functions.~~ ✅
    *   Implement `CallCenterDashboard` with mock data first.
    *   Implement `PipelineBoard` (Kanban).
    *   Implement `TasksTable`.

> **📋 Detailed documentation**: See `docs/features/CRM_CONTACTS_MODULE.md`

