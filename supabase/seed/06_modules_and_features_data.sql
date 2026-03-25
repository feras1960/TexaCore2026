-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Data: الميزات والموديولات والتبويبات
-- Modules Features & UI Tabs Default Data
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- الجزء 1: ميزات موديول المحاسبة (Accounting)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO module_features (module_code, feature_code, feature_name_ar, feature_name_en, description_ar, description_en, icon, category, display_order) VALUES
-- تقارير
('accounting', 'basic_reports', 'التقارير الأساسية', 'Basic Reports', 'تقارير الميزانية وقائمة الدخل الأساسية', 'Basic balance sheet and income statement', 'FileText', 'reporting', 1),
('accounting', 'advanced_reports', 'التقارير المتقدمة', 'Advanced Reports', 'تقارير مخصصة مع فلترة متقدمة', 'Custom reports with advanced filtering', 'BarChart3', 'reporting', 2),
('accounting', 'custom_reports', 'التقارير المخصصة', 'Custom Reports', 'إنشاء تقاريرك الخاصة', 'Build your own reports', 'FileBarChart', 'reporting', 3),
('accounting', 'scheduled_reports', 'التقارير المجدولة', 'Scheduled Reports', 'جدولة إرسال التقارير تلقائياً', 'Schedule automatic report delivery', 'Clock', 'reporting', 4),

-- العملات والتسعير
('accounting', 'multi_currency', 'العملات المتعددة', 'Multi-Currency', 'دعم العملات المتعددة', 'Support multiple currencies', 'DollarSign', 'general', 5),
('accounting', 'exchange_rates', 'أسعار الصرف التلقائية', 'Auto Exchange Rates', 'تحديث أسعار الصرف تلقائياً', 'Automatic exchange rate updates', 'RefreshCw', 'general', 6),

-- مراكز التكلفة والموازنات
('accounting', 'cost_centers', 'مراكز التكلفة', 'Cost Centers', 'إدارة مراكز التكلفة', 'Manage cost centers', 'Target', 'advanced', 7),
('accounting', 'budget_management', 'إدارة الموازنات', 'Budget Management', 'إنشاء ومتابعة الموازنات', 'Create and track budgets', 'PieChart', 'advanced', 8),
('accounting', 'budget_alerts', 'تنبيهات الموازنة', 'Budget Alerts', 'تنبيهات عند تجاوز الموازنة', 'Alerts when budget exceeded', 'Bell', 'advanced', 9),

-- الموافقات والتدقيق
('accounting', 'approval_workflow', 'سير الموافقات', 'Approval Workflow', 'موافقات متعددة المستويات', 'Multi-level approval workflows', 'CheckCircle', 'advanced', 10),
('accounting', 'audit_trail', 'سجل التدقيق المتقدم', 'Advanced Audit Trail', 'تتبع شامل لكل العمليات', 'Comprehensive operation tracking', 'Shield', 'advanced', 11),

-- الذكاء الاصطناعي
('accounting', 'ai_analysis', 'تحليلات الذكاء الاصطناعي', 'AI Analysis', 'تحليلات ذكية للبيانات المالية', 'Smart financial data analysis', 'Brain', 'ai', 12),
('accounting', 'ai_predictions', 'التنبؤات المالية', 'Financial Predictions', 'التنبؤ بالتدفقات النقدية', 'Cash flow predictions', 'TrendingUp', 'ai', 13),
('accounting', 'ai_recommendations', 'توصيات ذكية', 'Smart Recommendations', 'توصيات لتحسين الأداء المالي', 'Recommendations to improve performance', 'Lightbulb', 'ai', 14),

-- التصدير والتكامل
('accounting', 'export_excel', 'تصدير Excel', 'Export to Excel', 'تصدير التقارير لـ Excel', 'Export reports to Excel', 'FileSpreadsheet', 'integration', 15),
('accounting', 'export_pdf', 'تصدير PDF', 'Export to PDF', 'تصدير التقارير لـ PDF', 'Export reports to PDF', 'FileText', 'integration', 16),
('accounting', 'api_access', 'الوصول للـ API', 'API Access', 'ربط مع أنظمة خارجية', 'Integration with external systems', 'Plug', 'integration', 17),

