/**
 * ════════════════════════════════════════════════════════════════
 * 📷 Material Images Tab
 * تبويب صور المادة - رفع وعرض الصور
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ImagePlus,
    Trash2,
    Star,
    StarOff,
    Upload,
    X,
    Image as ImageIcon,
    ZoomIn,
    Download,
    MoreVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SheetMode } from '../types';

interface MaterialImage {
    id: string;
    url: string;
    alt?: string;
    is_primary?: boolean;
    order?: number;
    uploaded_at?: string;
}

interface MaterialImagesTabProps {
    data: any;
    mode: SheetMode;
    onChange?: (updates: any) => void;
}

export function MaterialImagesTab({ data, mode, onChange }: MaterialImagesTabProps) {
    const { language } = useLanguage();
    const isReadOnly = mode === 'view';

    const [images, setImages] = useState<MaterialImage[]>(() => {
        if (data?.images && Array.isArray(data.images)) {
            return data.images;
        }
        return [];
    });

    const [selectedImage, setSelectedImage] = useState<MaterialImage | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleChange = useCallback((field: string, value: any) => {
        if (onChange && !isReadOnly) {
            onChange({ [field]: value });
        }
    }, [onChange, isReadOnly]);

    const handleAddImage = (url: string) => {
        const newImage: MaterialImage = {
            id: `img-${Date.now()}`,
            url,
            is_primary: images.length === 0,
            order: images.length,
            uploaded_at: new Date().toISOString(),
        };
        const updatedImages = [...images, newImage];
        setImages(updatedImages);
        handleChange('images', updatedImages);
    };

    const handleRemoveImage = (imageId: string) => {
        const updatedImages = images.filter(img => img.id !== imageId);
        // If we removed the primary, set the first one as primary
        if (updatedImages.length > 0 && !updatedImages.some(img => img.is_primary)) {
            updatedImages[0].is_primary = true;
        }
        setImages(updatedImages);
        handleChange('images', updatedImages);
    };

    const handleSetPrimary = (imageId: string) => {
        const updatedImages = images.map(img => ({
            ...img,
            is_primary: img.id === imageId
        }));
        setImages(updatedImages);
        handleChange('images', updatedImages);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        // Simulate upload - in production, use Supabase Storage
        for (const file of Array.from(files)) {
            // Create a preview URL for demo
            const previewUrl = URL.createObjectURL(file);
            handleAddImage(previewUrl);
        }

        setIsUploading(false);
        e.target.value = ''; // Reset input
    };

    return (
        <div className="space-y-6 pb-6">
            {/* Upload Section - Only in Edit/Create Mode */}
            {!isReadOnly && (
                <Card className="border-2 border-dashed border-erp-primary/30 hover:border-erp-primary/50 transition-colors">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-erp-primary/10 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-erp-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-gray-900 dark:text-white">
                                    {language === 'ar' ? 'رفع صور المادة' : 'Upload Material Images'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {language === 'ar'
                                        ? 'اسحب وأفلت الصور هنا أو انقر للاختيار'
                                        : 'Drag and drop images here or click to select'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    PNG, JPG, WEBP {language === 'ar' ? 'حتى 5 ميجابايت' : 'up to 5MB'}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="default" className="relative" disabled={isUploading}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <ImagePlus className="w-4 h-4 me-2" />
                                    {language === 'ar' ? 'اختيار صور' : 'Select Images'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Images Grid */}
            {images.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {language === 'ar' ? `الصور (${images.length})` : `Images (${images.length})`}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className={cn(
                                    "relative group rounded-xl overflow-hidden border-2 transition-all",
                                    "hover:shadow-lg cursor-pointer",
                                    image.is_primary
                                        ? "border-erp-primary ring-2 ring-erp-primary/20"
                                        : "border-gray-200 dark:border-gray-700"
                                )}
                                onClick={() => setSelectedImage(image)}
                            >
                                {/* Image */}
                                <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                                    <img
                                        src={image.url}
                                        alt={image.alt || `Image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M4 4h16v16H4z"/></svg>';
                                        }}
                                    />
                                </div>

                                {/* Primary Badge */}
                                {image.is_primary && (
                                    <div className="absolute top-2 start-2 bg-erp-primary text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" />
                                        {language === 'ar' ? 'رئيسية' : 'Primary'}
                                    </div>
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white/90 hover:bg-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImage(image);
                                        }}
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>

                                    {!isReadOnly && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="bg-white/90 hover:bg-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {!image.is_primary && (
                                                    <DropdownMenuItem onClick={() => handleSetPrimary(image.id)}>
                                                        <Star className="w-4 h-4 me-2" />
                                                        {language === 'ar' ? 'تعيين كرئيسية' : 'Set as Primary'}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleRemoveImage(image.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 me-2" />
                                                    {language === 'ar' ? 'حذف' : 'Delete'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Empty State */
                <Card className="border border-dashed">
                    <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {language === 'ar' ? 'لا توجد صور' : 'No Images'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {language === 'ar'
                                ? 'قم برفع صور للمادة لعرضها هنا'
                                : 'Upload material images to display them here'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh]">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute -top-12 end-0 text-white hover:bg-white/20"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.alt || 'Material Image'}
                            className="w-full h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
