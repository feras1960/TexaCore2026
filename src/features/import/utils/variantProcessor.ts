import { SupabaseClient } from '@supabase/supabase-js';

export async function processVariantsForImport(
  supabase: SupabaseClient<any, "public", any>,
  validRows: any[],
  companyId: string,
  tenantId: string,
  language: string,
  categoryTranslations: Record<string, any>
) {
  // 1. Collect dimensions and parent materials from the import mapping
  const categorySet = new Set<string>();
  const parentMaterialSet = new Set<string>();
  
  // Data structure to hold parent materials, their specific variants and axis values
  const parentMap = new Map<string, {
    category: string;
    variants: any[]; // The actual SKUs
    designValues: Set<string>;
    colorValues: Set<string>;
    // Multi-language parent names (derived from first variant)
    parentNameAr: string;
    parentNameEn: string;
    parentNameUk: string;
    parentNameTr: string;
    parentNameRu: string;
  }>();

  for (const row of validRows) {
    const d = row.mapped_data || {};
    const category = String(d.category || '').trim();
    if (category) categorySet.add(category);

    const materialName = String(d.name_ar || d.name_en || d.name_tr || d.code || '');

    // Attempt to extract Design and Color using the same logic from PreviewTree
    const designKey = extractDesignKey(d);
    let colorKey = extractColorKey(d);

    const baseName = cleanParentName(materialName, designKey, colorKey);
    parentMaterialSet.add(baseName);

    if (!parentMap.has(baseName)) {
      // Derive parent names in ALL languages from the first variant
      const nameEn = String(d.name_en || '').trim();
      const nameUk = String(d.name_uk || '').trim();
      const nameTr = String(d.name_tr || '').trim();
      const nameRu = String(d.name_ru || '').trim();
      // Clean each language name using the same logic (strip design/color words)
      const parentNameEn = nameEn ? cleanParentName(nameEn, designKey, colorKey) : '';
      const parentNameUk = nameUk ? cleanParentName(nameUk, designKey, colorKey) : '';
      const parentNameTr = nameTr ? cleanParentName(nameTr, designKey, colorKey) : '';
      const parentNameRu = nameRu ? cleanParentName(nameRu, designKey, colorKey) : '';

      parentMap.set(baseName, {
        category,
        variants: [],
        designValues: new Set<string>(),
        colorValues: new Set<string>(),
        parentNameAr: baseName,
        parentNameEn: parentNameEn || baseName,
        parentNameUk,
        parentNameTr,
        parentNameRu,
      });
    }

    const p = parentMap.get(baseName)!;
    
    if (designKey) p.designValues.add(designKey);
    if (colorKey) p.colorValues.add(colorKey);
    
    p.variants.push({
      originalRow: row,
      designKey,
      colorKey,
      code: d.code,
      barcode: d.barcode || '',
      nameAr: d.name_ar || '',
      nameEn: d.name_en || '',
      nameUk: d.name_uk || '',
      nameTr: d.name_tr || '',
      nameRu: d.name_ru || '',
    });
  }

  // 2. Resolve or Create Axes (Design, Color)
  let designAxisId: string | null = null;
  let colorAxisId: string | null = null;
  
  // Check if Design/Color axes exist
  const { data: axesData } = await supabase
    .from('variant_axes')
    .select('id, code')
    .eq('company_id', companyId)
    .in('code', ['design', 'color']);
    
  let designAxis = axesData?.find(a => a.code === 'design');
  if (!designAxis) {
     const { data: newAxis } = await supabase.from('variant_axes').insert({
        tenant_id: tenantId, company_id: companyId, code: 'design',
        name_ar: 'التصميم', name_en: 'Design', axis_type: 'image', display_type: 'images'
     }).select('id').single();
     if (newAxis) designAxisId = newAxis.id;
  } else {
     designAxisId = designAxis.id;
  }
  
  let colorAxis = axesData?.find(a => a.code === 'color');
  if (!colorAxis) {
     const { data: newAxis } = await supabase.from('variant_axes').insert({
        tenant_id: tenantId, company_id: companyId, code: 'color',
        name_ar: 'اللون', name_en: 'Color', axis_type: 'color', display_type: 'color_swatches'
     }).select('id').single();
     if (newAxis) colorAxisId = newAxis.id;
  } else {
     colorAxisId = colorAxis.id;
  }

  // 3. Create or Resolve Axis Values in BATCH (instead of one-by-one)
  const designValueIds: Record<string, string> = {};
  const colorValueIds: Record<string, string> = {};

  // Collect all unique design and color values
  const allDesigns = new Set<string>();
  const allColors = new Set<string>();
  for (const [, info] of parentMap) {
    info.designValues.forEach(v => allDesigns.add(v));
    info.colorValues.forEach(v => allColors.add(v));
  }

  // ═══ BATCH: Fetch ALL existing design values in ONE query ═══
  if (designAxisId && allDesigns.size > 0) {
    const designNames = [...allDesigns].filter(Boolean);
    const { data: existingDesigns } = await supabase
      .from('variant_axis_values')
      .select('id, name_ar')
      .eq('axis_id', designAxisId)
      .eq('company_id', companyId)
      .in('name_ar', designNames);
    
    // Map existing
    existingDesigns?.forEach(d => { designValueIds[d.name_ar] = d.id; });
    
    // Batch insert missing designs
    const missingDesigns = designNames.filter(n => !designValueIds[n]);
    if (missingDesigns.length > 0) {
      const toInsert = missingDesigns.map((designName, idx) => ({
        tenant_id: tenantId, company_id: companyId, axis_id: designAxisId,
        code: `DSG-${designName}`, name_ar: designName,
        name_en: DESIGN_EN_MAP[designName] || designName,
        sort_order: (existingDesigns?.length || 0) + idx
      }));
      const { data: inserted } = await supabase
        .from('variant_axis_values').insert(toInsert).select('id, name_ar');
      inserted?.forEach(d => { designValueIds[d.name_ar] = d.id; });
    }
  }

  // ═══ BATCH: Fetch ALL existing color values in ONE query ═══
  if (colorAxisId && allColors.size > 0) {
    const colorNames = [...allColors].filter(Boolean);
    const { data: existingColors } = await supabase
      .from('variant_axis_values')
      .select('id, name_ar')
      .eq('axis_id', colorAxisId)
      .eq('company_id', companyId)
      .in('name_ar', colorNames);
    
    // Map existing
    existingColors?.forEach(c => { colorValueIds[c.name_ar] = c.id; });
    
    // Batch insert missing colors
    const missingColors = colorNames.filter(n => !colorValueIds[n]);
    if (missingColors.length > 0) {
      const toInsert = missingColors.map((colorName, idx) => ({
        tenant_id: tenantId, company_id: companyId, axis_id: colorAxisId,
        code: `CLR-${colorName}`, name_ar: colorName,
        name_en: COLOR_EN_MAP[colorName] || colorName,
        hex_code: COLOR_HEX_MAP[colorName] || '#808080',
        sort_order: (existingColors?.length || 0) + idx
      }));
      const { data: inserted } = await supabase
        .from('variant_axis_values').insert(toInsert).select('id, name_ar');
      inserted?.forEach(c => { colorValueIds[c.name_ar] = c.id; });
    }
  }

  // Helper maps for DB
  const createdGroupIds: Record<string, string> = {};
  const parentMaterialIds: Record<string, string> = {};

  // 4. Skip group creation in variant mode — parent materials ARE the top level
  // Groups (fabric_groups) are only used for non-variant category imports

  // 5. Create Parent Materials + Variant Config + Product Variants
  // ═══ BATCH PRE-FETCH: Get all potential existing parent materials ═══
  const parentNames = [...parentMap.keys()];
  const parentCodes = parentNames.map(n => {
    const m = n.match(/^(\d{4,5})/);
    return m ? m[1] : null;
  }).filter(Boolean) as string[];

  // Fetch existing parents by name and code in parallel
  const [existingByNameResult, existingByCodeResult] = await Promise.all([
    parentNames.length > 0
      ? supabase.from('fabric_materials').select('id, name_ar')
          .eq('company_id', companyId).eq('is_variant_parent', true)
          .in('name_ar', parentNames)
      : Promise.resolve({ data: [] }),
    parentCodes.length > 0
      ? supabase.from('fabric_materials').select('id, code')
          .eq('company_id', companyId).in('code', parentCodes)
      : Promise.resolve({ data: [] }),
  ]);

  const existingByNameMap = new Map<string, string>();
  const existingByCodeMap = new Map<string, string>();
  (existingByNameResult.data || []).forEach((m: any) => existingByNameMap.set(m.name_ar, m.id));
  (existingByCodeResult.data || []).forEach((m: any) => existingByCodeMap.set(m.code, m.id));

  for (const [parentName, info] of parentMap.entries()) {
    const groupId = createdGroupIds[info.category];
    
    // Extract the 5-digit code from the parent name
    const parentCodeMatch = parentName.match(/^(\d{4,5})/);
    const parentCode = parentCodeMatch ? parentCodeMatch[1] : `P-${Date.now().toString(36).toUpperCase()}`;
    
    // Use pre-fetched lookup (O(1) instead of DB query)
    let parentId = existingByNameMap.get(parentName) || null;

    if (!parentId) {
      parentId = existingByCodeMap.get(parentCode) || null;
      
      // If found by code, update it to be a variant parent
      if (parentId) {
        await supabase.from('fabric_materials')
          .update({ is_variant_parent: true, has_variants: true })
          .eq('id', parentId);
      }
    }

    if (!parentId) {
      // Use upsert to avoid 409 conflicts — if parent exists, update it
      // Use proper multi-language names from the import data
      const { data: upsertedParent, error: upsertErr } = await supabase
        .from('fabric_materials')
        .upsert({
           tenant_id: tenantId, company_id: companyId,
           name_ar: info.parentNameAr || parentName,
           name_en: info.parentNameEn || parentName,
           name_uk: info.parentNameUk || null,
           name_tr: info.parentNameTr || null,
           name_ru: info.parentNameRu || null,
           code: parentCode,
           is_variant_parent: true, has_variants: true,
           status: 'active', unit: 'meter', currency: 'USD'
        }, { onConflict: 'tenant_id,code' })
        .select('id').single();
      
      if (upsertErr) {
        // Fallback: lookup by code
        const { data: retryLookup } = await supabase
          .from('fabric_materials')
          .select('id')
          .eq('company_id', companyId)
          .eq('code', parentCode)
          .maybeSingle();
        parentId = retryLookup?.id;
      } else if (upsertedParent) {
        parentId = upsertedParent.id;
      }
    }
    
    if (parentId) {
       parentMaterialIds[parentName] = parentId;
       
       // ═══ PARALLEL: Link Parent to Axes (Config) ═══
       const axisConfigPromises: Array<PromiseLike<any>> = [];
       if (info.designValues.size > 0 && designAxisId) {
          axisConfigPromises.push(supabase.from('product_variant_config').upsert({
             product_id: parentId, axis_id: designAxisId, company_id: companyId, 
             product_table: 'fabric_materials',
             is_hierarchical: false, sort_order: 0
          }, { onConflict: 'product_id, axis_id' }));
       }
       if (info.colorValues.size > 0 && colorAxisId) {
          axisConfigPromises.push(supabase.from('product_variant_config').upsert({
             product_id: parentId, axis_id: colorAxisId, company_id: companyId, 
             product_table: 'fabric_materials',
             is_hierarchical: true, parent_axis_id: designAxisId, sort_order: 1
          }, { onConflict: 'product_id, axis_id' }));
       }
       if (axisConfigPromises.length > 0) await Promise.all(axisConfigPromises);

       // 6. Create Product Variants in BATCH for this parent
       const variantsToInsert: any[] = [];
       const variantSkuMap = new Map<string, any>(); // sku -> variant info
       
       for (const variant of info.variants) {
         const sku = variant.barcode || variant.code || `${parentCode}-${variant.designKey}-${variant.colorKey}`;
         const displayNameAr = `${parentName} - ${variant.designKey} - ${variant.colorKey}`;
         // Build proper English display name using English parent name and translated design/color
         const designEn = DESIGN_EN_MAP[variant.designKey] || variant.designKey;
         const colorEn = COLOR_EN_MAP[variant.colorKey] || variant.colorKey;
         const displayNameEn = variant.nameEn || `${info.parentNameEn || parentName} - ${designEn} - ${colorEn}`;
         
         variantSkuMap.set(sku, variant);
         variantsToInsert.push({
           tenant_id: tenantId, company_id: companyId,
           product_id: parentId, parent_product_id: parentId,
           product_table: 'fabric_materials',
           sku,
           name_ar: variant.nameAr || displayNameAr,
           name_en: variant.nameEn || displayNameEn,
           display_name_ar: displayNameAr,
           display_name_en: displayNameEn,
           is_active: true, sort_order: 0,
           variant_data: { design: variant.designKey, color: variant.colorKey, legacy_code: variant.code }
         });
       }

       // Batch insert all variants for this parent
       let insertedVariants: any[] = [];
       if (variantsToInsert.length > 0) {
         // Use upsert to handle re-imports gracefully (actual constraint is tenant_id, sku)
         const { data: batchResult, error: batchErr } = await supabase
           .from('product_variants')
           .upsert(variantsToInsert, { onConflict: 'tenant_id, sku' })
           .select('id, sku');
         
         if (batchErr) {
           console.warn('Batch variant upsert failed, falling back to individual:', batchErr.message);
           // Fallback: insert one by one for conflict handling
           for (const v of variantsToInsert) {
             // Try upsert first
             const { data: single, error: singleErr } = await supabase.from('product_variants')
               .upsert(v, { onConflict: 'tenant_id, sku' })
               .select('id, sku').single();
             if (single) {
               insertedVariants.push(single);
             } else if (singleErr) {
               // Fallback: lookup existing by sku
               const { data: existing } = await supabase.from('product_variants')
                 .select('id, sku')
                 .eq('tenant_id', v.tenant_id)
                 .eq('sku', v.sku)
                 .maybeSingle();
               if (existing) insertedVariants.push(existing);
             }
           }
         } else if (batchResult) {
           insertedVariants = batchResult;
         }
       }

       // Map variant IDs back to rows and build variant values batch
       const variantValuesToInsert: any[] = [];
       
       for (const iv of insertedVariants) {
         const variant = variantSkuMap.get(iv.sku);
         if (!variant) continue;
         
         // Store variant_id back on the row for fabric_materials insert
         if (variant.originalRow?.mapped_data) {
           variant.originalRow.mapped_data._variantId = iv.id;
           variant.originalRow.mapped_data._parentMaterialId = parentId;
           // Store variant_data for fabric_materials.variant_data column
           variant.originalRow.mapped_data._variantData = {
             design: {
               name_ar: variant.designKey,
               name_en: variant.designKey,
               value_id: designValueIds[variant.designKey] || null,
               sort_order: 0,
             },
             color: {
               name_ar: variant.colorKey,
               name_en: COLOR_EN_MAP[variant.colorKey] || variant.colorKey,
               code: variant.colorKey,
               value_id: colorValueIds[variant.colorKey] || null,
               sort_order: 1,
             },
           };
         }
         
         // Collect variant values for batch insert
         if (variant.designKey && designAxisId && designValueIds[variant.designKey]) {
           variantValuesToInsert.push({
             variant_id: iv.id, axis_id: designAxisId, value_id: designValueIds[variant.designKey]
           });
         }
         if (variant.colorKey && colorAxisId && colorValueIds[variant.colorKey]) {
           variantValuesToInsert.push({
             variant_id: iv.id, axis_id: colorAxisId, value_id: colorValueIds[variant.colorKey]
           });
         }
       }
       
       // Batch upsert all variant values (handles re-imports gracefully)
       if (variantValuesToInsert.length > 0) {
         // Deduplicate: keep only the last entry per (variant_id, axis_id) pair
         const deduped = new Map<string, typeof variantValuesToInsert[0]>();
         for (const val of variantValuesToInsert) {
           deduped.set(`${val.variant_id}|${val.axis_id}`, val);
         }
         const uniqueValues = Array.from(deduped.values());

         const { error: valErr } = await supabase
           .from('product_variant_values')
           .upsert(uniqueValues, { onConflict: 'variant_id, axis_id' });
         if (valErr) {
           console.warn('Batch variant values upsert error:', valErr.message);
           // Fallback: insert one-by-one with conflict handling
           for (const val of uniqueValues) {
             const { error: singleErr } = await supabase
               .from('product_variant_values')
               .upsert(val, { onConflict: 'variant_id, axis_id' });
             if (singleErr) {
               console.warn('Single variant value upsert error:', singleErr.message);
             }
           }
         }
       }
    }
  }

  return {
    parentMap,
    parentMaterialIds,
    designAxisId,
    colorAxisId,
    designValueIds,
    colorValueIds,
    createdGroupIds
  };
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

export const cleanParentName = (materialName: string, design: string, color: string): string => {
  let cleaned = materialName;
  
  // All known design words to strip (multi-language)
  const allDesigns = [
    // Arabic
    'سادة', 'مقلم', 'مورد', 'مربعات', 'مطرز', 'جاكار', 'مطبوع', 'تويل', 'منقوش',
    // English
    'Plain', 'Striped', 'Floral', 'Checkered', 'Embroidered', 'Jacquard', 'Printed', 'Twill', 'Dotted',
    // Ukrainian/Russian
    'Однотонний', 'Однотонній', 'У смужку', 'Квітковий', 'Картатий', 'Вишитий', 'Жакардовий', 'Друкований', 'Принт',
    'Гладкий', 'Полосатый', 'Цветочный', 'Клетчатый', 'Вышитый', 'Жаккардовый', 'Печатный',
    // Turkish
    'Düz', 'Çizgili', 'Çiçekli', 'Ekose', 'İşlemeli', 'Jakar', 'Baskılı',
  ];
  // All known color words to strip (multi-language)
  const allColors = [
    // Arabic
    'أبيض', 'أسود', 'كحلي', 'أحمر', 'ذهبي', 'بيج', 'أزرق', 'أخضر', 'بني', 'رمادي', 'وردي',
    // English
    'White', 'Black', 'Navy', 'Red', 'Gold', 'Beige', 'Blue', 'Green', 'Brown', 'Gray', 'Pink',
    // Ukrainian
    'Білий', 'Чорний', 'Червоний', 'Золотий', 'Бежевий', 'Синій', 'Зелений', 'Коричневий', 'Сірий', 'Рожевий',
    // Russian
    'Белый', 'Чёрный', 'Красный', 'Золотой', 'Бежевый', 'Синий', 'Зелёный', 'Коричневый', 'Серый', 'Розовый',
    // Turkish
    'Beyaz', 'Siyah', 'Kırmızı', 'Altın', 'Bej', 'Mavi', 'Yeşil', 'Kahverengi', 'Gri', 'Pembe',
  ];
  
  // Strip specific design/color first (with prefixes)
  if (design && design !== 'Other' && design !== 'أخرى') {
    cleaned = cleaned.replace(new RegExp(`تصميم\\s+${design}`, 'ig'), '');
  }
  if (color && color !== 'Other' && color !== 'أخرى') {
    cleaned = cleaned.replace(new RegExp(`لون\\s+${color}`, 'ig'), '');
  }
  
  // Strip ALL known design words (case-insensitive)
  for (const d of allDesigns) {
    cleaned = cleaned.replace(new RegExp(`\\b${d}\\b`, 'ig'), '');
    // Also try without word boundaries for non-Latin scripts
    cleaned = cleaned.replace(new RegExp(d, 'ig'), '');
  }
  // Strip ALL known color words (with or without prefix)
  for (const c of allColors) {
    cleaned = cleaned.replace(new RegExp(`لون\\s+${c}`, 'ig'), '');
    cleaned = cleaned.replace(new RegExp(`\\b${c}\\b`, 'ig'), '');
    cleaned = cleaned.replace(new RegExp(c, 'ig'), '');
  }
  
  // Strip any orphaned prefix words
  cleaned = cleaned.replace(/تصميم/g, '').replace(/لون/g, '');
  // Collapse whitespace, dashes, commas
  return cleaned.replace(/[-–,\s]+/g, ' ').trim() || 'General';
};

// Extract design key from all name fields
export const extractDesignKey = (data: Record<string, unknown>): string => {
  const designWordsMap: Record<string, { ar: string }> = {
    'سادة': { ar: 'سادة' }, 'plain': { ar: 'سادة' },
    'مقلم': { ar: 'مقلم' }, 'striped': { ar: 'مقلم' },
    'مورد': { ar: 'مورد' }, 'floral': { ar: 'مورد' },
    'مربعات': { ar: 'مربعات' }, 'checkered': { ar: 'مربعات' },
    'مطرز': { ar: 'مطرز' }, 'embroidered': { ar: 'مطرز' },
    'جاكار': { ar: 'جاكار' }, 'jacquard': { ar: 'جاكار' },
    'مطبوع': { ar: 'مطبوع' }, 'printed': { ar: 'مطبوع' },
    'تويل': { ar: 'تويل' }, 'twill': { ar: 'تويل' },
    'منقوش': { ar: 'منقوش' }, 'dotted': { ar: 'منقوش' },
  };
  const codeDesignNames: Record<string, { ar: string }> = {
    'PL': { ar: 'سادة' }, 'ST': { ar: 'مقلم' }, 'FL': { ar: 'مورد' },
    'CH': { ar: 'مربعات' }, 'EM': { ar: 'مطرز' }, 'JQ': { ar: 'جاكار' },
    'PR': { ar: 'مطبوع' }, 'TW': { ar: 'تويل' }, 'DT': { ar: 'منقوش' },
  };

  const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
  const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).join(' ');
  for (const [word, info] of Object.entries(designWordsMap)) {
    if (allNames.includes(word.toLowerCase())) return info.ar;
  }
  const code = String(data.code || '');
  const parts = code.split('-');
  const designCode = parts.length >= 3 ? parts[2] : '';
  if (designCode && codeDesignNames[designCode]) return codeDesignNames[designCode].ar;
  return '';
};

