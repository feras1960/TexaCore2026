// ═══════════════════════════════════════════════════
// 💾 Storage Handler — Supabase Storage Image Upload
// رفع الصور المُنشأة إلى Supabase Storage
// ═══════════════════════════════════════════════════

import type { GeneratedImageResult } from "./image-generator.ts"

// ═══ Types ═══
export interface StoredImage {
  url: string;
  storagePath: string;
  type: string;
  mimeType: string;
  fileName: string;
  scope: string;
  colorKey?: string;
  colorName?: string;
  fileSize: number;
}

// ═══ Upload Single Image ═══
async function uploadImage(
  adminClient: any,
  companyId: string,
  materialCode: string,
  image: GeneratedImageResult,
): Promise<StoredImage | null> {
  const BUCKET = 'material-images';

  try {
    // Decode Base64 → Uint8Array
    const binaryStr = atob(image.imageData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build file name and path
    const ext = image.mimeType.includes('png') ? 'png' : 'jpg';
    const suffix = image.colorKey ? `_${image.colorKey}` : '';
    const fileName = `ai_${image.type}${suffix}_${Date.now()}.${ext}`;
    const storagePath = `${companyId}/${materialCode}/ai/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await adminClient.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: image.mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadErr) {
      console.error(`[Storage] ❌ Upload failed for ${fileName}:`, uploadErr.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      console.error(`[Storage] ❌ Failed to get public URL for ${storagePath}`);
      return null;
    }

    console.log(`[Storage] ✅ Uploaded ${fileName} (${(bytes.length / 1024).toFixed(0)}KB)`);

    return {
      url: urlData.publicUrl,
      storagePath,
      type: image.type,
      mimeType: image.mimeType,
      fileName,
      scope: image.scope,
      colorKey: image.colorKey,
      colorName: image.colorName,
      fileSize: bytes.length,
    };
  } catch (err) {
    console.error(`[Storage] ❌ Upload error:`, err);
    return null;
  }
}

// ═══ Upload All Generated Images (Batch) ═══
export async function uploadAllImages(
  adminClient: any,
  companyId: string,
  materialCode: string,
  images: GeneratedImageResult[],
): Promise<StoredImage[]> {
  const stored: StoredImage[] = [];

  for (const image of images) {
    const result = await uploadImage(adminClient, companyId, materialCode, image);
    if (result) {
      stored.push(result);
    }
  }

  console.log(`[Storage] 📊 Uploaded ${stored.length}/${images.length} images`);
  return stored;
}

// ═══ Log AI Usage to Database ═══
export async function logAIUsage(
  adminClient: any,
  params: {
    tenantId: string;
    companyId: string;
    materialId: string;
    generationTypes: string[];
    creditsUsed: number;
    imagesCount: number;
    model: string;
    colorCount: number;
    userId: string;
    status: 'completed' | 'partial' | 'failed';
  },
): Promise<void> {
  try {
    await adminClient.from('ai_image_usage').insert({
      tenant_id: params.tenantId,
      company_id: params.companyId,
      material_id: params.materialId,
      generation_type: params.generationTypes.join(','),
      credits_used: params.creditsUsed,
      images_count: params.imagesCount,
      model_used: params.model,
      prompt_used: `types: ${params.generationTypes.join(',')} | colors: ${params.colorCount}`,
      status: params.status,
      created_by: params.userId,
    });
    console.log(`[Storage] 📝 Usage logged: ${params.creditsUsed} credits, ${params.imagesCount} images`);
  } catch (err) {
    // لا نوقف العملية بسبب فشل التسجيل
    console.warn('[Storage] ⚠️ Failed to log usage:', err);
  }
}
