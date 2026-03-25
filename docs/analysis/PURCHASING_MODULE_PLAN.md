# Purchasing & Sales Module Implementation Plan

## 1. Executive Summary
This document outlines the comprehensive strategy to implement the Purchasing and Sales modules in the TexaCore ERP system. The implementation will leverage the existing **UnifiedAccountingSheet** architecture to ensure consistency, RTL/LTR support, and adherence to the project constitution. The legacy project (28-01-2026) was analyzed and found to be a navigation shell; therefore, the business logic will be built from scratch following modern ERP best practices (similar to generic ERPNext/Odoo flows but customized for TexaCore).

## 2. Database Schema Analysis
The database schema (`00008_add_sales_and_purchases.sql`) is robust and ready for use.
**Existing Tables:**
- **Purchases:** `purchase_orders`, `purchase_invoices`, `purchase_invoice_items`
- **Sales:** `quotations`, `sales_orders`, `sales_invoices`, `sales_invoice_items`
- **Payments:** `payment_receipts`, `payment_vouchers`

**Required Schema Updates:**
- **Roll Management:** Add `roll_id` to `purchase_invoice_items` to support fabric roll tracking in purchases.
- **Workflow Status:** Ensure `status` columns align with the `status_management` module.

## 3. Architecture Strategy: "Unified Trade Document"
Instead of creating separate components for each document type, we will implement a polymorphic adapter pattern on top of `UnifiedAccountingSheet`.

### 3.1. Unified Component Scope
The `UnifiedAccountingSheet` will serve:
1.  **Purchase Request (RFQ)**
2.  **Purchase Order (PO)**
3.  **Purchase Invoice (PI / Bill)**
4.  **Sales Quotation**
5.  **Sales Order**
6.  **Sales Invoice**

### 3.2. Configuration Adapter
A new config file `tradeDocumentConfigs.ts` will map the generic sheet to specific document needs:
- **Title:** e.g., "New Purchase Order" (Localized)
- **Service:** Dynamic injection of `TradeService`.
- **Tabs:** Custom tab set for trade documents.

## 4. Implementation Steps (Phase 1: Purchases)

### Step 1: Backend Services (`src/services/tradeService.ts`)
- Implement strict typed interfaces for `PurchaseOrder`, `PurchaseInvoice`.
- Build CRUD operations with direct relation fetching (`items`, `supplier`).
- Implement "Conversion Logic" (e.g., `createInvoiceFromOrder`).

### Step 2: Trade Tabs Components (`src/features/trade/components/tabs`)
- **MainInfoTab:** Supplier selection, Dates, Warehouse, Currency.
- **LinesGridTab:** High-performance data grid (NexaDataTable) for items.
    - Columns: Product/Material, Quantity (Unit/Rolls), Unit Price, Discount, Tax, Total.
    - **Calculation Engine:** React hook to auto-calculate totals, taxes, and grand total in real-time.
- **FinancialsTab:** Payment terms, Additional charges, Global discount.

### Step 3: Integration with UnifiedAccountingSheet
- Register new `docType`s: `purchase_order`, `purchase_invoice`.
- Map tabs in `SheetTabs.tsx`.

### Step 4: Routing & Lists
- Create `src/features/purchases/pages/PurchaseOrdersPage.tsx`.
- Create `src/features/purchases/pages/PurchaseInvoicesPage.tsx`.
- Use `NexaDataTable` for the list view with status badges and filters.

## 5. Sales Module (Phase 2)
Once the Purchasing logic is solid, the Sales module will reuse 90% of the code. The primary differences will be:
- **Party:** Customer instead of Supplier.
- **Price List:** Sales Price vs Purchase Cost.
- **Stock Impact:** Outgoing vs Incoming.

## 6. Detailed Business Logic (To Be Implemented)

### A. Inventory Integration
- **Purchase Invoice:** Increases `physical_stock` (if direct update) or creates `stock_movements`.
- **Validation:** Check warehouse permissions.

### B. Fabric Specifics
- Support purchasing generic "Fabric" in Meters.
- Support purchasing specific "Rolls" (batch entry).

### C. Multi-Currency
- Use `exchange_rate` from header to calculate `amount_in_base`.
- Display totals in both Document Currency and Company Base Currency.

## 7. Action Plan
1.  **Schema Update:** Add `roll_id` to purchase items.
2.  **Service Layer:** Create `tradeService`.
3.  **UI Construction:** Build `LinesGridTab` (The most complex part).
4.  **Sheet Integration:** Connect to `UnifiedAccountingSheet`.
5.  **Testing:** Verify Calculations and Saving.

## 8. Alignment with Standards
- **RTL/LTR:** All grids and inputs will strictly follow `dir={isRTL ? 'rtl' : 'ltr'}`.
- **Validation:** Zod schemas for all forms.
- **Accessibility:** Semantic HTML and keyboard navigation in grids.
