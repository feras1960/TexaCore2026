/**
 * ════════════════════════════════════════════════════════════════
 * 📢 Company Announcements Settings Tab
 * ════════════════════════════════════════════════════════════════
 * Tab in SystemConfigPage for tenant owners to manage ticker bar announcements
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { useLanguage } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import {
  CompanyAnnouncementsService,
  COMPANY_ANNOUNCEMENT_TYPES,
  type CompanyAnnouncement,
  type CreateCompanyAnnouncement,
} from '@/services/data/companyAnnouncementsService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const EMPTY_FORM: Partial<CreateCompanyAnnouncement> = {
  message_ar: '',
  message_en: '',
  announcement_type: 'info',
  priority: 5,
  bg_color: '#047857',
  text_color: '#ffffff',
  is_active: true,
  is_dismissable: true,
};

export function CompanyAnnouncementsTab() {
  const { language } = useLanguage();
  const { user, tenantId } = useAuth();
  const isAr = language === 'ar';

  const [list, setList] = useState<CompanyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyAnnouncement | null>(null);
  const [form, setForm] = useState<Partial<CreateCompanyAnnouncement>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await CompanyAnnouncementsService.getAll(tenantId);
      setList(data);
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, tenant_id: tenantId!, created_by: user?.id });
    setDialogOpen(true);
  };

  const openEdit = (a: CompanyAnnouncement) => {
    setEditingId(a.id);
    setForm({
      message_ar: a.message_ar,
      message_en: a.message_en,
      announcement_type: a.announcement_type,
      priority: a.priority,
      bg_color: a.bg_color,
      text_color: a.text_color,
      is_active: a.is_active,
      is_dismissable: a.is_dismissable,
      starts_at: a.starts_at,
      ends_at: a.ends_at || undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.message_ar && !form.message_en) {
      toast.error(isAr ? 'يرجى إدخال نص الإعلان' : 'Please enter text');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await CompanyAnnouncementsService.update(editingId, form);
        toast.success(isAr ? 'تم التعديل' : 'Updated');
      } else {
        await CompanyAnnouncementsService.create({
          ...form,
          tenant_id: tenantId!,
          created_by: user?.id,
        } as CreateCompanyAnnouncement);
        toast.success(isAr ? 'تم الإنشاء' : 'Created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await CompanyAnnouncementsService.delete(deleteTarget.id);
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggle = async (a: CompanyAnnouncement) => {
    try {
      await CompanyAnnouncementsService.toggleActive(a.id, !a.is_active);
      setList(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateForm = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'announcement_type' && COMPANY_ANNOUNCEMENT_TYPES[value]) {
        next.bg_color = COMPANY_ANNOUNCEMENT_TYPES[value].bg;
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            {isAr ? 'إعلانات الشركة' : 'Company Announcements'}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAr ? 'إعلانات تظهر لموظفي الشركة في الشريط العلوي' : 'Announcements shown to company employees in the ticker bar'}
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          {isAr ? 'إعلان جديد' : 'New'}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لا توجد إعلانات. أنشئ إعلانك الأول!' : 'No announcements yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {list.map((a, i) => {
              const typeInfo = COMPANY_ANNOUNCEMENT_TYPES[a.announcement_type];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className={cn('transition-all', !a.is_active && 'opacity-50')}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Color dot */}
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.bg_color }} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge variant="outline" className="text-[11px] h-5">
                            {isAr ? typeInfo?.labelAr : typeInfo?.labelEn}
                          </Badge>
                          <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-[11px] h-5">
                            {a.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'متوقف' : 'Off')}
                          </Badge>
                        </div>
                        <p className="text-sm truncate">{isAr ? a.message_ar : a.message_en}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(a)}>
                          {a.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(a)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              {editingId ? (isAr ? 'تعديل' : 'Edit') : (isAr ? 'إعلان جديد' : 'New Announcement')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preview */}
            <div
              className="w-full py-2 px-4 text-center rounded-md text-sm font-medium"
              style={{ backgroundColor: form.bg_color || '#047857', color: form.text_color || '#fff', fontFamily: "'Inter', 'Tajawal', sans-serif" }}
            >
              {(isAr ? form.message_ar : form.message_en) || (isAr ? 'معاينة...' : 'Preview...')}
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isAr ? 'النوع' : 'Type'}</Label>
                <Select value={form.announcement_type} onValueChange={v => updateForm('announcement_type', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPANY_ANNOUNCEMENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{isAr ? v.labelAr : v.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'الأولوية' : 'Priority'}</Label>
                <Input type="number" min={1} max={10} value={form.priority || 5} onChange={e => updateForm('priority', +e.target.value || 5)} className="h-9" />
              </div>
            </div>

            {/* Messages */}
            <div>
              <Label className="text-xs">{isAr ? 'النص بالعربية' : 'Arabic'}</Label>
              <Textarea dir="rtl" rows={2} value={form.message_ar || ''} onChange={e => updateForm('message_ar', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">{isAr ? 'النص بالإنجليزية' : 'English'}</Label>
              <Textarea dir="ltr" rows={2} value={form.message_en || ''} onChange={e => updateForm('message_en', e.target.value)} />
            </div>

            {/* Color */}
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-xs">{isAr ? 'اللون' : 'Color'}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.bg_color || '#047857'} onChange={e => updateForm('bg_color', e.target.value)} className="w-9 h-9 rounded border cursor-pointer" />
                  <Input value={form.bg_color || '#047857'} onChange={e => updateForm('bg_color', e.target.value)} className="w-28 h-9" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={form.is_dismissable} onCheckedChange={v => updateForm('is_dismissable', v)} />
                <Label className="text-xs">{isAr ? 'قابل للإخفاء' : 'Dismissable'}</Label>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={form.is_active} onCheckedChange={v => updateForm('is_active', v)} />
                <Label className="text-xs">{isAr ? 'نشط' : 'Active'}</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? '...' : (isAr ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'حذف الإعلان' : 'Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr ? 'هل أنت متأكد؟ لا يمكن التراجع.' : 'Are you sure? This cannot be undone.'}
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

export default CompanyAnnouncementsTab;
