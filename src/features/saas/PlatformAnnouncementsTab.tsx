/**
 * ════════════════════════════════════════════════════════════════
 * 📢 Platform Announcements Management — SaaS Admin
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Eye,
  EyeOff,
  AlertTriangle,
  Wrench,
  ArrowUpCircle,
  Sparkles,
  Gift,
  Scale,
  Info,
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import {
  PlatformAnnouncementsService,
  ANNOUNCEMENT_COLORS,
  type PlatformAnnouncement,
  type CreatePlatformAnnouncement,
} from '@/services/saas/platformAnnouncementsService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Type config ─────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ComponentType<any>; labelAr: string; labelEn: string }> = {
  urgent:      { icon: AlertTriangle,  labelAr: 'عاجل',       labelEn: 'Urgent' },
  maintenance: { icon: Wrench,         labelAr: 'صيانة',      labelEn: 'Maintenance' },
  update:      { icon: ArrowUpCircle,  labelAr: 'تحديث',      labelEn: 'Update' },
  feature:     { icon: Sparkles,       labelAr: 'ميزة جديدة', labelEn: 'New Feature' },
  promotion:   { icon: Gift,           labelAr: 'ترويج',      labelEn: 'Promotion' },
  legal:       { icon: Scale,          labelAr: 'قانوني',     labelEn: 'Legal' },
  info:        { icon: Info,           labelAr: 'معلومات',    labelEn: 'Info' },
};

// ─── Default empty form ─────────────────────────────────────
const EMPTY_FORM: Partial<CreatePlatformAnnouncement> = {
  title_ar: '',
  title_en: '',
  message_ar: '',
  message_en: '',
  announcement_type: 'info',
  priority: 5,
  bg_color: '#047857',
  text_color: '#ffffff',
  icon: 'info',
  cta_text_ar: '',
  cta_text_en: '',
  cta_link: '',
  target_audience: 'all',
  is_active: true,
  is_dismissable: true,
  animation_type: 'scroll',
};

// ─── Component ─────────────────────────────────────────────────
export function PlatformAnnouncementsTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isAr = language === 'ar';

  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformAnnouncement | null>(null);
  const [form, setForm] = useState<Partial<CreatePlatformAnnouncement>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ─── Load ──────────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PlatformAnnouncementsService.getAll();
      setAnnouncements(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  // ─── Handlers ──────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, created_by: user?.id });
    setDialogOpen(true);
  };

  const openEdit = (a: PlatformAnnouncement) => {
    setEditingId(a.id);
    setForm({
      title_ar: a.title_ar,
      title_en: a.title_en,
      message_ar: a.message_ar,
      message_en: a.message_en,
      announcement_type: a.announcement_type,
      priority: a.priority,
      bg_color: a.bg_color,
      text_color: a.text_color,
      icon: a.icon,
      cta_text_ar: a.cta_text_ar || '',
      cta_text_en: a.cta_text_en || '',
      cta_link: a.cta_link || '',
      target_audience: a.target_audience,
      is_active: a.is_active,
      is_dismissable: a.is_dismissable,
      animation_type: a.animation_type,
      starts_at: a.starts_at,
      ends_at: a.ends_at || undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.message_ar && !form.message_en) {
      toast.error(isAr ? 'يرجى إدخال نص الإعلان' : 'Please enter announcement text');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await PlatformAnnouncementsService.update(editingId, form);
        toast.success(isAr ? 'تم تعديل الإعلان' : 'Announcement updated');
      } else {
        await PlatformAnnouncementsService.create(form as CreatePlatformAnnouncement);
        toast.success(isAr ? 'تم إنشاء الإعلان' : 'Announcement created');
      }
      setDialogOpen(false);
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await PlatformAnnouncementsService.delete(deleteTarget.id);
      toast.success(isAr ? 'تم حذف الإعلان' : 'Announcement deleted');
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (a: PlatformAnnouncement) => {
    try {
      await PlatformAnnouncementsService.toggleActive(a.id, !a.is_active);
      setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(isAr 
        ? (a.is_active ? 'تم إيقاف الإعلان' : 'تم تفعيل الإعلان')
        : (a.is_active ? 'Announcement deactivated' : 'Announcement activated'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateForm = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-update colors when type changes
      if (key === 'announcement_type' && ANNOUNCEMENT_COLORS[value]) {
        next.bg_color = ANNOUNCEMENT_COLORS[value].bg;
        next.text_color = ANNOUNCEMENT_COLORS[value].text;
        next.icon = value === 'urgent' ? 'alert' : value;
      }
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            {isAr ? 'إعلانات المنصة' : 'Platform Announcements'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? 'إدارة الإعلانات التي تظهر لجميع المستخدمين في الشريط العلوي' : 'Manage announcements shown to all users in the top ticker bar'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          {isAr ? 'إعلان جديد' : 'New Announcement'}
        </Button>
      </div>

      {/* Announcements list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {isAr ? 'لا توجد إعلانات بعد. أنشئ إعلانك الأول!' : 'No announcements yet. Create your first one!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {announcements.map((a, i) => {
              const TypeIcon = TYPE_CONFIG[a.announcement_type]?.icon || Info;
              const typeLabel = isAr 
                ? TYPE_CONFIG[a.announcement_type]?.labelAr 
                : TYPE_CONFIG[a.announcement_type]?.labelEn;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={cn('transition-all', !a.is_active && 'opacity-50')}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Color preview */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: a.bg_color, color: a.text_color }}
                        >
                          <TypeIcon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {typeLabel}
                            </Badge>
                            <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs">
                              {a.is_active 
                                ? (isAr ? 'نشط' : 'Active')
                                : (isAr ? 'متوقف' : 'Inactive')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              P{a.priority}
                            </span>
                            {a.animation_type !== 'scroll' && (
                              <Badge variant="outline" className="text-xs">
                                {a.animation_type}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm truncate">
                            {isAr ? a.message_ar : a.message_en}
                          </p>
                          {(a.starts_at || a.ends_at) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(a.starts_at).toLocaleDateString()}
                              {a.ends_at && ` → ${new Date(a.ends_at).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(a)}
                            title={a.is_active ? (isAr ? 'إيقاف' : 'Deactivate') : (isAr ? 'تفعيل' : 'Activate')}
                          >
                            {a.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ Create/Edit Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              {editingId 
                ? (isAr ? 'تعديل الإعلان' : 'Edit Announcement')
                : (isAr ? 'إنشاء إعلان جديد' : 'Create New Announcement')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Preview bar */}
            <div
              className="w-full py-2.5 px-4 text-center font-medium rounded-lg text-sm"
              style={{
                backgroundColor: form.bg_color || '#047857',
                color: form.text_color || '#fff',
                fontFamily: "'Inter', 'Tajawal', sans-serif",
              }}
            >
              {(isAr ? form.message_ar : form.message_en) || (isAr ? 'معاينة الإعلان...' : 'Preview announcement...')}
              {form.cta_text_ar || form.cta_text_en ? (
                <span className="underline ms-3 font-semibold">
                  {isAr ? form.cta_text_ar : form.cta_text_en}
                </span>
              ) : null}
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isAr ? 'النوع' : 'Type'}</Label>
                <Select value={form.announcement_type} onValueChange={(v) => updateForm('announcement_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {isAr ? cfg.labelAr : cfg.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isAr ? 'الأولوية (1-10)' : 'Priority (1-10)'}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority || 5}
                  onChange={(e) => updateForm('priority', parseInt(e.target.value) || 5)}
                />
              </div>
            </div>

            {/* Messages AR & EN */}
            <div className="space-y-3">
              <div>
                <Label>{isAr ? 'النص بالعربية' : 'Arabic Text'}</Label>
                <Textarea
                  dir="rtl"
                  placeholder={isAr ? 'نص الإعلان بالعربية...' : 'Arabic announcement text...'}
                  value={form.message_ar || ''}
                  onChange={(e) => updateForm('message_ar', e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label>{isAr ? 'النص بالإنجليزية' : 'English Text'}</Label>
                <Textarea
                  dir="ltr"
                  placeholder="English announcement text..."
                  value={form.message_en || ''}
                  onChange={(e) => updateForm('message_en', e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{isAr ? 'نص الزر (عربي)' : 'CTA Arabic'}</Label>
                <Input
                  dir="rtl"
                  value={form.cta_text_ar || ''}
                  onChange={(e) => updateForm('cta_text_ar', e.target.value)}
                  placeholder={isAr ? 'مثل: اعرف المزيد' : 'e.g. Learn More'}
                />
              </div>
              <div>
                <Label>{isAr ? 'نص الزر (إنجليزي)' : 'CTA English'}</Label>
                <Input
                  dir="ltr"
                  value={form.cta_text_en || ''}
                  onChange={(e) => updateForm('cta_text_en', e.target.value)}
                  placeholder="e.g. Learn More"
                />
              </div>
              <div>
                <Label>{isAr ? 'رابط الزر' : 'CTA Link'}</Label>
                <Input
                  dir="ltr"
                  value={form.cta_link || ''}
                  onChange={(e) => updateForm('cta_link', e.target.value)}
                  placeholder="/pricing"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isAr ? 'لون الخلفية' : 'Background Color'}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.bg_color || '#047857'}
                    onChange={(e) => updateForm('bg_color', e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.bg_color || '#047857'}
                    onChange={(e) => updateForm('bg_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>{isAr ? 'الجمهور المستهدف' : 'Target Audience'}</Label>
                <Select value={form.target_audience} onValueChange={(v) => updateForm('target_audience', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'الجميع' : 'All'}</SelectItem>
                    <SelectItem value="trial">{isAr ? 'تجريبي' : 'Trial'}</SelectItem>
                    <SelectItem value="paid">{isAr ? 'مدفوع' : 'Paid'}</SelectItem>
                    <SelectItem value="expired">{isAr ? 'منتهي' : 'Expired'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{isAr ? 'تاريخ البدء' : 'Start Date'}</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at ? new Date(form.starts_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateForm('starts_at', e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                />
              </div>
              <div>
                <Label>{isAr ? 'تاريخ الانتهاء (اختياري)' : 'End Date (optional)'}</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at ? new Date(form.ends_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => updateForm('ends_at', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_dismissable}
                  onCheckedChange={(v) => updateForm('is_dismissable', v)}
                />
                <Label>{isAr ? 'قابل للإخفاء' : 'Dismissable'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => updateForm('is_active', v)}
                />
                <Label>{isAr ? 'نشط' : 'Active'}</Label>
              </div>
              <div>
                <Select value={form.animation_type} onValueChange={(v) => updateForm('animation_type', v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll">{isAr ? 'متحرك' : 'Scroll'}</SelectItem>
                    <SelectItem value="static">{isAr ? 'ثابت' : 'Static'}</SelectItem>
                    <SelectItem value="blink">{isAr ? 'نابض' : 'Blink'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'حذف الإعلان' : 'Delete Announcement'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? 'هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع.'
                : 'Are you sure you want to delete this announcement? This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isAr ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PlatformAnnouncementsTab;
