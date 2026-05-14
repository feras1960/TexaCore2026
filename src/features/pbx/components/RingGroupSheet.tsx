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
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Users, HeadphonesIcon, AlignLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RingGroupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  data?: any;
  companyId: string;
  onSuccess: () => void;
}

export function RingGroupSheet({
  isOpen,
  onClose,
  mode,
  data,
  companyId,
  onSuccess,
}: RingGroupSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    extension_number: '',
    name: '',
    strategy: 'ringall',
    ring_time: 20,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          extension_number: data.extension_number || '',
          name: data.name || '',
          strategy: data.strategy || 'ringall',
          ring_time: data.ring_time || 20,
          description: data.description || '',
          is_active: data.is_active !== false,
        });
      } else {
        setFormData({
          extension_number: '',
          name: '',
          strategy: 'ringall',
          ring_time: 20,
          description: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, mode, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.extension_number) {
      toast.error(isRTL ? 'رقم المجموعة مطلوب' : 'Group number is required');
      return;
    }

    if (!formData.name) {
      toast.error(isRTL ? 'اسم المجموعة مطلوب' : 'Group name is required');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('pbx_ring_groups').insert({
          company_id: companyId,
          ...formData,
        });
        if (error) throw error;
        toast.success(isRTL ? 'تم إنشاء مجموعة الرنين بنجاح' : 'Ring group created successfully');
      } else {
        const { error } = await supabase
          .from('pbx_ring_groups')
          .update(formData)
          .eq('id', data.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث مجموعة الرنين بنجاح' : 'Ring group updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving ring group:', err);
      if (err.code === '23505') {
        toast.error(isRTL ? 'رقم المجموعة موجود مسبقاً' : 'Group number already exists');
      } else {
        toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving ring group');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto" dir={direction}>
        <SheetHeader>
          <SheetTitle>
            {mode === 'create'
              ? isRTL ? 'إضافة مجموعة رنين جديدة' : 'Add New Ring Group'
              : isRTL ? 'تعديل مجموعة الرنين' : 'Edit Ring Group'}
          </SheetTitle>
          <SheetDescription>
            {isRTL
              ? 'توجيه المكالمات الواردة لعدة أرقام داخلية في وقت واحد أو بتسلسل'
              : 'Route incoming calls to multiple extensions simultaneously or sequentially'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HeadphonesIcon className="w-4 h-4 text-gray-500" />
                {isRTL ? 'رقم المجموعة' : 'Group Number'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.extension_number}
                onChange={(e) => handleChange('extension_number', e.target.value)}
                placeholder="e.g. 600"
                disabled={mode === 'edit'}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اسم المجموعة' : 'Group Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={isRTL ? 'المبيعات' : 'Sales Team'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-gray-500" />
              {isRTL ? 'وصف المجموعة' : 'Description'}
            </Label>
            <Input
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={isRTL ? 'تستقبل مكالمات الزبائن وتوزعها...' : 'Handles customer calls...'}
            />
          </div>

          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {isRTL ? 'إعدادات الرنين' : 'Ringing Settings'}
            </h3>
            
            <div className="space-y-2">
              <Label>{isRTL ? 'استراتيجية الرنين' : 'Ring Strategy'}</Label>
              <Select
                value={formData.strategy}
                onValueChange={(val) => handleChange('strategy', val)}
                dir={direction}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ringall">{isRTL ? 'رنين للجميع (Ring All)' : 'Ring All'}</SelectItem>
                  <SelectItem value="linear">{isRTL ? 'تتابعي (Linear)' : 'Linear'}</SelectItem>
                  <SelectItem value="leastrecent">{isRTL ? 'الأقل اتصالاً (Least Recent)' : 'Least Recent'}</SelectItem>
                  <SelectItem value="fewestcalls">{isRTL ? 'الأقل مكالمات (Fewest Calls)' : 'Fewest Calls'}</SelectItem>
                  <SelectItem value="random">{isRTL ? 'عشوائي (Random)' : 'Random'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'مدة الرنين (بالثواني)' : 'Ring Time (seconds)'}</Label>
              <Input
                type="number"
                min={5}
                max={300}
                value={formData.ring_time}
                onChange={(e) => handleChange('ring_time', parseInt(e.target.value) || 20)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <Label className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isRTL ? 'مجموعة نشطة ومتاحة للاتصال' : 'Group is Active'}
              </Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(val) => handleChange('is_active', val)}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
            {isLoading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ المجموعة' : 'Save Group')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
