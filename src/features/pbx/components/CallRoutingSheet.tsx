import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Route, Filter, Play, ArrowDown, ArrowUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CallRoutingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  data?: any;
  companyId: string;
  onSuccess: () => void;
}

export function CallRoutingSheet({
  isOpen,
  onClose,
  mode,
  data,
  companyId,
  onSuccess,
}: CallRoutingSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priority: 10,
    direction: 'inbound',
    condition_type: 'all',
    condition_value_text: '', // Simplified from JSON for MVP
    action: 'ivr',
    action_target: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          name: data.name || '',
          priority: data.priority || 10,
          direction: data.direction || 'inbound',
          condition_type: data.condition_type || 'all',
          condition_value_text: data.condition_value?.value || '',
          action: data.action || 'ivr',
          action_target: data.action_target || '',
        });
      } else {
        setFormData({
          name: '',
          priority: 10,
          direction: 'inbound',
          condition_type: 'all',
          condition_value_text: '',
          action: 'ivr',
          action_target: '',
        });
      }
    }
  }, [isOpen, mode, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error(isRTL ? 'اسم القاعدة مطلوب' : 'Rule name is required');
      return;
    }
    if (!formData.action_target && formData.action !== 'voicemail') {
      toast.error(isRTL ? 'هدف الإجراء مطلوب' : 'Action target is required');
      return;
    }

    setIsLoading(true);

    const dbData = {
      company_id: companyId,
      name: formData.name,
      priority: formData.priority,
      direction: formData.direction,
      condition_type: formData.condition_type,
      condition_value: { value: formData.condition_value_text },
      action: formData.action,
      action_target: formData.action_target,
    };

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('pbx_call_routing').insert(dbData);
        if (error) throw error;
        toast.success(isRTL ? 'تم إنشاء القاعدة بنجاح' : 'Rule created successfully');
      } else {
        const { error } = await supabase
          .from('pbx_call_routing')
          .update(dbData)
          .eq('id', data.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث القاعدة بنجاح' : 'Rule updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving routing rule:', err);
      toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving routing rule');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto" dir={direction}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-rose-600" />
            {mode === 'create'
              ? isRTL ? 'إضافة قاعدة توجيه جديدة' : 'Add Routing Rule'
              : isRTL ? 'تعديل قاعدة التوجيه' : 'Edit Routing Rule'}
          </SheetTitle>
          <SheetDescription>
            {isRTL
              ? 'تحديد مسار المكالمات الواردة والصادرة بناءً على الشروط (مثل الوقت أو المتصل)'
              : 'Define how inbound and outbound calls are routed based on specific conditions.'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* General info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>{isRTL ? 'اسم القاعدة (للتمييز)' : 'Rule Name'} <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={isRTL ? 'مثال: توجيه المكالمات أثناء الدوام' : 'e.g. Working Hours Routing'}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'الأولوية' : 'Priority'}</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => handleChange('priority', parseInt(e.target.value) || 10)}
              />
              <p className="text-[10px] text-gray-400">{isRTL ? '1 الأعلى أولوية' : '1 is highest'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? 'اتجاه المكالمة' : 'Direction'}</Label>
            <Select
              value={formData.direction}
              onValueChange={(val) => handleChange('direction', val)}
              dir={direction}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-emerald-500" />
                    {isRTL ? 'واردة (Inbound)' : 'Inbound'}
                  </div>
                </SelectItem>
                <SelectItem value="outbound">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-blue-500" />
                    {isRTL ? 'صادرة (Outbound)' : 'Outbound'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Condition Box */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              {isRTL ? 'الشرط (متى تعمل القاعدة؟)' : 'Condition (When should this run?)'}
            </h3>
            
            <div className="space-y-2">
              <Label>{isRTL ? 'نوع الشرط' : 'Condition Type'}</Label>
              <Select
                value={formData.condition_type}
                onValueChange={(val) => handleChange('condition_type', val)}
                dir={direction}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'تطبيق على جميع المكالمات (All)' : 'Apply to All Calls'}</SelectItem>
                  <SelectItem value="time_based">{isRTL ? 'حسب الوقت (Time Based)' : 'Time Based'}</SelectItem>
                  <SelectItem value="caller_id">{isRTL ? 'رقم المتصل (Caller ID)' : 'Caller ID'}</SelectItem>
                  <SelectItem value="did_number">{isRTL ? 'الرقم المطلوب (DID Number)' : 'DID Number'}</SelectItem>
                  <SelectItem value="prefix">{isRTL ? 'بداية الرقم (Prefix)' : 'Prefix (e.g. +971)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.condition_type !== 'all' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 pt-2">
                <Label>{isRTL ? 'قيمة الشرط' : 'Condition Value'}</Label>
                <Input
                  value={formData.condition_value_text}
                  onChange={(e) => handleChange('condition_value_text', e.target.value)}
                  placeholder={
                    formData.condition_type === 'prefix' ? '+971' :
                    formData.condition_type === 'time_based' ? '08:00-17:00' :
                    'Enter value...'
                  }
                  className="bg-white dark:bg-gray-900"
                />
              </div>
            )}
          </div>

          {/* Action Box */}
          <div className="space-y-4 bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800">
            <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-300 flex items-center gap-2">
              <Play className="w-4 h-4 text-rose-600" />
              {isRTL ? 'الإجراء (ماذا يحدث للمكالمة؟)' : 'Action (Where does the call go?)'}
            </h3>

            <div className="space-y-2">
              <Label>{isRTL ? 'الإجراء المتخذ' : 'Action to take'}</Label>
              <Select
                value={formData.action}
                onValueChange={(val) => handleChange('action', val)}
                dir={direction}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ivr">{isRTL ? 'تشغيل رد آلي (IVR)' : 'Play IVR Menu'}</SelectItem>
                  <SelectItem value="ring_group">{isRTL ? 'تحويل لمجموعة رنين' : 'Route to Ring Group'}</SelectItem>
                  <SelectItem value="extension">{isRTL ? 'تحويل لرقم داخلي' : 'Route to Extension'}</SelectItem>
                  <SelectItem value="voicemail">{isRTL ? 'تحويل للبريد الصوتي' : 'Route to Voicemail'}</SelectItem>
                  <SelectItem value="trunk">{isRTL ? 'توجيه عبر خط خارجي (Trunk)' : 'Route via Trunk'}</SelectItem>
                  <SelectItem value="external">{isRTL ? 'تحويل لرقم خارجي' : 'Route to External Number'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.action !== 'voicemail' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 pt-2">
                <Label>
                  {formData.action === 'ivr' ? (isRTL ? 'اختر رسالة الرد الآلي' : 'Select IVR Menu') :
                   formData.action === 'ring_group' ? (isRTL ? 'رقم المجموعة' : 'Ring Group Number') :
                   formData.action === 'extension' ? (isRTL ? 'رقم التحويلة' : 'Extension Number') :
                   formData.action === 'trunk' ? (isRTL ? 'اسم الخط الخارجي' : 'Trunk Name') :
                   (isRTL ? 'الوجهة' : 'Target')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.action_target}
                  onChange={(e) => handleChange('action_target', e.target.value)}
                  placeholder={
                    formData.action === 'extension' ? '101' :
                    formData.action === 'ring_group' ? '600' :
                    formData.action === 'external' ? '+971501234567' :
                    'Enter target ID or number'
                  }
                  className="bg-white dark:bg-gray-900 font-mono"
                />
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[120px]">
            {isLoading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ القاعدة' : 'Save Rule')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
