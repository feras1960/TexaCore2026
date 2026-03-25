# Container Module Implementation Documentation (Unified System)

**Date**: February 8, 2026
**Author**: Antigravity (AI Assistant)

## Overview
This document outlines the implementation of the specialized "Container Management" module within the Purchases section. The implementation leverages the **Unified Accounting Sheet** architecture, replacing the standalone `AddContainerSheet` to ensure consistency, maintainability, and full integration with the ERP's core systems (multilingual support, theming, permissions).

## Key Components

### 1. Unified Sheet Integration
The container creation and editing workflow is now handled by `UnifiedTradeSheet` (which wraps `UnifiedAccountingSheet`).

*   **Config**: `tradeContainerConfig` in `src/features/accounting/components/unified/configs/tradeConfigs.ts`.
*   **Type**: `trade_container`.
*   **Tabs**:
    *   `trade_details`: Maps to **Container Contents** (Invoice Linking).
    *   `shipping`: Maps to **Shipping Details** (B/L, Ports, etc.).
    *   `expenses`: Maps to **Expenses** (Freight, Customs, etc.).

### 2. Invoice Linking (vs. Manual Items)
Based on user requirements, the primary method for populating a container is by **linking posted Purchase Invoices**.
*   **Component**: `ContainerInvoiceSelector` (`src/features/trade/components/ContainerInvoiceSelector.tsx`).
*   **Functionality**: Fetches posted invoices for the selected supplier that are not yet assigned to a shipment.
*   **Why**: This ensures financial integrity. The container value is derived from the actual invoices rather than manual entry, preventing discrepancies between logistics and accounting.

### 3. Shipping Details
The `TradeShippingTab` was enhanced to support editable fields for full container logistics.
*   **Fields Added**: `Origin Country`, `Container Size`, `Container Type` (in addition to standard fields like B/L, Ports, Vessel, Dates).
*   **Component**: `TradeShippingTab.tsx` (`src/features/accounting/components/unified/tabs/TradeShippingTab.tsx`).

### 4. Expense Management
A dedicated `ContainerExpensesTab` was created to manage shipment-related costs.
*   **Component**: `ContainerExpensesTab.tsx`.
*   **Features**: Add/Edit/Remove expenses (Freight, Customs, Insurance) with multi-currency support (UI ready).

## Database & Schema
The implementation relies on the following schema updates (ensure `supabase/scripts/ADD_SHIPMENT_TO_INVOICES.sql` is executed):

### `shipments` Table Updates
*   `origin_country` (VARCHAR)
*   `port_of_loading` (VARCHAR)
*   `port_of_discharge` (VARCHAR)
*   `shipping_line` (VARCHAR)
*   `vessel_name` (VARCHAR)
*   `etd`, `eta` (DATE)
*   `container_size`, `container_type` (VARCHAR)
*   `customs_declaration_number`, `clearance_date`

### `purchase_invoices` Table Updates
*   `shipment_id` (FK to `shipments`): Links invoices to a container.

## Comparison with Legacy Project
The new implementation matches the data requirements of the legacy `AddContainerSheet` but improves the workflow:
*   **Old**: Manual Item Entry -> **New**: Link Invoices (More accurate).
*   **Old**: Standalone Sheet -> **New**: Unified Sheet (Consistent UI).
*   **Old**: Hardcoded Strings -> **New**: Full Translation Keys (`t()`).

## 5. Recent Fixes & Improvements (Feb 2026)

### 5.1 Database Schema & Relationships
To resolve `400 Bad Request` errors and ensure data integrity, the following schema enforcements were applied via `FIX_SHIPMENTS_SCHEMA.sql`:
- **`shipments` Table**: Verified existence of all columns including `supplier_id`.
- **Foreign Keys**: Explicitly added/verified:
    - `shipments.supplier_id` -> `suppliers.id` (Critical for `supplier:suppliers` relation).
    - `purchase_invoices.shipment_id` -> `shipments.id` (Critical for `invoices:purchase_invoices` relation).
- **RLS Policies**: Updated to use the unified `can_access_company(company_id)` function for secure access control.

### 5.2 Translation System
- **Key Collision Resolution**: Renamed the nested `purchases.containers` object to `purchases.container_details` in both `ar.json` and `en.json`.
    - *Before*: `purchases.containers` was both a string (sidebar) and an object (page details), causing conflicts.
    - *After*: `purchases.containers` (String) for Sidebar, `purchases.container_details` (Object) for Page Titles/Subtitles.
- **Missing Keys**: Added missing translations for `fields.supplier`, `fields.status`, and container statuses (`all`, `inTransit`, `cleared`, `received`).

### 5.3 UI/UX Enhancements
- **RTL Tab Alignment**: Implemented logic to reverse the visual order of status tabs ("All", "In Transit", etc.) specifically for Arabic users to follow natural reading order (Right to Left).
- **Code Hygiene**: Removed unsupported `isLoading` prop from `NexaDataTable` to fix TypeScript errors.

## 6. Verification Status
- **Schema**: Verified. Relationships `shipments->suppliers` and `purchase_invoices->shipments` are active.
- **Translations**: Verified. No `Translation missing` errors.
- **UI**: Verified. Tabs align correctly in RTL. Data loads without 400 errors.

## 7. Next Steps
- Continue implementing the "Expenses" tab logic (linking to GL).
- Finalize "Attachments" and "Activity" tabs.
