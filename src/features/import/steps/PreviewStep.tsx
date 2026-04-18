/**
 * Preview Step - خطوة معاينة البيانات قبل الاستيراد
 * مع إمكانية تعديل العملة والكمية والوحدة والمبلغ
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/hooks';
import { useCompanyCurrencies, currencyMetadata } from '@/hooks/useCompanyCurrencies';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
import { importService } from '@/services/importService';
import { cleanParentName } from '../utils/variantProcessor';
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
  Sparkles,
  FolderTree,
  Wand2,
  Warehouse
} from 'lucide-react';
import type { ImportJob, ImportRow, EntityDefinition, ImportOptions } from '@/services/importService';
import type { WarehouseBreakdown, WarehouseInfo } from '../hooks/useImportWizard';

interface PreviewStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  entityType: string | null;
  options: ImportOptions;
  onExecute: (overrideCurrency?: string) => void;
  onUpdateRows?: (rows: ImportRow[]) => void;
  onUpdateOptions?: (updates: Partial<ImportOptions>) => void;
  isLoading: boolean;
  // Multi-warehouse support
  warehouseBreakdown?: WarehouseBreakdown;
  warehouseList?: WarehouseInfo[];
}

export function PreviewStep({
  importJob,
  importRows,
  entityDefinition,
  entityType,
  options,
  onExecute,
  onUpdateRows,
  onUpdateOptions,
  isLoading,
  warehouseBreakdown = {},
  warehouseList = [],
}: PreviewStepProps) {
  const { t, language } = useLanguage();
  const { supportedCurrencies, baseCurrency } = useCompanyCurrencies();
  const { companyId: authCompanyId } = useAuth();
  const { companyId: hookCompanyId } = useCompany();
  const companyId = authCompanyId || hookCompanyId;
  const [currentPage, setCurrentPage] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [backupRows, setBackupRows] = useState<ImportRow[] | null>(null);
  const [inventoryAccount, setInventoryAccount] = useState({ code: '', name: '' });
  const [showTree, setShowTree] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  // ═══ MULTI-WAREHOUSE: Track warehouse column remapping ═══
  const [warehouseRemap, setWarehouseRemap] = useState<Map<string, string>>(new Map());
  const pageSize = 15;

  // ═══ Chart of Accounts: Parent group selection ═══
  const [accountGroups, setAccountGroups] = useState<{ id: string; code: string; name_ar: string; name_en: string; name_ru?: string; name_uk?: string; name_tr?: string; level: number; account_type_id: string }[]>([]);
  const [parentGroupMap, setParentGroupMap] = useState<Map<number, string>>(new Map()); // rowIndex → group_id
  const [aiSuggestionsApplied, setAiSuggestionsApplied] = useState(false);

  const isCOA = entityType === 'chart_of_accounts';

  // Fetch existing account groups for COA import
  useEffect(() => {
    if (!companyId || !isCOA) return;
    (async () => {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, name_ar, name_en, name_ru, name_uk, name_tr, level, account_type_id')
        .eq('company_id', companyId)
        .eq('is_group', true)
        .eq('is_active', true)
        .order('account_code');
      if (data) setAccountGroups(data.map(d => ({
        id: d.id, code: d.account_code, name_ar: d.name_ar || '', name_en: d.name_en || '',
        name_ru: d.name_ru, name_uk: d.name_uk, name_tr: d.name_tr, level: d.level || 1,
        account_type_id: d.account_type_id,
      })));
    })();
  }, [companyId, isCOA]);

  // AI fuzzy match: suggest parent group based on account name
  const suggestParentGroup = useCallback((accountName: string): string | null => {
    if (!accountName || accountGroups.length === 0) return null;
    const normalized = importService.normalizeString(accountName);
    let bestMatch: { id: string; score: number } | null = null;

    for (const group of accountGroups) {
      // Compare with all language names
      const names = [group.name_ar, group.name_en, group.name_ru, group.name_uk, group.name_tr].filter(Boolean);
      for (const name of names) {
        const score = importService.similarityScore(normalized, importService.normalizeString(name || ''));
        if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: group.id, score };
        }
      }

      // Also check if account name CONTAINS group name or vice versa
      for (const name of names) {
        const groupNorm = importService.normalizeString(name || '');
        if (groupNorm.length > 2 && (normalized.includes(groupNorm) || groupNorm.includes(normalized))) {
          const containScore = 0.7;
          if (!bestMatch || containScore > bestMatch.score) {
            bestMatch = { id: group.id, score: containScore };
          }
        }
      }
    }

    return bestMatch && bestMatch.score >= 0.4 ? bestMatch.id : null;
  }, [accountGroups]);

  // Auto-suggest parent groups on first load
  useEffect(() => {
    if (!isCOA || aiSuggestionsApplied || accountGroups.length === 0 || importRows.length === 0) return;
    const newMap = new Map<number, string>();
    importRows.forEach((row, idx) => {
      const d = row.mapped_data || {};
      const name = String(d.name_ar || d.name_en || d.name_ru || d.name_uk || d.name_tr || '');
      const suggested = suggestParentGroup(name);
      if (suggested) newMap.set(idx, suggested);
    });
    setParentGroupMap(newMap);
    setAiSuggestionsApplied(true);
  }, [isCOA, aiSuggestionsApplied, accountGroups, importRows, suggestParentGroup]);

  // Check if all COA rows have parent groups assigned
  const allCOAGroupsAssigned = useMemo(() => {
    if (!isCOA) return true;
    const validRows = importRows.filter(r => r.status === 'valid');
    return validRows.every((_, idx) => parentGroupMap.has(idx));
  }, [isCOA, importRows, parentGroupMap]);

  const getGroupDisplayName = useCallback((groupId: string) => {
    const group = accountGroups.find(g => g.id === groupId);
    if (!group) return '?';
    const name = language === 'ar' ? (group.name_ar || group.name_en) : (group.name_en || group.name_ar);
    return `${group.code} - ${name}`;
  }, [accountGroups, language]);

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
  const needsCurrency = entityType === 'customers' || entityType === 'suppliers' || entityType === 'products' || entityType === 'chart_of_accounts';

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
  // Determine which fields to display in read-only mode dynamically
  const displayFields = useMemo(() => {
    if (!entityDefinition) return [];
    
    // Determine which fields actually contain valid data in the spreadsheet
    const fieldsWithData = new Set<string>();
    for (const row of importRows) {
      if (!row.mapped_data) continue;
      for (const [key, val] of Object.entries(row.mapped_data)) {
         if (val !== undefined && val !== null && val !== '') {
            fieldsWithData.add(key);
         }
      }
    }

    // Show name fields ONLY if they were actually mapped with data + always show code and category
    return entityDefinition.fields.filter(f => 
      f.name === 'code' || f.name === 'category' || 
      (f.name.startsWith('name_') && fieldsWithData.has(f.name))
    );
  }, [entityDefinition, importRows]);

  // ═══ MULTI-WAREHOUSE: Compute unique warehouses for dynamic columns ═══
  const uniqueWarehouses = useMemo(() => {
    if (entityType !== 'products' || !warehouseBreakdown || Object.keys(warehouseBreakdown).length === 0) return [];
    const whMap = new Map<string, { code: string; name: string }>();
    for (const entries of Object.values(warehouseBreakdown)) {
      for (const entry of entries) {
        if (!whMap.has(entry.warehouse_code)) {
          // Find name from warehouseList or fallback to code
          const info = warehouseList.find(w => w.code === entry.warehouse_code);
          whMap.set(entry.warehouse_code, {
            code: entry.warehouse_code,
            name: entry.warehouse_name || info?.name_ar || entry.warehouse_code,
          });
        }
      }
    }
    return Array.from(whMap.values());
  }, [entityType, warehouseBreakdown, warehouseList]);

  const hasMultiWarehouse = uniqueWarehouses.length > 0;

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

  const applyUnitToAll = (unitValue: string) => {
    if (!onUpdateRows) return;
    const newRows = importRows.map(row => ({
      ...row,
      mapped_data: {
        ...row.mapped_data,
        unit: unitValue
      }
    }));
    onUpdateRows(newRows);
  };

  const handleEnterEditMode = () => {
    setBackupRows(JSON.parse(JSON.stringify(importRows)));
    setEditMode(true);
  };

  const handleCancelEditMode = () => {
    if (backupRows && onUpdateRows) {
      onUpdateRows(backupRows);
    }
    setBackupRows(null);
    setEditMode(false);
  };

  const handleSaveEditMode = () => {
    setBackupRows(null);
    setEditMode(false);
  };

  // Helper to normalize translated unit text to system enums
  const normalizeUnit = (raw: string) => {
    if (!raw) return 'unit';
    const l = raw.toLowerCase().trim();
    if (['متر', 'meter', 'm'].includes(l)) return 'meter';
    if (['كغ', 'kg', 'kilo'].includes(l)) return 'kg';
    if (['قطعة', 'unit', 'pcs'].includes(l)) return 'unit';
    if (['رولون', 'رول', 'roll', 'r'].includes(l)) return 'roll';
    if (['صندوق', 'box', 'b'].includes(l)) return 'box';
    if (['حزمة', 'pack', 'p'].includes(l)) return 'pack';
    return 'unit';
  };

  // Editable fields per entity type
  const editableFields = useMemo(() => {
    if (entityType === 'customers' || entityType === 'suppliers') {
      return ['currency', 'opening_balance'];
    }
    if (entityType === 'products') {
      return [
        'currency', 'unit', 'opening_qty',
        'purchase_price', 'cost_price', 'sale_price',
        'wholesale_price', 'half_wholesale_price', 'special_price'
      ];
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

          {/* Edit Mode Toggle moved to Data Preview Header */}
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

        type TreeMaterial = { name: string; code: string; qty: number; value: number; variantAxis1?: string; variantAxis2?: string; purchasePrice?: number; costPrice?: number; salePrice?: number };
        type TreeAxis1 = { name: string; materials: TreeMaterial[] };
        type TreeParent = { name: string; code: string; axes: TreeAxis1[]; isVariantParent?: boolean };
        type TreeCategory = { name: string; parents: TreeParent[]; isVariantMode?: boolean; isVariantParent?: boolean };

        // Grouping mode options
        type GroupMode = 'category' | 'variant_design_color' | 'variant_color_design';
        const groupModeLabels: Record<GroupMode, string> = {
          category: language === 'ar' ? '📂 حسب الفئة (الافتراضي)' : '📂 By Category (default)',
          variant_design_color: language === 'ar' ? '🎨 حسب التصميم (متغيرات اللون)' : '🎨 By Design (Color variants)',
          variant_color_design: language === 'ar' ? '🎨 حسب اللون (متغيرات التصميم)' : '🎨 By Color (Design variants)',
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
          const purchasePrice = Number(d.purchase_price || 0);
          const salePrice = Number(d.sale_price || d.selling_price || 0);

          return { code, designCode, colorCode, designName, colorName, category, materialName, qty, costPrice, purchasePrice, salePrice, value: qty * costPrice };
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

        const buildTree = (mode: GroupMode): TreeCategory[] => {
          const parentMap = new Map<string, TreeCategory>();

          for (const r of parsedRows) {
            // ═══ Level 1: Parent Material (top level) ═══
            const baseName = cleanParentName(r.materialName, r.designName, r.colorName);
            if (!parentMap.has(baseName)) {
              parentMap.set(baseName, {
                name: baseName,
                parents: [],
                isVariantMode: mode !== 'category',
                isVariantParent: mode !== 'category',
              });
            }
            const parentNode = parentMap.get(baseName)!;

            if (mode === 'category') {
              // ═══ Category mode: Parent → Materials directly ═══
              let defaultGroup = parentNode.parents.find(p => p.name === '_default_');
              if (!defaultGroup) {
                defaultGroup = { name: '_default_', code: '', axes: [{ name: 'Default', materials: [] }] };
                parentNode.parents.push(defaultGroup);
              }
              defaultGroup.axes[0].materials.push({ name: r.materialName, code: r.code, qty: r.qty, value: r.value, purchasePrice: r.purchasePrice, costPrice: r.costPrice, salePrice: r.salePrice });
            } else {
              // ═══ Variant mode: Parent → Axis Group → Materials ═══
              const axisGrouping = mode === 'variant_design_color' ? r.designName : r.colorName;
              let axisGroup = parentNode.parents.find(p => p.name === axisGrouping);
              if (!axisGroup) {
                axisGroup = { name: axisGrouping, code: '', axes: [{ name: 'Default', materials: [] }] };
                parentNode.parents.push(axisGroup);
              }
              axisGroup.axes[0].materials.push({
                name: r.materialName,
                code: r.code,
                qty: r.qty,
                value: r.value,
                purchasePrice: r.purchasePrice,
                costPrice: r.costPrice,
                salePrice: r.salePrice,
                variantAxis1: mode === 'variant_design_color' ? r.designName : r.colorName,
                variantAxis2: mode === 'variant_design_color' ? r.colorName : r.designName,
              });
            }
          }

          return Array.from(parentMap.values());
        };

        const treeCategories = buildTree(options._variantGroupMode as GroupMode || 'category');
        if (treeCategories.length === 0) return null;

        // Auto-expand parent materials on first render
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

        const totalMaterials = treeCategories.reduce((t, c) => t + c.parents.reduce((t2, p) => t2 + p.axes.reduce((t3, a) => t3 + a.materials.length, 0), 0), 0);
        const fmtNum = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
        const currentMode = (options._variantGroupMode as GroupMode) || 'category';
        const isVariantMode = currentMode === 'variant_design_color' || currentMode === 'variant_color_design';
        const axis1Name = currentMode === 'variant_design_color'
          ? (language === 'ar' ? 'التصميم' : 'Design')
          : (language === 'ar' ? 'اللون' : 'Color');
        const axis2Name = currentMode === 'variant_design_color'
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
                    ? `${treeCategories.length} مادة أم · ${totalMaterials} مادة — سيتم إنشاؤها تلقائياً`
                    : `${treeCategories.length} parents · ${totalMaterials} materials — auto-created`}
                  {isVariantMode && (
                    <span className="ms-2 text-purple-600 dark:text-purple-400 font-semibold">
                      🧩 {language === 'ar' ? `متغيرات: ${axis1Name} و ${axis2Name}` : `Variants: ${axis1Name} & ${axis2Name}`}
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
                        // Update options via React state (NOT direct mutation)
                        if (onUpdateOptions) {
                          onUpdateOptions({ _variantGroupMode: e.target.value });
                        }
                        // Reset tree expansion
                        setTreeInitialized(false);
                        setExpandedDesigns(new Set());
                      }}
                      className="h-7 px-2 text-xs rounded-md border border-purple-300 bg-white dark:bg-gray-800 dark:border-purple-700 text-purple-800 dark:text-purple-200 font-tajawal flex-1 max-w-[280px]"
                    >
                      <option value="category">{groupModeLabels.category}</option>
                      {hasDesignVariants && <option value="variant_design_color">{groupModeLabels.variant_design_color}</option>}
                      {hasColorVariants && <option value="variant_color_design">{groupModeLabels.variant_color_design}</option>}
                    </select>
                    {isVariantMode && (
                      <Badge className="bg-purple-600 text-white text-[10px] px-1.5 animate-in fade-in">
                        {language === 'ar' ? 'يربط المواد الأم بالمحاور' : 'Links to Axes'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Tree Nodes */}
                <div className="max-h-[350px] overflow-y-auto space-y-1">
                  {treeCategories.map(parentMat => {
                    const pmExpanded = expandedCats.has(parentMat.name);
                    const pmMats = parentMat.parents.reduce((t, p) => t + p.axes.reduce((t2, a) => t2 + a.materials.length, 0), 0);
                    const pmQty = parentMat.parents.reduce((t, p) => t + p.axes.reduce((t2, a) => t2 + a.materials.reduce((t3, m) => t3 + m.qty, 0), 0), 0);

                    return (
                      <div key={parentMat.name}>
                        {/* Parent Material (Level 1 — top level) */}
                        <button
                          onClick={() => toggleCat(parentMat.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                        >
                          {pmExpanded
                            ? <ChevronDown className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-purple-500 flex-shrink-0" />
                          }
                          <Package className="h-4.5 w-4.5 text-purple-500 flex-shrink-0" />
                          <span className="font-bold text-sm text-purple-800 dark:text-purple-200 flex-1 text-start">{parentMat.name}</span>
                          {parentMat.isVariantParent && (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] px-1.5 border border-purple-200">
                              👑 {language === 'ar' ? 'مادة أم' : 'Parent'}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5">
                            {pmMats} {language === 'ar' ? 'مادة' : 'items'}
                          </Badge>
                          <span className="text-[11px] font-mono text-slate-500">{fmtNum(pmQty)} {language === 'ar' ? 'وحدة' : 'units'}</span>
                        </button>

                        {/* Children under parent material */}
                        {pmExpanded && parentMat.parents.map(group => {
                          // In category mode, _default_ group → show materials directly
                          if (group.name === '_default_') {
                            return (
                              <div key="_default_" className="ms-8 mt-1 flex flex-col gap-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                                {group.axes[0].materials.map((mat, idx) => (
                                  <div
                                    key={`${mat.code}-${idx}`}
                                    className="flex items-center gap-2 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                  >
                                    <Package className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-[12px] text-slate-600 dark:text-slate-400 flex-1">{mat.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{mat.code}</span>
                                    {mat.costPrice ? <Badge variant="outline" className="text-[10px] px-1.5 font-mono text-slate-500 border-slate-200">💰 {mat.costPrice}$</Badge> : null}
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] px-1.5 font-mono">
                                      {fmtNum(mat.qty)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            );
                          }

                          // In variant mode, show axis groups (سادة, منقوش, أحمر, etc.)
                          const gKey = `${parentMat.name}|${group.name}`;
                          const gExpanded = expandedDesigns.has(gKey);
                          const gMats = group.axes[0].materials.length;
                          const gQty = group.axes[0].materials.reduce((t, m) => t + m.qty, 0);

                          return (
                            <div key={gKey} className="ms-6">
                              <button
                                onClick={() => toggleDesign(gKey)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              >
                                {gExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                }
                                <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                <span className="font-semibold text-[13px] text-indigo-700 dark:text-indigo-300 flex-1 text-start">
                                  {group.name}
                                </span>
                                <Badge className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 text-[9px] px-1.5 border border-indigo-200">
                                  {axis1Name}
                                </Badge>
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 text-[9px] px-1.5">
                                  {gMats}
                                </Badge>
                                <span className="text-[10px] font-mono text-slate-400">{fmtNum(gQty)}</span>
                              </button>

                              {/* Materials under axis group */}
                              {gExpanded && (
                                <div className="ms-8 mt-1 flex flex-col gap-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                                  {group.axes[0].materials.map((mat, idx) => (
                                    <div
                                      key={`${mat.code}-${idx}`}
                                      className="flex items-center gap-2 px-3 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                      <Package className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                      <span className="text-[12px] text-slate-600 dark:text-slate-400 flex-1">{mat.name}</span>
                                      {mat.variantAxis2 && (
                                        <Badge className="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 text-[9px] px-1.5 border border-violet-200">
                                          {axis2Name}: {mat.variantAxis2}
                                        </Badge>
                                      )}
                                      <span className="text-[10px] font-mono text-slate-400">{mat.code}</span>
                                      {mat.costPrice ? <Badge variant="outline" className="text-[10px] px-1.5 font-mono text-slate-500 border-slate-200">💰 {mat.costPrice}$</Badge> : null}
                                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] px-1.5 font-mono">
                                        {fmtNum(mat.qty)}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* ═══ COA: Parent Group Assignment Section ═══ */}
      {isCOA && accountGroups.length > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800/50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                <FolderTree className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-800 dark:text-blue-300">
                  {language === 'ar' ? 'تحديد المجموعة الأم لكل حساب' : 'Assign Parent Group for Each Account'}
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  {language === 'ar'
                    ? `${parentGroupMap.size} من ${importRows.filter(r => r.status === 'valid').length} حساب تم تحديد مجموعته — ${!allCOAGroupsAssigned ? '⚠️ يرجى إكمال الباقي' : '✅ مكتمل'}`
                    : `${parentGroupMap.size} of ${importRows.filter(r => r.status === 'valid').length} accounts assigned — ${!allCOAGroupsAssigned ? '⚠️ Please complete the rest' : '✅ Complete'}`}
                </p>
              </div>
              {aiSuggestionsApplied && parentGroupMap.size > 0 && (
                <Badge className="bg-purple-600 text-white gap-1">
                  <Wand2 className="h-3 w-3" />
                  {language === 'ar' ? 'اقتراحات ذكية' : 'AI Suggested'}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-3">
            <ScrollArea className="max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'اسم الحساب' : 'Account Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
                    <TableHead className="min-w-[250px]">
                      {language === 'ar' ? '📂 المجموعة الأم' : '📂 Parent Group'}
                    </TableHead>
                    <TableHead className="w-[40px]">✓</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.filter(r => r.status === 'valid').map((row, idx) => {
                    const d = row.mapped_data || {};
                    const hasParent = parentGroupMap.has(idx);
                    const name = String(d.name_ar || d.name_en || d.name_ru || d.name_uk || d.name_tr || '-');

                    return (
                      <TableRow key={row.row_number} className={!hasParent ? 'bg-red-50/50 dark:bg-red-950/10' : undefined}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{row.row_number}</TableCell>
                        <TableCell className="font-mono text-sm font-semibold">{String(d.account_code || '-')}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {Number(d.opening_balance) ? Number(d.opening_balance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={parentGroupMap.get(idx) || ''}
                            onValueChange={(v) => {
                              setParentGroupMap(prev => {
                                const n = new Map(prev);
                                if (v) n.set(idx, v); else n.delete(idx);
                                return n;
                              });
                            }}
                          >
                            <SelectTrigger className={`h-8 text-xs ${!hasParent ? 'border-red-400 ring-1 ring-red-300' : 'border-green-400'}`}>
                              <SelectValue placeholder={language === 'ar' ? '⚠️ اختر المجموعة...' : '⚠️ Select group...'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {accountGroups.map(group => {
                                const gName = language === 'ar'
                                  ? (group.name_ar || group.name_en)
                                  : (group.name_en || group.name_ar);
                                return (
                                  <SelectItem key={group.id} value={group.id}>
                                    <span style={{ paddingInlineStart: `${(group.level - 1) * 12}px` }}>
                                      📂 {group.code} - {gName}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {hasParent
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <AlertTriangle className="h-4 w-4 text-red-500" />
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </Card>
      )}

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
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div>
            <h4 className="font-bold text-lg">{t('import.dataPreview')}</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('import.showing')} {paginatedRows.length} {t('import.of')} {rowsToImport.length}
              {editMode && (
                <span className="ms-2 text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                  {language === 'ar' ? 'وضع التعديل النشط' : 'Edit Mode Active'}
                </span>
              )}
            </p>
          </div>
          {/* Edit Mode Toggle */}
          {needsCurrency && editableFields.length > 0 && (
            editMode ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditMode}
                  className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEditMode}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterEditMode}
                className="gap-2 shadow-sm border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Pencil className="h-4 w-4" />
                {language === 'ar' ? 'تعديل أسعار الجدول' : 'Edit Table Data'}
              </Button>
            )
          )}
        </div>

        <div className="w-full overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] sticky top-0 bg-background">#</TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الكود' : 'Code'}
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  {language === 'ar' ? 'الاسم الأساسي' : 'Primary Name'}
                </TableHead>
                {/* Dynamically show name fields (including name_uk, name_ru, etc) and Category next to main name */}
                {displayFields.filter(f => f.name !== 'code' && f.name !== 'name_ar').map(field => (
                  <TableHead key={field.name} className="sticky top-0 bg-background whitespace-nowrap text-cyan-800 dark:text-cyan-200 bg-cyan-50/30 dark:bg-cyan-900/10">
                    {language === 'ar' ? field.label_ar : field.label_en}
                  </TableHead>
                ))}
                {entityType === 'products' && (
                  <>
                    <TableHead className="sticky top-0 bg-background min-w-[120px]">
                      <div className="flex items-center gap-1">
                        {language === 'ar' ? 'الوحدة' : 'Unit'}
                        {editMode && (
                          <Select onValueChange={applyUnitToAll}>
                            <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent [&>svg]:hidden">
                              <span title={language === 'ar' ? 'تطبيق على الكل' : 'Apply to all'} className="cursor-pointer text-blue-500 font-bold p-1 hover:bg-blue-50 rounded">⚡</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meter">{language === 'ar' ? 'الكل: متر' : 'All: Meter'}</SelectItem>
                              <SelectItem value="kg">{language === 'ar' ? 'الكل: كغ' : 'All: Kg'}</SelectItem>
                              <SelectItem value="unit">{language === 'ar' ? 'الكل: قطعة' : 'All: Unit'}</SelectItem>
                              <SelectItem value="roll">{language === 'ar' ? 'الكل: رولون' : 'All: Roll'}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableHead>
                    {/* ═══ MULTI-WAREHOUSE COLUMNS ═══ */}
                    {hasMultiWarehouse ? (
                      <>
                        {uniqueWarehouses.map(wh => {
                          const effectiveCode = warehouseRemap.get(wh.code) || wh.code;
                          const effectiveInfo = warehouseList.find(w => w.code === effectiveCode);
                          const effectiveName = effectiveInfo?.name_ar || wh.name;
                          return (
                            <TableHead key={wh.code} className="sticky top-0 bg-emerald-50 dark:bg-emerald-900/20 whitespace-nowrap text-emerald-700 dark:text-emerald-300 text-center min-w-[120px]">
                              {editMode && warehouseList.length > 0 ? (
                                <Select
                                  value={effectiveCode}
                                  onValueChange={(newCode) => {
                                    // Remap warehouse column
                                    const newMap = new Map(warehouseRemap);
                                    if (newCode === wh.code) {
                                      newMap.delete(wh.code);
                                    } else {
                                      newMap.set(wh.code, newCode);
                                    }
                                    setWarehouseRemap(newMap);
                                    // Update breakdown entries
                                    for (const [materialCode, entries] of Object.entries(warehouseBreakdown)) {
                                      const idx = entries.findIndex(e => e.warehouse_code === wh.code || e.warehouse_code === effectiveCode);
                                      if (idx >= 0) {
                                        const newInfo = warehouseList.find(w => w.code === newCode);
                                        entries[idx] = {
                                          ...entries[idx],
                                          warehouse_code: newCode,
                                          warehouse_id: newInfo?.id,
                                          warehouse_name: newInfo?.name_ar || newCode,
                                        };
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/30">
                                    <div className="flex items-center gap-1">
                                      <Warehouse className="h-3 w-3" />
                                      <SelectValue />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {warehouseList.map(w => (
                                      <SelectItem key={w.id} value={w.code}>
                                        <span className="flex items-center gap-2">
                                          <Warehouse className="h-3 w-3 text-emerald-600" />
                                          <span>{w.name_ar}</span>
                                          <span className="text-xs text-muted-foreground font-mono">({w.code})</span>
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <Warehouse className="h-3 w-3" />
                                    <span className="text-xs">{effectiveName}</span>
                                    {/* TASK 6: "New" badge for freshly created warehouses */}
                                    {effectiveInfo && !warehouseList.some(w => w.code === wh.code) && (
                                      <Badge className="text-[9px] px-1 py-0 bg-emerald-600 text-white">
                                        {language === 'ar' ? 'جديد' : 'New'}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">{effectiveCode}</span>
                                </div>
                              )}
                            </TableHead>
                          );
                        })}
                        <TableHead className="sticky top-0 bg-blue-50 dark:bg-blue-900/20 whitespace-nowrap text-blue-700 dark:text-blue-300 font-bold text-center">
                          {language === 'ar' ? '📦 الإجمالي' : '📦 Total'}
                        </TableHead>
                      </>
                    ) : (
                      <TableHead className="sticky top-0 bg-background">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    )}
                    <TableHead className="sticky top-0 bg-background">{language === 'ar' ? 'الشراء' : 'Purchase'}</TableHead>
                    <TableHead className="sticky top-0 bg-background">{language === 'ar' ? 'التكلفة' : 'Cost'}</TableHead>
                    <TableHead className="sticky top-0 bg-background">{language === 'ar' ? 'المفرد' : 'Retail'}</TableHead>
                    <TableHead className="sticky top-0 bg-background">{language === 'ar' ? 'الجملة' : 'Wholesale'}</TableHead>
                    <TableHead className="sticky top-0 bg-background whitespace-nowrap">{language === 'ar' ? 'نصف جملة' : 'Half W.'}</TableHead>
                    <TableHead className="sticky top-0 bg-background whitespace-nowrap">{language === 'ar' ? 'سعر خاص' : 'Special'}</TableHead>
                  </>
                )}
                {(entityType === 'customers' || entityType === 'suppliers') && (
                  <TableHead className="sticky top-0 bg-background">
                    {language === 'ar' ? 'الرصيد الافتتاحي' : 'Balance'}
                  </TableHead>
                )}
                <TableHead className="sticky top-0 bg-background w-[130px]">
                  {language === 'ar' ? 'العملة' : 'Currency'}
                </TableHead>

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
                    <TableCell className="max-w-[180px] truncate font-medium">{String(d.name_ar || d.name_en || '-')}</TableCell>
                    {/* Render additional language names here */}
                    {displayFields.filter(f => f.name !== 'code' && f.name !== 'name_ar').map(field => (
                      <TableCell key={field.name} className="max-w-[150px] truncate text-sm text-cyan-700 dark:text-cyan-300 bg-cyan-50/10 dark:bg-cyan-900/10">
                        {d[field.name]?.toString() || '-'}
                      </TableCell>
                    ))}

                    {entityType === 'products' && (
                      <>
                        <TableCell>
                          {editMode ? (
                            <Select
                              value={normalizeUnit(String(d.unit || ''))}
                              onValueChange={(v) => updateRowField(globalIdx, 'unit', v)}
                            >
                              <SelectTrigger className="h-8 w-[95px] text-xs">
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
                          ) : (
                            <span className="text-sm font-medium">{normalizeUnit(String(d.unit || ''))}</span>
                          )}
                        </TableCell>
                        {/* ═══ MULTI-WAREHOUSE QTY CELLS ═══ */}
                        {hasMultiWarehouse ? (
                          <>
                            {uniqueWarehouses.map(wh => {
                              const materialCode = String(d.code || '');
                              const breakdown = warehouseBreakdown[materialCode] || [];
                              const entry = breakdown.find(e => e.warehouse_code === wh.code);
                              const qty = entry?.qty || 0;
                              return (
                                <TableCell key={wh.code} className="text-center bg-emerald-50/30 dark:bg-emerald-900/10">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      value={String(qty || '')}
                                      onChange={(e) => {
                                        const newQty = Number(e.target.value) || 0;
                                        // Update breakdown entry
                                        const updated = [...(warehouseBreakdown[materialCode] || [])];
                                        const idx = updated.findIndex(x => x.warehouse_code === wh.code);
                                        if (idx >= 0) {
                                          updated[idx] = { ...updated[idx], qty: newQty };
                                        } else {
                                          updated.push({ warehouse_code: wh.code, qty: newQty, unit_cost: 0 });
                                        }
                                        warehouseBreakdown[materialCode] = updated;
                                        // Update total opening_qty
                                        const total = updated.reduce((sum, x) => sum + x.qty, 0);
                                        updateRowField(globalIdx, 'opening_qty', String(total));
                                      }}
                                      className="h-8 w-[75px] text-xs text-center"
                                      min={0}
                                    />
                                  ) : (
                                    <span className={`text-sm font-mono ${qty > 0 ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground'}`}>
                                      {qty > 0 ? qty.toLocaleString() : '-'}
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center bg-blue-50/30 dark:bg-blue-900/10">
                              <span className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300">
                                {Number(d.opening_qty || 0).toLocaleString()}
                              </span>
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>
                            {editMode ? (
                              <Input
                                type="number"
                                value={String(d.opening_qty ?? '')}
                                onChange={(e) => updateRowField(globalIdx, 'opening_qty', e.target.value)}
                                className="h-8 w-[80px] text-xs text-center"
                                min={0}
                              />
                            ) : (
                              <span className="text-sm font-mono">{String(d.opening_qty ?? '-')}</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.purchase_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'purchase_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-slate-600">{String(d.purchase_price ?? '-')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.cost_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'cost_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-amber-600">{String(d.cost_price ?? '-')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.sale_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'sale_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-green-600">{String(d.sale_price ?? '-')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.wholesale_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'wholesale_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-blue-600">{String(d.wholesale_price ?? '-')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.half_wholesale_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'half_wholesale_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-indigo-600">{String(d.half_wholesale_price ?? '-')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editMode ? (
                            <Input
                              type="number"
                              value={String(d.special_price ?? '')}
                              onChange={(e) => updateRowField(globalIdx, 'special_price', e.target.value)}
                              className="h-8 w-[80px] text-xs text-center"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm font-mono text-purple-600">{String(d.special_price ?? '-')}</span>
                          )}
                        </TableCell>
                      </>
                    )}

                    {(entityType === 'customers' || entityType === 'suppliers') && (
                      <TableCell>
                        {editMode ? (
                          <Input
                            type="number"
                            value={String(d.opening_balance ?? '')}
                            onChange={(e) => updateRowField(globalIdx, 'opening_balance', e.target.value)}
                            className="h-8 w-[110px] text-xs text-center"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-sm font-mono">{String(d.opening_balance ?? '-')}</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      {editMode ? (
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
                      ) : (
                        <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {String(d.currency || defaultCurrency || baseCurrency || '-')}
                        </span>
                      )}
                    </TableCell>



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
        </div>

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
        {isCOA && !allCOAGroupsAssigned && (
          <span className="text-sm text-red-600 font-medium">
            {language === 'ar' ? '⚠️ يجب تحديد المجموعة الأم لكل حساب' : '⚠️ All accounts need a parent group'}
          </span>
        )}
        <Button
          onClick={() => {
            // Inject parent_id into mapped_data before executing COA import
            if (isCOA && onUpdateRows) {
              const validRows = importRows.filter(r => r.status === 'valid');
              const updatedRows = importRows.map((row) => {
                const validIdx = validRows.indexOf(row);
                if (validIdx === -1) return row;
                const parentId = parentGroupMap.get(validIdx);
                const parentGroup = accountGroups.find(g => g.id === parentId);
                return {
                  ...row,
                  mapped_data: {
                    ...row.mapped_data,
                    _parent_id: parentId || null,
                    _account_type_id: parentGroup?.account_type_id || null,
                    _level: parentGroup ? (parentGroup.level + 1) : 2,
                  }
                };
              });
              onUpdateRows(updatedRows);
              // Small delay to ensure state is committed before execution
              setTimeout(() => onExecute(defaultCurrency || undefined), 50);
            } else {
              onExecute(defaultCurrency || undefined);
            }
          }}
          size="lg"
          disabled={isLoading || rowsToImport.length === 0 || !currencyResolved || (isCOA && !allCOAGroupsAssigned)}
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
