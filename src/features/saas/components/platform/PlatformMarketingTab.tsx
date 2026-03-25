/**
 * ════════════════════════════════════════════════════════════════
 * 🎁 Platform Marketing Tab — Promotions & Coupons
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Gift, Plus, Edit, Trash2, Save, X, Loader2,
    Percent, Calendar, Tag, Users, Star,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MarketingTabProps {
    platformId: string;
    platformCode: string;
}

export default function PlatformMarketingTab({ platformId, platformCode }: MarketingTabProps) {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [loading, setLoading] = useState(true);
    const [promos, setPromos] = useState<any[]>([]);
    const [usageStats, setUsageStats] = useState<any[]>([]);
    const [editItem, setEditItem] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: promoData } = await supabase
                .from('promotional_discounts')
                .select('*')
                .order('priority', { ascending: true });

            const { data: usageData } = await supabase
                .from('coupon_usage')
                .select('*')
                .order('used_at', { ascending: false });

            setPromos(promoData || []);
            setUsageStats(usageData || []);
        } catch (err) {
            console.error('Load marketing error:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const newPromo = () => {
        setEditItem({
            code: '',
            name_ar: '',
            name_en: '',
            description: '',
            discount_percentage: 10,
            valid_from: new Date().toISOString().split('T')[0],
            valid_to: '',
            is_active: true,
            auto_apply: false,
            priority: promos.length,
            applies_to: 'all',
        });
    };

    const save = async () => {
        if (!editItem) return;
        setSaving(true);
        const { id, created_at, updated_at, created_by, ...payload } = editItem;
        // Convert dates
        if (payload.valid_from) payload.valid_from = new Date(payload.valid_from).toISOString();
        if (payload.valid_to) payload.valid_to = new Date(payload.valid_to).toISOString();
        else payload.valid_to = null;

        const { error } = id
            ? await supabase.from('promotional_discounts').update(payload).eq('id', id)
            : await supabase.from('promotional_discounts').insert(payload);
        if (error) toast.error((isAr ? 'خطأ: ' : 'Error: ') + error.message);
        else { toast.success(isAr ? 'تم الحفظ ✅' : 'Saved ✅'); setEditItem(null); load(); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        await supabase.from('promotional_discounts').delete().eq('id', id);
        toast.success(isAr ? 'تم الحذف' : 'Deleted');
        load();
    };

    // Stats
    const activePromos = promos.filter(p => p.is_active).length;
    const totalUsage = usageStats.length;
    const totalSaved = usageStats.reduce((sum, u) => sum + Number(u.discount_amount || 0), 0);

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { icon: Gift, labelAr: 'عروض', labelEn: 'Promotions', value: promos.length, color: 'text-purple-600' },
                    { icon: Star, labelAr: 'نشطة', labelEn: 'Active', value: activePromos, color: 'text-emerald-600' },
                    { icon: Users, labelAr: 'مرات الاستخدام', labelEn: 'Times Used', value: totalUsage, color: 'text-blue-600' },
                    { icon: Percent, labelAr: 'إجمالي الخصومات', labelEn: 'Total Discounts', value: `$${totalSaved.toLocaleString()}`, color: 'text-amber-600' },
                ].map((s, i) => (
                    <Card key={i} className="border-gray-200">
                        <CardContent className="p-3 flex items-center gap-3">
                            <s.icon className={cn("w-5 h-5", s.color)} />
                            <div>
                                <div className="text-lg font-bold">{s.value}</div>
                                <div className="text-[10px] text-gray-500">{isAr ? s.labelAr : s.labelEn}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Promotions List */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Gift className="w-4 h-4 text-purple-500" />
                            {isAr ? 'العروض والخصومات' : 'Promotions & Discounts'}
                            <Badge variant="secondary" className="text-[10px]">{promos.length}</Badge>
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={newPromo} className="h-7 text-xs gap-1">
                            <Plus className="w-3 h-3" /> {isAr ? 'عرض جديد' : 'New Promo'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Edit Form */}
                    {editItem && (
                        <div className="border rounded-lg p-3 bg-purple-50/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-purple-700">
                                    {editItem.id ? (isAr ? 'تعديل العرض' : 'Edit Promo') : (isAr ? 'عرض جديد' : 'New Promo')}
                                </span>
                                <Button size="sm" variant="ghost" onClick={() => setEditItem(null)} className="h-6 w-6 p-0">
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'الكود' : 'Code'}</Label>
                                    <Input value={editItem.code} onChange={e => setEditItem({ ...editItem, code: e.target.value.toUpperCase() })}
                                        placeholder="WELCOME25" className="h-8 text-xs mt-0.5 font-mono" dir="ltr" />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
                                    <Input value={editItem.name_ar} onChange={e => setEditItem({ ...editItem, name_ar: e.target.value })}
                                        className="h-8 text-xs mt-0.5" />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
                                    <Input value={editItem.name_en} onChange={e => setEditItem({ ...editItem, name_en: e.target.value })}
                                        className="h-8 text-xs mt-0.5" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-[10px]">{isAr ? 'الوصف' : 'Description'}</Label>
                                <Textarea value={editItem.description || ''} onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                                    className="text-xs mt-0.5" rows={2} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'نسبة الخصم %' : 'Discount %'}</Label>
                                    <Input type="number" min="1" max="100" value={editItem.discount_percentage}
                                        onChange={e => setEditItem({ ...editItem, discount_percentage: Number(e.target.value) })}
                                        className="h-8 text-xs mt-0.5" />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'من' : 'Valid From'}</Label>
                                    <Input type="date" value={editItem.valid_from?.split('T')[0] || ''}
                                        onChange={e => setEditItem({ ...editItem, valid_from: e.target.value })}
                                        className="h-8 text-xs mt-0.5" />
                                </div>
                                <div>
                                    <Label className="text-[10px]">{isAr ? 'إلى' : 'Valid To'}</Label>
                                    <Input type="date" value={editItem.valid_to?.split('T')[0] || ''}
                                        onChange={e => setEditItem({ ...editItem, valid_to: e.target.value })}
                                        className="h-8 text-xs mt-0.5" />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch checked={editItem.is_active} onCheckedChange={v => setEditItem({ ...editItem, is_active: v })} />
                                    <span className="text-[10px]">{isAr ? 'مفعّل' : 'Active'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={editItem.auto_apply} onCheckedChange={v => setEditItem({ ...editItem, auto_apply: v })} />
                                    <span className="text-[10px]">{isAr ? 'تطبيق تلقائي' : 'Auto Apply'}</span>
                                </div>
                            </div>
                            <Button onClick={save} disabled={saving} size="sm" className="w-full bg-purple-600 hover:bg-purple-700 h-8">
                                {saving ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : <Save className="w-3 h-3 me-1" />}
                                {isAr ? 'حفظ' : 'Save'}
                            </Button>
                        </div>
                    )}

                    {/* List */}
                    {promos.length === 0 && !editItem && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            {isAr ? 'لا توجد عروض — اضغط "عرض جديد" لإضافة' : 'No promotions — click "New Promo" to add'}
                        </div>
                    )}
                    {promos.map(promo => {
                        const usageCount = usageStats.filter(u => u.coupon_id === promo.id).length;
                        const isExpired = promo.valid_to && new Date(promo.valid_to) < new Date();

                        return (
                            <div key={promo.id} className={cn("border rounded-lg p-3 flex items-center gap-3",
                                !promo.is_active && "opacity-50", isExpired && "border-dashed"
                            )}>
                                {/* Icon */}
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm",
                                    promo.is_active && !isExpired ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
                                )}>
                                    {promo.discount_percentage}%
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold font-mono" dir="ltr">{promo.code}</span>
                                        <span className="text-xs text-gray-500">{isAr ? promo.name_ar : promo.name_en}</span>
                                        {promo.auto_apply && <Badge variant="secondary" className="text-[9px]">{isAr ? 'تلقائي' : 'Auto'}</Badge>}
                                        {isExpired && <Badge variant="destructive" className="text-[9px]">{isAr ? 'منتهي' : 'Expired'}</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {promo.valid_from ? new Date(promo.valid_from).toLocaleDateString() : '—'}
                                            {promo.valid_to ? ` → ${new Date(promo.valid_to).toLocaleDateString()}` : ''}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {usageCount} {isAr ? 'استخدام' : 'uses'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditItem(promo)}>
                                        <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => remove(promo.id)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
