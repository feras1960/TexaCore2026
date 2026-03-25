// =============================================
// استوديو الإلهام - خدمة التصدير الشامل
// تصدير إلى: مادة / صورة / PDF / مشاركة
// =============================================

import { supabase } from '@/lib/supabase';
import type { ExportSettings, DesignConcept } from './types';
import { updateDesignConcept } from './DesignConceptService';

const MATERIAL_IMAGES_BUCKET = 'material-images';

/**
 * خدمة التصدير الموحدة
 */
export class ExportService {

  /**
   * تصدير التصميم إلى بطاقة مادة موجودة
   */
  static async exportToMaterial(
    concept: DesignConcept,
    materialId: string,
    companyId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!concept.image_url) {
        return { success: false, error: 'No image to export' };
      }

      // Download the concept image
      const response = await fetch(concept.image_url);
      const blob = await response.blob();

      // Upload to material-images bucket
      const fileName = `inspiration_${concept.id}_${Date.now()}.jpg`;
      const storagePath = `${companyId}/${materialId}/inspiration/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from(MATERIAL_IMAGES_BUCKET)
        .upload(storagePath, blob, { contentType: blob.type || 'image/jpeg' });

      if (uploadErr) {
        return { success: false, error: uploadErr.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(MATERIAL_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      // Insert into material_images table
      const { error: insertErr } = await (supabase as any)
        .from('material_images')
        .insert({
          material_id: materialId,
          image_url: urlData.publicUrl,
          storage_path: storagePath,
          image_type: 'ai_inspiration',
          is_primary: false,
        });

      if (insertErr) {
        console.error('[ExportService] material_images insert error:', insertErr);
        // Non-fatal: the image is uploaded even if metadata fails
      }

      // Update concept with exported material reference
      await updateDesignConcept(concept.id, {
        exported_to_material_id: materialId,
      } as any);

      console.log('[ExportService] ✅ Exported to material:', materialId);
      return { success: true };

    } catch (err: any) {
      console.error('[ExportService] ❌ Export error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * تنزيل الصورة كـ JPG أو PNG
   */
  static async downloadAsImage(
    imageUrl: string,
    fileName: string,
    format: 'jpg' | 'png' = 'jpg',
  ): Promise<void> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ExportService] Download error:', err);
    }
  }

  /**
   * إنشاء رابط مؤقت آمن للمشاركة (Signed URL)
   */
  static async createShareLink(
    storagePath: string,
    expiresInSeconds = 86400, // 24 hours
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('concept-images')
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error) {
        console.error('[ExportService] Signed URL error:', error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.error('[ExportService] Share link error:', err);
      return null;
    }
  }

  /**
   * مشاركة عبر واتساب
   */
  static shareViaWhatsApp(message: string, imageUrl?: string): void {
    const text = encodeURIComponent(
      imageUrl ? `${message}\n\n${imageUrl}` : message
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  /**
   * مشاركة عبر تيليغرام
   */
  static shareViaTelegram(message: string, imageUrl?: string): void {
    const text = encodeURIComponent(
      imageUrl ? `${message}\n\n${imageUrl}` : message
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(imageUrl || '')}&text=${text}`, '_blank');
  }
}
