# Sales Payments Schema Update (2026-02-08)

## Overview
To support the Sales Payments (Receipts) module, the `payment_vouchers` table schema was updated to include necessary columns for linking payments to customers and sales invoices.

## Changes Implemented
The executing script `FIX_PAYMENT_VOUCHERS_FOR_SALES.sql` ensured the following columns exist:

1.  **`customer_id`** (UUID): Foreign Key to `customers(id)`.
    - Purpose: Links the receipt to a specific customer.
    - Index: `idx_payment_vouchers_customer_id`.

2.  **`sales_invoice_id`** (UUID): Foreign Key to `sales_invoices(id)`.
    - Purpose: Links the receipt to a specific sales invoice (optional, for direct invoice payment).
    - Index: `idx_payment_vouchers_sales_invoice_id`.

3.  **`type`** (VARCHAR): Record type discriminator.
    - Values: `'payment'` (Outgoing), `'receipt'` (Incoming).
    - Default: `'payment'` (for backward compatibility).

4.  **`status`** (VARCHAR): Document status.
    - Values: `'draft'`, `'posted'`, `'cancelled'`.
    - Default: `'draft'`.

5.  **`payment_method`** (VARCHAR): Method of payment.
    - Values: `'cash'`, `'bank'`, `'check'`, `'transfer'`.
    - Default: `'cash'`.

## Frontend Integration
The `SalesPaymentsList.tsx` component now correctly queries `payment_vouchers` using:
- Filter: `customer_id IS NOT NULL` (to identify sales receipts).
- Columns: `voucher_number`, `voucher_date`, `payment_method`, `amount`, `status`.

## Notes
- The `UnifiedAccountingSheet` component handles the display/editing of these records via `docType='receipt'`. 
- Future enhancements may require a dedicated `ReceiptFormTab` component if the generic accounting form is insufficient.