-- المحاسبة المتقدمة
('accounting', 'consolidation', 'توحيد القوائم المالية', 'Financial Consolidation', 'توحيد قوائم الشركات المتعددة', 'Consolidate multiple companies', 'Layers', 'advanced', 18),
('accounting', 'tax_management', 'إدارة الضرائب', 'Tax Management', 'حساب وإدارة الضرائب', 'Calculate and manage taxes', 'Receipt', 'advanced', 19)

ON CONFLICT (module_code, feature_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 2: ميزات موديول المبيعات (Sales)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO module_features (module_code, feature_code, feature_name_ar, feature_name_en, description_ar, description_en, icon, category, display_order) VALUES
('sales', 'basic_invoicing', 'الفواتير الأساسية', 'Basic Invoicing', 'إنشاء فواتير بسيطة', 'Create simple invoices', 'FileText', 'general', 1),
('sales', 'recurring_invoices', 'الفواتير المتكررة', 'Recurring Invoices', 'فواتير تلقائية متكررة', 'Automatic recurring invoices', 'RefreshCw', 'general', 2),
('sales', 'quotes_management', 'إدارة عروض الأسعار', 'Quote Management', 'إنشاء وإدارة عروض الأسعار', 'Create and manage quotes', 'FileText', 'general', 3),
('sales', 'credit_notes', 'إشعارات الائتمان', 'Credit Notes', 'إنشاء إشعارات دائنة', 'Create credit notes', 'FileX', 'general', 4),
('sales', 'sales_analytics', 'تحليلات المبيعات', 'Sales Analytics', 'تقارير وتحليلات المبيعات', 'Sales reports and analytics', 'BarChart', 'reporting', 5),
('sales', 'customer_portal', 'بوابة العملاء', 'Customer Portal', 'بوابة للعملاء لعرض الفواتير', 'Customer portal for invoices', 'Users', 'advanced', 6),
('sales', 'payment_reminders', 'تذكيرات الدفع', 'Payment Reminders', 'تذكيرات تلقائية للدفع', 'Automatic payment reminders', 'Bell', 'advanced', 7),
('sales', 'discount_management', 'إدارة الخصومات', 'Discount Management', 'خصومات متقدمة', 'Advanced discount management', 'Percent', 'general', 8)

ON CONFLICT (module_code, feature_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 3: ميزات موديول المخزون (Inventory)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO module_features (module_code, feature_code, feature_name_ar, feature_name_en, description_ar, description_en, icon, category, display_order) VALUES
('inventory', 'basic_inventory', 'المخزون الأساسي', 'Basic Inventory', 'إدارة مخزون بسيطة', 'Simple inventory management', 'Package', 'general', 1),
('inventory', 'barcode_scanning', 'مسح الباركود', 'Barcode Scanning', 'مسح الباركود', 'Barcode scanning support', 'Barcode', 'general', 2),
('inventory', 'batch_tracking', 'تتبع الدفعات', 'Batch Tracking', 'تتبع دفعات المنتجات', 'Track product batches', 'Layers', 'advanced', 3),
('inventory', 'expiry_management', 'إدارة الصلاحية', 'Expiry Management', 'تتبع تواريخ الصلاحية', 'Track expiry dates', 'Calendar', 'advanced', 4),
('inventory', 'multiple_warehouses', 'مستودعات متعددة', 'Multiple Warehouses', 'إدارة مستودعات متعددة', 'Manage multiple warehouses', 'Building', 'advanced', 5),
('inventory', 'auto_reorder', 'إعادة الطلب التلقائي', 'Auto Reorder', 'إعادة طلب تلقائية', 'Automatic reorder points', 'RefreshCw', 'advanced', 6),
('inventory', 'inventory_valuation', 'تقييم المخزون', 'Inventory Valuation', 'طرق تقييم متعددة', 'Multiple valuation methods', 'DollarSign', 'advanced', 7),
('inventory', 'stock_alerts', 'تنبيهات المخزون', 'Stock Alerts', 'تنبيهات للمخزون المنخفض', 'Low stock alerts', 'Bell', 'general', 8)

ON CONFLICT (module_code, feature_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 4: ميزات موديول الأقمشة (Fabric)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO module_features (module_code, feature_code, feature_name_ar, feature_name_en, description_ar, description_en, icon, category, display_order) VALUES
('fabric', 'fabric_rolls', 'إدارة اللفات', 'Roll Management', 'إدارة لفات الأقمشة', 'Manage fabric rolls', 'Package', 'general', 1),
('fabric', 'color_management', 'إدارة الألوان', 'Color Management', 'نظام إدارة الألوان', 'Color management system', 'Palette', 'general', 2),
('fabric', 'quality_control', 'مراقبة الجودة', 'Quality Control', 'فحص جودة الأقمشة', 'Fabric quality inspection', 'CheckCircle', 'advanced', 3),
('fabric', 'cutting_optimization', 'تحسين القص', 'Cutting Optimization', 'تحسين استخدام القماش', 'Optimize fabric usage', 'Scissors', 'advanced', 4),
('fabric', 'wastage_tracking', 'تتبع الهدر', 'Wastage Tracking', 'تتبع هدر الأقمشة', 'Track fabric wastage', 'AlertTriangle', 'advanced', 5)

ON CONFLICT (module_code, feature_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 5: ربط الميزات بالباقات
-- ═══════════════════════════════════════════════════════════════

-- الحصول على IDs الباقات
DO $$
DECLARE
    v_starter_id UUID;
    v_professional_id UUID;
    v_enterprise_id UUID;
BEGIN
    -- الحصول على IDs
    SELECT id INTO v_starter_id FROM subscription_plans WHERE code = 'starter' LIMIT 1;
    SELECT id INTO v_professional_id FROM subscription_plans WHERE code = 'professional' LIMIT 1;
    SELECT id INTO v_enterprise_id FROM subscription_plans WHERE code = 'enterprise' LIMIT 1;
    
    IF v_starter_id IS NULL OR v_professional_id IS NULL OR v_enterprise_id IS NULL THEN
        RAISE NOTICE '⚠️  الباقات غير موجودة - سيتم تخطي ربط الميزات';
        RETURN;
    END IF;
    
    -- ═══ Starter Plan ═══
    -- المحاسبة الأساسية
    INSERT INTO plan_module_features (plan_id, module_code, feature_code, is_enabled) VALUES
    (v_starter_id, 'accounting', 'basic_reports', true),
    (v_starter_id, 'accounting', 'export_pdf', true),
    
    -- المبيعات الأساسية
    (v_starter_id, 'sales', 'basic_invoicing', true),
    (v_starter_id, 'sales', 'quotes_management', true),
    
    -- المخزون الأساسي
    (v_starter_id, 'inventory', 'basic_inventory', true),
    (v_starter_id, 'inventory', 'stock_alerts', true)
    
    ON CONFLICT (plan_id, module_code, feature_code) DO NOTHING;
    
    -- ═══ Professional Plan ═══
    -- كل ميزات Starter + ميزات إضافية
    INSERT INTO plan_module_features (plan_id, module_code, feature_code, is_enabled) VALUES
    -- المحاسبة
    (v_professional_id, 'accounting', 'basic_reports', true),
    (v_professional_id, 'accounting', 'advanced_reports', true),
    (v_professional_id, 'accounting', 'multi_currency', true),
    (v_professional_id, 'accounting', 'exchange_rates', true),
    (v_professional_id, 'accounting', 'cost_centers', true),
    (v_professional_id, 'accounting', 'budget_management', true),
    (v_professional_id, 'accounting', 'export_excel', true),
    (v_professional_id, 'accounting', 'export_pdf', true),
    (v_professional_id, 'accounting', 'audit_trail', true),
    
    -- المبيعات
    (v_professional_id, 'sales', 'basic_invoicing', true),
    (v_professional_id, 'sales', 'recurring_invoices', true),
    (v_professional_id, 'sales', 'quotes_management', true),
    (v_professional_id, 'sales', 'credit_notes', true),
    (v_professional_id, 'sales', 'sales_analytics', true),
    (v_professional_id, 'sales', 'payment_reminders', true),
    (v_professional_id, 'sales', 'discount_management', true),
    
    -- المخزون
    (v_professional_id, 'inventory', 'basic_inventory', true),
    (v_professional_id, 'inventory', 'barcode_scanning', true),
    (v_professional_id, 'inventory', 'batch_tracking', true),
    (v_professional_id, 'inventory', 'expiry_management', true),
    (v_professional_id, 'inventory', 'stock_alerts', true),
    (v_professional_id, 'inventory', 'inventory_valuation', true),
    
    -- الأقمشة
    (v_professional_id, 'fabric', 'fabric_rolls', true),
    (v_professional_id, 'fabric', 'color_management', true)
    
    ON CONFLICT (plan_id, module_code, feature_code) DO NOTHING;
    
    -- ═══ Enterprise Plan ═══
    -- كل الميزات
    INSERT INTO plan_module_features (plan_id, module_code, feature_code, is_enabled)
    SELECT v_enterprise_id, module_code, feature_code, true
    FROM module_features
    WHERE is_active = true
    ON CONFLICT (plan_id, module_code, feature_code) DO NOTHING;
    
    RAISE NOTICE '✅ تم ربط الميزات بالباقات بنجاح';
END $$;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 6: تعريف التبويبات (UI Tabs)
-- ═══════════════════════════════════════════════════════════════

-- تبويبات صفحة تفاصيل الفاتورة (Invoice Details)
INSERT INTO ui_tabs (tab_code, module_code, section_code, tab_name_ar, tab_name_en, icon, display_order, required_feature_code, min_plan_level, is_core) VALUES
('invoice_overview', 'sales', 'invoice_details', 'نظرة عامة', 'Overview', 'FileText', 1, NULL, NULL, true),
('invoice_items', 'sales', 'invoice_details', 'البنود', 'Items', 'List', 2, NULL, NULL, true),
('invoice_payments', 'sales', 'invoice_details', 'المدفوعات', 'Payments', 'DollarSign', 3, NULL, NULL, true),
('invoice_ledger', 'accounting', 'invoice_details', 'دفتر الأستاذ', 'Ledger', 'Book', 4, 'advanced_reports', 'professional', false),
('invoice_ai_analysis', 'accounting', 'invoice_details', 'تحليل ذكي', 'AI Analysis', 'Brain', 5, 'ai_analysis', 'enterprise', false),
('invoice_documents', 'sales', 'invoice_details', 'المستندات', 'Documents', 'Paperclip', 6, NULL, NULL, false),
('invoice_activity', 'sales', 'invoice_details', 'النشاط', 'Activity', 'Activity', 7, NULL, NULL, false)

ON CONFLICT (tab_code) DO NOTHING;

-- تبويبات صفحة تفاصيل الحساب (Account Details)
INSERT INTO ui_tabs (tab_code, module_code, section_code, tab_name_ar, tab_name_en, icon, display_order, required_feature_code, min_plan_level, is_core) VALUES
('account_overview', 'accounting', 'account_details', 'نظرة عامة', 'Overview', 'Info', 1, NULL, NULL, true),
('account_ledger', 'accounting', 'account_details', 'كشف الحساب', 'Ledger', 'List', 2, NULL, NULL, true),
('account_balance', 'accounting', 'account_details', 'الأرصدة', 'Balances', 'DollarSign', 3, NULL, NULL, true),
('account_analytics', 'accounting', 'account_details', 'التحليلات', 'Analytics', 'BarChart', 4, 'advanced_reports', 'professional', false),
('account_budget', 'accounting', 'account_details', 'الموازنة', 'Budget', 'Target', 5, 'budget_management', 'professional', false),
('account_forecast', 'accounting', 'account_details', 'التنبؤات', 'Forecast', 'TrendingUp', 6, 'ai_predictions', 'enterprise', false)

ON CONFLICT (tab_code) DO NOTHING;

-- تبويبات صفحة تفاصيل العميل (Customer Details)
INSERT INTO ui_tabs (tab_code, module_code, section_code, tab_name_ar, tab_name_en, icon, display_order, required_feature_code, min_plan_level, is_core) VALUES
('customer_overview', 'sales', 'customer_details', 'نظرة عامة', 'Overview', 'User', 1, NULL, NULL, true),
('customer_invoices', 'sales', 'customer_details', 'الفواتير', 'Invoices', 'FileText', 2, NULL, NULL, true),
('customer_payments', 'sales', 'customer_details', 'المدفوعات', 'Payments', 'DollarSign', 3, NULL, NULL, true),
('customer_ledger', 'accounting', 'customer_details', 'كشف الحساب', 'Ledger', 'Book', 4, NULL, 'starter', false),
('customer_analytics', 'sales', 'customer_details', 'التحليلات', 'Analytics', 'BarChart', 5, 'sales_analytics', 'professional', false),
('customer_documents', 'sales', 'customer_details', 'المستندات', 'Documents', 'Paperclip', 6, NULL, NULL, false),
('customer_activity', 'sales', 'customer_details', 'النشاط', 'Activity', 'Activity', 7, NULL, NULL, false),
('customer_notes', 'sales', 'customer_details', 'الملاحظات', 'Notes', 'StickyNote', 8, NULL, NULL, false)

ON CONFLICT (tab_code) DO NOTHING;

-- تبويبات صفحة تفاصيل المنتج (Product Details)
INSERT INTO ui_tabs (tab_code, module_code, section_code, tab_name_ar, tab_name_en, icon, display_order, required_feature_code, min_plan_level, is_core) VALUES
('product_overview', 'inventory', 'product_details', 'نظرة عامة', 'Overview', 'Package', 1, NULL, NULL, true),
('product_stock', 'inventory', 'product_details', 'المخزون', 'Stock', 'Boxes', 2, NULL, NULL, true),
('product_transactions', 'inventory', 'product_details', 'الحركات', 'Transactions', 'ArrowLeftRight', 3, NULL, NULL, true),
('product_batches', 'inventory', 'product_details', 'الدفعات', 'Batches', 'Layers', 4, 'batch_tracking', 'professional', false),
('product_warehouses', 'inventory', 'product_details', 'المستودعات', 'Warehouses', 'Building', 5, 'multiple_warehouses', 'enterprise', false),
('product_analytics', 'inventory', 'product_details', 'التحليلات', 'Analytics', 'BarChart', 6, 'advanced_reports', 'professional', false)

ON CONFLICT (tab_code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- الجزء 7: التحقق النهائي
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_features_count INT;
    v_plan_features_count INT;
    v_tabs_count INT;
BEGIN
    SELECT COUNT(*) INTO v_features_count FROM module_features;
    SELECT COUNT(*) INTO v_plan_features_count FROM plan_module_features;
    SELECT COUNT(*) INTO v_tabs_count FROM ui_tabs;
    
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 إحصائيات البيانات المُدرجة:';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ الميزات (module_features): %', v_features_count;
    RAISE NOTICE '✅ ربط الميزات بالباقات (plan_module_features): %', v_plan_features_count;
    RAISE NOTICE '✅ التبويبات (ui_tabs): %', v_tabs_count;
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل إدراج البيانات الافتراضية';
    RAISE NOTICE '══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ✅ تم إدراج البيانات الافتراضية للميزات والتبويبات
-- ✅ Default Features & Tabs Data Inserted
