/**
 * ContactNotesTab — تبويب الملاحظات
 * 
 * ✅ ملاحظات عامة (notes field من contacts)
 * ✅ عرض وتعديل في جميع الأوضاع
 * ✅ حقول مخصصة (tags)
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    StickyNote, Tag, Plus, X, Star,
} from 'lucide-react';

import type { SheetMode } from '../types';

interface ContactNotesTabProps {
    data: any;
    mode: SheetMode;
    onChange: (updates: any) => void;
}

export function ContactNotesTab({ data, mode, onChange }: ContactNotesTabProps) {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';
    const isViewMode = mode === 'view';
    const [newTag, setNewTag] = useState('');

    const tags: string[] = Array.isArray(data?.tags) ? data.tags : [];

    const addTag = () => {
        const tag = newTag.trim();
        if (tag && !tags.includes(tag)) {
            onChange({ tags: [...tags, tag] });
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => {
        onChange({ tags: tags.filter(t => t !== tag) });
    };

    const inputClass = isViewMode
        ? 'bg-gray-50 dark:bg-gray-800 border-transparent cursor-default'
        : '';

    return (
        <div className="space-y-6">
            {/* Notes Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    {isRTL ? 'الملاحظات' : 'Notes'}
                </h3>
                <Textarea
                    value={data?.notes || ''}
                    onChange={e => onChange({ notes: e.target.value })}
                    readOnly={isViewMode}
                    className={`text-sm min-h-[160px] ${inputClass}`}
                    rows={6}
                    placeholder={isViewMode ? '' : (isRTL ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...')}
                />
            </div>

            <Separator />

            {/* Tags Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {isRTL ? 'الوسوم' : 'Tags'}
                </h3>

                {/* Existing Tags */}
                <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <Tag className="w-3 h-3" />
                            {tag}
                            {!isViewMode && (
                                <button onClick={() => removeTag(tag)} className="ms-1 hover:text-red-500 transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </Badge>
                    )) : (
                        <p className="text-xs text-gray-400">{isRTL ? 'لا توجد وسوم' : 'No tags'}</p>
                    )}
                </div>

                {/* Add Tag */}
                {!isViewMode && (
                    <div className="flex gap-2">
                        <Input
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                            placeholder={isRTL ? 'أضف وسم...' : 'Add tag...'}
                            className="h-8 text-xs flex-1"
                        />
                        <Button size="sm" variant="outline" onClick={addTag} className="h-8 px-3 text-xs gap-1">
                            <Plus className="w-3 h-3" />
                            {isRTL ? 'إضافة' : 'Add'}
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Lead Score */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {isRTL ? 'تقييم العميل المحتمل' : 'Lead Score'}
                </h3>
                <div className="flex items-center gap-4">
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        value={data?.lead_score ?? 0}
                        onChange={e => onChange({ lead_score: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        readOnly={isViewMode}
                        className={`h-9 text-sm w-24 ${inputClass}`}
                    />
                    <div className="flex-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500"
                                style={{ width: `${Math.min(100, data?.lead_score || 0)}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-xs font-mono text-gray-500 w-12 text-end">{data?.lead_score || 0}/100</span>
                </div>
            </div>

            {/* Lost Reason (only if stage is lost) */}
            {(data?.lifecycle_stage === 'lost' || !isViewMode) && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {isRTL ? 'سبب الخسارة' : 'Lost Reason'}
                        </h3>
                        <Textarea
                            value={data?.lost_reason || ''}
                            onChange={e => onChange({ lost_reason: e.target.value })}
                            readOnly={isViewMode}
                            className={`text-sm min-h-[80px] ${inputClass}`}
                            rows={3}
                            placeholder={isViewMode ? '' : (isRTL ? 'أدخل سبب الخسارة إن وُجد...' : 'Enter lost reason if applicable...')}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default ContactNotesTab;
