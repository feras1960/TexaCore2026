/**
 * ════════════════════════════════════════════════════════════════
 * 🤖 AI Image Generation Wizard 
 * معالج إنشاء صور المواد بالذكاء الاصطناعي — 4 خطوات
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    Wand2, Upload, Sparkles, Image as ImgIcon, Loader2,
    ChevronLeft, ChevronRight, Check, X, RotateCcw,
    Palette, Shirt, Sofa, Save, ZoomIn,
    Tag, QrCode, Barcode, Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import heic2any from 'heic2any';
import { createWatermarkedImage, WatermarkSettings, MaterialData } from './WatermarkEngine';

interface VariantGroupInfo {
    key: string;
    name_ar: string;
    name_en: string;
    type: 'design' | 'color';
    hex_color?: string;
}

interface GeneratedImage {
    url: string;
    storage_path?: string;
    type?: string;
    mime_type?: string;
    file_name?: string;
    scope?: string;
    color_key?: string;
    color_name?: string;
    accepted: boolean;
    generation_type?: string;
    prompt_used?: string;
    model_used?: string;
}

interface AIImageWizardProps {
    materialId: string;
    companyId: string;
    tenantId: string;
    materialCode: string;
    materialInfo: {
        name: string;
        design?: string;
        color?: string;
        composition?: string;
        category?: string;
        code?: string;
        fabric_type?: string;
        usage_type?: string;
    };
    variantGroups: VariantGroupInfo[];
    onClose: () => void;
    onImagesGenerated: (images: any[]) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

// ═══ Usage context options ═══
// ═══ Usage Scenario Categories ═══
const USAGE_CATEGORIES = [
    {
        id: 'women', labelAr: '👗 أزياء نسائية', labelEn: '👗 Women\'s Fashion',
        options: [
            { id: 'dress', icon: '👗', labelAr: 'فستان سهرة', labelEn: 'Evening Gown' },
            { id: 'cocktail', icon: '🥂', labelAr: 'فستان كوكتيل فاخر', labelEn: 'Luxury Cocktail Dress' },
            { id: 'wedding', icon: '👰', labelAr: 'فستان زفاف', labelEn: 'Wedding Gown' },
            { id: 'abaya', icon: '🧕', labelAr: 'عباءة / جلباب', labelEn: 'Abaya / Modest Wear' },
            { id: 'hijab', icon: '🧣', labelAr: 'حجاب / شال', labelEn: 'Hijab / Scarf' },
            { id: 'pajamas', icon: '🌙', labelAr: 'بيجاما نوم', labelEn: 'Sleep Pajamas' },
        ],
    },
    {
        id: 'men', labelAr: '🤵 أزياء رجالية', labelEn: '🤵 Men\'s Fashion',
        options: [
            { id: 'mensuit', icon: '🤵', labelAr: 'بذلة رسمية / طقم', labelEn: 'Formal Suit' },
            { id: 'shirt', icon: '👔', labelAr: 'قميص رسمي', labelEn: 'Dress Shirt' },
            { id: 'jacket', icon: '🧥', labelAr: 'جاكيت / بليزر', labelEn: 'Jacket / Blazer' },
            { id: 'tie', icon: '👔', labelAr: 'ربطة عنق / فيونكة', labelEn: 'Necktie / Bow Tie' },
        ],
    },
    {
        id: 'casual', labelAr: '🏃 أطفال ورياضة', labelEn: '🏃 Kids & Sport',
        options: [
            { id: 'kidswear', icon: '👶', labelAr: 'ملابس أطفال', labelEn: "Kids' Wear" },
            { id: 'sportswear', icon: '🏃', labelAr: 'ملابس رياضية', labelEn: 'Sportswear / Activewear' },
            { id: 'uniform', icon: '👷', labelAr: 'زي موحد / عمل', labelEn: 'Uniform / Workwear' },
        ],
    },
    {
        id: 'home', labelAr: '🏠 ديكور المنزل', labelEn: '🏠 Home Decor',
        options: [
            { id: 'bedding', icon: '🛏️', labelAr: 'مفرش سرير / لحاف', labelEn: 'Bedding / Duvet' },
            { id: 'curtain', icon: '🪟', labelAr: 'ستائر', labelEn: 'Curtains / Drapes' },
            { id: 'furniture', icon: '🛋️', labelAr: 'كنبة / أثاث', labelEn: 'Sofa / Upholstery' },
            { id: 'cushion', icon: '🧸', labelAr: 'وسائد ديكور', labelEn: 'Decorative Cushions' },
            { id: 'tablecloth', icon: '🍽️', labelAr: 'مفرش طاولة', labelEn: 'Tablecloth' },
        ],
    },
    {
        id: 'pro', labelAr: '🎬 عرض احترافي', labelEn: '🎬 Professional Display',
        options: [
            { id: 'ghost_mannequin', icon: '🪆', labelAr: 'مانيكان شفاف (Ghost)', labelEn: 'Ghost Mannequin' },
            { id: 'dynamic_flow', icon: '💨', labelAr: 'مودل بحركة انسيابية', labelEn: 'Dynamic Flow Model' },
            { id: 'side_by_side', icon: '↔️', labelAr: 'مانيكان + مودل (مقارنة)', labelEn: 'Side-by-Side Comparison' },
            { id: 'editorial', icon: '📰', labelAr: 'تصوير تحريري (Vogue)', labelEn: 'Editorial High-Fashion' },
            { id: 'roll', icon: '🧮', labelAr: 'لفة قماش في معرض (B2B)', labelEn: 'Fabric Roll Display (B2B)' },
        ],
    },
];
// Flat list for backward compatibility
const USAGE_OPTIONS = USAGE_CATEGORIES.flatMap(cat => cat.options);

// ═══ Age Range Options ═══
const AGE_OPTIONS = [
    { id: 'young', labelAr: 'شابة (20s)', labelEn: 'Young (20s)', prompt: 'representing a dynamic young woman in her 20s' },
    { id: 'active', labelAr: 'نشيطة (30s)', labelEn: 'Active (30s)', prompt: 'representing an active woman in her 30s' },
    { id: 'elegant', labelAr: 'أنيقة (40s)', labelEn: 'Elegant (40s)', prompt: 'representing an elegant woman in her 40s' },
    { id: 'classic', labelAr: 'كلاسيك (50s)', labelEn: 'Classic (50s)', prompt: 'representing a classic woman in her 50s' },
];

// ═══ Fabric Type Options ═══
const FABRIC_TYPE_OPTIONS = [
    { id: 'auto', labelAr: '🤖 تلقائي (يكتشف AI)', labelEn: '🤖 Auto (AI detects)' },
    { id: 'cotton', labelAr: '🧶 قطن', labelEn: '🧶 Cotton' },
    { id: 'silk', labelAr: '✨ حرير', labelEn: '✨ Silk' },
    { id: 'satin', labelAr: '💎 ساتان', labelEn: '💎 Satin' },
    { id: 'chiffon', labelAr: '🌸 شيفون', labelEn: '🌸 Chiffon' },
    { id: 'linen', labelAr: '🌾 كتان', labelEn: '🌾 Linen' },
    { id: 'velvet', labelAr: '🎭 مخمل', labelEn: '🎭 Velvet' },
    { id: 'polyester', labelAr: '🔷 بوليستر', labelEn: '🔷 Polyester' },
    { id: 'organza', labelAr: '🦋 أورجانزا', labelEn: '🦋 Organza' },
    { id: 'tulle', labelAr: '🩰 تول', labelEn: '🩰 Tulle' },
    { id: 'denim', labelAr: '👖 جينز / دنيم', labelEn: '👖 Denim' },
    { id: 'wool', labelAr: '🐑 صوف', labelEn: '🐑 Wool' },
    { id: 'lace', labelAr: '🌺 دانتيل', labelEn: '🌺 Lace' },
    { id: 'crepe', labelAr: '🌊 كريب', labelEn: '🌊 Crepe' },
    { id: 'taffeta', labelAr: '👑 تافتا', labelEn: '👑 Taffeta' },
    { id: 'jersey', labelAr: '🏃 جيرسي', labelEn: '🏃 Jersey' },
    { id: 'tweed', labelAr: '🧥 تويد', labelEn: '🧥 Tweed' },
    { id: 'jacquard', labelAr: '🎨 جاكار', labelEn: '🎨 Jacquard' },
    { id: 'brocade', labelAr: '👘 بروكار', labelEn: '👘 Brocade' },
    { id: 'canvas', labelAr: '🎨 كانفاس', labelEn: '🎨 Canvas' },
];

// ═══ Fabric Type → Relevant Usage Options Mapping ═══
const FABRIC_USAGE_MAP: Record<string, string[]> = {
    auto: [], // empty = show all
    cotton: ['dress', 'pajamas', 'shirt', 'kidswear', 'uniform', 'bedding', 'curtain', 'cushion', 'tablecloth', 'roll', 'ghost_mannequin', 'editorial'],
    silk: ['dress', 'cocktail', 'wedding', 'abaya', 'hijab', 'tie', 'cushion', 'roll', 'ghost_mannequin', 'dynamic_flow', 'editorial', 'side_by_side'],
    satin: ['dress', 'cocktail', 'wedding', 'abaya', 'hijab', 'pajamas', 'bedding', 'cushion', 'roll', 'ghost_mannequin', 'dynamic_flow', 'editorial'],
    chiffon: ['dress', 'cocktail', 'wedding', 'hijab', 'curtain', 'roll', 'dynamic_flow', 'editorial', 'ghost_mannequin'],
    linen: ['dress', 'shirt', 'pajamas', 'bedding', 'curtain', 'cushion', 'tablecloth', 'furniture', 'roll', 'ghost_mannequin', 'editorial'],
    velvet: ['dress', 'cocktail', 'abaya', 'jacket', 'curtain', 'furniture', 'cushion', 'roll', 'ghost_mannequin', 'editorial', 'side_by_side'],
    polyester: ['dress', 'shirt', 'sportswear', 'uniform', 'curtain', 'bedding', 'cushion', 'roll', 'ghost_mannequin'],
    organza: ['dress', 'cocktail', 'wedding', 'hijab', 'curtain', 'roll', 'dynamic_flow', 'ghost_mannequin'],
    tulle: ['dress', 'wedding', 'kidswear', 'curtain', 'roll', 'dynamic_flow', 'ghost_mannequin'],
    denim: ['jacket', 'shirt', 'kidswear', 'cushion', 'roll', 'ghost_mannequin'],
    wool: ['mensuit', 'jacket', 'coat', 'curtain', 'cushion', 'roll', 'ghost_mannequin', 'editorial', 'side_by_side'],
    lace: ['dress', 'cocktail', 'wedding', 'abaya', 'hijab', 'curtain', 'tablecloth', 'roll', 'ghost_mannequin', 'dynamic_flow', 'editorial'],
    crepe: ['dress', 'cocktail', 'abaya', 'hijab', 'shirt', 'roll', 'ghost_mannequin', 'dynamic_flow'],
    taffeta: ['dress', 'cocktail', 'wedding', 'curtain', 'cushion', 'roll', 'ghost_mannequin', 'dynamic_flow'],
    jersey: ['dress', 'pajamas', 'sportswear', 'kidswear', 'hijab', 'roll', 'dynamic_flow'],
    tweed: ['mensuit', 'jacket', 'cushion', 'roll', 'ghost_mannequin', 'editorial', 'side_by_side'],
    jacquard: ['dress', 'curtain', 'furniture', 'cushion', 'bedding', 'tablecloth', 'roll', 'ghost_mannequin', 'editorial'],
    brocade: ['dress', 'abaya', 'curtain', 'furniture', 'cushion', 'roll', 'ghost_mannequin', 'editorial'],
    canvas: ['cushion', 'furniture', 'uniform', 'roll', 'ghost_mannequin'],
};

export function AIImageWizard({
    materialId, companyId, tenantId, materialCode, materialInfo,
    variantGroups, onClose, onImagesGenerated,
}: AIImageWizardProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    // ═══ Auto-Detect Usage from Material Data ═══
    const autoDetectedUsage = (() => {
        if (materialInfo.usage_type) return materialInfo.usage_type;
        const haystack = [materialInfo.name, materialInfo.design, materialInfo.category, materialInfo.composition].filter(Boolean).join(' ').toLowerCase();
        if (/\b(furniture|upholster|sofa|موبيليا|كنب|أثاث|تنجيد|koltuk)\b/i.test(haystack)) return 'furniture';
        if (/\b(cushion|pillow|وسائد?|مخد|yastık)\b/i.test(haystack)) return 'cushion';
        if (/\b(tablecloth|table.?linen|مفرش.*طاولة|masa)\b/i.test(haystack)) return 'tablecloth';
        if (/\b(curtain|draper|ستار|perde)\b/i.test(haystack)) return 'curtain';
        if (/\b(bed|sheet|duvet|مفرش.*سرير|لحاف|yatak)\b/i.test(haystack)) return 'bedding';
        if (/\b(wedding|bridal|زفاف|عروس|عرس|gelinlik)\b/i.test(haystack)) return 'wedding';
        if (/\b(abaya|عباء|عبايا|جلباب)\b/i.test(haystack)) return 'abaya';
        if (/\b(hijab|حجاب|شال|eşarp)\b/i.test(haystack)) return 'hijab';
        if (/\b(pajam|pyjam|بيج|نوم|pijama)\b/i.test(haystack)) return 'pajamas';
        if (/\b(cocktail|كوكتيل|سهرة.*فاخر|parti)\b/i.test(haystack)) return 'cocktail';
        if (/\b(uniform|زي.*موحد|عمل|iş.?giyim)\b/i.test(haystack)) return 'uniform';
        if (/\b(jacket|blazer|جاكيت|بليزر|معطف|ceket)\b/i.test(haystack)) return 'jacket';
        if (/\b(tie|necktie|ربطة.*عنق|فيونكة|kravat)\b/i.test(haystack)) return 'tie';
        if (/\b(suit|blazer|formal|بذل|طقم رسمي|takım)\b/i.test(haystack)) return 'mensuit';
        if (/\b(kids?|child|أطفال|ولادي|çocuk)\b/i.test(haystack)) return 'kidswear';
        if (/\b(sport|athletic|رياض|سبور|spor)\b/i.test(haystack)) return 'sportswear';
        if (/\b(shirt|polo|قميص|gömlek)\b/i.test(haystack)) return 'shirt';
        if (/\b(dress|gown|فستان|سهر|elbise)\b/i.test(haystack)) return 'dress';
        return 'dress';
    })();

    // ═══ Auto-Detect Fabric Type from Material Data ═══
    const autoDetectedFabricType = (() => {
        if (materialInfo.fabric_type && materialInfo.fabric_type !== 'auto') return materialInfo.fabric_type;
        const haystack = [materialInfo.name, materialInfo.design, materialInfo.composition, materialInfo.category].filter(Boolean).join(' ').toLowerCase();
        // Check all known fabric types - order matters (more specific first)
        // Supports: EN, AR, TR, RU, UK, PL
        if (/\b(organza|أورجانزا|organze|органза|органза|organza)\b/i.test(haystack)) return 'organza';
        if (/\b(tulle|تول|tül|тюль|тюль|tiul)\b/i.test(haystack)) return 'tulle';
        if (/\b(chiffon|شيفون|şifon|шифон|шифон|szyfon)\b/i.test(haystack)) return 'chiffon';
        if (/\b(satin|ساتان|ستان|saten|атлас|сатин|атлас|сатин|satyna|atłas)\b/i.test(haystack)) return 'satin';
        if (/\b(silk|حرير|ipek|шёлк|шелк|шовк|jedwab)\b/i.test(haystack)) return 'silk';
        if (/\b(velvet|مخمل|قطيفة|kadife|бархат|оксамит|aksamit)\b/i.test(haystack)) return 'velvet';
        if (/\b(linen|كتان|keten|лён|льняной|льон|len)\b/i.test(haystack)) return 'linen';
        if (/\b(lace|دانتيل|dantel|кружево|мереживо|koronka)\b/i.test(haystack)) return 'lace';
        if (/\b(denim|جينز|دنيم|kot|деним|джинс|денім|джинс|dżins|denim)\b/i.test(haystack)) return 'denim';
        if (/\b(wool|صوف|yün|шерсть|вовна|wełna)\b/i.test(haystack)) return 'wool';
        if (/\b(tweed|تويد|твид|твід|tweed)\b/i.test(haystack)) return 'tweed';
        if (/\b(jacquard|جاكار|jakar|жаккард|жакард|żakard)\b/i.test(haystack)) return 'jacquard';
        if (/\b(brocade|بروكار|brokat|парча|парча|brokat)\b/i.test(haystack)) return 'brocade';
        if (/\b(crepe|كريب|krep|креп|креп|krepa)\b/i.test(haystack)) return 'crepe';
        if (/\b(taffeta|تافتا|tafta|тафта|тафта|tafta)\b/i.test(haystack)) return 'taffeta';
        if (/\b(jersey|جيرسي|jarse|джерси|джерсі|dżersej)\b/i.test(haystack)) return 'jersey';
        if (/\b(canvas|كانفاس|kanvas|канва|холст|канва|brezent|płótno)\b/i.test(haystack)) return 'canvas';
        if (/\b(polyester|بوليستر|بولي|полиэстер|поліестер|poliester)\b/i.test(haystack)) return 'polyester';
        if (/\b(cotton|قطن|قطني|pamuk|pamuklu|хлопок|хлопковый|бавовна|bawełna)\b/i.test(haystack)) return 'cotton';
        // Fallback: check composition for common fibers
        if (/\b(100%.*cotton|cotton.*100%|قطن.*100|100.*قطن|100%.*хлопок|100%.*бавовна|100%.*bawełna)\b/i.test(haystack)) return 'cotton';
        if (/\b(100%.*poly|poly.*100%|100%.*полиэстер|100%.*поліестер|100%.*poliester)\b/i.test(haystack)) return 'polyester';
        return 'auto'; // truly unknown
    })();

    // ═══ Constants ═══
    const MAX_IMAGES = 5;

    // ═══ State ═══
    const [step, setStep] = useState<WizardStep>(1);
    const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [selectedUsage, setSelectedUsage] = useState<string>(autoDetectedUsage);
    const [selectedAge, setSelectedAge] = useState<string>('elegant');
    const [selectedFabricType, setSelectedFabricType] = useState<string>(
        autoDetectedFabricType !== 'auto' ? autoDetectedFabricType : (materialInfo.fabric_type || 'auto')
    );
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
    const [colorApplyMode, setColorApplyMode] = useState<'background' | 'pattern' | 'all'>('all');
    
    // --- Image Type Specific Settings ---
    // Color Scopes (user chooses which global colors apply to which Image Type)
    const [studioSelectedColors, setStudioSelectedColors] = useState<Set<string>>(new Set(['original']));
    const [textureSelectedColors, setTextureSelectedColors] = useState<Set<string>>(new Set(['original']));
    const [usageSelectedColors, setUsageSelectedColors] = useState<Set<string>>(new Set(['original']));
    const [paletteSelectedColors, setPaletteSelectedColors] = useState<Set<string>>(new Set(['original']));
    const [compositeSelectedColors, setCompositeSelectedColors] = useState<Set<string>>(new Set(['original']));
    const [compositeMainColor, setCompositeMainColor] = useState<string>('original');

    // Studio Specific
    const [studioPresentationStyle, setStudioPresentationStyle] = useState<'draped' | 'flat' | 'bolt'>('draped');
    
    // Composite Card Config
    const [compFabricDraped, setCompFabricDraped] = useState(true);
    const [compFabricFlat, setCompFabricFlat] = useState(false);
    const [compShowColors, setCompShowColors] = useState(true);
    const [compShowInfo, setCompShowInfo] = useState(true);
    const [compShowScene, setCompShowScene] = useState(true);

    // Palette Card Config
    const [paletteIncludeOriginal, setPaletteIncludeOriginal] = useState(true);
    const [palettePresentationStyle, setPalettePresentationStyle] = useState<'draped' | 'flat'>('flat');
    // Usage Scene Config
    const [usageLighting, setUsageLighting] = useState<'cinematic' | 'daylight' | 'studio' | 'evening'>('cinematic');

    const [isGenerating, setIsGenerating] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Total tasks count
    const totalTasks = (() => {
        let count = 0;
        if (selectedTypes.has('studio')) count += studioSelectedColors.size;
        if (selectedTypes.has('texture')) count += textureSelectedColors.size;
        if (selectedTypes.has('usage')) count += usageSelectedColors.size;
        if (selectedTypes.has('palette')) count += 1;
        if (selectedTypes.has('composite')) count += 1;
        return count;
    })();

    // Auto-reset usage when fabric type changes
    React.useEffect(() => {
        const allowed = FABRIC_USAGE_MAP[selectedFabricType] || [];
        if (allowed.length > 0 && !allowed.includes(selectedUsage)) {
            setSelectedUsage(allowed[0]);
        }
    }, [selectedFabricType]);

    // ═══ Tag/Watermark Options ═══
    const [tagEnabled, setTagEnabled] = useState(true);
    const [companyWatermark, setCompanyWatermark] = useState('TexaCore');
    const [showMaterialCode, setShowMaterialCode] = useState(true);
    const [showMaterialName, setShowMaterialName] = useState(true);
    const [showComposition, setShowComposition] = useState(true);
    const [showDesign, setShowDesign] = useState(false);
    const [showColor, setShowColor] = useState(false);
    const [showQRCode, setShowQRCode] = useState(false);
    const [showBarcode, setShowBarcode] = useState(false);
    const [tagLanguage, setTagLanguage] = useState<'ar' | 'en' | 'tr' | 'bilingual'>(isAr ? 'ar' : 'en');
    const [tagPosition, setTagPosition] = useState<'bottom-left' | 'bottom-right' | 'top-right'>('bottom-left');

    const [priceMode, setPriceMode] = useState<'none' | 'wholesale' | 'retail'>('none');
    const [priceValue, setPriceValue] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');

    const [watermarkPreviewUrl, setWatermarkPreviewUrl] = useState<string | null>(null);
    const [isRenderingWatermark, setIsRenderingWatermark] = useState(false);

    // ═══ Realtime watermark preview effect ═══
    React.useEffect(() => {
        const accepted = generatedImages.filter(img => img.accepted);
        if (step !== 4 || accepted.length === 0) return;

        const wData: MaterialData = {
            code: materialCode,
            name_ar: materialInfo.name,
            name_en: materialInfo.name,
            composition: materialInfo.composition,
            design: materialInfo.design,
            color: materialInfo.color,
        };
        const wSettings: WatermarkSettings = {
            enabled: tagEnabled,
            companyName: companyWatermark,
            showCode: showMaterialCode,
            showName: showMaterialName,
            showComposition: showComposition,
            showDesign: showDesign,
            showColor: showColor,
            showQRCode: showQRCode,
            showBarcode: showBarcode,
            language: tagLanguage,
            position: tagPosition,
            priceMode: priceMode,
            priceValue: priceValue,
            currency: currency,
        };

        if (!tagEnabled) {
            setWatermarkPreviewUrl(accepted[0].url);
            return;
        }

        let isMounted = true;
        setIsRenderingWatermark(true);
        createWatermarkedImage(accepted[0].url, wSettings, wData)
            .then(blob => {
                if (isMounted) {
                    setWatermarkPreviewUrl(URL.createObjectURL(blob));
                }
            })
            .catch(err => {
                console.error('Preview error:', err);
                if (isMounted) setWatermarkPreviewUrl(accepted[0].url); // fallback
            })
            .finally(() => {
                if (isMounted) setIsRenderingWatermark(false);
            });

        return () => { isMounted = false; };
    }, [
        step, tagEnabled, companyWatermark, showMaterialCode, showMaterialName, 
        showComposition, showDesign, showColor, showQRCode, showBarcode, 
        tagLanguage, tagPosition, priceMode, priceValue, currency, generatedImages,
        materialCode, materialInfo
    ]);

    const colorGroups = variantGroups.filter(g => g.type === 'color');

    // ═══ Credits calculation ═══
    const creditsNeeded = (() => {
        let total = 0;
        if (selectedTypes.has('studio')) total += 1;
        if (selectedTypes.has('texture')) total += 1;
        if (selectedTypes.has('usage')) total += 1;
        if (selectedTypes.has('palette')) total += 0.5;
        if (selectedTypes.has('composite')) total += 1;
        total += selectedColors.size * 0.5;
        return total;
    })();

    // ═══ Step 1: Upload reference image ═══
    const isHEIC = (file: File) => {
        const name = file.name.toLowerCase();
        const type = file.type.toLowerCase();
        return name.endsWith('.heic') || name.endsWith('.heif') || type.includes('heic') || type.includes('heif');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let processedFile = file;

        // ═══ HEIC Conversion ═══
        if (isHEIC(file)) {
            setIsConverting(true);
            toast.info(isAr ? '🔄 جاري تحويل صورة HEIC...' : '🔄 Converting HEIC image...');

            try {
                const blob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.85,
                }) as Blob;

                processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
                    type: 'image/jpeg',
                });
                toast.success(isAr ? '✅ تم تحويل الصورة بنجاح' : '✅ Image converted successfully');
            } catch (err) {
                console.error('HEIC conversion failed:', err);
                toast.error(isAr ? '❌ فشل تحويل صورة HEIC — يرجى استخدام JPEG أو PNG' : '❌ HEIC conversion failed — please use JPEG or PNG');
                setIsConverting(false);
                return; // Don't proceed
            } finally {
                setIsConverting(false);
            }
        }

        // ═══ Create preview ═══
        try {
            const bitmap = await createImageBitmap(processedFile);
            const canvas = document.createElement('canvas');
            const MAX_PREVIEW = 400;
            let w = bitmap.width, h = bitmap.height;
            if (w > MAX_PREVIEW || h > MAX_PREVIEW) {
                if (w > h) { h = Math.round(h * MAX_PREVIEW / w); w = MAX_PREVIEW; }
                else { w = Math.round(w * MAX_PREVIEW / h); h = MAX_PREVIEW; }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
            bitmap.close();
            const previewUrl = canvas.toDataURL('image/jpeg', 0.7);
            setReferenceImage({ file: processedFile, preview: previewUrl });
        } catch {
            const preview = URL.createObjectURL(processedFile);
            setReferenceImage({ file: processedFile, preview });
        }
    };

    // ═══ Step 2: Toggle generation types ═══
    const toggleType = (type: string) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else {
                if (totalTasks >= MAX_IMAGES) {
                    toast.error(isAr ? `⚠️ الحد الأقصى ${MAX_IMAGES} صور` : `⚠️ Max ${MAX_IMAGES} images`);
                    return prev;
                }
                next.add(type);
            }
            return next;
        });
    };

    const toggleColor = (key: string) => {
        setSelectedColors(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAllColors = () => {
        if (selectedColors.size === colorGroups.length) {
            setSelectedColors(new Set());
        } else {
            const maxColorSlots = MAX_IMAGES - selectedTypes.size;
            const limited = colorGroups.slice(0, maxColorSlots).map(c => c.key);
            setSelectedColors(new Set(limited));
            if (colorGroups.length > maxColorSlots) {
                toast.info(isAr ? `تم تحديد ${maxColorSlots} ألوان (الحد الأقصى ${MAX_IMAGES} صور)` : `Selected ${maxColorSlots} colors (max ${MAX_IMAGES} images)`);
            }
        }
    };

    // ═══ Step 3: Generate images (V3: Two-Phase Pipeline with analysis caching) ═══
    const handleGenerate = async () => {
        if (!referenceImage) return;

        setIsGenerating(true);
        setGenerationProgress(5);
        setStep(3);

        try {
            // Convert file to base64
            setProgressLabel(isAr ? '📷 جاري ضغط الصورة...' : '📷 Compressing image...');
            const base64 = await fileToBase64(referenceImage.file);
            setGenerationProgress(8);

            // 🔐 Force refresh session FIRST to ensure valid JWT
            console.log('[AI-Wizard] 🔄 Refreshing session...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            let activeSession = refreshData?.session;
            
            if (!activeSession || refreshError) {
                // Fallback: try getting existing session
                console.warn('[AI-Wizard] ⚠️ Refresh failed, trying getSession...');
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                activeSession = existingSession;
            }
            
            if (!activeSession) {
                console.error('[AI-Wizard] ❌ No valid session');
                toast.error(isAr ? 'يرجى تسجيل الدخول مرة أخرى' : 'Please login again');
                setIsGenerating(false);
                return;
            }
            console.log('[AI-Wizard] ✅ Auth OK, user:', activeSession.user?.email, 'expires:', new Date((activeSession.expires_at || 0) * 1000).toLocaleTimeString());

            // Build task list: each type + each color = one API call
            const tasks: Array<{ type: string; color?: any; label: string }> = [];
            
            const getColorInfo = (key: string) => {
                if (key === 'original') return null; // original color
                const group = colorGroups.find(g => g.key === key);
                if (group) return { key, hex: group.hex_color || '#000', name_ar: group.name_ar, name_en: group.name_en, applyMode: colorApplyMode };
                if (key.startsWith('custom_')) {
                    const customInfo = (window as any).__customColors?.[key] || { hex: key.replace('custom_', ''), ar: key, en: key };
                    return { key, hex: customInfo.hex, name_ar: customInfo.ar, name_en: customInfo.en, applyMode: colorApplyMode };
                }
                return null;
            };

            if (selectedTypes.has('studio')) {
                studioSelectedColors.forEach(key => {
                    const c = getColorInfo(key);
                    tasks.push({ type: 'studio', color: c, label: `studio (${c ? (c.name_en || c.name_ar || key) : 'original'})` });
                });
            }
            if (selectedTypes.has('texture')) {
                textureSelectedColors.forEach(key => {
                    const c = getColorInfo(key);
                    tasks.push({ type: 'texture', color: c, label: `texture (${c ? (c.name_en || c.name_ar || key) : 'original'})` });
                });
            }
            if (selectedTypes.has('usage')) {
                usageSelectedColors.forEach(key => {
                    const c = getColorInfo(key);
                    tasks.push({ type: 'usage', color: c, label: `usage (${c ? (c.name_en || c.name_ar || key) : 'original'})` });
                });
            }
            if (selectedTypes.has('palette')) {
                tasks.push({ type: 'palette', color: null, label: 'palette (multi-color)' });
            }
            if (selectedTypes.has('composite')) {
                const mainKey = compositeSelectedColors.has(compositeMainColor) ? compositeMainColor : (Array.from(compositeSelectedColors)[0] || 'original');
                const c = getColorInfo(mainKey);
                tasks.push({ type: 'composite', color: c, label: 'composite (multi-color)' });
            }

            const tagOpts = {
                enabled: tagEnabled,
                companyWatermark, showMaterialCode, showMaterialName,
                showComposition, showDesign, showColor,
                showQRCode, showBarcode, tagLanguage, tagPosition,
            };

            const allResults: GeneratedImage[] = [];
            let cachedAnalysis: any = null; // Cached from first API response

            // Show analysis phase for first task
            setProgressLabel(isAr
                ? '🧠 جاري تحليل نسيج القماش بالذكاء الاصطناعي...'
                : '🧠 AI is analyzing the fabric texture...');
            setGenerationProgress(10);

            let cachedAccessToken: string | null = null;

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                const progressBase = 10 + Math.round((i / tasks.length) * 80);
                setGenerationProgress(progressBase);

                // Model-specific labels for better UX
                const typeLabels: Record<string, { ar: string; en: string; model: string }> = {
                    studio: { ar: '📷 صورة استوديو احترافية', en: '📷 Professional studio shot', model: 'TexaCore AI' },
                    texture: { ar: '🔍 صورة مقربة للنسيج', en: '🔍 Texture macro close-up', model: 'TexaCore AI' },
                    usage: { ar: '🏠 صورة واقعية للاستخدام', en: '🏠 Lifestyle scene', model: 'TexaCore AI' },
                    palette: { ar: '🎨 بطاقة العينات النسيجية', en: '🎨 Fabric swatch card', model: 'TexaCore AI' },
                    composite: { ar: '🖼️ بطاقة مختلطة', en: '🖼️ Mixed card', model: 'TexaCore AI' },
                    color_variant: { ar: `🖌️ تعميم لون: ${task.color?.name_ar || ''}`, en: `🖌️ Recolor: ${task.color?.name_en || ''}`, model: 'TexaCore AI' },
                };
                const label = typeLabels[task.type] || { ar: task.label, en: task.label, model: 'AI' };

                if (i === 0 && !cachedAnalysis) {
                    setProgressLabel(isAr
                        ? `🧠 تحليل القماش + ${label.ar} (${i+1}/${tasks.length})...`
                        : `🧠 Analyzing fabric + ${label.en} (${i+1}/${tasks.length})...`);
                } else {
                    setProgressLabel(isAr
                        ? `${label.ar} (${i+1}/${tasks.length}) — ${label.model}...`
                        : `${label.en} (${i+1}/${tasks.length}) — ${label.model}...`);
                }

                console.log(`[AI-Wizard] Generating ${i+1}/${tasks.length}: ${task.label} → ${label.model}`);
                console.log(`[AI-Wizard] 🧵 Fabric: selectedType=${selectedFabricType}, autoDetected=${autoDetectedFabricType}, materialName="${materialInfo?.name}", composition="${materialInfo?.composition || 'N/A'}"`);

                try {
                    // ═══════════════════════════════════════════════
                    // 🎯 DIRECT API: Call Google from browser (bypasses geo-block)
                    // Step 1: Get access token from Edge Function
                    // Step 2: Call Gemini directly from browser
                    // Step 3: Upload result to Supabase Storage
                    // ═══════════════════════════════════════════════
                    
                    // Build professional prompt based on type
                    const fabricType = selectedFabricType === 'auto' 
                        ? (cachedAnalysis?.fabric_type || materialInfo?.name || 'fabric')
                        : selectedFabricType;
                    const ageDesc = selectedAge === 'young' ? 'young woman in her 20s' :
                        selectedAge === 'active' ? 'confident woman in her 30s' :
                        selectedAge === 'elegant' ? 'elegant woman in her 40s' :
                        selectedAge === 'classic' ? 'refined woman in her 50s' : '';
                    
                    // ═══ Fabric-specific texture hints ═══
                    const fabricHints: Record<string, string> = {
                        velvet: 'Show the rich tactile texture, soft sheen, and plush pile of the velvet.',
                        silk: 'Capture the lightness, elegant sheen, and fluid drape of the silk.',
                        chiffon: 'Highlight the semi-transparency, airy floating quality, and fine weave of the chiffon.',
                        satin: 'Show the glossy, smooth surface and luxurious reflective sheen of the satin.',
                        linen: 'Focus on the natural slubs, earthy organic texture, and interlaced thread details of the linen.',
                        cotton: 'Show the soft, natural weave and comfortable texture of the cotton.',
                        organza: 'Capture the crisp transparency, stiff drape, and subtle shimmer of the organza.',
                        tulle: 'Show the fine mesh network, delicate structure, and ethereal lightness of the tulle.',
                        lace: 'Highlight the intricate patterns, microscopic thread details, and delicate vine/petal motifs of the lace.',
                        jacquard: 'Show the raised 3D patterns, contrast between shiny metallic threads and matte base of the jacquard.',
                        brocade: 'Highlight the ornate raised patterns, rich metallic threads, and royal texture of the brocade.',
                        crepe: 'Show the distinctive crinkled texture and matte finish of the crepe.',
                        taffeta: 'Capture the crisp rustling quality, subtle color-shifting sheen of the taffeta.',
                        denim: 'Show the characteristic twill weave, rugged texture, and indigo depth of the denim.',
                        wool: 'Highlight the warm, textured surface and natural fiber character of the wool.',
                        tweed: 'Show the complex multi-color weave, nubby texture, and heritage craftsmanship of the tweed.',
                        jersey: 'Capture the stretch, soft drape, and comfortable knit texture of the jersey.',
                        canvas: 'Show the sturdy, plain weave and durable texture of the canvas.',
                    };
                    const fabricHint = fabricHints[selectedFabricType] || '';
                    
                    // CRITICAL: "Generate an image" forces image output mode
                    const fabricLabel = selectedFabricType === 'auto' 
                        ? (materialInfo?.name || 'fabric') 
                        : selectedFabricType;
                    const REF = `Generate a new image. Study the attached reference to learn the pattern, motifs, and ${fabricLabel} texture.${fabricHint ? ' ' + fabricHint : ''}`;
                    
                    let prompt = '';
                    switch (task.type) {
                        case 'studio': {
                            let colorInstruction = '';
                            let patternInstruction = 'The fabric features the identical printed pattern, motifs, design, and base colors as the provided reference image.';
                            
                            if (task.color) {
                                // Important: Force English color names to avoid Gemini safety filter issues with mixed Arabic/English
                                const colorName = task.color.name_en || task.color.hex || 'the selected color';
                                const applyMode = task.color.applyMode || colorApplyMode || 'all';
                                patternInstruction = 'The fabric features the identical printed pattern, motifs, and design layout as the reference image, but with updated colors as instructed.';
                                
                                if (applyMode === 'background') {
                                    colorInstruction = ` Change ONLY the base/background color to ${colorName} (${task.color.hex}), keeping the original pattern colors exactly the same.`;
                                } else if (applyMode === 'pattern') {
                                    colorInstruction = ` Keep the original base color exactly the same, but change ONLY the pattern/motif colors to ${colorName} (${task.color.hex}).`;
                                } else {
                                    colorInstruction = ` Recolor the fabric to ${colorName} (${task.color.hex}).`;
                                }
                            }

                            if (studioPresentationStyle === 'flat') {
                                prompt = `${REF} Create a SEAMLESS REPEATING TEXTILE PATTERN image of this ${fabricLabel} fabric.${colorInstruction} The pattern must tile perfectly — fill every pixel of the frame. NO edges, NO borders, NO background, NO wrinkles, NO folds. Perfectly flat and pressed. The fabric surface should have subtle ${fabricLabel} weave texture visible at close inspection. Bright, even softbox lighting. Premium e-commerce product image. 8K, ultra-sharp.`;
                            } else if (studioPresentationStyle === 'bolt') {
                                prompt = `${REF} Close-up product photography of a large, thick fabric roll (bolt) of this premium ${fabricLabel} fabric resting on a luxurious wooden table in a high-end textile boutique.${colorInstruction} ${patternInstruction} The physical cylindrical roll of fabric MUST be clearly visible in the top half of the image. The fabric is partially unrolled from this core, cascading down beautiful, thick, majestic folds towards the camera and overflowing the table edge. The background features a softly blurred, brightly lit luxury fabric showroom (bokeh effect). Premium cinematic lighting, warm golden hour accents, and soft rim lighting on the fabric folds to highlight the authentic ${fabricLabel} texture and rich colors without dark shadows. 8K, ultra-sharp photorealistic catalog image.`;
                            } else {
                                prompt = `${REF} Top-down, flat lay product photography of a premium ${fabricLabel} fabric draped over a light, natural wood table edge.${colorInstruction} ${patternInstruction} The fabric features a central, perfect, tight swirl (twirl) from which elegant, deep, radiating folds emanate, showcasing the texture. The scene is lit with bright, airy, soft high-key studio lighting that creates gentle, realistic shadows to highlight the three-dimensional fabric folds without making the fabric look dark. In the foreground, resting directly on the wooden table surface near the fabric edge, are four small, natural, four-hole wooden buttons. The depth of field is critically sharp on the central fabric twirl and the foreground buttons. The composition is clean, minimalistic, and photorealistic. 8K, ultra-sharp.`;
                            }
                            break;
                        }
                        case 'texture': {
                            let colorInstruction2 = '';
                            if (task.color) {
                                // Important: Force English color names to avoid Gemini safety filter issues
                                const colorName = task.color.name_en || task.color.hex || 'the selected color';
                                const applyMode = task.color.applyMode || colorApplyMode || 'all';
                                if (applyMode === 'background') {
                                    colorInstruction2 = `Change ONLY the background/base color to ${colorName} (${task.color.hex}). Keep pattern colors as-is.`;
                                } else if (applyMode === 'pattern') {
                                    colorInstruction2 = `Keep the base color, change ONLY the pattern/design colors to ${colorName} (${task.color.hex}).`;
                                } else {
                                    colorInstruction2 = `Shift the entire fabric color scheme towards ${colorName} (${task.color.hex}). Both base and pattern shift proportionally.`;
                                }
                            }
                            prompt = `${REF} Create a NEW extreme macro close-up photograph of this ${fabricLabel} fabric. ${colorInstruction2} Show thread-level detail, natural ${fabricLabel} fiber structure, weave pattern, and print precision filling the entire frame. The texture must clearly look like ${fabricLabel}. Subtle rim lighting reveals translucency and surface sheen. Soft neutral studio lighting for maximum color accuracy. Professional textile catalog quality. 8K resolution.`;
                            break;
                        }
                        case 'palette': {
                            // Build color names + hex from selected colors for the palette card
                            const paletteColors: { name: string; hex: string }[] = [];
                            
                            // Iterate over the locally selected palette colors (from global ones)
                            for (const key of Array.from(paletteSelectedColors)) {
                                if (key === 'original') {
                                    paletteColors.push({ name: 'Original Color (Base Material)', hex: 'As Reference' });
                                    continue;
                                }
                                const group = colorGroups.find(g => g.key === key);
                                if (group) paletteColors.push({ name: group.name_en || group.name_ar || '', hex: group.hex_color || '#000' });
                                else if (key.startsWith('custom_')) {
                                    const ci = (window as any).__customColors?.[key];
                                    if (ci) paletteColors.push({ name: ci.en || ci.hex, hex: ci.hex });
                                }
                            }
                            
                            const palettePresentationHint = palettePresentationStyle === 'flat'
                                ? 'Each swatch shows the fabric laid flat and pressed, showing the pattern clearly.'
                                : 'Each swatch shows the fabric elegantly draped and swirled, showing texture and dimension.';
                            
                            const paletteApplyHint = colorApplyMode === 'background'
                                ? 'Each swatch shows the fabric pattern on a different colored background.'
                                : colorApplyMode === 'pattern'
                                    ? 'Each swatch shows the pattern/motif in a different color on the original background.'
                                    : 'Each swatch shows the entire fabric in a different color tone.';
                            
                            const maxSwatches = paletteIncludeOriginal ? 5 : 4;
                            const colorNamesStr = paletteColors.length > 0
                                ? `Show these specific color variants: ${paletteColors.slice(0, maxSwatches).map(c => `${c.name} (${c.hex})`).join(', ')}. ${palettePresentationHint} ${paletteApplyHint}`
                                : `Give each swatch an elegant poetic color name (like 'Sage Frost', 'Ivory Mistletoe', 'Cranberry Blush'). ${palettePresentationHint}`;
                            
                            const collectionName = materialInfo?.name || materialCode || 'EXCLUSIVE COLLECTION';
                            prompt = `${REF} Create a premium, elegant, and modern fabric collection card. The card should have a clean white or light grey background with NO ornate or vintage borders. Use sleek, contemporary typography. Title at top: "${collectionName.toUpperCase()}". Show ${Math.min(paletteColors.length || 4, maxSwatches)} actual fabric swatches cut from this ${fabricLabel} with clean or pinking shear edges arranged in a very modern, neat grid. Each swatch shows a different color variation of the fabric. ${colorNamesStr} Luxury textile catalog quality, 8K resolution, photorealistic.`;
                            break;
                        }
                        case 'composite': {
                            // Dynamic composite prompt for the Nana Banana 3-panel style
                            const compColors: { name: string; hex: string }[] = [];
                            for (const key of Array.from(compositeSelectedColors)) {
                                if (key === 'original') {
                                    compColors.push({ name: 'Original', hex: 'Original' });
                                    continue;
                                }
                                const group = colorGroups.find(g => g.key === key);
                                if (group) compColors.push({ name: group.name_en || group.key || '', hex: group.hex_color || '#000' });
                                else if (key.startsWith('custom_')) {
                                    const ci = (window as any).__customColors?.[key];
                                    if (ci) compColors.push({ name: ci.en || ci.hex, hex: ci.hex });
                                }
                            }
                            
                            // MAIN Color instruction for Top-Left and Bottom (the display and scene)
                            let mainColorInstruction = 'CRITICAL: Maintain the exact original colors, pattern, and motifs flawlessly. NO color alteration.';
                            if (task.color) {
                                const mainColorName = task.color.name_en || task.color.hex || 'the selected color';
                                const applyMode = task.color.applyMode || colorApplyMode || 'all';
                                if (applyMode === 'background') {
                                    mainColorInstruction = `CRITICAL COLORING: Recolor ONLY the base/background of the fabric to ${mainColorName} (${task.color.hex}). The original pattern/motifs MUST remain in their exact original colors.`;
                                } else if (applyMode === 'pattern') {
                                    mainColorInstruction = `CRITICAL COLORING: Keep the original base/background in its exact original color. Recolor ONLY the pattern/motifs to be ${mainColorName} (${task.color.hex}).`;
                                } else {
                                    mainColorInstruction = `CRITICAL COLORING: Change the overall fabric tone/primary color to distinctively ${mainColorName} (${task.color.hex}), while preserving the original pattern clearly.`;
                                }
                            }

                            const compApplyHint = colorApplyMode === 'background' ? 'Change the base/background color ONLY for the swatches, preserving the original pattern colors.'
                                : colorApplyMode === 'pattern' ? 'Change the pattern colors ONLY for the swatches, preserving the original base color.'
                                : 'Shift the overall tone of both pattern and base for the swatches.';
                            
                            const numSwatches = Math.min(compColors.length, 5); // Allow up to 5
                            const swatchList = compColors.slice(0, numSwatches).map((c, i) => {
                                if (c.hex === 'Original') return `Cutout ${i+1} (Original Pattern)`;
                                return `Cutout ${i+1} (${c.name.split(' ')[0]} tone)`;
                            }).join(', ');
                            
                            /* 
                            // PREVIOUS APPROACH 1: STRICT GRID (Failed due to AI counting/geometry hallucinations)
                            let layoutInstruction = 'Arrange exactly 5 separate square fabric cutouts...';
                            
                            // PREVIOUS APPROACH 2: BLANK CANVAS FOR REACT OVERLAY (Saved for reference)
                            let layoutInstruction = 'CRITICAL LAYOUT COMMAND: You MUST leave the entire background 100% pure solid white...';
                            */

                            // APPROACH 3: FANNED CARDS / SQUARES (User Preferred)
                            let layoutInstruction = `CRITICAL LAYOUT COMMAND: Arrange exactly ${numSwatches} square fabric cutouts perfectly arranged in a neat grid or slightly fanned out like premium fabric swatch cards. They MUST fill the space beautifully.`;

                            const swatchDesc = compColors.length > 0
                                ? `Display an elegant fabric swatch presentation showing exactly ${numSwatches} perfectly styled square fabric cutouts: ${swatchList}. CRITICAL INSTRUCTION: EVERY single square cutout MUST visibly show the actual woven fabric texture, natural lighting, and the original ${fabricLabel} pattern dyed in its respective DIFFERENT color. ${layoutInstruction} ABSOLUTELY DO NOT DRAW ANY TEXT, LABELS, BORDERS, OR CODES.`
                                : `Display elegant abstract fabric swatches flowing organically. DO NOT DRAW ANY TEXT.`;
                            
                            // Determine usage scene based on exact selection mapping
                            let compUsageScene = 'a grand, opulent master bedroom. The camera angle is a dynamic three-quarter side-angle shot (around 45 degrees), clearly showing the side of the bed, the nightstands, and the deep perspective of the luxurious room to showcase the majestic drape of the duvet cover seamlessly. Exquisite interior styling, premium architecture, ultra-detailed textures.';
                            const fashionUsages = ['dress', 'cocktail', 'wedding', 'abaya', 'hijab', 'pajamas'];
                            if (fashionUsages.includes(selectedUsage)) {
                                compUsageScene = `a high-fashion Vogue editorial. A beautiful, elegant female model wearing a breathtaking, custom-tailored ${selectedUsage} made flawlessly out of this exact fabric. Dynamic camera angle showing the flow of the garment. Luxurious studio setting, exquisite haute couture details.`;
                            } else if (selectedUsage === 'curtain') {
                                compUsageScene = 'a breathtaking luxury living room showcasing magnificent, flowing floor-to-ceiling window curtains made perfectly from this exact fabric. Dynamic angle to show the drape. High ceilings, lavish interior design, exquisite architectural details.';
                            } else if (selectedUsage === 'furniture') {
                                compUsageScene = 'an upscale architectural interior featuring a majestic modern designer sofa completely upholstered in this exact fabric. Dynamic three-quarter angle. Styled with high-end decor and supreme elegance.';
                            } else if (selectedUsage === 'cushion') {
                                compUsageScene = 'a sleek high-end designer couch beautifully decorated with large, luxurious throw cushions made strictly from this exact fabric. Premium interior styling.';
                            } else if (selectedUsage === 'table_linen') {
                                compUsageScene = 'a grand dining room with a long banquet table beautifully draped in an elegant tablecloth made from this exact fabric. Dynamic angle showing the fabric falling over the edge. Fine dining setup, crystal glasses, opulent details.';
                            } else if (selectedUsage === 'kidswear') {
                                compUsageScene = `a premium kids' fashion catalog. A playful but ultra-professional studio shot of a cute child wearing an exquisite outfit made entirely from this exact fabric. Sharp focus on the fabric pattern.`;
                            } else if (selectedUsage === 'shirt') {
                                compUsageScene = `a premium menswear GQ-style catalog. A professional highly-detailed shot of a crisp, perfectly tailored dress shirt made flawlessly from this exact fabric.`;
                            }
                            
                            // Emphatic instruction to keep the pattern upright!
                            compUsageScene += ' CRITICAL ORIENTATION REQUIREMENT: You MUST maintain the logical vertical alignment and gravity of the original fabric pattern. The motifs/pattern MUST stand upright precisely as it does in the original image. DO NOT rotate the pattern sideways or upside down when applying it to this lifestyle scene.';

                            const lightingInstruction = usageLighting === 'cinematic' ? 'Brilliant, vivid, commercial cinematic lighting. Highly saturated and incredibly bright. NO dark gloomy shadows, NO greyness.' :
                                usageLighting === 'daylight' ? 'Radiant, dazzling natural daytime sunlight flooding the room. Extremely bright, airy, and sun-drenched. NO gloominess.' :
                                usageLighting === 'evening' ? 'Warm, ultra-bright luxury evening lighting. Very vibrant, high contrast. NO dark spots.' :
                                'Brilliant, crisp, ultra-bright professional commercial studio lighting. Vivid, colorful, and uplifting. NO greyness.';

                            prompt = `${REF} Create a highly professional collage showcasing this ${fabricLabel}. The image MUST follow this exact full-bleed layout:

[TOP-LEFT QUADRANT: FABRIC MACRO SHOT]
A photorealistic close-up of the exact reference fabric gracefully swirled and draped. ${mainColorInstruction} Show off the rich folds and natural texture perfectly. ${lightingInstruction}. Stretch this from edge to edge of its quadrant.

[TOP-RIGHT QUADRANT: COLOR PALETTE]
${swatchDesc}
CRITICAL REQUIREMENT: These fabric cutouts MUST stretch completely to the very edges of this quadrant (FULL BLEED). DO NOT draw an inner white frame, DO NOT draw a margin, DO NOT draw a border around the cutouts. The fabric cutouts must touch each other tightly and fill the entire space from corner to corner. Important coloring instruction: ${compApplyHint}

[BOTTOM HALF: SINGLE WIDE LIFESTYLE SCENE] (Spanning the full width)
A breathtaking, photorealistic interior/fashion shot of ${compUsageScene}. The item must aggressively feature the fabric pattern flawlessly applied to it. ${mainColorInstruction} Architecture/styling must be ultra-luxurious, Vogue/Architectural Digest quality, 8K resolution, ultra-sharp focus, with ${lightingInstruction}. CRITICAL: This scene must be ONE continuous wide panoramic image completely filling the bottom half from edge to edge without any borders. DO NOT draw a white banner.

CRITICAL FINAL TOUCH: Draw fine, clean divider lines ONLY between the main sections (Top row, Bottom scene) to give it a neat catalog look. DO NOT draw any vertical lines cutting through the bottom lifestyle scene.`;
                            break;
                        }
                        case 'usage': {
                            const scenes: Record<string, string> = {
                                dress: `${REF} A high-end fashion editorial shot of ${ageDesc || 'a mannequin'} in a minimalist luxury studio wearing a bespoke floor-length evening gown crafted entirely from this ${fabricLabel}. The fabric shows realistic drapes, sheen, and light reflections. The pattern is gracefully scaled to highlight the gown's elegant silhouette. 8K resolution, cinematic lighting, sharp focus on fabric texture.`,
                                cocktail: `${REF} A Vogue-quality fashion editorial of ${ageDesc || 'a mannequin'} wearing a chic knee-length cocktail dress made from this ${fabricLabel}. Contemporary art gallery setting with marble walls. The fabric catches light beautifully, revealing its texture and print. Dramatic side lighting, shallow depth of field.`,
                                wedding: `${REF} A bridal magazine editorial of ${ageDesc || 'a mannequin'} wearing a modern, flowing bridal gown made from this ${fabricLabel}. Bright airy venue with natural light streaming through tall windows. The fabric drapes magnificently showing its full beauty. Warm, romantic lighting, 8K resolution.`,
                                abaya: `${REF} A modern modest fashion editorial of ${ageDesc || 'a mannequin'} wearing an elegant contemporary abaya made from this ${fabricLabel}. Minimalist marble and gold studio setting. Soft dramatic lighting highlights the fabric's texture and drape. Premium fashion photography quality.`,
                                hijab: `${REF} A fashion portrait of ${ageDesc || 'a mannequin'} wearing this ${fabricLabel} styled as a modern hijab with artistic draping. Soft studio lighting, clean background. The fabric's pattern and texture are clearly visible. High-fashion portrait photography quality.`,
                                pajamas: `${REF} A lifestyle editorial of ${ageDesc || 'a mannequin'} in comfortable modern pajamas made from this ${fabricLabel}. Bright Scandinavian bedroom with white linen, morning golden hour light streaming in. The fabric looks soft and inviting. Lifestyle photography, warm tones.`,
                                mensuit: `${REF} A GQ-quality fashion editorial of a male mannequin in a modern slim-fit three-piece suit made from this ${fabricLabel}. Clean studio with subtle city skyline backdrop. The fabric's weave and texture are sharp and detailed. Three-quarter view, dramatic lighting.`,
                                shirt: `${REF} A premium menswear editorial of a mannequin wearing a perfectly tailored dress shirt made from this ${fabricLabel}. Clean studio with neutral background. Every detail of the fabric weave and any pattern is crisp and visible. Professional fashion photography.`,
                                jacket: `${REF} A luxury outerwear editorial of a mannequin torso wearing a structured blazer made from this ${fabricLabel}. Dramatic studio lighting against a dark background reveals the fabric's texture and structure. Premium fashion catalog quality.`,
                                tie: `${REF} A luxury product photograph of an elegant necktie made from this ${fabricLabel}, artfully arranged on dark marble with soft spotlighting. The fabric's weave and pattern are visible in sharp detail. High-end accessories catalog photography.`,
                                kidswear: `${REF} A bright, playful children's fashion editorial showing a cute outfit made from this ${fabricLabel}. Colorful studio with fun props. The fabric looks comfortable and vibrant. Professional kids fashion photography with warm, inviting light.`,
                                sportswear: `${REF} A dynamic sports fashion editorial showing modern athletic wear made from this ${fabricLabel}. Action pose in a contemporary gym setting with dramatic lighting. The fabric shows performance qualities and movement. Sports editorial photography.`,
                                uniform: `${REF} A corporate fashion editorial showing a modern professional uniform made from this ${fabricLabel}. Clean studio with subtle office backdrop. The fabric looks professional and durable. Business wear catalog photography.`,
                                bedding: `${REF} A realistic high-end interior photography of a master bedroom. The bed is styled with a premium duvet set and pillows made from this ${fabricLabel}. Large windows show a beautiful garden view with natural daylight streaming in. White walls, light wood furniture, green plants. Architectural Digest quality interior photography. 8K resolution, photorealistic.`,
                                curtain: `${REF} A luxurious living room interior with floor-to-ceiling curtains made from this ${fabricLabel}. Natural light streams through the fabric showing its drape, texture, and any pattern. Contemporary furniture, light wood floors, indoor plants. The curtains are the focal point. Interior design magazine quality photography.`,
                                furniture: `${REF} A luxury living room with a modern designer sofa upholstered in this ${fabricLabel}. The setup highlights the harmony between the textile and a contemporary interior. City view through large window. Decorative cushions and accessories complement the fabric. Photorealistic, 8K resolution, architectural photography.`,
                                cushion: `${REF} Decorative throw cushions made from this ${fabricLabel} arranged artistically on a modern light sofa. Minimalist living room with natural light, indoor plants, warm tones. The fabric pattern is clearly visible on each cushion. Instagram home decor aesthetic, lifestyle photography.`,
                                tablecloth: `${REF} A premium dining scene with an elegant tablecloth made from this ${fabricLabel} on a modern dining table. Fine tableware, crystal glasses, candles, fresh flowers. Natural light from a nearby window. The fabric drapes beautifully over the table. Premium dining lifestyle photography.`,
                                roll: `${REF} Commercial high-detail photography of this ${fabricLabel} as a fabric bolt on a sleek display shelf in a modern textile showroom. The fabric is partially unrolled to reveal its full pattern. Professional lighting for maximum color accuracy. B2B wholesale catalog photography, sharp focus on textile details.`,
                                // ═══ Professional Display Scenarios ═══
                                ghost_mannequin: `${REF} Professional ghost mannequin photography of a structured couture dress made from this ${fabricLabel}. The dress maintains a 3D human shape as if worn by an invisible person, showing the internal construction. Clean neutral grey studio background. Soft top-down lighting emphasizes the fabric's drape, texture, and any pattern. 8K resolution, crisp details, commercial catalog style. The focus is 100% on the fabric and design.`,
                                dynamic_flow: `${REF} A high-fashion action shot of ${ageDesc || 'a professional model'} spinning gracefully, wearing a voluminous pleated garment made from this ${fabricLabel}. The fabric is captured mid-air, showing its lightness, movement, and flow. Cinematic backlighting highlights the fine threads and vibrant colors. 8K resolution, motion blur on edges, ultra-realistic fabric texture and translucency.`,
                                side_by_side: `${REF} A split-screen professional composition. Left side: A tailor's mannequin draped with raw ${fabricLabel} showing the weave, texture, and pattern details. Right side: ${ageDesc || 'A high-fashion model'} wearing a finished luxury garment made from the same fabric, posing in a modern architectural setting. Soft studio lighting, consistent color grading, luxury textile branding style. 8K resolution.`,
                                editorial: `${REF} A Vogue-quality editorial fashion photography of ${ageDesc || 'a model'} seated on a vintage velvet sofa, wearing an avant-garde gown made from this ${fabricLabel}. Dramatic Chiaroscuro lighting creates deep shadows and bright highlights on the fabric's folds and drape. The environment is an old European palace with high ceilings and tall windows. 8K resolution, rich colors, emphasize the interplay between light and textile.`,
                            };
                            let colorInstruction3 = '';
                            if (task.color) {
                                const colorName = task.color.name_en || task.color.name_ar || task.color.hex;
                                const applyMode = task.color.applyMode || colorApplyMode || 'all';
                                if (applyMode === 'background') {
                                    colorInstruction3 = `Change ONLY the background/base color of the fabric to ${colorName} (${task.color.hex}). Keep the pattern colors as-is. `;
                                } else if (applyMode === 'pattern') {
                                    colorInstruction3 = `Keep the base color, change ONLY the pattern/design colors to ${colorName} (${task.color.hex}). `;
                                } else {
                                    colorInstruction3 = `Shift the entire fabric color design towards ${colorName} (${task.color.hex}) while preserving the pattern. `;
                                }
                            }
                            
                            const scenePrompt = scenes[selectedUsage] || scenes.dress;
                            // Inject colorInstruction3 just after REF
                            prompt = scenePrompt.replace(REF, `${REF} ${colorInstruction3}`);
                            break;
                        }
                        default:
                            prompt = `${REF} Professional product photo of this ${fabricLabel}. Studio lighting, clean background.`;
                    }

                    console.log(`[AI-Wizard] 📝 Prompt (${task.type}):`, prompt.substring(0, 300) + '...');

                    // Step 1: Get access token from Edge Function (fast, no image data)
                    // Using cached token if still valid
                    if (!cachedAccessToken) {
                        console.log('[AI-Wizard] 🔑 Getting access token...');
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                        const tokenRaw = await fetch(`${supabaseUrl}/functions/v1/generate-material-images`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${supabaseAnonKey}`,
                                'apikey': supabaseAnonKey,
                            },
                            body: JSON.stringify({ action: 'get_token' }),
                        });
                        if (!tokenRaw.ok) {
                            const errText = await tokenRaw.text().catch(() => '');
                            throw new Error(`Token request failed (${tokenRaw.status}): ${errText}`);
                        }
                        const tokenData = await tokenRaw.json();
                        if (!tokenData?.access_token) {
                            throw new Error('No access_token in response');
                        }
                        cachedAccessToken = tokenData.access_token;
                        console.log('[AI-Wizard] ✅ Google access token received');
                    }
                    const accessToken = cachedAccessToken;

                    // Step 2: Call Gemini via Vertex AI (commercial, higher rate limits)
                    console.log(`[AI-Wizard] 🎨 Calling Vertex AI Gemini (${task.type})...`);
                    const GEMINI_URL = 'https://us-central1-aiplatform.googleapis.com/v1/projects/starlit-gift-434314-n8/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent';
                    
                    const geminiResp = await fetch(GEMINI_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                role: 'user',
                                parts: [
                                    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                                    { text: prompt },
                                ],
                            }],
                            generationConfig: {
                                responseModalities: ['IMAGE', 'TEXT'],
                                temperature: 1.0,
                            },
                        }),
                    });

                    if (!geminiResp.ok) {
                        const errData = await geminiResp.json().catch(() => ({}));
                        const errMsg = errData?.error?.message || `Gemini error: ${geminiResp.status}`;
                        
                        // Auto-retry on rate limit (429)
                        if (geminiResp.status === 429) {
                            console.warn(`[AI-Wizard] ⏳ Rate limited, waiting 30s before retry...`);
                            setProgressLabel(isAr 
                                ? `⏳ تجاوز الحد — يتم الانتظار 30 ثانية لتجنب الضغط ثم المحاولة...`
                                : `⏳ Rate limited — waiting 30s then retrying...`);
                            await new Promise(r => setTimeout(r, 30000));
                            
                            // Retry once
                            const retryResp = await fetch(GEMINI_URL, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    contents: [{ role: 'user', parts: [
                                        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                                        { text: prompt },
                                    ]}],
                                    generationConfig: { responseModalities: ['IMAGE', 'TEXT'], temperature: 1.0 },
                                }),
                            });
                            
                            if (retryResp.ok) {
                                const retryResult = await retryResp.json();
                                const retryParts = retryResult?.candidates?.[0]?.content?.parts || [];
                                const retryImg = retryParts.find((p: any) => p.inlineData);
                                if (retryImg) {
                                    console.log(`[AI-Wizard] ✅ Retry succeeded!`);
                                    // Process retry result
                                    const imageBytes = Uint8Array.from(atob(retryImg.inlineData.data), c => c.charCodeAt(0));
                                    const ext = retryImg.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
                                    const fileName = `${companyId}/${materialId}/${task.type}_${Date.now()}.${ext}`;
                                    await supabase.storage.from('material-images').upload(fileName, imageBytes, {
                                        contentType: retryImg.inlineData.mimeType || 'image/png', upsert: true,
                                    });
                                    const { data: urlData } = supabase.storage.from('material-images').getPublicUrl(fileName);
                                    allResults.push({
                                        url: urlData.publicUrl, generation_type: task.type,
                                        prompt_used: prompt.substring(0, 200), model_used: 'gemini-2.5-flash-image', accepted: true,
                                    });
                                    toast.success(isAr ? `✅ ${i+1}/${tasks.length} — ${label.ar}` : `✅ ${i+1}/${tasks.length} — ${label.en}`);
                                    setGenerationProgress(10 + Math.round(((i + 1) / tasks.length) * 80));
                                    // Add delay before next request
                                    if (i < tasks.length - 1) await new Promise(r => setTimeout(r, 3000));
                                    continue;
                                }
                            }
                            // Retry also failed
                            toast.warning(isAr ? `⚠️ ${label.ar}: تجاوز الحد — تم التخطي` : `⚠️ ${label.en}: Rate limited — skipped`);
                            if (i < tasks.length - 1) await new Promise(r => setTimeout(r, 5000));
                            continue;
                        }
                        
                        throw new Error(errMsg);
                    }

                    const geminiResult = await geminiResp.json();
                    const parts = geminiResult?.candidates?.[0]?.content?.parts || [];
                    const imgPart = parts.find((p: any) => p.inlineData);
                    
                    if (!imgPart) {
                        const textReply = parts.map((p: any) => p.text).join(' ');
                        console.warn('[AI-Wizard] ⚠️ Gemini returned text only:', textReply);
                        if (textReply.length > 5) {
                            toast.error(isAr ? `⚠️ الرفض: ${textReply.substring(0, 100)}` : `⚠️ AI Refusal: ${textReply.substring(0, 100)}`);
                        } else {
                            toast.warning(isAr ? `⚠️ ${label.ar}: لم تُنشأ الصورة` : `⚠️ ${label.en}: No image generated`);
                        }
                        continue;
                    }

                    console.log(`[AI-Wizard] ✅ Image generated! (${(imgPart.inlineData?.data?.length * 0.75 / 1024).toFixed(0)}KB)`);

                    // Step 3: Upload to Supabase Storage
                    const imageBytes = Uint8Array.from(atob(imgPart.inlineData.data), c => c.charCodeAt(0));
                    const ext = imgPart.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
                    const fileName = `${companyId}/${materialId}/${task.type}_${Date.now()}.${ext}`;
                    
                    const { error: uploadErr } = await supabase.storage
                        .from('material-images')
                        .upload(fileName, imageBytes, {
                            contentType: imgPart.inlineData.mimeType || 'image/png',
                            upsert: true,
                        });

                    if (uploadErr) {
                        console.error('[AI-Wizard] Upload error:', uploadErr);
                        throw new Error(`Upload failed: ${uploadErr.message}`);
                    }

                    const { data: urlData } = supabase.storage
                        .from('material-images')
                        .getPublicUrl(fileName);

                    allResults.push({
                        url: urlData.publicUrl,
                        generation_type: task.type,
                        prompt_used: prompt.substring(0, 200),
                        model_used: 'gemini-2.5-flash-image',
                        accepted: true,
                    });
                    
                    toast.success(
                        isAr
                            ? `✅ ${i+1}/${tasks.length} — ${label.ar}`
                            : `✅ ${i+1}/${tasks.length} — ${label.en}`
                    );
                } catch (taskErr) {
                    console.error(`[AI-Wizard] ❌ ${task.label} exception:`, taskErr);
                    toast.error(`❌ ${task.label}: ${taskErr instanceof Error ? taskErr.message : 'Unknown error'}`);
                }

                // Update progress + delay between requests to avoid rate limits
                setGenerationProgress(10 + Math.round(((i + 1) / tasks.length) * 80));
                if (i < tasks.length - 1) {
                    console.log('[AI-Wizard] ⏳ Waiting 3s before next request...');
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            setGeneratedImages(allResults);
            setGenerationProgress(100);

            if (allResults.length > 0) {
                toast.success(
                    isAr
                        ? `🎉 تم إنشاء ${allResults.length} صورة بنجاح!`
                        : `🎉 ${allResults.length} images generated!`
                );
            } else {
                toast.error(isAr ? 'لم يتم إنشاء أي صور' : 'No images generated');
            }

        } catch (err: any) {
            console.error('AI generation error:', err);
            toast.error(isAr ? `فشل الإنشاء: ${err.message}` : `Generation failed: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ═══ Step 4: Save accepted images to DB ═══
    const handleSaveAll = async () => {
        const accepted = generatedImages.filter(img => img.accepted);
        const rejected = generatedImages.filter(img => img.accepted === false);

        if (accepted.length === 0) {
            toast.error(isAr ? 'لم يتم اختيار أي صور' : 'No images selected');
            return;
        }

        setIsSaving(true);
        const processingToast = toast.loading(isAr ? '⏳ جاري المعالجة وإضافة الوسوم...' : '⏳ Processing and applying watermarks...');

        try {
            // Delete rejected images from Storage
            for (const img of rejected) {
                try {
                    if (img.storage_path || img.url) {
                        const path = img.storage_path || new URL(img.url).pathname.split('/material-images/')[1];
                        if (path) {
                            await supabase.storage.from('material-images').remove([path]);
                        }
                    }
                } catch { /* ignore cleanup errors */ }
            }

            // Material Data payload for the watermark
            const currentMaterialCode = materialCode;
            const wData: MaterialData = {
                code: currentMaterialCode,
                name_ar: materialInfo.name,
                name_en: materialInfo.name, // Usually has to be extracted or passed if there is a separate English field
                composition: materialInfo.composition,
                design: materialInfo.design,
                color: materialInfo.color,
            };

            const wSettings: WatermarkSettings = {
                enabled: tagEnabled,
                companyName: companyWatermark,
                showCode: showMaterialCode,
                showName: showMaterialName,
                showComposition: showComposition,
                showDesign: showDesign,
                showColor: showColor,
                showQRCode: showQRCode,
                showBarcode: showBarcode,
                language: tagLanguage,
                position: tagPosition,
                priceMode: priceMode,
                priceValue: priceValue,
                currency: currency,
            };

            // Process accepted ones (applying watermark if enabled)
            const processedImages = await Promise.all(accepted.map(async (img) => {
                let finalUrl = img.url;
                let finalPath = img.url ? new URL(img.url).pathname.split('/material-images/')[1] || '' : '';

                if (tagEnabled && img.url) {
                    try {
                        const blob = await createWatermarkedImage(img.url, wSettings, wData);
                        
                        // Upload over
                        const fileName = `composite_${materialId}_${Date.now()}.jpg`;
                        const materialCodeValue = materialCode || 'wizard';
                        const storagePath = `${companyId}/${materialCodeValue}/ai-watermark/${fileName}`;
                        
                        const { data: uploadData, error: uploadErr } = await supabase.storage
                            .from('material-images')
                            .upload(storagePath, blob, { 
                                cacheControl: '3600', 
                                upsert: false,
                                contentType: 'image/jpeg' 
                            });

                        if (!uploadErr && uploadData?.path) {
                            finalPath = uploadData.path;
                            const { data: publicData } = supabase.storage.from('material-images').getPublicUrl(uploadData.path);
                            finalUrl = publicData.publicUrl;
                            
                            // Optional: Delete the original blank AI image
                            const oldPath = new URL(img.url).pathname.split('/material-images/')[1];
                            if (oldPath) {
                                supabase.storage.from('material-images').remove([oldPath]).catch(() => {});
                            }
                        } else {
                            console.error('Watermark upload failed', uploadErr);
                        }
                    } catch (err) {
                        console.error('Watermark generation failed for image', img.url, err);
                        // fallback to original image url
                    }
                }

                return {
                    ...img,
                    url: finalUrl,
                    storage_path: finalPath
                };
            }));

            // Save accepted images to material_images table
            const insertRows = processedImages.map((img, idx) => ({
                material_id: materialId,
                company_id: companyId,
                tenant_id: tenantId,
                url: img.url,
                storage_path: img.storage_path,
                is_primary: idx === 0 && processedImages.length === 1,
                is_ai_generated: true,
                source: 'ai',
                image_scope: img.scope || 'general',
                sort_order: idx,
            }));

            const { error: dbErr } = await supabase
                .from('material_images')
                .insert(insertRows);

            if (dbErr) {
                console.error('[AI-Wizard] DB save error:', dbErr);
                toast.error(isAr ? `❌ خطأ في الحفظ: ${dbErr.message}` : `❌ Save error: ${dbErr.message}`, { id: processingToast });
            } else {
                toast.success(
                    isAr ? `💾 تم طباعة الوسوم وحفظ ${processedImages.length} صورة` : `💾 Watermarked and saved ${processedImages.length} images`,
                    { id: processingToast }
                );
            }

            onImagesGenerated(processedImages);
            onClose();
        } catch (err: any) {
            console.error('[AI-Wizard] Save error:', err);
            toast.error(isAr ? `❌ خطأ: ${err.message}` : `❌ Error: ${err.message}`, { id: processingToast });
        } finally {
            setIsSaving(false);
        }
    };

    // ═══ Toggle acceptance ═══
    const toggleAcceptance = (index: number) => {
        setGeneratedImages(prev =>
            prev.map((img, i) => i === index ? { ...img, accepted: !img.accepted } : img)
        );
    };

    // ═══ Compress and convert image to base64 (max 1024px, JPEG) ═══
    const fileToBase64 = async (file: File): Promise<string> => {
        const MAX = 1024; // Higher res preserves fabric patterns and details better

        try {
            // createImageBitmap supports more formats than <img> (but NOT HEIC on Chrome)
            const bitmap = await createImageBitmap(file);
            let { width, height } = bitmap;

            if (width > MAX || height > MAX) {
                if (width > height) {
                    height = Math.round((height * MAX) / width);
                    width = MAX;
                } else {
                    width = Math.round((width * MAX) / height);
                    height = MAX;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const base64 = dataUrl.split(',')[1];
            const sizeKB = Math.round(base64.length * 0.75 / 1024);
            console.log(`[AI-Wizard] ✅ Compressed: ${(file.size/1024).toFixed(0)}KB → ${sizeKB}KB (${width}x${height})`);
            return base64;
        } catch (err) {
            console.warn('[AI-Wizard] createImageBitmap failed, trying FileReader:', err);
            // Fallback for unsupported formats (HEIC on Chrome)
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    // Limit: if base64 > 500KB, warn user
                    const sizeKB = Math.round(base64.length * 0.75 / 1024);
                    if (sizeKB > 500) {
                        console.warn(`[AI-Wizard] ⚠️ Image too large: ${sizeKB}KB. HEIC not supported for compression.`);
                        toast.warning(isAr
                            ? '⚠️ صيغة HEIC غير مدعومة — يرجى استخدام JPEG أو PNG'
                            : '⚠️ HEIC format not supported — please use JPEG or PNG');
                    }
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    };

    const renderColorSubsetSelector = (
        labelAr: string,
        labelEn: string,
        selectedSubset: Set<string>,
        setSubset: React.Dispatch<React.SetStateAction<Set<string>>>
    ) => {
        const allOptions = ['original', ...Array.from(selectedColors)];
        if (allOptions.length <= 1) return null; // Only original available, no variants selected

        return (
            <div className="space-y-1.5 mt-2 p-2 border border-orange-100 bg-orange-50/50 dark:bg-orange-900/10 rounded-md">
                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-200 flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    {isAr ? labelAr : labelEn}
                </p>
                <div className="flex flex-wrap gap-1">
                    {allOptions.map(key => {
                        const isSelected = selectedSubset.has(key);
                        let nameAr = key === 'original' ? 'اللون الأصلي' : '';
                        let nameEn = key === 'original' ? 'Original Color' : '';
                        let hex = '';
                        
                        if (key !== 'original') {
                            const group = colorGroups.find(g => g.key === key);
                            if (group) {
                                nameAr = group.name_ar || key;
                                nameEn = group.name_en || key;
                                hex = group.hex_color || '';
                            } else if (key.startsWith('custom_')) {
                                const ci = (window as any).__customColors?.[key];
                                if (ci) {
                                    nameAr = ci.ar || ci.hex;
                                    nameEn = ci.en || ci.hex;
                                    hex = ci.hex;
                                }
                            }
                        }

                        return (
                            <button
                                key={key}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all",
                                    isSelected ? "border-orange-400 bg-orange-100 text-orange-900 ring-1 ring-orange-300" : "border-gray-200 hover:border-orange-200 bg-white"
                                )}
                                onClick={() => {
                                    setSubset(prev => {
                                        const next = new Set(prev);
                                        if (next.has(key)) {
                                            if (next.size > 1) next.delete(key); // prevent unselecting all
                                        } else {
                                            next.add(key);
                                        }
                                        return next;
                                    });
                                }}
                            >
                                {hex && key !== 'original' && (
                                    <div className="w-2.5 h-2.5 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: hex }} />
                                )}
                                {key === 'original' && <span className="text-gray-400">⚫</span>}
                                {isAr ? nameAr : nameEn}
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    };

    // ═══ Render Steps ═══
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Wand2 className="w-5 h-5" />
                        <div>
                            <h2 className="font-bold text-sm">{isAr ? 'استوديو تيكسا كور للأقمشة' : 'TexaCore Fabric Studio'}</h2>
                            <p className="text-xs text-white/70">
                                {isAr ? `الخطوة ${step} من 4` : `Step ${step} of 4`}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-gray-200 dark:bg-gray-800">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${step * 25}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* ═══ Step 1: Upload Reference Image ═══ */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-base">
                                {isAr ? '📤 ارفع صورة المادة المرجعية' : '📤 Upload Reference Image'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {isAr
                                    ? 'صوّر المادة بكاميرا الجوال أو اختر صورة موجودة. الذكاء الاصطناعي سيُنشئ منها صور احترافية.'
                                    : 'Take a photo with your phone or select an existing image. AI will create professional images from it.'}
                            </p>

                            {/* HEIC Converting State */}
                            {isConverting && (
                                <div className="text-center py-8 space-y-3">
                                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
                                    <p className="font-medium text-sm text-purple-600">
                                        {isAr ? '🔄 جاري تحويل صورة iPhone (HEIC → JPEG)...' : '🔄 Converting iPhone photo (HEIC → JPEG)...'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {isAr ? 'قد يستغرق بضع ثوانٍ' : 'This may take a few seconds'}
                                    </p>
                                </div>
                            )}

                            {referenceImage ? (
                                <div className="relative rounded-xl overflow-hidden border-2 border-purple-200 max-w-sm mx-auto bg-gray-100 dark:bg-gray-800">
                                    {/* Image preview or fallback */}
                                    <div className="relative w-full min-h-[200px] flex items-center justify-center">
                                        <img
                                            src={referenceImage.preview}
                                            alt="Reference"
                                            className="w-full max-h-[300px] object-contain"
                                            onLoad={(e) => {
                                                // Image loaded successfully — hide fallback
                                                const fallback = (e.target as HTMLElement).parentElement?.querySelector('.preview-fallback');
                                                if (fallback) (fallback as HTMLElement).style.display = 'none';
                                            }}
                                            onError={(e) => {
                                                // Image can't render (HEIC etc.) — hide img, show fallback
                                                (e.target as HTMLElement).style.display = 'none';
                                                const fallback = (e.target as HTMLElement).parentElement?.querySelector('.preview-fallback');
                                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                            }}
                                        />
                                        {/* Fallback for non-renderable images (HEIC) */}
                                        <div className="preview-fallback absolute inset-0 flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30" style={{ display: 'none' }}>
                                            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                                <ImgIcon className="w-8 h-8 text-purple-500" />
                                            </div>
                                            <p className="font-medium text-sm text-gray-700 dark:text-gray-300">
                                                {referenceImage.file.name}
                                            </p>
                                            <p className="text-xs text-green-600">
                                                ✅ {isAr ? 'تم اختيار الصورة بنجاح' : 'Image selected successfully'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="absolute top-2 end-2 z-10"
                                        onClick={() => { setReferenceImage(null); }}
                                    >
                                        <X className="w-3 h-3 me-1" />{isAr ? 'تغيير' : 'Change'}
                                    </Button>
                                    <div className="absolute bottom-2 start-2 z-10 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        {referenceImage.file.size > 1024 * 1024
                                            ? `${(referenceImage.file.size / 1024 / 1024).toFixed(1)} MB`
                                            : `${(referenceImage.file.size / 1024).toFixed(0)} KB`
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {isAr ? 'اضغط لرفع صورة أو صور' : 'Click to upload image'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        JPEG, PNG, WebP, HEIC
                                    </p>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.heic,.heif"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {/* ═══ Step 2: Select Generation Options ═══ */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <h3 className="font-semibold text-base">
                                {isAr ? '⚙️ اختر أنواع الصور المطلوبة' : '⚙️ Select Image Types'}
                            </h3>

                            {/* 🧵 Fabric Type — GLOBAL setting for ALL image types */}
                            <div className="space-y-1.5 p-3 rounded-lg border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20">
                                <p className="text-xs font-bold text-teal-700 dark:text-teal-300">
                                    {isAr ? '🧵 نوع القماش (يؤثر على جميع الصور)' : '🧵 Fabric Type (affects ALL images)'}
                                </p>
                                <div className="flex gap-1.5 flex-wrap">
                                    {FABRIC_TYPE_OPTIONS.map(ft => (
                                        <button
                                            key={ft.id}
                                            className={cn(
                                                "px-2.5 py-1 rounded-full text-[11px] border transition-all",
                                                selectedFabricType === ft.id
                                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                                    : ft.id === (materialInfo.fabric_type || 'auto')
                                                        ? "border-teal-400 bg-teal-100 dark:bg-teal-900/30 text-teal-800"
                                                        : "border-gray-300 hover:border-teal-400 bg-white dark:bg-gray-800"
                                            )}
                                            onClick={() => setSelectedFabricType(ft.id)}
                                        >
                                            {isAr ? ft.labelAr : ft.labelEn}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ═══ 🎨 Color Variants — Global Palette ═══ */}
                            <div className="space-y-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                                        <Palette className="w-3.5 h-3.5 inline me-1" />
                                        {isAr ? '🎨 الألوان المتاحة (Global Palette)' : '🎨 Available Colors (Global Palette)'}
                                    </p>
                                </div>

                                {/* Variant colors from material (if any) */}
                                {colorGroups.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] text-gray-500">{isAr ? 'ألوان المتغيرات:' : 'Variant Colors:'}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {colorGroups.map(color => (
                                                <button
                                                    key={color.key}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all",
                                                        selectedColors.has(color.key)
                                                            ? "border-orange-400 bg-orange-100 dark:bg-orange-900/30 ring-1 ring-orange-300"
                                                            : "border-gray-200 hover:border-orange-300 bg-white dark:bg-gray-800"
                                                    )}
                                                    onClick={() => toggleColor(color.key)}
                                                >
                                                    {color.hex_color && (
                                                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-sm"
                                                            style={{ backgroundColor: color.hex_color }} />
                                                    )}
                                                    {isAr ? color.name_ar : color.name_en}
                                                </button>
                                            ))}
                                            <Button variant="ghost" size="sm" className="text-[10px] h-6 text-orange-600" onClick={toggleAllColors}>
                                                {selectedColors.size === colorGroups.length ? (isAr ? 'إلغاء الكل' : 'Deselect') : (isAr ? 'الكل' : 'All')}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Custom color picker */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-gray-500">{isAr ? 'ألوان سريعة:' : 'Quick Colors:'}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            { hex: '#C41E3A', ar: 'أحمر قرمزي', en: 'Crimson Red' },
                                            { hex: '#1B365D', ar: 'أزرق كحلي', en: 'Navy Blue' },
                                            { hex: '#2D5A27', ar: 'أخضر زيتوني', en: 'Olive Green' },
                                            { hex: '#6B3FA0', ar: 'بنفسجي ملكي', en: 'Royal Purple' },
                                            { hex: '#D4A574', ar: 'بيج رملي', en: 'Sandy Beige' },
                                            { hex: '#8B4513', ar: 'بني شوكولاتة', en: 'Chocolate Brown' },
                                            { hex: '#C0C0C0', ar: 'فضي', en: 'Silver' },
                                            { hex: '#FFD700', ar: 'ذهبي', en: 'Gold' },
                                            { hex: '#FF69B4', ar: 'وردي', en: 'Pink' },
                                            { hex: '#40E0D0', ar: 'تركواز', en: 'Turquoise' },
                                            { hex: '#800020', ar: 'عنابي', en: 'Burgundy' },
                                            { hex: '#F5F5DC', ar: 'كريمي', en: 'Cream' },
                                        ].map(c => {
                                            const colorKey = `custom_${c.hex}`;
                                            const isSelected = selectedColors.has(colorKey);
                                            return (
                                                <button
                                                    key={c.hex}
                                                    title={isAr ? c.ar : c.en}
                                                    className={cn(
                                                        "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                                                        isSelected ? "border-orange-500 ring-2 ring-orange-300 scale-110" : "border-gray-200"
                                                    )}
                                                    style={{ backgroundColor: c.hex }}
                                                    onClick={() => {
                                                        const next = new Set(selectedColors);
                                                        if (isSelected) next.delete(colorKey);
                                                        else next.add(colorKey);
                                                        setSelectedColors(next);
                                                        if (!isSelected) {
                                                            (window as any).__customColors = (window as any).__customColors || {};
                                                            (window as any).__customColors[colorKey] = c;
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom hex input */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="w-8 h-8 rounded-lg border cursor-pointer"
                                        onChange={(e) => {
                                            const hex = e.target.value;
                                            const colorKey = `custom_${hex}`;
                                            const next = new Set(selectedColors);
                                            next.add(colorKey);
                                            setSelectedColors(next);
                                            (window as any).__customColors = (window as any).__customColors || {};
                                            (window as any).__customColors[colorKey] = { hex, ar: hex, en: hex };
                                        }}
                                    />
                                    <span className="text-[10px] text-gray-500">{isAr ? 'أو اختر لون مخصص' : 'Or pick custom color'}</span>
                                </div>

                                {/* Color Apply Mode */}
                                <div className="space-y-1.5 pt-2 border-t border-orange-200 border-dashed mt-3">
                                    <p className="text-[11px] text-gray-500 font-medium">{isAr ? '🎯 كيفية تطبيق اللون:' : '🎯 Color application method:'}</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            { id: 'all', ar: 'تغيير اللون بالكامل (الافتراضي)', en: 'Change entire color (Default)' },
                                            { id: 'background', ar: 'تغيير لون الخلفية فقط', en: 'Change background only' },
                                            { id: 'pattern', ar: 'تغيير لون الرسمة فقط', en: 'Change pattern only' }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                className={cn(
                                                    "px-3 py-1 rounded text-[11px] border transition-colors",
                                                    colorApplyMode === mode.id ? "bg-orange-100 border-orange-300 text-orange-800 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
                                                )}
                                                onClick={() => setColorApplyMode(mode.id as 'all' | 'background' | 'pattern')}
                                            >
                                                {isAr ? mode.ar : mode.en}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-orange-600/60 dark:text-orange-400/60">
                                        {isAr ? '* هذا الخيار يتم تعميمه على جميع الصور المنشأة.' : '* This option is generalized to all generated images.'}
                                    </p>
                                </div>
                            </div>

                            {/* Image types */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">{isAr ? 'صور المنتج' : 'Product Images'}</p>
                                {[
                                    { id: 'studio', icon: '📷', labelAr: 'صورة استوديو احترافية', labelEn: 'Professional Studio Shot', credit: 1 },
                                    { id: 'texture', icon: '🔍', labelAr: 'صورة مقرّبة للنسيج', labelEn: 'Texture Close-up', credit: 1 },
                                ].map(opt => (
                                    <div key={opt.id} className="space-y-1">
                                        <label className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                            selectedTypes.has(opt.id) ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30" : "border-gray-200 hover:border-purple-200"
                                        )}>
                                            <Checkbox checked={selectedTypes.has(opt.id)} onCheckedChange={() => toggleType(opt.id)} />
                                            <span className="text-lg">{opt.icon}</span>
                                            <span className="flex-1 text-sm">{isAr ? opt.labelAr : opt.labelEn}</span>
                                            <Badge variant="secondary" className="text-[10px]">{opt.credit} credit</Badge>
                                        </label>
                                        
                                        {/* Color Selector for Studio */}
                                        {opt.id === 'studio' && selectedTypes.has('studio') && renderColorSubsetSelector('الألوان لصور الاستوديو', 'Colors for Studio Shot', studioSelectedColors, setStudioSelectedColors)}

                                        {/* Sub-settings specifically for Studio */}
                                        {opt.id === 'studio' && selectedTypes.has('studio') && (
                                            <div className="ps-8 pe-4 py-2 space-y-1.5 opacity-90 animate-in slide-in-from-top-2">
                                                <p className="text-[11px] text-gray-500 font-medium">
                                                    {isAr ? '🎬 نمط عرض القماش في الاستوديو:' : '🎬 Studio presentation style:'}
                                                </p>
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: 'draped' as const, ar: 'ملفوف بأناقة 🌀', en: 'Elegantly Draped 🌀' },
                                                        { id: 'bolt' as const, ar: 'حامل أسطواني 🏛️', en: 'Display Bolt 🏛️' },
                                                        { id: 'flat' as const, ar: 'مسطح مكوي 📐', en: 'Flat & Pressed 📐' },
                                                    ].map(style => (
                                                        <button
                                                            key={style.id}
                                                            className={cn(
                                                                "flex-1 px-3 py-1.5 rounded text-[11px] border transition-colors",
                                                                studioPresentationStyle === style.id ? "bg-purple-100 border-purple-300 text-purple-800" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                            )}
                                                            onClick={() => setStudioPresentationStyle(style.id)}
                                                        >
                                                            {isAr ? style.ar : style.en}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Color Selector for Texture */}
                            {selectedTypes.has('texture') && (
                                <div className="mt-[-8px] mb-2 px-1">
                                    {renderColorSubsetSelector('الألوان لصورة النسيج', 'Colors for Texture', textureSelectedColors, setTextureSelectedColors)}
                                </div>
                            )}

                            {/* Usage examples — Categorized */}
                            <div className="space-y-2">
                                <label className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                    selectedTypes.has('usage') ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30" : "border-gray-200 hover:border-purple-200"
                                )}>
                                    <Checkbox checked={selectedTypes.has('usage')} onCheckedChange={() => toggleType('usage')} />
                                    <span className="text-lg">👗</span>
                                    <span className="flex-1 text-sm">{isAr ? 'صورة استخدام واقعية (Lifestyle)' : 'Realistic Usage Scene (Lifestyle)'}</span>
                                    <Badge variant="secondary" className="text-[10px]">1 credit</Badge>
                                </label>

                                {selectedTypes.has('usage') && (
                                    <div className="ps-10 space-y-3">
                                        {autoDetectedUsage !== 'dress' && (
                                            <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                {isAr
                                                    ? `🔎 اكتشاف: "${USAGE_OPTIONS.find(o => o.id === autoDetectedUsage)?.labelAr}"`
                                                    : `🔎 Auto: "${USAGE_OPTIONS.find(o => o.id === autoDetectedUsage)?.labelEn}"`}
                                            </p>
                                        )}

                                        {/* Categorized usage options — filtered by fabric type */}
                                        {USAGE_CATEGORIES.map(cat => {
                                            const allowedUsages = FABRIC_USAGE_MAP[selectedFabricType] || [];
                                            const filteredOptions = allowedUsages.length > 0
                                                ? cat.options.filter(opt => allowedUsages.includes(opt.id))
                                                : cat.options; // 'auto' = show all
                                            if (filteredOptions.length === 0) return null;
                                            return (
                                            <div key={cat.id} className="space-y-1">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {isAr ? cat.labelAr : cat.labelEn}
                                                </p>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {filteredOptions.map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-full text-[11px] border transition-all",
                                                                selectedUsage === opt.id
                                                                    ? "bg-purple-500 text-white border-purple-500"
                                                                    : opt.id === autoDetectedUsage
                                                                        ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20"
                                                                        : "border-gray-300 hover:border-purple-400"
                                                            )}
                                                            onClick={() => setSelectedUsage(opt.id)}
                                                        >
                                                            {opt.icon} {isAr ? opt.labelAr : opt.labelEn}
                                                            {opt.id === autoDetectedUsage && selectedUsage !== opt.id && ' ⭐'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            );
                                        })}

                                        {/* Age range — shown only for women's fashion scenes */}
                                        {['dress', 'cocktail', 'wedding', 'abaya', 'hijab', 'pajamas'].includes(selectedUsage) && (
                                            <div className="space-y-1 pt-1 border-t">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {isAr ? '👤 الفئة العمرية للمانيكان' : '👤 Mannequin Age Range'}
                                                </p>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {AGE_OPTIONS.map(age => (
                                                        <button
                                                            key={age.id}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-full text-[11px] border transition-all",
                                                                selectedAge === age.id
                                                                    ? "bg-indigo-500 text-white border-indigo-500"
                                                                    : "border-gray-300 hover:border-indigo-400"
                                                            )}
                                                            onClick={() => setSelectedAge(age.id)}
                                                        >
                                                            {isAr ? age.labelAr : age.labelEn}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Color Selector for Usage Scene */}
                                        {renderColorSubsetSelector('الألوان لصورة الاستخدام', 'Colors for Usage Scene', usageSelectedColors, setUsageSelectedColors)}

                                    </div>
                                )}
                            </div>

                            {/* ═══ Palette & Composite Cards ═══ */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">{isAr ? '🎨 بطاقات العرض' : '🎨 Presentation Cards'}</p>
                                {[
                                    { id: 'palette', icon: '🎨', labelAr: 'بطاقة الألوان النسيجية', labelEn: 'Textile Color Swatch Card', credit: '0.5' },
                                    { id: 'composite', icon: '🖼️', labelAr: 'بطاقة مختلطة (قماش + ألوان + مشهد)', labelEn: 'Mixed Card (Fabric + Colors + Scene)', credit: '1' },
                                ].map(opt => (
                                    <label key={opt.id} className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                        selectedTypes.has(opt.id) ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30" : "border-gray-200 hover:border-purple-200"
                                    )}>
                                        <Checkbox checked={selectedTypes.has(opt.id)} onCheckedChange={() => toggleType(opt.id)} />
                                        <span className="text-lg">{opt.icon}</span>
                                        <span className="flex-1 text-sm">{isAr ? opt.labelAr : opt.labelEn}</span>
                                        <Badge variant="secondary" className="text-[10px]">{opt.credit} credit</Badge>
                                    </label>
                                ))}
                                
                                {/* Composite Config Section */}
                                {selectedTypes.has('composite') && (
                                    <div className="ps-8 pe-4 py-2 space-y-2 opacity-90 animate-in slide-in-from-top-2">
                                        <p className="text-xs font-medium text-gray-500">
                                            {isAr ? '⚙️ تخصيص تصميم البطاقة المختلطة:' : '⚙️ Customize Mixed Card Layout:'}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { key: 'colors', checked: compShowColors, set: setCompShowColors, labelAr: 'لوحة الألوان', labelEn: 'Colors', icon: '🎨' },
                                                { key: 'info', checked: compShowInfo, set: setCompShowInfo, labelAr: 'بيانات المادة', labelEn: 'Info', icon: '📝' },
                                                { key: 'scene', checked: compShowScene, set: setCompShowScene, labelAr: 'مشهد استخدام', labelEn: 'Scene', icon: '🛋️' }
                                            ].map(tc => (
                                                <label key={tc.key} className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                                                    tc.checked ? "bg-purple-100 border-purple-300 text-purple-800" : "bg-gray-50 border-gray-200 text-gray-500"
                                                )}>
                                                    <Checkbox checked={tc.checked} onCheckedChange={(c) => tc.set(!!c)} className="w-3.5 h-3.5" />
                                                    <span>{tc.icon}</span>
                                                    <span>{isAr ? tc.labelAr : tc.labelEn}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[11px] font-medium text-gray-500 pt-2 border-t">{isAr ? 'صورة القماشة المطلوبة في البطاقة:' : 'Fabric presentation in card:'}</p>
                                        <div className="flex gap-2">
                                            <label className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                                                    compFabricDraped ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-500"
                                                )}>
                                                    <Checkbox checked={compFabricDraped} onCheckedChange={(c) => setCompFabricDraped(!!c)} className="w-3.5 h-3.5" />
                                                    <span>🌀</span>
                                                    <span>{isAr ? 'قماش ملفوف' : 'Draped Fabric'}</span>
                                            </label>
                                            <label className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                                                    compFabricFlat ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-500"
                                                )}>
                                                    <Checkbox checked={compFabricFlat} onCheckedChange={(c) => setCompFabricFlat(!!c)} className="w-3.5 h-3.5" />
                                                    <span>📐</span>
                                                    <span>{isAr ? 'قماش مسطح' : 'Flat Fabric'}</span>
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-gray-400">
                                            {isAr ? 'اختر الأجزاء التي تريد دمجها في بطاقة العرض الواحدة.' : 'Select the sections you want to combine in the single presentation card.'}
                                        </p>

                                        {/* Color Selector for Composite */}
                                        {renderColorSubsetSelector('الألوان للبطاقة المختلطة', 'Colors for Mixed Card', compositeSelectedColors, setCompositeSelectedColors)}

                                        {/* Main Color Selector for Composite */}
                                        {compositeSelectedColors.size > 0 && (
                                            <div className="pt-2 border-t space-y-2 mt-2">
                                                <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3 text-orange-500" />
                                                    {isAr ? 'اللون الرئيسي (للمشهد والقماشة):' : 'Main Color (for Scene & Fabric):'}
                                                </p>
                                                <select
                                                    value={compositeSelectedColors.has(compositeMainColor) ? compositeMainColor : (Array.from(compositeSelectedColors)[0] || 'original')}
                                                    onChange={e => setCompositeMainColor(e.target.value)}
                                                    className="w-full text-xs p-2 rounded-md border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
                                                >
                                                    {Array.from(compositeSelectedColors).map(key => {
                                                        const label = key === 'original' ? (isAr ? 'اللون الأصلي' : 'Original Color')
                                                            : colorGroups.find(g => g.key === key)?.name_ar 
                                                            || (window as any).__customColors?.[key]?.ar 
                                                            || key;
                                                        return <option key={key} value={key}>{label}</option>
                                                    })}
                                                </select>
                                                <p className="text-[10px] text-orange-600/80 leading-tight">
                                                    {isAr ? '* سيتم تطبيق هذا اللون على المشهد الرئيسي، بينما تظهر باقي الألوان كبطاقات.' : '* Applied to the main scene, other selected colors appear as swatches.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Usage Selector specifically for Composite */}
                                        <div className="pt-2 border-t space-y-2 mt-2">
                                            <p className="text-[11px] font-medium text-gray-500">{isAr ? '🛋️ مشهد الاستخدام داخل البطاقة:' : '🛋️ Scene inside card:'}</p>
                                            <select
                                                value={selectedUsage}
                                                onChange={e => setSelectedUsage(e.target.value)}
                                                className="w-full text-xs p-2 rounded-md border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
                                            >
                                                {USAGE_CATEGORIES.map(cat => {
                                                    const allowedUsages = FABRIC_USAGE_MAP[selectedFabricType] || [];
                                                    const filteredOptions = allowedUsages.length > 0
                                                        ? cat.options.filter(opt => allowedUsages.includes(opt.id))
                                                        : cat.options;
                                                    if (filteredOptions.length === 0) return null;
                                                    return (
                                                        <optgroup key={cat.id} label={isAr ? cat.labelAr : cat.labelEn}>
                                                            {filteredOptions.map(opt => (
                                                                <option key={opt.id} value={opt.id}>
                                                                    {opt.icon} {isAr ? opt.labelAr : opt.labelEn}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                            <p className="text-[10px] text-gray-500 leading-tight">
                                                {isAr ? '* سيتم تطبيق (اللون الرئيسي المحدد أعلاه) بالإضافة إلى طريقة (تفضيل التلوين) على هذا المشهد مباشرة.' : '* The primary color selected above and the color application method will be applied directly to this scene.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Palette Config Section */}
                                {selectedTypes.has('palette') && (
                                    <div className="ps-8 pe-4 py-2 space-y-3 opacity-90 animate-in slide-in-from-top-2">
                                        <p className="text-xs font-medium text-gray-500 border-b pb-1">
                                            {isAr ? '🎨 إعدادات بطاقة الألوان:' : '🎨 Palette Card Settings:'}
                                        </p>
                                        
                                        {/* Original Color Inclusion */}
                                        <label className={cn(
                                            "flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                                            paletteIncludeOriginal ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-500"
                                        )}>
                                            <Checkbox checked={paletteIncludeOriginal} onCheckedChange={(c) => setPaletteIncludeOriginal(!!c)} className="w-4 h-4" />
                                            <span>✨</span>
                                            <span className="font-medium">{isAr ? 'تضمين اللون الأصلي للمادة كعينة للمقارنة' : 'Include Original Base Color Swatch'}</span>
                                        </label>

                                        {/* Palette Presentation Style */}
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] text-gray-500">{isAr ? 'نمط عرض القماش في العينات:' : 'Fabric presentation in swatches:'}</p>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'draped' as const, label: isAr ? 'ملفوف' : 'Draped' },
                                                    { id: 'flat' as const, label: isAr ? 'مسطح' : 'Flat' },
                                                ].map(style => (
                                                    <button
                                                        key={style.id}
                                                        className={cn(
                                                            "px-3 py-1 rounded text-[11px] border transition-colors",
                                                            palettePresentationStyle === style.id ? "bg-purple-100 border-purple-300 text-purple-800" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                        )}
                                                        onClick={() => setPalettePresentationStyle(style.id)}
                                                    >
                                                        {style.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Color Selector for Palette */}
                                        {renderColorSubsetSelector('الألوان لبطاقة الألوان', 'Colors for Palette Card', paletteSelectedColors, setPaletteSelectedColors)}
                                    </div>
                                )}
                            </div>

                            {/* Tag options moved to step 4 */}

                            {/* Credits summary */}
                            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200">
                                <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-medium">{isAr ? 'المجموع' : 'Total'}</span>
                                    </div>
                                    <Badge className="bg-purple-600">
                                        {creditsNeeded} {creditsNeeded === 1 ? 'credit' : 'credits'}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ═══ Step 3: Generation & Preview ═══ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {isGenerating ? (
                                <div className="text-center py-12 space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{progressLabel || (isAr ? '🤖 جاري التحضير...' : '🤖 Preparing...')}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {isAr ? `كل صورة تستغرق ~15-30 ثانية` : `Each image takes ~15-30 seconds`}
                                        </p>
                                    </div>
                                    <div className="w-full max-w-xs mx-auto">
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${generationProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{generationProgress}%</p>
                                    </div>
                                </div>
                            ) : generatedImages.length > 0 ? (
                                <>
                                    <h3 className="font-semibold text-base flex items-center gap-2">
                                        {isAr ? '✅ الصور المُنشأة' : '✅ Generated Images'}
                                        <Badge variant="secondary">{generatedImages.filter(i => i.accepted).length}/{generatedImages.length}</Badge>
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {generatedImages.map((img, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "relative rounded-xl overflow-hidden border-2 transition-all group",
                                                    img.accepted ? "border-green-400 ring-1 ring-green-200" : "border-gray-200 opacity-50"
                                                )}
                                            >
                                                <img src={img.url} alt={img.type} className="w-full aspect-square object-cover" />
                                                {/* Type badge */}
                                                <div className="absolute top-1.5 start-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px]">
                                                    {img.type === 'studio' ? '📷' : img.type === 'texture' ? '🔍' : img.type === 'usage' ? '👗' : img.type === 'composite' ? '🖼️' : '🎨'}
                                                    {' '}{img.color_name || img.type}
                                                </div>
                                                {/* Accept/Reject toggle */}
                                                <button
                                                    className="absolute top-1.5 end-1.5 z-10"
                                                    onClick={() => toggleAcceptance(i)}
                                                    title={img.accepted ? (isAr ? 'رفض' : 'Reject') : (isAr ? 'قبول' : 'Accept')}
                                                >
                                                    {img.accepted ? (
                                                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
                                                            <Check className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                                                            <X className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                                {/* Preview zoom button */}
                                                <button
                                                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all z-[5]"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(img.url); }}
                                                    title={isAr ? 'استعراض' : 'Preview'}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 shadow-lg">
                                                        <ZoomIn className="w-5 h-5 text-gray-700" />
                                                    </div>
                                                </button>
                                                {/* Scope */}
                                                <div className="absolute bottom-1.5 start-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                                                    → {img.scope === 'general' ? (isAr ? 'عامة' : 'General') :
                                                        img.scope === 'design' ? (isAr ? 'تصميم' : 'Design') :
                                                            (isAr ? 'لون' : 'Color')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 text-center">
                                        {isAr ? 'اضغط ✅/❌ لقبول أو رفض • اضغط على الصورة للاستعراض' : 'Click ✅/❌ to accept/reject • Click image to preview'}
                                    </p>

                                    {/* ═══ Full-screen Preview Lightbox ═══ */}
                                    {previewImage && (
                                        <div
                                            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                                            onClick={() => setPreviewImage(null)}
                                        >
                                            <button
                                                className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                                                onClick={() => setPreviewImage(null)}
                                            >
                                                <X className="w-6 h-6 text-white" />
                                            </button>
                                            <img
                                                src={previewImage}
                                                alt="Preview"
                                                className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <ImgIcon className="w-12 h-12 mx-auto mb-3" />
                                    <p>{isAr ? 'لم يتم إنشاء صور بعد' : 'No images generated yet'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ Step 4: Watermark Setup ═══ */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-base">
                                {isAr ? '🏷️ إضافة وسوم وبيانات المادة' : '🏷️ Add Material Watermark & Info'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {isAr ? 'عاين كيفية ظهور الوسوم على الصور المولدة.' : 'Preview how the watermarks look on generated images.'}
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Settings Column */}
                                <div className="space-y-3 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                    <label className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all bg-white dark:bg-gray-950",
                                        tagEnabled ? "border-indigo-400 ring-1 ring-indigo-400/20" : "border-gray-200"
                                    )}>
                                        <Checkbox checked={tagEnabled} onCheckedChange={(c) => setTagEnabled(!!c)} />
                                        <Tag className="w-4 h-4 text-indigo-500" />
                                        <span className="flex-1 text-sm font-medium">{isAr ? '🏷️ إضافة وسم المادة' : '🏷️ Enable Material Tag'}</span>
                                    </label>

                                    {tagEnabled && (
                                        <div className="ps-2 space-y-4 animate-in slide-in-from-top-2 pt-2">
                                            {/* Company watermark */}
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                                                <Input
                                                    value={companyWatermark}
                                                    onChange={e => setCompanyWatermark(e.target.value)}
                                                    placeholder={isAr ? 'اسم الشركة' : 'Company name'}
                                                    className="h-9 text-sm font-medium"
                                                />
                                            </div>

                                            {/* Data to show */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {[
                                                    { key: 'code', checked: showMaterialCode, set: setShowMaterialCode, labelAr: 'كود المادة', labelEn: 'Code' },
                                                    { key: 'name', checked: showMaterialName, set: setShowMaterialName, labelAr: 'اسم المادة', labelEn: 'Name' },
                                                    { key: 'comp', checked: showComposition, set: setShowComposition, labelAr: 'المكونات', labelEn: 'Composition' },
                                                    { key: 'design', checked: showDesign, set: setShowDesign, labelAr: 'التصميم', labelEn: 'Design' },
                                                    { key: 'color', checked: showColor, set: setShowColor, labelAr: 'اللون', labelEn: 'Color' },
                                                ].map(opt => (
                                                    <label key={opt.key} className={cn(
                                                        "px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-all flex items-center gap-1.5 font-medium",
                                                        opt.checked ? "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                                                    )}>
                                                        <Checkbox checked={opt.checked} onCheckedChange={(c) => opt.set(!!c)} className="w-3.5 h-3.5" />
                                                        {isAr ? opt.labelAr : opt.labelEn}
                                                    </label>
                                                ))}
                                            </div>

                                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />

                                            {/* QR / Barcode & Position */}
                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-3">
                                                    <label className={cn(
                                                        "flex-1 px-3 py-2 rounded-lg border text-xs cursor-pointer flex items-center justify-center gap-2 transition-all bg-white dark:bg-gray-950",
                                                        showQRCode ? "border-indigo-400 ring-1 ring-indigo-400/20" : "border-gray-200"
                                                    )}>
                                                        <Checkbox checked={showQRCode} onCheckedChange={(c) => setShowQRCode(!!c)} className="w-3.5 h-3.5" />
                                                        <QrCode className="w-4 h-4 text-indigo-500" />
                                                        {isAr ? 'QR كود' : 'QR Code'}
                                                    </label>
                                                    <label className={cn(
                                                        "flex-1 px-3 py-2 rounded-lg border text-xs cursor-pointer flex items-center justify-center gap-2 transition-all bg-white dark:bg-gray-950",
                                                        showBarcode ? "border-indigo-400 ring-1 ring-indigo-400/20" : "border-gray-200"
                                                    )}>
                                                        <Checkbox checked={showBarcode} onCheckedChange={(c) => setShowBarcode(!!c)} className="w-3.5 h-3.5" />
                                                        <Barcode className="w-4 h-4 text-indigo-500" />
                                                        {isAr ? 'باركود' : 'Barcode'}
                                                    </label>
                                                </div>
                                                <div className="flex gap-3">
                                                    <select
                                                        value={tagLanguage}
                                                        onChange={e => setTagLanguage(e.target.value as any)}
                                                        className="flex-1 h-9 text-xs border rounded-lg px-2 bg-white dark:bg-gray-950 focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="ar">اللغة: العربية</option>
                                                        <option value="en">Language: English</option>
                                                        <option value="tr">Language: Türkçe</option>
                                                        <option value="bilingual">اللغة: مزدوج (Bilingual)</option>
                                                    </select>
                                                    <select
                                                        value={tagPosition}
                                                        onChange={e => setTagPosition(e.target.value as any)}
                                                        className="flex-1 h-9 text-xs border rounded-lg px-2 bg-white dark:bg-gray-950 focus:outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="bottom-left">{isAr ? 'يمين الصورة' : 'Right Side'}</option>
                                                        <option value="bottom-right">{isAr ? 'يسار الصورة' : 'Left Side'}</option>
                                                        <option value="top-right">{isAr ? 'أعلى يمين' : 'Top Right'}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />

                                            {/* Price Tag (Optional) */}
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-semibold text-gray-700">{isAr ? 'السعر (اختياري):' : 'Price (Optional):'}</span>
                                                    <select
                                                        value={priceMode}
                                                        onChange={e => setPriceMode(e.target.value as any)}
                                                        className="h-8 text-xs border rounded-lg px-2 bg-white dark:bg-gray-950 focus:outline-none focus:border-emerald-500"
                                                    >
                                                        <option value="none">{isAr ? 'دون سعر' : 'None'}</option>
                                                        <option value="wholesale">{isAr ? 'سعر الجملة' : 'Wholesale Price'}</option>
                                                        <option value="retail">{isAr ? 'سعر المفرق' : 'Retail Price'}</option>
                                                    </select>
                                                </div>
                                                {priceMode !== 'none' && (
                                                    <div className="flex gap-2 animate-in fade-in zoom-in-95">
                                                        <Input 
                                                            value={priceValue} 
                                                            onChange={e => setPriceValue(e.target.value)} 
                                                            placeholder={isAr ? 'اكتب السعر (مثال: 15)' : 'Value (e.g 15)'} 
                                                            className="flex-1 h-9 text-sm font-semibold border-emerald-300 focus:border-emerald-500 dark:focus:border-emerald-500"
                                                        />
                                                        <Input 
                                                            value={currency} 
                                                            onChange={e => setCurrency(e.target.value)} 
                                                            placeholder={isAr ? 'العملة' : 'Currency'} 
                                                            className="w-20 h-9 text-sm text-center border-emerald-300 focus:border-emerald-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Preview Column */}
                                <div>
                                    <div className="sticky top-4 border-2 border-dashed rounded-2xl overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center min-h-[400px] relative">
                                        {!watermarkPreviewUrl || isRenderingWatermark ? (
                                            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                                                <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
                                                <span className="text-sm font-medium">{isAr ? 'جاري تطبيق الوسم وعرض المعاينة...' : 'Applying watermark preview...'}</span>
                                            </div>
                                        ) : (
                                            <img src={watermarkPreviewUrl} alt="Watermark Preview" className="w-full h-full object-contain saturate-[1.1] shadow-xl animate-in fade-in zoom-in duration-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Step 5: Distribution & Save ═══ */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-base">
                                {isAr ? '💾 توزيع الصور وحفظها' : '💾 Distribute & Save'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {isAr
                                    ? 'الصور ستُوزع تلقائياً على المستويات الصحيحة. يمكنك تعديل التوزيع لاحقاً.'
                                    : 'Images will be auto-distributed to correct levels. You can adjust later.'}
                            </p>

                            {/* Distribution preview */}
                            {['general', 'design', 'color'].map(scope => {
                                const scopeImages = generatedImages.filter(i => i.accepted && i.scope === scope);
                                if (scopeImages.length === 0) return null;
                                return (
                                    <div key={scope} className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                            {scope === 'general' ? '📷' : scope === 'design' ? '📁' : '🎨'}
                                            {scope === 'general' ? (isAr ? 'صور عامة' : 'General') :
                                                scope === 'design' ? (isAr ? 'صور التصميم' : 'Design') :
                                                    (isAr ? 'صور الألوان' : 'Colors')}
                                            <Badge variant="secondary" className="text-[10px] ms-1">{scopeImages.length}</Badge>
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {scopeImages.map((img, i) => (
                                                <div key={i} className="w-20 h-20 rounded-lg overflow-hidden border shrink-0">
                                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                                <CardContent className="p-3 text-center">
                                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                        {isAr
                                            ? `📊 ${generatedImages.filter(i => i.accepted).length} صورة جاهزة للحفظ`
                                            : `📊 ${generatedImages.filter(i => i.accepted).length} images ready to save`}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        {step > 1 && step !== 3 && (
                            <Button variant="ghost" size="sm" onClick={() => setStep((step - 1) as WizardStep)}>
                                <ChevronLeft className="w-4 h-4 me-1" />
                                {isAr ? 'السابق' : 'Back'}
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </Button>

                        {step === 1 && (
                            <Button
                                size="sm"
                                disabled={!referenceImage || isConverting}
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => setStep(2)}
                            >
                                {isAr ? 'التالي' : 'Next'}
                                <ChevronRight className="w-4 h-4 ms-1" />
                            </Button>
                        )}

                        {step === 2 && (
                            <Button
                                size="sm"
                                disabled={selectedTypes.size === 0 || totalTasks === 0}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                onClick={handleGenerate}
                            >
                                <Sparkles className="w-4 h-4 me-1" />
                                {isAr
                                    ? `إنشاء ${totalTasks} ${totalTasks === 1 ? 'صورة' : 'صور'}`
                                    : `Generate ${totalTasks} image${totalTasks > 1 ? 's' : ''}`}
                            </Button>
                        )}

                        {step === 3 && !isGenerating && generatedImages.length > 0 && (
                            <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => setStep(4)}
                            >
                                {isAr ? 'التالي: إضافة الوسوم' : 'Next: Watermarks'}
                                <ChevronRight className="w-4 h-4 ms-1" />
                            </Button>
                        )}

                        {step === 4 && (
                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                                onClick={() => setStep(5)}
                            >
                                {isAr ? 'التالي: التوزيع' : 'Next: Distribute'}
                                <ChevronRight className="w-4 h-4 ms-1" />
                            </Button>
                        )}

                        {step === 5 && (
                            <Button
                                size="sm"
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleSaveAll}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 me-1 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 me-1" />
                                )}
                                {isAr ? 'حفظ الكل' : 'Save All'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