// Extract color key from all name fields
export const extractColorKey = (data: Record<string, unknown>): string => {
  const colorWordsMap: Record<string, { ar: string }> = {
    'أبيض': { ar: 'أبيض' }, 'white': { ar: 'أبيض' }, 'белый': { ar: 'أبيض' }, 'білий': { ar: 'أبيض' },
    'أسود': { ar: 'أسود' }, 'black': { ar: 'أسود' }, 'чёрный': { ar: 'أسود' }, 'чорний': { ar: 'أسود' },
    'كحلي': { ar: 'كحلي' }, 'navy': { ar: 'كحلي' },
    'أحمر': { ar: 'أحمر' }, 'red': { ar: 'أحمر' }, 'красный': { ar: 'أحمر' }, 'червоний': { ar: 'أحمر' },
    'ذهبي': { ar: 'ذهبي' }, 'gold': { ar: 'ذهبي' },
    'بيج': { ar: 'بيج' }, 'beige': { ar: 'بيج' },
    'أزرق': { ar: 'أزرق' }, 'blue': { ar: 'أزرق' }, 'синий': { ar: 'أزرق' }, 'синій': { ar: 'أزرق' },
    'أخضر': { ar: 'أخضر' }, 'green': { ar: 'أخضر' },
    'بني': { ar: 'بني' }, 'brown': { ar: 'بني' },
    'رمادي': { ar: 'رمادي' }, 'gray': { ar: 'رمادي' },
    'وردي': { ar: 'وردي' }, 'pink': { ar: 'وردي' },
  };
  const codeColorNames: Record<string, { ar: string }> = {
    'WH': { ar: 'أبيض' }, 'BK': { ar: 'أسود' }, 'NV': { ar: 'كحلي' },
    'RD': { ar: 'أحمر' }, 'GD': { ar: 'ذهبي' }, 'BG': { ar: 'بيج' },
    'BL': { ar: 'أزرق' }, 'GR': { ar: 'أخضر' }, 'BR': { ar: 'بني' },
    'GY': { ar: 'رمادي' }, 'PK': { ar: 'وردي' },
  };

  const nameFields = ['name_ar', 'name_en', 'name_tr', 'name_ru', 'name_uk', 'name'];
  const allNames = nameFields.map(f => String(data[f] || '').toLowerCase()).join(' ');
  for (const [word, info] of Object.entries(colorWordsMap)) {
    if (allNames.includes(word.toLowerCase())) return info.ar;
  }
  const code = String(data.code || '');
  const parts = code.split('-');
  const colorCode = parts.length >= 4 ? parts[3] : '';
  if (colorCode && codeColorNames[colorCode]) return codeColorNames[colorCode].ar;
  return '';
};

