/**
 * Sheets Preview Page
 * صفحة استعراض الشيتات
 * 
 * استخدم هذه الصفحة لاستعراض جميع variants من UniversalDetailSheet
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UniversalDetailSheet,
  UniversalDetailSheetWithUnderlineTabs,
  UniversalDetailSheetPreview,
} from '@/components/sheets';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import { Building2, Users, CreditCard, Package, Layers, Plus } from 'lucide-react';
import { DevLabNav } from '@/features/componentLab/DevLabNav';

export default function SheetsPreview() {
  const { t, direction } = useLanguage();

  // State for each variant
  const [variant1Open, setVariant1Open] = useState(false);
  const [variant2Open, setVariant2Open] = useState(false);
  const [variant3Open, setVariant3Open] = useState(false);
  // Material sheets
  const [materialViewOpen, setMaterialViewOpen] = useState(false);
  const [materialCreateOpen, setMaterialCreateOpen] = useState(false);

  // Mock data
  const mockTenant = {
    id: '1',
    code: 'T-CE6CA1948F',
    name: 'مودا تكس',
    email: 'modatexpt@gmail.com',
    phone: '+966 50 123 4567',
    status: 'active',
    plan_id: 'professional',
    plan_name: 'Professional',
    subscription_start: '2021-01-25',
    subscription_end: '2027-01-25',
    currency: 'SAR',
    balance: 0,
    users_count: 0,
    companies_count: 1,
    storage_used_mb: 250,
    storage_limit_mb: 10240,
    created_at: '2021-01-25',
    updated_at: '2026-01-27',
  };

  const mockAgent = {
    id: '2',
    code: 'AGT-001',
    name: 'Tech Solutions Co.',
    email: 'agent@techsolutions.com',
    phone: '+966 50 987 6543',
    tier: 'gold',
    status: 'active',
    commission_percent: 20,
    current_balance: 50000,
    pending_balance: 5000,
    total_earned: 150000,
    total_withdrawn: 100000,
    currency: 'SAR',
    created_at: '2024-01-01',
    updated_at: '2026-01-27',
  };

  const mockPayment = {
    id: '3',
    code: 'PAY-001',
    tenant_id: '1',
    tenant_name: 'مودا تكس',
    amount: 999,
    currency: 'SAR',
    status: 'completed',
    payment_method: 'credit_card',
    payment_date: '2026-01-27',
    invoice_id: 'INV-001',
    created_at: '2026-01-27',
    updated_at: '2026-01-27',
  };

  const mockPlan = {
    id: 'professional',
    code: 'professional',
    name: 'Professional',
    name_ar: 'احترافي',
    description: 'For growing businesses',
    description_ar: 'للشركات النامية',
    price_monthly: 999,
    price_yearly: 9990,
    currency: 'SAR',
    max_users: 50,
    max_companies: 10,
    max_storage_gb: 100,
    is_active: true,
    is_popular: true,
    trial_days: 14,
    features: ['Advanced Reports', 'API Access', 'Priority Support'],
    modules: ['accounting', 'inventory', 'hr', 'crm'],
    created_at: '2024-01-01',
    updated_at: '2026-01-27',
  };

  // Mock Material Data
  const mockMaterial = {
    id: 'mat-001',
    code: 'FAB-001',
    name_ar: 'قماش قطني ناعم',
    name_en: 'Soft Cotton Fabric',
    category: 'cotton',
    unit: 'meter',
    composition: '60% قطن، 40% بوليستر',
    weight_per_meter: 180,
    default_width: 150,
    shrinkage_percent: 2.5,
    status: 'active',
    is_active: true,
    purchase_price: 15.50,
    selling_price: 25.00,
    wholesale_price: 22.00,
    currency: 'USD',
    total_stock: 1250.5,
    available_stock: 1100.0,
    reserved_stock: 150.5,
    rolls_count: 25,
    average_price: 16.25,
    min_stock: 100,
    reorder_point: 200,
    origin_country: 'TR',
    images: [
      { id: '1', url: 'https://placehold.co/400x400/4F46E5/FFFFFF?text=Fabric+1', is_primary: true },
      { id: '2', url: 'https://placehold.co/400x400/10B981/FFFFFF?text=Fabric+2', is_primary: false },
    ],
    created_at: '2024-01-15',
    updated_at: '2026-02-05',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8" dir={direction}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 font-cairo">
            🎨 {direction === 'rtl' ? 'استعراض الشيتات' : 'Sheets Preview'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-tajawal">
            {direction === 'rtl'
              ? 'استعرض جميع أنواع الشيتات واختر المناسب لك'
              : 'Preview all sheet variants and choose the right one'}
          </p>
        </div>
      </div>

      {/* ─── Lab Sub-Navigation ─── */}
      <div className="max-w-7xl mx-auto mb-4">
        <DevLabNav currentLabId="sheets-preview" />
      </div>

      {/* Grid of Variants */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Variant 1: UniversalDetailSheet (Default) */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 text-white rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">UniversalDetailSheet</h3>
                <Badge variant="outline" className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {direction === 'rtl' ? 'الافتراضي' : 'Default'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• الشيت الأساسي مع tabs عادية (pills style)'
                  : '• Default sheet with standard tabs (pills style)'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• يدعم nested sheets'
                  : '• Supports nested sheets'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• Stats cards في الأعلى'
                  : '• Stats cards at the top'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• يعمل بنظام Config'
                  : '• Config-based system'}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setVariant1Open(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🔍 {direction === 'rtl' ? 'استعراض Tenant' : 'Preview Tenant'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
              src/components/sheets/universal/UniversalDetailSheet.tsx
            </div>
          </CardContent>
        </Card>

        {/* Variant 2: UniversalDetailSheetWithUnderlineTabs */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 text-white rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">WithUnderlineTabs</h3>
                <Badge variant="outline" className="mt-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  {direction === 'rtl' ? 'خطوط تحتية' : 'Underline Style'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• tabs بخط تحتي (underline style)'
                  : '• Tabs with underline style'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• نفس الميزات + تصميم مختلف'
                  : '• Same features + different design'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• أكثر أناقة وحداثة'
                  : '• More elegant and modern'}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setVariant2Open(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                🔍 {direction === 'rtl' ? 'استعراض Agent' : 'Preview Agent'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
              src/components/sheets/universal/UniversalDetailSheet.tsx (variant)
            </div>
          </CardContent>
        </Card>

        {/* Variant 3: UniversalDetailSheetPreview */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-green-200 dark:border-green-800">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-green-500 text-white rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">Preview Mode</h3>
                <Badge variant="outline" className="mt-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {direction === 'rtl' ? 'معاينة مبسطة' : 'Simplified'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• وضع معاينة سريع'
                  : '• Quick preview mode'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• بدون tabs (معلومات أساسية فقط)'
                  : '• No tabs (basic info only)'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• مثالي للمعاينة السريعة'
                  : '• Perfect for quick previews'}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setVariant3Open(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                🔍 {direction === 'rtl' ? 'استعراض Payment' : 'Preview Payment'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
              src/components/sheets/universal/UniversalDetailSheet.tsx (preview)
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 text-white rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">
                  {direction === 'rtl' ? 'معلومات إضافية' : 'Additional Info'}
                </h3>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  {direction === 'rtl' ? '📌 الموصى به' : '📌 Recommended'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {direction === 'rtl'
                    ? 'استخدم UniversalDetailSheet (الافتراضي) في معظم الحالات'
                    : 'Use UniversalDetailSheet (default) for most cases'}
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
                  {direction === 'rtl' ? '🎨 للتصميم الحديث' : '🎨 For Modern Design'}
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  {direction === 'rtl'
                    ? 'استخدم WithUnderlineTabs للمظهر الأنيق'
                    : 'Use WithUnderlineTabs for elegant look'}
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
                  {direction === 'rtl' ? '⚡ للمعاينة السريعة' : '⚡ For Quick Preview'}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  {direction === 'rtl'
                    ? 'استخدم Preview Mode لعرض البيانات بسرعة'
                    : 'Use Preview Mode for quick data display'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material View Card */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-teal-200 dark:border-teal-800">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-teal-500 text-white rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">Material View Sheet</h3>
                <Badge variant="outline" className="mt-1 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                  {direction === 'rtl' ? 'عرض المادة' : 'View Mode'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• عرض تفاصيل المادة (نظرة عامة، صور، رولونات)'
                  : '• View material details (overview, images, rolls)'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• المخزون والحركات مع NexaDataTable'
                  : '• Inventory and movements with NexaDataTable'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• الأسعار والإحصائيات'
                  : '• Pricing and statistics'}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setMaterialViewOpen(true)}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                🔍 {direction === 'rtl' ? 'استعراض المادة' : 'Preview Material'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
              src/features/accounting/components/unified/UnifiedAccountingSheet.tsx
            </div>
          </CardContent>
        </Card>

        {/* Material Create Card */}
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500 text-white rounded-xl">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-cairo">Material Create Sheet</h3>
                <Badge variant="outline" className="mt-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {direction === 'rtl' ? 'إضافة مادة' : 'Create Mode'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• إدخال المعلومات الأساسية والمواصفات'
                  : '• Enter basic info and specifications'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• إضافة المتغيرات (الألوان والرسمات)'
                  : '• Add variants (colors and patterns)'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-tajawal">
                {direction === 'rtl'
                  ? '• تحميل الصور وتحديد الأسعار'
                  : '• Upload images and set prices'}
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={() => setMaterialCreateOpen(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                ➕ {direction === 'rtl' ? 'إنشاء مادة جديدة' : 'Create New Material'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
              src/features/accounting/components/unified/UnifiedAccountingSheet.tsx (create mode)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sheets */}
      <UniversalDetailSheet
        isOpen={variant1Open}
        onClose={() => setVariant1Open(false)}
        docType="tenant"
        data={mockTenant}
        styleVariant="classic"
      />

      <UniversalDetailSheet
        isOpen={variant2Open}
        onClose={() => setVariant2Open(false)}
        docType="agent"
        data={mockAgent}
        styleVariant="swiss"
      />

      {variant3Open && (
        <UniversalDetailSheetPreview
          docType="payment"
          data={mockPayment}
          onClose={() => setVariant3Open(false)}
        />
      )}

      {/* Material View Sheet */}
      <UnifiedAccountingSheet
        isOpen={materialViewOpen}
        onClose={() => setMaterialViewOpen(false)}
        docType="material"
        documentId="mat-001"
        data={mockMaterial}
        mode="view"
      />

      {/* Material Create Sheet */}
      <UnifiedAccountingSheet
        isOpen={materialCreateOpen}
        onClose={() => setMaterialCreateOpen(false)}
        docType="material"
        mode="create"
        onSave={async (newData) => {
          console.log('New material data:', newData);
          setMaterialCreateOpen(false);
        }}
      />
    </div>
  );
}
