# Sales Module Analysis & Roadmap 2026

## 1. Executive Summary
This document analyzes the Sales Reporting and Settings capabilities of the legacy "Eragold" system and outlines a modernization roadmap for the current "TexaCore" implementations. The goal is to migrate valuable business logic while upgrading the User Experience (UX) to professional standards using Charts, Interactive Data Tables, and Robust Configuration Engines.

## 2. Legacy System Analysis (Eragold)

### 2.1 Sales Reports
The legacy system offered a functional but purely tabular reporting suite covering 10 key dimensions:
1.  **Daily Sales**: Date-wise aggregation (Invoices, Net Sales, Returns).
2.  **By Salesperson**: Performance tracking (Targets vs Achievement).
3.  **By Customer**: Revenue contribution and Churn risk.
4.  **By Product**: Velocity and Profit Margin analysis.
5.  **By Category**: Category contribution.
6.  **By Region**: Geographic performance.
7.  **Returns Analysis**: Reasons and status tracking.
8.  **Profit Margin**: COGS vs Revenue efficiency.
9.  **Time Comparison**: Month-over-Month (MoM) and Year-over-Year (YoY).
10. **Target Achievement**: Quarterly progress bars.

**Critique**:
- **Pros**: Comprehensive coverage of operational metrics.
- **Cons**: Lack of data visualization (Charts), static tables without drill-down, limited export options.

### 2.2 Sales Settings
The legacy settings module was highly feature-rich, organized into 4 main pillars:
1.  **Price Lists**: Multi-currency, multi-tier pricing (Retail, Wholesale, VIP).
2.  **Discount Rules**: Automated engines for Quantity, Seasonal, and Payment-based discounts.
3.  **Commission Plans**: Sophisticated incentive structures (Fixed/Percentage + Bonuses).
4.  **Sales Targets**: Period-based quotas (Monthly/Quarterly) for agents.

**Critique**:
- **Pros**: Strong business logic for flexible pricing and incentives.
- **Cons**: UI was fragmented; data often hard-coded or strictly local state in some prototypes.

## 3. Current System Status (TexaCore)
- **Infrastructure**: Ready. We have `recharts` for visualization, `jspdf` for export, and `NexaDataTable` for advanced grids.
- **Database**:
    - `price_lists`: **Exists**.
    - `employee_commissions`: **Exists**.
    - `discount_rules`: **Missing** (Needs schema).
    - `sales_targets`: **Missing** (Needs schema).
- **Frontend**: Currently lacks dedicated `SalesReportsPage` and `SalesSettingsPage`.

## 4. Modernization Roadmap

### Phase 1: The "Intelligence" Layer (Reports)
Build a **Sales Analytics Hub** that supersedes the old tabular reports.
- **Visuals**: Use `Recharts` for:
    - Revenue Trends (Area Chart).
    - Category Distribution (Donut Chart).
    - Target Gauges (Radial Bar).
- **Interactivity**: Click-to-drill-down (e.g., Click 'Riyadh' on map -> Show Riyadh Customers).
- **Export**: Built-in PDF/Excel generation for management meetings.

### Phase 2: The "Control" Layer (Settings)
Implement a **Centralized Sales Configuration** module.
1.  **Pricing Engine**: UI for `price_lists` table (CRUD).
2.  **Commissions**: UI for `employee_commissions` and new `commission_plans` table.
3.  **Targets**: New Schema `sales_targets` linked to `users`.
4.  **General Preferences**: Store in `company_settings` JSONB (Invoice prefixes, Tax defaults, Stock rules).

## 5. Implementation Plan
1.  **Database Upgrade**:
    - Create `sales_targets` and `discount_rules` tables.
    - Add `sales_settings` column to `companies` or dedicated settings table.
2.  **Frontend**:
    - Scaffold `features/sales/pages/SalesReports.tsx`.
    - Scaffold `features/sales/pages/SalesSettings.tsx`.
3.  **Migration**:
    - Port logic from old `SalesReportsPage.tsx` but map to Recharts + Database.

---
*Authored by Antigravity - Feb 08, 2026*
