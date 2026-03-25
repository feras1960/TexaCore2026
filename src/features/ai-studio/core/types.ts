// =============================================
// استوديو الإلهام - الأنواع والتعريفات (Types)
// =============================================
// ⚠️ جميع التسميات تعتمد على مفاتيح ترجمة (i18n keys)
//    لا يوجد أي نص ثابت هنا - استخدم t('inspirationStudio.xxx')

export type DesignStatus = 'draft' | 'published' | 'archived';

// Generation modes: inspired = new pattern, professional = same fabric + pro photo + optional recolor
export type GenerationMode = 'inspired' | 'professional';

export type FabricType = 
  | 'silk' | 'velvet' | 'linen' | 'cotton' | 'lace' 
  | 'chiffon' | 'satin' | 'tweed' | 'denim' | 'jacquard' | 'organza';

export type ApplicationMethod = 'printed' | 'embroidered' | 'woven_jacquard';

export type Season = 'spring_summer' | 'autumn_winter' | 'timeless';

export type PatternStyle = 
  | 'damask' | 'geometric' | 'floral' | 'abstract' 
  | 'minimalist' | 'oriental' | 'botanical' | 'stripes';

export type SceneType = 
  // عرض القماش (Fabric Display)
  | 'flat_lay' | 'table_display' | 'hanging' | 'rolls' | 'swirl' | 'macro'
  // منتجات (Products)
  | 'dress' | 'evening_gown' | 'abaya' | 'suit'
  | 'curtain' | 'bedding' | 'sofa' | 'cushion';

export type ExportType = 'material' | 'image' | 'pdf' | 'share';

export type AspectRatio = 'landscape' | 'portrait' | 'square';

// ===== Inspiration Source =====
export interface InspirationSource {
  type: 'system_material' | 'uploaded' | 'url';
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  imageUrl: string;
  role: 'texture' | 'pattern' | 'full_reference';
}

// ===== Design Settings (saved in prompt_settings JSONB) =====
export interface DesignSettings {
  sources: InspirationSource[];
  generationMode: GenerationMode;
  fabricType: FabricType;
  applicationMethod: ApplicationMethod;
  season: Season;
  patternStyle: PatternStyle;
  baseColor: string;
  baseColorName: string;
  motifColor: string;
  motifColorName: string;
  sceneType: SceneType;
  customPromptHint?: string;
  customColors?: string[]; // User's favorite colors for batch
  colorTarget?: 'base' | 'motif' | 'both'; // Where to apply selected colors
  aspectRatio?: AspectRatio; // Image format: landscape (16:9), portrait (9:16), square (1:1)
  // Original colors from image analysis (to detect user changes)
  originalBaseColor?: string;
  originalMotifColor?: string;
  // AI-detected values (to show 🤖 AI vs ✏️ Manual badge)
  autoDetectedFabricType?: FabricType;
  autoDetectedApplicationMethod?: ApplicationMethod;
}

// ===== Design Concept (DB row) =====
export interface DesignConcept {
  id: string;
  tenant_id: string;
  company_id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  storage_path: string | null;
  prompt_settings: DesignSettings;
  source_material_ids: string[];
  source_uploaded_urls: string[];
  created_by: string;
  customer_id: string | null;
  version: number;
  parent_id: string | null;
  tags: string[];
  likes_count: number;
  status: DesignStatus;
  exported_to_material_id: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  customer_name?: string;
}

// ===== Generation Request =====
export interface GenerationRequest {
  settings: DesignSettings;
  referenceImages: string[];
}

// ===== Generation Result =====
export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  error?: string;
  modelUsed?: string;
  fabricAnalysis?: any;
}

// ===== Export Settings =====
export interface ExportSettings {
  type: ExportType;
  targetMaterialId?: string;
  createNewMaterial?: boolean;
  newMaterialName?: string;
  format?: 'jpg' | 'png';
  includeWatermark?: boolean;
  shareMethod?: 'link' | 'whatsapp' | 'telegram';
}

// ===== Gallery Filters =====
export interface GalleryFilters {
  season?: Season;
  patternStyle?: PatternStyle;
  status?: DesignStatus;
  createdBy?: string;
  customerId?: string;
  searchQuery?: string;
  sortBy: 'newest' | 'oldest' | 'most_liked';
}

// ===== i18n Key Mappings =====
// كل القيم هي مفاتيح ترجمة يتم استخدامها مع t('inspirationStudio.fabricTypes.silk')
// لا يوجد أي نص مباشر - فقط مفاتيح

export const FABRIC_TYPE_OPTIONS: FabricType[] = [
  'silk', 'velvet', 'linen', 'cotton', 'lace',
  'chiffon', 'satin', 'tweed', 'denim', 'jacquard', 'organza'
];

export const APPLICATION_METHOD_OPTIONS: ApplicationMethod[] = [
  'printed', 'embroidered', 'woven_jacquard'
];

export const SEASON_OPTIONS: Season[] = [
  'spring_summer', 'autumn_winter', 'timeless'
];

export const PATTERN_STYLE_OPTIONS: PatternStyle[] = [
  'damask', 'geometric', 'floral', 'abstract',
  'minimalist', 'oriental', 'botanical', 'stripes'
];

// عرض القماش — Fabric Display Scenes
export const FABRIC_DISPLAY_SCENES: SceneType[] = [
  'flat_lay', 'table_display', 'hanging', 'rolls', 'swirl', 'macro'
];

// منتجات — Product Scenes
export const PRODUCT_SCENES: SceneType[] = [
  'dress', 'evening_gown', 'abaya', 'suit',
  'curtain', 'bedding', 'sofa', 'cushion'
];

// All scenes combined
export const SCENE_TYPE_OPTIONS: SceneType[] = [
  ...FABRIC_DISPLAY_SCENES, ...PRODUCT_SCENES
];

// Helper: get i18n key for any option type
export function getFabricTypeKey(value: FabricType): string {
  return `inspirationStudio.fabricTypes.${value}`;
}
export function getApplicationMethodKey(value: ApplicationMethod): string {
  return `inspirationStudio.applicationMethods.${value}`;
}
export function getSeasonKey(value: Season): string {
  return `inspirationStudio.seasons.${value}`;
}
export function getPatternStyleKey(value: PatternStyle): string {
  return `inspirationStudio.patternStyles.${value}`;
}
export function getSceneTypeKey(value: SceneType): string {
  return `inspirationStudio.sceneTypes.${value}`;
}
export function getStatusKey(value: DesignStatus): string {
  return `inspirationStudio.statuses.${value}`;
}
