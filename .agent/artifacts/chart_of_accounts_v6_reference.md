# 📊 Chart of Accounts — V6 Reference

## الحالة: ✅ نظيف ومعتمد — 2026-03-11

---

## القوالب المعتمدة (2 فقط)

### 1. الشجرة القياسية (`simple`)
- **Function:** `create_simple_chart(p_company_id)` — V6
- **56 حساب** بترقيم 1-5
- العملة ديناميكية من `company_accounting_settings`
- مناسبة للشركات الصغيرة

### 2. الشجرة الموسعة (`extended`)
- **Function:** `create_extended_chart(p_company_id)` — V6
- **90 حساب** بترقيم 1-5
- تشمل: لوجستيك (212)، صرافة (2126)، شحن وجمركة (58)، متنوعة (59)
- مناسبة للشركات التجارية

## نقاط الدخول
- `apply_chart_template_to_company(company_id, 'simple'|'extended')` — V6
- `upgrade_company_chart(company_id)` — ترقية simple → extended
- `setup_chart_templates_for_tenant(tenant_id)` — إعداد القوالب

## العملة
- `base_currency` من `company_accounting_settings` = المحلية
- `default_international_purchase_currency` = الدولية
- حسابات 1112, 1122, 115, 2121, 2124, 581, 583 بالعملة الدولية

## ما حُذف (2026-03-11)
- Functions: `create_simple_chart_of_accounts`, `create_extended_chart_of_accounts`, `clone_chart_from_template`, `apply_coa_template`
- Tables: `coa_templates`, `coa_template_items`, `coa_template_cash_accounts`
- Records: `fabric_extended`, `fabric_extended_demo`

## التوثيق الكامل
→ `docs/chart_of_accounts_v6.md`
