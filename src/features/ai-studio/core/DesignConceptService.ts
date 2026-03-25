// =============================================
// استوديو الإلهام - خدمة التصاميم (CRUD Service)
// =============================================

import { supabase } from '@/lib/supabase';
import type { DesignConcept, DesignSettings, DesignStatus, GalleryFilters } from './types';

const TABLE = 'design_concepts';
const BUCKET = 'concept-images';

// ===== إنشاء تصميم جديد =====
export async function createDesignConcept(params: {
  title?: string;
  description?: string;
  imageUrl: string;
  storagePath: string;
  promptSettings: DesignSettings;
  sourceMaterialIds?: string[];
  sourceUploadedUrls?: string[];
  customerId?: string;
  parentId?: string;
  tags?: string[];
}): Promise<{ data: DesignConcept | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .insert({
        title: params.title || null,
        description: params.description || null,
        image_url: params.imageUrl,
        storage_path: params.storagePath,
        prompt_settings: params.promptSettings,
        source_material_ids: params.sourceMaterialIds || [],
        source_uploaded_urls: params.sourceUploadedUrls || [],
        customer_id: params.customerId || null,
        parent_id: params.parentId || null,
        tags: params.tags || [],
        version: params.parentId ? undefined : 1, // auto-increment if variation
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('[InspirationStudio] Create error:', err);
    return { data: null, error: err };
  }
}

// ===== جلب تصميم واحد =====
export async function getDesignConcept(id: string): Promise<DesignConcept | null> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[InspirationStudio] Get error:', error);
    return null;
  }
  return data;
}

// ===== جلب تصاميم مع فلاتر (للمعرض) =====
export async function listDesignConcepts(
  filters: GalleryFilters,
  page = 0,
  pageSize = 20
): Promise<{ data: DesignConcept[]; count: number }> {
  let query = (supabase as any)
    .from(TABLE)
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.season) query = query.contains('prompt_settings', { season: filters.season });
  if (filters.patternStyle) query = query.contains('prompt_settings', { patternStyle: filters.patternStyle });
  if (filters.createdBy) query = query.eq('created_by', filters.createdBy);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.searchQuery) query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);

  // Sorting
  const ascending = filters.sortBy === 'oldest';
  if (filters.sortBy === 'most_liked') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending });
  }

  // Pagination
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error('[InspirationStudio] List error:', error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}

// ===== جلب تصاميم عميل محدد =====
export async function listCustomerConcepts(customerId: string): Promise<DesignConcept[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[InspirationStudio] Customer concepts error:', error);
    return [];
  }
  return data || [];
}

// ===== جلب تاريخ النسخ =====
export async function getVersionHistory(conceptId: string): Promise<DesignConcept[]> {
  // Get the root concept
  const concept = await getDesignConcept(conceptId);
  if (!concept) return [];

  // Find root (walk up parent chain)
  let rootId = concept.id;
  let current = concept;
  while (current.parent_id) {
    const parent = await getDesignConcept(current.parent_id);
    if (!parent) break;
    rootId = parent.id;
    current = parent;
  }

  // Now get all versions from root
  const versions: DesignConcept[] = [current];
  const { data } = await (supabase as any)
    .from(TABLE)
    .select('*')
    .not('parent_id', 'is', null)
    .order('version', { ascending: true });

  // Filter chain manually (since recursive CTEs aren't available via PostgREST)
  if (data) {
    const childMap = new Map<string, DesignConcept[]>();
    data.forEach((d: DesignConcept) => {
      const arr = childMap.get(d.parent_id!) || [];
      arr.push(d);
      childMap.set(d.parent_id!, arr);
    });

    const queue = [rootId];
    while (queue.length > 0) {
      const pid = queue.shift()!;
      const children = childMap.get(pid) || [];
      children.forEach(c => {
        versions.push(c);
        queue.push(c.id);
      });
    }
  }

  return versions;
}

// ===== تحديث تصميم =====
export async function updateDesignConcept(
  id: string,
  updates: Partial<Pick<DesignConcept, 'title' | 'description' | 'status' | 'tags' | 'customer_id' | 'exported_to_material_id'>>
): Promise<boolean> {
  const { error } = await (supabase as any)
    .from(TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[InspirationStudio] Update error:', error);
    return false;
  }
  return true;
}

// ===== إعجاب / إلغاء إعجاب =====
export async function toggleLike(id: string, increment: boolean): Promise<boolean> {
  const concept = await getDesignConcept(id);
  if (!concept) return false;

  const newCount = Math.max(0, concept.likes_count + (increment ? 1 : -1));
  return updateDesignConcept(id, { } as any); // simplified - use RPC in production
}

// ===== حذف تصميم =====
export async function deleteDesignConcept(id: string): Promise<boolean> {
  // Delete storage file first
  const concept = await getDesignConcept(id);
  if (concept?.storage_path) {
    await supabase.storage.from(BUCKET).remove([concept.storage_path]);
  }

  const { error } = await (supabase as any)
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[InspirationStudio] Delete error:', error);
    return false;
  }
  return true;
}

// ===== رفع صورة للتخزين =====
export async function uploadConceptImage(
  blob: Blob,
  companyId: string,
  fileName?: string
): Promise<{ url: string; path: string } | null> {
  const name = fileName || `concept_${Date.now()}.jpg`;
  const storagePath = `${companyId}/concepts/${name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

  if (error) {
    console.error('[InspirationStudio] Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { url: urlData.publicUrl, path: storagePath };
}
