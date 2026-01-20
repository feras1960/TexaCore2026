# هيكلية جميع الجداول - Multi-Tenant SaaS
# All Tables Structure - Multi-Tenant SaaS

## ✅ تأكيد: جميع الجداول تدعم tenant_id + company_id

### 📋 القاعدة العامة:

**كل جدول يحتوي على:**
```sql
tenant_id UUID NOT NULL REFERENCES tenants(id)
company_id UUID NOT NULL REFERENCES companies(id)
```

---

## 📊 الجداول الأساسية

### 1. tenants
```sql
id, code, name, email, ...
-- لا يحتوي tenant_id (هو نفسه tenant)
```

### 2. companies
```sql
id, tenant_id, code, name, ...
-- يحتوي tenant_id فقط (هو نفسه company)
```

### 3. branches
```sql
id, tenant_id, company_id, code, name, ...
-- يحتوي tenant_id + company_id
```

---

## 📊 جداول المحاسبة

### 4. chart_of_accounts
```sql
id, tenant_id, company_id, account_code, ...
```

### 5. journal_entries
```sql
id, tenant_id, company_id, branch_id, entry_number, ...
```

### 6. journal_entry_lines
```sql
id, tenant_id, entry_id, account_id, ...
-- tenant_id من entry_id
```

### 7. fiscal_years
```sql
id, tenant_id, company_id, name, ...
```

### 8. accounting_periods
```sql
id, tenant_id, company_id, fiscal_year_id, ...
```

### 9. cost_centers
```sql
id, tenant_id, company_id, code, ...
```

### 10. cash_accounts
```sql
id, tenant_id, company_id, branch_id, code, ...
```

### 11. cash_transactions
```sql
id, tenant_id, company_id, branch_id, transaction_number, ...
```

### 12. tax_rates
```sql
id, tenant_id, company_id, code, ...
```

---

## 📊 جداول العملاء والموردين

### 13. customers
```sql
id, tenant_id, company_id, code, name_ar, ...
```

### 14. customer_addresses
```sql
id, tenant_id, customer_id, ...
-- tenant_id من customer_id
```

### 15. customer_contacts
```sql
id, tenant_id, customer_id, ...
-- tenant_id من customer_id
```

### 16. suppliers
```sql
id, tenant_id, company_id, code, name_ar, ...
```

### 17. supplier_contacts
```sql
id, tenant_id, supplier_id, ...
-- tenant_id من supplier_id
```

### 18. price_lists
```sql
id, tenant_id, company_id, code, ...
```

### 19. price_list_items
```sql
id, tenant_id, price_list_id, ...
-- tenant_id من price_list_id
```

---

## 📊 جداول المخزون والمنتجات

### 20. warehouses
```sql
id, tenant_id, company_id, branch_id, code, ...
```

### 21. warehouse_locations
```sql
id, tenant_id, warehouse_id, code, ...
-- tenant_id من warehouse_id
```

### 22. products
```sql
id, tenant_id, company_id, sku, name_ar, ...
```

### 23. product_variants
```sql
id, tenant_id, product_id, sku, ...
-- tenant_id من product_id
```

### 24. inventory_stock
```sql
id, tenant_id, company_id, product_id, warehouse_id, ...
```

### 25. inventory_movements
```sql
id, tenant_id, company_id, product_id, warehouse_id, ...
```

### 26. inventory_batches
```sql
id, tenant_id, company_id, product_id, warehouse_id, ...
```

### 27. inventory_serials
```sql
id, tenant_id, company_id, product_id, warehouse_id, ...
```

---

## 📊 جداول المبيعات والمشتريات

### 28. quotations
```sql
id, tenant_id, company_id, branch_id, quotation_number, ...
```

### 29. sales_orders
```sql
id, tenant_id, company_id, branch_id, order_number, ...
```

### 30. sales_invoices
```sql
id, tenant_id, company_id, branch_id, invoice_number, ...
```

### 31. sales_invoice_items
```sql
id, tenant_id, invoice_id, product_id, ...
-- tenant_id من invoice_id
```

### 32. purchase_orders
```sql
id, tenant_id, company_id, branch_id, order_number, ...
```

### 33. purchase_invoices
```sql
id, tenant_id, company_id, branch_id, invoice_number, ...
```

### 34. purchase_invoice_items
```sql
id, tenant_id, invoice_id, product_id, ...
-- tenant_id من invoice_id
```

### 35. payment_receipts
```sql
id, tenant_id, company_id, branch_id, receipt_number, ...
```

### 36. payment_receipt_allocations
```sql
id, tenant_id, receipt_id, invoice_id, ...
-- tenant_id من receipt_id
```

### 37. payment_vouchers
```sql
id, tenant_id, company_id, branch_id, voucher_number, ...
```

---

## 📊 جداول الأقمشة (اختياري)

### 38. fabric_materials
```sql
id, tenant_id, company_id, code, name_ar, ...
```

### 39. fabric_rolls
```sql
id, tenant_id, company_id, material_id, roll_number, ...
```

### 40. roll_movements
```sql
id, tenant_id, company_id, roll_id, ...
-- tenant_id من roll_id
```

---

## 📊 جداول الصرافة (اختياري)

### 41. exchange_rates
```sql
id, tenant_id, company_id, from_currency, to_currency, ...
```

### 42. exchange_transactions
```sql
id, tenant_id, company_id, branch_id, transaction_number, ...
```

### 43. remittances
```sql
id, tenant_id, company_id, branch_id, remittance_number, ...
```

---

## ✅ الخلاصة

### القاعدة:
- ✅ **كل جدول رئيسي** يحتوي على `tenant_id + company_id`
- ✅ **الجداول الفرعية** تحتوي على `tenant_id` (من الجدول الرئيسي)
- ✅ **العزل المزدوج** مضمون في جميع الجداول

### الاستعلامات:
```sql
-- دائماً استخدم:
WHERE tenant_id = ? AND company_id = ?

-- أو للجداول الفرعية:
WHERE tenant_id = ? AND parent_id = ?
```

---

## 🎯 مثال عملي

### مشترك جديد (Tenant 1) لديه شركتين:

```sql
-- Tenant
tenant_id: 'tenant-1'

-- Company A
company_id: 'comp-1', tenant_id: 'tenant-1'

-- Company B
company_id: 'comp-2', tenant_id: 'tenant-1'

-- Customers للشركة A
customers: tenant_id='tenant-1', company_id='comp-1'

-- Customers للشركة B
customers: tenant_id='tenant-1', company_id='comp-2'

-- Products للشركة A
products: tenant_id='tenant-1', company_id='comp-1'

-- Products للشركة B
products: tenant_id='tenant-1', company_id='comp-2'
```

**النتيجة:**
- ✅ Company A لا ترى بيانات Company B
- ✅ Tenant 1 لا يرى بيانات Tenant 2
- ✅ العزل مضمون تماماً

---

**جميع الجداول تدعم هذه الهيكلية! ✅**
