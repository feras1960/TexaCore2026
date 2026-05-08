/**
 * ════════════════════════════════════════════════════════════════
 * 🔄 DataPortalTab — تبويب استيراد وتصدير البيانات الموحد
 * ════════════════════════════════════════════════════════════════
 * Replaces ImportDataTab with a unified portal for:
 * - Import: RSF, TCDB, Excel/CSV (via UnifiedImportWizard)
 * - Export: .tcdb backup
 * - Cloud Backup: Google Drive sync
 * @module features/settings/components
 */

import React, { useState, useCallback } from 'react';
import {
  FileUp, FileDown, Cloud, ArrowUpDown,
  FileSpreadsheet, Database, Package, Users,
  TrendingUp, Plus, X as XIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';

const UnifiedImportWizard = React.lazy(() => import('@/features/import/wizard/UnifiedImportWizard'));

// Existing Excel import wizard
import { ImportWizard } from '@/features/import';

// ─── Sub-section type ────────────────────────────────────────
type Section = 'import' | 'export' | 'backup';

const SECTIONS = [
  { id: 'import' as Section, icon: FileUp, labelAr: 'استيراد', labelEn: 'Import', color: 'from-indigo-500 to-blue-600', descAr: 'RSF / TCDB / Excel', descEn: 'RSF / TCDB / Excel' },
  { id: 'export' as Section, icon: FileDown, labelAr: 'تصدير', labelEn: 'Export', color: 'from-emerald-500 to-green-600', descAr: '.tcdb نسخة احتياطية', descEn: '.tcdb Backup' },
  { id: 'backup' as Section, icon: Cloud, labelAr: 'نسخ سحابي', labelEn: 'Cloud Backup', color: 'from-sky-500 to-blue-600', descAr: 'Google Drive', descEn: 'Google Drive' },
];

const IMPORT_SOURCES = [
  { type: 'rsf', icon: '📋', labelAr: 'ملف الرشيد (.rsf)', labelEn: 'Al-Rashid File (.rsf)', descAr: 'استيراد كامل من برنامج الرشيد', descEn: 'Full import from Al-Rashid ERP', color: 'from-amber-500 to-orange-600' },
  { type: 'tcdb', icon: '💾', labelAr: 'ملف TexaCore (.tcdb)', labelEn: 'TexaCore Backup (.tcdb)', descAr: 'استيراد من النسخة المحلية', descEn: 'Import from local version', color: 'from-blue-500 to-indigo-600' },
  { type: 'excel', icon: '📄', labelAr: 'Excel / CSV', labelEn: 'Excel / CSV', descAr: 'قوالب جاهزة لكل نوع بيانات', descEn: 'Ready templates for each data type', color: 'from-green-500 to-emerald-600' },
];

const TEMPLATE_TYPES = [
  { type: 'customers', icon: Users, color: 'from-blue-500 to-blue-600', labelAr: 'العملاء', labelEn: 'Customers' },
  { type: 'suppliers', icon: Users, color: 'from-orange-500 to-orange-600', labelAr: 'الموردين', labelEn: 'Suppliers' },
  { type: 'products', icon: Package, color: 'from-green-500 to-green-600', labelAr: 'المنتجات', labelEn: 'Products' },
  { type: 'journal_entries', icon: FileSpreadsheet, color: 'from-indigo-500 to-indigo-600', labelAr: 'القيود', labelEn: 'Journal Entries' },
  { type: 'inventory_movements', icon: TrendingUp, color: 'from-teal-500 to-teal-600', labelAr: 'حركات المخزون', labelEn: 'Inventory Moves' },
];

export default function DataPortalTab() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [section, setSection] = useState<Section>('import');
  const [showWizard, setShowWizard] = useState(false);
  const [showExcelWizard, setShowExcelWizard] = useState(false);

  const handleDownloadTemplate = useCallback(async (entityType: string) => {
    try {
      const { downloadTemplate } = await import('@/features/import/templates/templateGenerator');
      downloadTemplate(entityType, (language || 'ar') as any);
    } catch (err) { console.error('Template download error:', err); }
  }, [language]);

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-indigo-500" />
            {isAr ? 'استيراد وتصدير البيانات' : 'Data Import & Export'}
          </h2>
          <p className="text-sm text-gray-500">
            {isAr ? 'استيراد من الرشيد أو TexaCore أو Excel — تصدير نسخة احتياطية' : 'Import from Rashid, TexaCore, or Excel — Export backups'}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${active ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
              <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-2 ${active ? 'shadow-lg' : ''}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-semibold text-sm">{isAr ? s.labelAr : s.labelEn}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{isAr ? s.descAr : s.descEn}</div>
            </button>
          );
        })}
      </div>

      {/* ─── Import Section ─────────────────────────────── */}
      {section === 'import' && (
        <div className="space-y-4">
          {/* Source Cards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileUp className="w-4 h-4 text-indigo-500" />
                {isAr ? 'مصادر الاستيراد' : 'Import Sources'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {IMPORT_SOURCES.map(src => (
                <div key={src.type} className="flex items-center gap-4 p-3 rounded-xl border bg-white dark:bg-slate-800/50 hover:shadow-sm transition-shadow">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${src.color} flex items-center justify-center text-xl shadow-lg flex-shrink-0`}>
                    {src.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{isAr ? src.labelAr : src.labelEn}</div>
                    <div className="text-[11px] text-gray-400">{isAr ? src.descAr : src.descEn}</div>
                  </div>
                  <Button size="sm" onClick={() => src.type === 'excel' ? setShowExcelWizard(true) : setShowWizard(true)}
                    className="gap-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                    {isAr ? 'استيراد' : 'Import'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Excel Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                {isAr ? 'قوالب Excel الجاهزة' : 'Excel Templates'}
                <Badge variant="outline" className="text-[10px] ms-auto">🇸🇦 🇬🇧 🇹🇷 🇷🇺 🇺🇦</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATE_TYPES.map(et => {
                const Icon = et.icon;
                return (
                  <div key={et.type} className="flex items-center gap-3 p-2 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${et.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="flex-1 text-sm font-medium">{isAr ? et.labelAr : et.labelEn}</span>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate(et.type)} className="text-xs gap-1 h-7">
                      <FileDown className="w-3 h-3" />
                      {isAr ? 'تحميل' : 'Download'}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Export Section ──────────────────────────────── */}
      {section === 'export' && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">{isAr ? 'تصدير نسخة احتياطية' : 'Export Backup'}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {isAr
                ? 'صدّر بياناتك كملف .tcdb مشفر يمكنك استخدامه مع النسخة المحلية أو الاحتفاظ به كنسخة احتياطية'
                : 'Export your data as an encrypted .tcdb file for use with the local version or as a backup'}
            </p>
            <Badge variant="outline" className="text-xs">🔐 AES-256-GCM {isAr ? 'تشفير متقدم' : 'Advanced Encryption'}</Badge>
            <div>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white gap-2 px-6" size="lg">
                <FileDown className="w-4 h-4" />
                {isAr ? 'تصدير .tcdb' : 'Export .tcdb'}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">{isAr ? 'قريباً — قيد التطوير' : 'Coming soon — Under development'}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Cloud Backup Section ───────────────────────── */}
      {section === 'backup' && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg">{isAr ? 'نسخ احتياطي سحابي' : 'Cloud Backup'}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {isAr
                ? 'ارفع نسخة احتياطية تلقائياً إلى Google Drive الخاص بك كل 5 دقائق'
                : 'Automatically upload a backup to your Google Drive every 5 minutes'}
            </p>
            <Badge variant="outline" className="text-xs">☁️ Google Drive {isAr ? 'مزامنة' : 'Sync'}</Badge>
            <p className="text-[11px] text-gray-400">{isAr ? 'قريباً — قيد التطوير' : 'Coming soon — Under development'}</p>
          </CardContent>
        </Card>
      )}

      {/* ─── Unified Import Wizard Dialog ───────────────── */}
      {showWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto relative">
            <React.Suspense fallback={<div className="p-20 text-center">جاري التحميل...</div>}>
              <UnifiedImportWizard onClose={() => setShowWizard(false)} onComplete={() => setShowWizard(false)} />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* ─── Excel Import Wizard Dialog ─────────────────── */}
      {showExcelWizard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] overflow-y-auto relative">
            <Button variant="ghost" size="icon" onClick={() => setShowExcelWizard(false)}
              className="absolute top-3 start-3 z-10 h-8 w-8 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600">
              <XIcon className="w-4 h-4" />
            </Button>
            <ImportWizard onClose={() => setShowExcelWizard(false)} onComplete={() => setShowExcelWizard(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
