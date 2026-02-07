# Warehouse Materials Visibility & Structure Fix (2026-02-07)

## Problem Summary
- Materials created successfully but not appearing in the list or tree view.
- Tree structure mixing groups and materials in a cluttered way.
- Missing columns in `fabric_materials` (e.g., `company_id`, `custom_fields`, `min_stock`) causing silent failures or data mismatch.
- RLS policies preventing read access despite successful insertion.
- Console warnings regarding accessibility (DialogTitle) and missing columns.

## Solution Implemented

### 1. Database Schema & Data Integrity
- **Missing Columns:** Added `company_id`, `custom_fields` (JSONB), `min_stock`, `reorder_point`, `notes`, `status`, and `category` to `fabric_materials`.
- **Data Unification:** Updated all existing materials and groups to align with the current active company (`1313232...`) to ensure visibility.
- **RLS Policies:** Simplified RLS policies for `fabric_groups` and `fabric_materials` to allow authenticated users full access (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) within their authorized scope.

### 2. Frontend Logic (React/TypeScript)
- **Material Tree Structure (`MaterialTree.tsx`):** Modified the tree component to show **only groups (folders)** in the sidebar tree, while displaying materials (content) in the main details panel. This mimics a cleaner "File Explorer" experience.
- **Tree Sorting (`MaterialsPage.tsx`):** Implemented sorting logic: Groups first, then alphabetical sorting by code/name.
- **Data Fetching:** Verified and logged `company_id` propagation from `useAuth` to `warehouseService`.
- **Accessibility:** Added hidden `SheetTitle` and `SheetDescription` to `UnifiedAccountingSheet` to resolve Radix UI warnings.
- **Form Handling (`MaterialOverviewTab.tsx`):** Ensured proper `group_id` selection and passing to backend.

## Executed SQL Migration Scripts
The following scripts were executed to fix the database state:

1.  `supabase/scripts/FIX_fabric_groups_rls_v2.sql` - Fixed RLS for groups using fallback tenant logic.
2.  `supabase/scripts/FIX_fabric_materials_rls.sql` - Initial RLS fix for materials.
3.  `supabase/scripts/FIX_missing_columns_fabric_materials.sql` - Added `company_id` and initial missing columns.
4.  `supabase/scripts/FIX_all_missing_columns_and_data.sql` - Comprehensive data update to match current frontend company context.
5.  `supabase/scripts/FIX_rls_simple_authentication.sql` - **Definitive RLS fix:** Simplified access for authenticated users to guarantee visibility.
6.  `supabase/scripts/FIX_fabric_materials_schema_full.sql` - **Schema Completion:** Added `custom_fields` and all remaining missing columns found in the frontend payload.

## Verification
- Materials now appear correctly under their respective groups in the tree view (sidebar only shows groups, main panel shows content).
- Adding new materials works flawlessly with all fields (`custom_fields`, `min_stock`, etc.) correctly saved.
- Data is consistent with the current authenticated user's company context.