// ═══════════════════════════════════════════════════════════════
// Translation Maps
// ═══════════════════════════════════════════════════════════════

const DESIGN_EN_MAP: Record<string, string> = {
  'سادة': 'Plain', 'مقلم': 'Striped', 'مورد': 'Floral', 'مربعات': 'Checkered',
  'مطرز': 'Embroidered', 'جاكار': 'Jacquard', 'مطبوع': 'Printed', 'تويل': 'Twill',
  'منقوش': 'Dotted',
};

const COLOR_EN_MAP: Record<string, string> = {
  'أبيض': 'White', 'أسود': 'Black', 'كحلي': 'Navy', 'أحمر': 'Red',
  'ذهبي': 'Gold', 'بيج': 'Beige', 'أزرق': 'Blue', 'أخضر': 'Green',
  'بني': 'Brown', 'رمادي': 'Gray', 'وردي': 'Pink',
};

const COLOR_HEX_MAP: Record<string, string> = {
  'أبيض': '#FFFFFF', 'أسود': '#000000', 'كحلي': '#000080', 'أحمر': '#DC2626',
  'ذهبي': '#D4A017', 'بيج': '#F5F5DC', 'أزرق': '#2563EB', 'أخضر': '#16A34A',
  'بني': '#8B4513', 'رمادي': '#6B7280', 'وردي': '#EC4899',
};
