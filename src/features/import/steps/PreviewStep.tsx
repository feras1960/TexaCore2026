/**
 * Preview Step - خطوة معاينة البيانات قبل الاستيراد
 * مع إمكانية تعديل العملة والكمية والوحدة والمبلغ
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/hooks';
import { useCompanyCurrencies, currencyMetadata } from '@/hooks/useCompanyCurrencies';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CheckCircle,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  BookOpen,
  Coins,
  Pencil,
  TreePine,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Package,
  Sparkles
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';

interface PreviewStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  entityType: string | null;
  options: ImportOptions;
  onExecute: (overrideCurrency?: string) => void;
  onUpdateRows?: (rows: ImportRow[]) => void;
  isLoading: boolean;
}

export function PreviewStep({
  importJob,
  importRows,
  entityDefinition,
  entityType,
  options,
  onExecute,
  onUpdateRows,
  isLoading
}: PreviewStepProps) {
  const { t, language } = useLanguage();
  const { supportedCurrencies, baseCurrency } = useCompanyCurrencies();
  const { companyId } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [inventoryAccount, setInventoryAccount] = useState({ code: '', name: '' });
  const [showTree, setShowTree] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const pageSize = 15;

  // Fetch real inventory account from accounting settings
  useEffect(() => {
    if (!companyId || entityType !== 'products') return;
    (async () => {
      const { data: company } = await supabase
        .from('companies')
        .select('accounting_settings')
        .eq('id', companyId)
        .single();
      const accId = (company?.accounting_settings as any)?.default_accounts?.inventory_account_id;
      if (accId) {
        const { data: acc } = await supabase
          .from('chart_of_accounts')
          .select('account_code, name_ar, name_en')
          .eq('id', accId)
          .maybeSingle();
        if (acc) {
          setInventoryAccount({
            code: acc.account_code,
            name: language === 'ar' ? (acc.name_ar || acc.name_en) : (acc.name_en || acc.name_ar),
          });
          return;
        }
      }
      // Fallback
      setInventoryAccount({ code: '1141', name: language === 'ar' ? 'بضاعة جاهزة' : 'Inventory' });
    })();
  }, [companyId, entityType, language]);

  // Is this an entity that needs currency?
  const needsCurrency = entityType === 'customers' || entityType === 'suppliers' || entityType === 'products';

  if (!importJob || !entityDefinition) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
        <h3 className="text-lg font-semibold">
          {language === 'ar' ? 'لا توجد بيانات للمعاينة' : 'No data to preview'}
        </h3>
      </div>
    );
  }

  // Check if ALL rows have currency
  const hasCurrencyInData = useMemo(() => {
    const validRows = importRows.filter(r => r.status === 'valid');
    return validRows.length > 0 && validRows.every(r => r.mapped_data?.currency);
  }, [importRows]);

  const currencyResolved = !needsCurrency || hasCurrencyInData || !!defaultCurrency;

  const rowsToImport = options.skip_invalid_rows
    ? importRows.filter(r => r.status === 'valid')
    : importRows;

  const paginatedRows = rowsToImport.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const totalPages = Math.ceil(rowsToImport.length / pageSize);
  const displayFields = entityDefinition.fields.slice(0, 5);

  // Currency display helper
  const getCurrencyLabel = (code: string) => {
    const meta = currencyMetadata[code];
    if (meta) return `${code} - ${language === 'ar' ? meta.nameAr : meta.name}`;
    return code;
  };

  // Apply default currency to all rows (FORCE overwrite)
  const handleCurrencyChange = (currency: string) => {
    setDefaultCurrency(currency);
    if (onUpdateRows) {
      const updatedRows = importRows.map(row => ({
        ...row,
        mapped_data: {
          ...row.mapped_data,
          currency: currency, // Force-write: user's selection overrides everything
        }
      }));
      onUpdateRows(updatedRows);
    }
  };

  // Update single row field
  const updateRowField = useCallback((rowIndex: number, field: string, value: unknown) => {
    if (!onUpdateRows) return;
    const updated = importRows.map((row, i) => {
      if (i !== rowIndex) return row;
      return {
        ...row,
        mapped_data: { ...row.mapped_data, [field]: value }
      };
    });
    onUpdateRows(updated);
  }, [importRows, onUpdateRows]);

  // Editable fields per entity type
  const editableFields = useMemo(() => {
    if (entityType === 'customers' || entityType === 'suppliers') {
      return ['currency', 'opening_balance'];
    }
    if (entityType === 'products') {
      return ['currency', 'unit', 'opening_qty', 'cost_price', 'sale_price'];
    }
    return [];
  }, [entityType]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t('import.readyToImport')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('import.reviewAndConfirm')}</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {rowsToImport.length}
                </Badge>
                <span className="text-sm">{t('import.recordsToImport')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {language === 'ar' ? entityDefinition.display_name_ar : entityDefinition.display_name_en}
                </Badge>
                <span className="text-sm">{t('import.entityType')}</span>
              </div>
            </div>
          </div>

          {/* Edit Mode Toggle */}
          {needsCurrency && editableFields.length > 0 && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              {editMode
                ? (language === 'ar' ? 'إنهاء التعديل' : 'Done Editing')
                : (language === 'ar' ? 'تعديل البيانات' : 'Edit Data')}
            </Button>
          )}
        </div>
      </Card>

      {/* ─── Tree Preview for Products ─── */}
      {entityType === 'products' && (() => {
        // Design names map for code-based detection
        const designNamesMap: Record<string, string> = {
          'PL': language === 'ar' ? 'سادة' : 'Plain',
          'ST': language === 'ar' ? 'مقلم' : 'Striped',
          'FL': language === 'ar' ? 'مورد' : 'Floral',
          'CH': language === 'ar' ? 'مربعات' : 'Checkered',
          'EM': language === 'ar' ? 'مطرز' : 'Embroidered',
          'JQ': language === 'ar' ? 'جاكار' : 'Jacquard',
          'PR': language === 'ar' ? 'مطبوع' : 'Printed',
          'TW': language === 'ar' ? 'تويل' : 'Twill',
        };

        // Color names map for code-based detection
        const colorNamesMap: Record<string, string> = {
          'WH': language === 'ar' ? 'أبيض' : 'White',
          'BK': language === 'ar' ? 'أسود' : 'Black',
          'NV': language === 'ar' ? 'كحلي' : 'Navy',
          'RD': language === 'ar' ? 'أحمر' : 'Red',
          'GD': language === 'ar' ? 'ذهبي' : 'Gold',
          'BG': language === 'ar' ? 'بيج' : 'Beige',
          'BL': language === 'ar' ? 'أزرق' : 'Blue',
          'GR': language === 'ar' ? 'أخضر' : 'Green',
          'BR': language === 'ar' ? 'بني' : 'Brown',
          'GY': language === 'ar' ? 'رمادي' : 'Gray',
          'PK': language === 'ar' ? 'وردي' : 'Pink',
        };

        // ─── Smart multi-language name parsing ───
        // Detect design and color from names in ANY language (AR, EN, TR, RU, UK)
        const designWords: Record<string, string[]> = {
          ar: ['سادة', 'مقلم', 'مورد', 'مربعات', 'مطرز', 'جاكار', 'مطبوع', 'تويل', 'منقوش'],
          en: ['plain', 'striped', 'floral', 'checkered', 'embroidered', 'jacquard', 'printed', 'twill', 'dotted'],
          tr: ['düz', 'çizgili', 'çiçekli', 'ekose', 'işlemeli', 'jakar', 'baskılı'],
          ru: ['гладкий', 'полосатый', 'цветочный', 'клетчатый', 'вышитый', 'жаккардовый', 'печатный'],
          uk: ['гладкий', 'смугастий', 'квітковий', 'картатий', 'вишитий', 'жакардовий', 'друкований'],
        };
        const colorWords: Record<string, string[]> = {
          ar: ['أبيض', 'أسود', 'كحلي', 'أحمر', 'ذهبي', 'بيج', 'أزرق', 'أخضر', 'بني', 'رمادي', 'وردي'],
          en: ['white', 'black', 'navy', 'red', 'gold', 'beige', 'blue', 'green', 'brown', 'gray', 'pink'],
          tr: ['beyaz', 'siyah', 'lacivert', 'kırmızı', 'altın', 'bej', 'mavi', 'yeşil', 'kahverengi', 'gri', 'pembe'],
          ru: ['белый', 'чёрный', 'тёмно-синий', 'красный', 'золотой', 'бежевый', 'синий', 'зелёный', 'коричневый', 'серый', 'розовый'],
          uk: ['білий', 'чорний', 'темно-синій', 'червоний', 'золотий', 'бежевий', 'синій', 'зелений', 'коричневий', 'сірий', 'рожевий'],
        };

        // Extract design & color from ALL available name fields
        const extractFromNames = (data: Record<string, unknown>) => {
          // Gather all name fields into one search text
          const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
          const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).filter(Boolean);
          const searchText = allNames.join(' ');
          if (!searchText) return { design: '', color: '' };

          let design = '';
          let color = '';

          // Search across ALL languages
          for (const lang of Object.keys(designWords)) {
            if (design) break;
            for (const w of designWords[lang]) {
              if (searchText.includes(w.toLowerCase())) { design = w; break; }
            }
          }
          for (const lang of Object.keys(colorWords)) {
            if (color) break;
            for (const w of colorWords[lang]) {
              if (searchText.includes(w.toLowerCase())) { color = w; break; }
            }
          }

          return { design, color };
        };

        type TreeMaterial = { name: string; code: string; qty: number; value: number; variant?: string };
        type TreeDesign = { name: string; code: string; materials: TreeMaterial[]; isVariantParent?: boolean };
        type TreeCategory = { name: string; designs: TreeDesign[] };

        // Grouping mode options
        type GroupMode = 'category' | 'design' | 'color';
        const groupModeLabels: Record<GroupMode, string> = {
          category: language === 'ar' ? '📂 حسب الفئة (افتراضي)' : '📂 By Category (default)',
          design: language === 'ar' ? '🎨 حسب التصميم (متغيرات اللون)' : '🎨 By Design (Color variants)',
          color: language === 'ar' ? '🌈 حسب اللون (متغيرات التصميم)' : '🌈 By Color (Design variants)',
        };

        // Parse all rows to extract design/color info
        const parsedRows = importRows.filter(r => r.status === 'valid').map(row => {
          const d = row.mapped_data || {};
          const code = String(d.code || '');
          const parts = code.split('-');
          // Name-based detection is PRIMARY (works for any language)
          const extracted = extractFromNames(d);

          // Code-based detection as FALLBACK only
          const designCode = parts.length >= 3 ? parts[2] : '';
          const colorCode = parts.length >= 4 ? parts[3] : '';
          const designName = extracted.design || designNamesMap[designCode] || designCode || (language === 'ar' ? 'أخرى' : 'Other');
          const colorName = extracted.color || colorNamesMap[colorCode] || colorCode || (language === 'ar' ? 'أخرى' : 'Other');
          const category = String(d.category || (language === 'ar' ? 'بدون تصنيف' : 'Uncategorized'));
          // Use the best available name for display
          const nameAr = String(d.name_ar || '');
          const nameEn = String(d.name_en || '');
          const nameTr = String(d.name_tr || '');
          const materialName = language === 'ar'
            ? (nameAr || nameEn || nameTr || code)
            : (nameEn || nameAr || nameTr || code);
          const qty = Number(d.opening_qty || 0);
          const costPrice = Number(d.cost_price || 0);

          return { code, designCode, colorCode, designName, colorName, category, materialName, qty, costPrice, value: qty * costPrice };
        });

        // Detect if variant grouping makes sense (at least 2+ materials share same design or color)
        const designGroups = new Map<string, number>();
        const colorGroups = new Map<string, number>();
        parsedRows.forEach(r => {
          designGroups.set(r.designName, (designGroups.get(r.designName) || 0) + 1);
          colorGroups.set(r.colorName, (colorGroups.get(r.colorName) || 0) + 1);
        });
        const hasDesignVariants = Array.from(designGroups.values()).some(c => c >= 2);
        const hasColorVariants = Array.from(colorGroups.values()).some(c => c >= 2);

        // Build tree based on groupMode
        const buildTree = (mode: GroupMode): TreeCategory[] => {
          const categoryMap = new Map<string, TreeCategory>();

          if (mode === 'category') {
            // Original: Category → Design → Materials
            for (const r of parsedRows) {
              if (!categoryMap.has(r.category)) {
                categoryMap.set(r.category, { name: r.category, designs: [] });
              }
              const cat = categoryMap.get(r.category)!;
              let design = cat.designs.find(ds => ds.name === r.designName);
              if (!design) {
                design = { name: r.designName, code: r.designCode, materials: [] };
                cat.designs.push(design);
              }
              design.materials.push({ name: r.materialName, code: r.code, qty: r.qty, value: r.value });
            }
          } else if (mode === 'design') {
            // Group by Category → Design (parent) → Color (children as variants)
            for (const r of parsedRows) {
              if (!categoryMap.has(r.category)) {
                categoryMap.set(r.category, { name: r.category, designs: [] });
              }
              const cat = categoryMap.get(r.category)!;
              // Extract base material name (category part) from the material name
              const parentName = `${r.category.replace('أقمشة ', '').replace('أقمشة', '')} ${r.designName}`.trim();
              let design = cat.designs.find(ds => ds.name === parentName);
              if (!design) {
                design = { name: parentName, code: `${r.designCode}`, materials: [], isVariantParent: true };
                cat.designs.push(design);
              }
              design.materials.push({ name: r.materialName, code: r.code, qty: r.qty, value: r.value, variant: r.colorName });
            }
          } else if (mode === 'color') {
            // Group by Category → Color (parent) → Design (children as variants)
            for (const r of parsedRows) {
              if (!categoryMap.has(r.category)) {
                categoryMap.set(r.category, { name: r.category, designs: [] });
              }
              const cat = categoryMap.get(r.category)!;
              const parentName = `${r.category.replace('أقمشة ', '').replace('أقمشة', '')} ${r.colorName}`.trim();
              let design = cat.designs.find(ds => ds.name === parentName);
              if (!design) {
                design = { name: parentName, code: `${r.colorCode}`, materials: [], isVariantParent: true };
                cat.designs.push(design);
              }
              design.materials.push({ name: r.materialName, code: r.code, qty: r.qty, value: r.value, variant: r.designName });
            }
          }

          return Array.from(categoryMap.values());
        };

        const treeCategories = buildTree(options._variantGroupMode as GroupMode || 'category');
        if (treeCategories.length === 0) return null;

        // Auto-expand categories on first render
        if (!treeInitialized && treeCategories.length > 0) {
          setTimeout(() => {
            setExpandedCats(new Set(treeCategories.map(c => c.name)));
            setTreeInitialized(true);
          }, 0);
        }

        const toggleCat = (name: string) => {
          setExpandedCats(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
        };
        const toggleDesign = (key: string) => {
          setExpandedDesigns(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
        };

        const totalMaterials = treeCategories.reduce((t, c) => t + c.designs.reduce((t2, d) => t2 + d.materials.length, 0), 0);
        const totalGroups = treeCategories.length + treeCategories.reduce((t, c) => t + c.designs.length, 0);
        const fmtNum = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
        const currentMode = (options._variantGroupMode as GroupMode) || 'category';
        const isVariantMode = currentMode === 'design' || currentMode === 'color';
        const variantAxisName = currentMode === 'design'
          ? (language === 'ar' ? 'اللون' : 'Color')
          : (language === 'ar' ? 'التصميم' : 'Design');

        return (
          <Card className="border-2 border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setShowTree(!showTree)}
              className="w-full p-4 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 transition-colors"
            >
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-sm">
                <TreePine className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 text-start">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
                  {language === 'ar' ? 'معاينة الشجرة التنظيمية' : 'Organization Tree Preview'}
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {language === 'ar'
                    ? `${totalGroups} مجموعة · ${totalMaterials} مادة — سيتم إنشاؤها تلقائياً`
                    : `${totalGroups} groups · ${totalMaterials} materials — auto-created`}
                  {isVariantMode && (
                    <span className="ms-2 text-purple-600 dark:text-purple-400 font-semibold">
                      🧩 {language === 'ar' ? `متغيرات: ${variantAxisName}` : `Variants: ${variantAxisName}`}
                    </span>
                  )}
                </p>
              </div>
              {showTree
                ? <ChevronDown className="h-5 w-5 text-emerald-500" />
                : <ChevronRight className="h-5 w-5 text-emerald-500" />
              }
            </button>

            {/* Tree Content */}
            {showTree && (
              <div className="p-3 space-y-1">
                {/* Grouping Mode Selector */}
                {(hasDesignVariants || hasColorVariants) && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      {language === 'ar' ? 'تجميع المتغيرات:' : 'Variant Grouping:'}
                    </span>
                    <select
                      value={currentMode}
                      onChange={(e) => {
                        // Store in options so it persists and can be used during import execution
                        if (onUpdateRows) {
                          const updatedRows = importRows.map(row => ({
                            ...row,
                            mapped_data: { ...row.mapped_data, _variantGroupMode: e.target.value }
                          }));
                          onUpdateRows(updatedRows);
                        }
                        // Also update options directly
                        (options as any)._variantGroupMode = e.target.value;
                        // Reset tree expansion
                        setTreeInitialized(false);
                        setExpandedDesigns(new Set());
                      }}
                      className="h-7 px-2 text-xs rounded-md border border-purple-300 bg-white dark:bg-gray-800 dark:border-purple-700 text-purple-800 dark:text-purple-200 font-tajawal flex-1 max-w-[280px]"
                    >
                      <option value="category">{groupModeLabels.category}</option>
                      {hasDesignVariants && <option value="design">{groupModeLabels.design}</option>}
                      {hasColorVariants && <option value="color">{groupModeLabels.color}</option>}
                    </select>
                    {isVariantMode && (
                      <Badge className="bg-purple-600 text-white text-[10px] px-1.5 animate-in fade-in">
                        {language === 'ar' ? 'سيُنشئ مواد أم + فرعيات' : 'Creates parent + children'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tree Nodes */}
                <div className="max-h-[350px] overflow-y-auto space-y-1">
                  {treeCategories.map(cat => {
                    const catExpanded = expandedCats.has(cat.name);
                    const catQty = cat.designs.reduce((t, d) => t + d.materials.reduce((t2, m) => t2 + m.qty, 0), 0);
                    const catMats = cat.designs.reduce((t, d) => t + d.materials.length, 0);

                    return (
                      <div key={cat.name}>
                        {/* Category */}
                        <button
                          onClick={() => toggleCat(cat.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
                        >
                          {catExpanded
                            ? <ChevronDown className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          }
                          {catExpanded
                            ? <FolderOpen className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
                            : <Folder className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
                          }
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex-1 text-start">{cat.name}</span>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5">
                            {catMats} {language === 'ar' ? 'مادة' : 'items'}
                          </Badge>
                          <span className="text-[11px] font-mono text-slate-500">{fmtNum(catQty)} {language === 'ar' ? 'وحدة' : 'units'}</span>
                        </button>

                        {/* Designs / Parent Materials */}
                        {catExpanded && cat.designs.map(design => {
                          const dKey = `${cat.name}|${design.code || design.name}`;
                          const dExpanded = expandedDesigns.has(dKey);
                          const dQty = design.materials.reduce((t, m) => t + m.qty, 0);

                          return (
                            <div key={dKey} className="ms-6">
                              <button
                                onClick={() => toggleDesign(dKey)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                              >
                                {dExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                                }
                                {design.isVariantParent
                                  ? <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                  : <Folder className="h-4 w-4 text-teal-500 flex-shrink-0" />
                                }
                                <span className={`font-semibold text-[13px] flex-1 text-start ${design.isVariantParent ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {design.name}
                                </span>
                                {design.isVariantParent && (
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[9px] px-1.5 border border-purple-200">
                                    👑 {language === 'ar' ? 'أم' : 'Parent'}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] px-1.5 border-teal-200 text-teal-600">
                                  {design.materials.length}
                                </Badge>
                                <span className="text-[10px] font-mono text-slate-400">{fmtNum(dQty)}</span>
                              </button>

                              {/* Materials / Variant Children */}
                              {dExpanded && design.materials.map(mat => (
                                <div
                                  key={mat.code}
                                  className="ms-8 flex items-center gap-2 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <Package className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="text-[12px] text-slate-600 dark:text-slate-400 flex-1">{mat.name}</span>
                                  {mat.variant && isVariantMode && (
                                    <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 text-[9px] px-1.5 border border-indigo-200">
                                      {variantAxisName}: {mat.variant}
                                    </Badge>
                                  )}
                                  <span className="text-[10px] font-mono text-slate-400">{mat.code}</span>
                                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] px-1.5 font-mono">
                                    {fmtNum(mat.qty)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Default Currency Selector */}
      {needsCurrency && !hasCurrencyInData && (
        <Card className={`p-4 border-2 ${defaultCurrency ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-red-300 bg-red-50/50 dark:bg-red-950/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${defaultCurrency ? 'bg-green-100' : 'bg-red-100'}`}>
              <Coins className={`h-5 w-5 ${defaultCurrency ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-medium ${defaultCurrency ? 'text-green-800' : 'text-red-800'}`}>
                {language === 'ar' ? 'العملة (إجباري) ⚠️' : 'Currency (Required) ⚠️'}
              </h4>
              <p className={`text-xs mt-0.5 ${defaultCurrency ? 'text-green-600' : 'text-red-600'}`}>
                {language === 'ar'
                  ? 'لم يتم تحديد العملة في البيانات. يجب اختيار العملة قبل الاستيراد'
                  : 'Currency not found in data. Must select currency before importing'}
              </p>
            </div>
            <Select value={defaultCurrency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className={`w-[240px] bg-white dark:bg-background ${!defaultCurrency ? 'border-red-400 ring-1 ring-red-300' : 'border-green-400'}`}>
                <SelectValue placeholder={language === 'ar' ? '⚠️ اختر العملة...' : '⚠️ Select currency...'} />
              </SelectTrigger>
              <SelectContent>
                {supportedCurrencies.length > 0
                  ? supportedCurrencies.map(code => (
                    <SelectItem key={code} value={code}>
                      {getCurrencyLabel(code)}
                    </SelectItem>
                  ))
                  : <SelectItem value={baseCurrency || 'USD'}>{getCurrencyLabel(baseCurrency || 'USD')}</SelectItem>
                }
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Data Preview Table with Edit Mode */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h4 className="font-medium">{t('import.dataPreview')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('import.showing')} {paginatedRows.length} {t('import.of')} {rowsToImport.length}
              {editMode && (
                <span className="ms-2 text-amber-600 font-medium">
                  — {language === 'ar' ? 'وضع التعديل' : 'Edit Mode'}
                </span>
              )}
            </p>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] sticky top-0 bg-background">#</TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الكود' : 'Code'}
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الاسم' : 'Name'}
                </TableHead>
                {entityType === 'products' && editMode && (
                  <>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'الوحدة' : 'Unit'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'الكمية' : 'Qty'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'سعر التكلفة' : 'Cost'}
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      {language === 'ar' ? 'سعر البيع' : 'Sale'}
                    </TableHead>
                  </>
                )}
                {(entityType === 'customers' || entityType === 'suppliers') && editMode && (
                  <TableHead className="sticky top-0 bg-background">
                    {language === 'ar' ? 'الرصيد الافتتاحي' : 'Balance'}
                  </TableHead>
                )}
                {editMode && (
                  <TableHead className="sticky top-0 bg-background w-[130px]">
                    {language === 'ar' ? 'العملة' : 'Currency'}
                  </TableHead>
                )}
                {!editMode && displayFields.slice(2).map(field => (
                  <TableHead key={field.name} className="sticky top-0 bg-background">
                    {language === 'ar' ? field.label_ar : field.label_en}
                  </TableHead>
                ))}
                <TableHead className="sticky top-0 bg-background w-[40px]">✓</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => {
                const globalIdx = importRows.indexOf(row);
                const d = row.mapped_data || {};
                return (
                  <TableRow key={row.row_number}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.row_number}</TableCell>
                    <TableCell className="font-mono text-sm">{String(d.code || '-')}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{String(d.name_ar || d.name_en || '-')}</TableCell>

                    {entityType === 'products' && editMode && (
                      <>
                        <TableCell>
                          <Select
                            value={String(d.unit || 'unit')}
                            onValueChange={(v) => updateRowField(globalIdx, 'unit', v)}
                          >
                            <SelectTrigger className="h-8 w-[90px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meter">{language === 'ar' ? 'متر' : 'Meter'}</SelectItem>
                              <SelectItem value="kg">{language === 'ar' ? 'كغ' : 'Kg'}</SelectItem>
                              <SelectItem value="unit">{language === 'ar' ? 'قطعة' : 'Unit'}</SelectItem>
                              <SelectItem value="roll">{language === 'ar' ? 'رولون' : 'Roll'}</SelectItem>
                              <SelectItem value="box">{language === 'ar' ? 'صندوق' : 'Box'}</SelectItem>
                              <SelectItem value="pack">{language === 'ar' ? 'حزمة' : 'Pack'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.opening_qty ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'opening_qty', e.target.value)}
                            className="h-8 w-[80px] text-xs text-center"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.cost_price ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'cost_price', e.target.value)}
                            className="h-8 w-[90px] text-xs text-center"
                            min={0}
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={String(d.sale_price ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'sale_price', e.target.value)}
                            className="h-8 w-[90px] text-xs text-center"
                            min={0}
                            step="0.01"
                          />
                        </TableCell>
                      </>
                    )}

                    {(entityType === 'customers' || entityType === 'suppliers') && editMode && (
                      <TableCell>
                        <Input
                          type="number"
                          value={String(d.opening_balance ?? '')}
                          onChange={(e) => updateRowField(globalIdx, 'opening_balance', e.target.value)}
                          className="h-8 w-[110px] text-xs text-center"
                          step="0.01"
                        />
                      </TableCell>
                    )}

                    {editMode && (
                      <TableCell>
                        <Select
                          value={String(d.currency || defaultCurrency || baseCurrency || '')}
                          onValueChange={(v) => updateRowField(globalIdx, 'currency', v)}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportedCurrencies.length > 0
                              ? supportedCurrencies.map(code => (
                                <SelectItem key={code} value={code}>{code}</SelectItem>
                              ))
                              : <SelectItem value={baseCurrency || 'USD'}>{baseCurrency || 'USD'}</SelectItem>
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}

                    {!editMode && displayFields.slice(2).map(field => (
                      <TableCell key={field.name} className="max-w-[150px] truncate text-sm">
                        {d[field.name]?.toString() || '-'}
                      </TableCell>
                    ))}

                    <TableCell>
                      {row.status === 'valid'
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('import.page')} {currentPage + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
              {t('common.next')}
            </Button>
          </div>
        )}
      </Card>

      {/* Import Options */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">{t('import.importSettings')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.skip_invalid_rows ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>{t('import.skipInvalidRows')}: {options.skip_invalid_rows ? t('common.yes') : t('common.no')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.update_existing ? 'bg-yellow-500' : 'bg-gray-300'}`} />
            <span>{t('import.updateExisting')}: {options.update_existing ? t('common.yes') : t('common.no')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${options.use_ai_analysis ? 'bg-purple-500' : 'bg-gray-300'}`} />
            <span>{t('import.aiAnalysis')}: {options.use_ai_analysis ? t('common.yes') : t('common.no')}</span>
          </div>
        </div>
      </Card>

      {/* Opening Balance Journal Preview — قيد منفصل لكل عملة */}
      {needsCurrency && (() => {
        const validRows = options.skip_invalid_rows
          ? importRows.filter(r => r.status === 'valid')
          : importRows;

        type PreviewLine = { name: string; code: string; debit: number; credit: number };
        const linesByCurrency: Map<string, PreviewLine[]> = new Map();

        const addLine = (currency: string, line: PreviewLine) => {
          if (!linesByCurrency.has(currency)) linesByCurrency.set(currency, []);
          linesByCurrency.get(currency)!.push(line);
        };

        if (entityType === 'customers') {
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const bal = Number(d.opening_balance) || 0;
            if (bal === 0) continue;
            const cur = String(d.currency || defaultCurrency || 'USD');
            addLine(cur, {
              name: String(d.name_ar || d.name_en || ''),
              code: String(d.code || ''),
              debit: bal > 0 ? Math.abs(bal) : 0,
              credit: bal < 0 ? Math.abs(bal) : 0,
            });
          }
        } else if (entityType === 'suppliers') {
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const bal = Number(d.opening_balance) || 0;
            if (bal === 0) continue;
            const cur = String(d.currency || defaultCurrency || 'USD');
            addLine(cur, {
              name: String(d.name_ar || d.name_en || ''),
              code: String(d.code || ''),
              debit: bal < 0 ? Math.abs(bal) : 0,
              credit: bal > 0 ? Math.abs(bal) : 0,
            });
          }
        } else if (entityType === 'products') {
          const valuesByCur: Map<string, number> = new Map();
          for (const row of validRows) {
            const d = row.mapped_data || {};
            const qty = Number(d.opening_qty) || 0;
            const price = Number(d.cost_price) || 0;
            const cur = String(d.currency || defaultCurrency || 'USD');
            const value = qty * price;
            if (value > 0) {
              valuesByCur.set(cur, (valuesByCur.get(cur) || 0) + value);
            }
          }
          for (const [cur, totalValue] of valuesByCur) {
            addLine(cur, {
              name: inventoryAccount.name || (language === 'ar' ? 'المخزون' : 'Inventory'),
              code: inventoryAccount.code || '1141',
              debit: totalValue,
              credit: 0,
            });
          }
        }

        if (linesByCurrency.size === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600" />
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                {language === 'ar'
                  ? `معاينة القيود الافتتاحية (${linesByCurrency.size} ${linesByCurrency.size === 1 ? 'قيد' : 'قيود'})`
                  : `Opening Balance Preview (${linesByCurrency.size} ${linesByCurrency.size === 1 ? 'entry' : 'entries'})`}
              </h4>
            </div>

            {Array.from(linesByCurrency).map(([currency, lines]) => {
              const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
              const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
              const obDebit = totalCredit > totalDebit ? totalCredit - totalDebit : 0;
              const obCredit = totalDebit > totalCredit ? totalDebit - totalCredit : 0;

              return (
                <Card key={currency} className="p-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-600 text-white text-xs">{currency}</Badge>
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {language === 'ar'
                        ? `قيد أرصدة افتتاحية - ${currency}`
                        : `Opening Balance - ${currency}`}
                    </span>
                  </div>

                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-100/70 dark:bg-amber-900/30">
                          <TableHead className="text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'الحساب' : 'Account'}
                          </TableHead>
                          <TableHead className="text-right text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'مدين' : 'Debit'}
                          </TableHead>
                          <TableHead className="text-right text-amber-900 dark:text-amber-200">
                            {language === 'ar' ? 'دائن' : 'Credit'}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, i) => (
                          <TableRow key={i} className="bg-white/60 dark:bg-transparent">
                            <TableCell className="font-medium">{line.code} - {line.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-amber-50 dark:bg-amber-900/20 font-medium">
                          <TableCell>35 - {language === 'ar' ? 'أرصدة افتتاحية' : 'Opening Balance'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {obDebit > 0 ? obDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {obCredit > 0 ? obCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-amber-100 dark:bg-amber-900/40 font-bold border-t-2 border-amber-300">
                          <TableCell>{language === 'ar' ? 'المجموع' : 'Total'} ({currency})</TableCell>
                          <TableCell className="text-right font-mono">
                            {(totalDebit + obDebit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(totalCredit + obCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {language === 'ar' ? 'متوازن ✓' : 'Balanced ✓'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Execute Button */}
      <div className="flex justify-end gap-3 items-center">
        {!currencyResolved && (
          <span className="text-sm text-red-600 font-medium">
            {language === 'ar' ? '⚠️ يجب اختيار العملة أولاً' : '⚠️ Currency required'}
          </span>
        )}
        <Button
          onClick={() => onExecute(defaultCurrency || undefined)}
          size="lg"
          disabled={isLoading || rowsToImport.length === 0 || !currencyResolved}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('import.importing')}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t('import.startImport')} ({rowsToImport.length} {t('import.records')})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
