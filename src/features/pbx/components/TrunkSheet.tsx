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
import { Network, Server, Lock, User, PhoneOutgoing } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrunkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  data?: any;
  companyId: string;
  onSuccess: () => void;
}

export function TrunkSheet({
  isOpen,
  onClose,
  mode,
  data,
  companyId,
  onSuccess,
}: TrunkSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'sip_trunk',
    host: '',
    port: 5060,
    username: '',
    password: '',
    codecs: 'ulaw,alaw,gsm',
    max_channels: 1,
    outbound_caller_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          name: data.name || '',
          type: data.type || 'sip_trunk',
          host: data.host || '',
          port: data.port || 5060,
          username: data.username || '',
          password: data.password || '',
          codecs: Array.isArray(data.codecs) ? data.codecs.join(',') : 'ulaw,alaw,gsm',
          max_channels: data.max_channels || 1,
          outbound_caller_id: data.outbound_caller_id || '',
          is_active: data.is_active !== false,
        });
      } else {
        setFormData({
          name: '',
          type: 'sip_trunk',
          host: '',
          port: 5060,
          username: '',
          password: '',
          codecs: 'ulaw,alaw,gsm',
          max_channels: 1,
          outbound_caller_id: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, mode, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.host) {
      toast.error(isRTL ? 'الاسم والمضيف (Host) حقول مطلوبة' : 'Name and Host are required');
      return;
    }

    setIsLoading(true);

    const dbData = {
      ...formData,
      codecs: formData.codecs.split(',').map(c => c.trim()).filter(Boolean)
    };

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('pbx_trunks').insert({
          company_id: companyId,
          ...dbData,
        });
        if (error) throw error;
        toast.success(isRTL ? 'تم إضافة الخط بنجاح' : 'Trunk added successfully');
      } else {
        const { error } = await supabase
          .from('pbx_trunks')
          .update(dbData)
          .eq('id', data.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث الخط بنجاح' : 'Trunk updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving trunk:', err);
      toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving trunk');
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
              ? isRTL ? 'إضافة خط/بوابة جديدة' : 'Add New Trunk'
              : isRTL ? 'تعديل إعدادات الخط' : 'Edit Trunk'}
          </SheetTitle>
          <SheetDescription>
            {isRTL
              ? 'إعداد بوابات الاتصال (SIP Trunks) لربط المقسم بمزود الخدمة الخارجي'
              : 'Configure SIP Trunks to connect the PBX to your SIP provider'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* General Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Network className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اسم الخط (للتمييز)' : 'Trunk Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={isRTL ? 'مثال: مزود اتصالات زين' : 'e.g. Zain Telecom'}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'نوع الخط' : 'Trunk Type'}</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => handleChange('type', val)}
                dir={direction}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sip_trunk">{isRTL ? 'خط SIP (SIP Trunk)' : 'SIP Trunk'}</SelectItem>
                  <SelectItem value="voip_gateway">{isRTL ? 'بوابة VoIP (VoIP Gateway)' : 'VoIP Gateway'}</SelectItem>
                  <SelectItem value="gsm_gateway">{isRTL ? 'بوابة هواتف محمولة (GSM Gateway)' : 'GSM Gateway'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Connection Settings */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              {isRTL ? 'بيانات الاتصال (Connection Details)' : 'Connection Details'}
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>{isRTL ? 'المضيف (Host/IP)' : 'Host (IP or Domain)'} <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.host}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="sip.provider.com"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'المنفذ (Port)' : 'Port'}</Label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleChange('port', parseInt(e.target.value) || 5060)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><User className="w-3 h-3" /> {isRTL ? 'اسم المستخدم' : 'Username'}</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="Optional"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Lock className="w-3 h-3" /> {isRTL ? 'كلمة المرور' : 'Password'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Optional"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'الحد الأقصى للقنوات' : 'Max Channels'}</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_channels}
                  onChange={(e) => handleChange('max_channels', parseInt(e.target.value) || 1)}
                />
                <p className="text-[10px] text-gray-400">{isRTL ? 'كم مكالمة متزامنة يسمح بها هذا الخط؟' : 'Concurrent calls limit'}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><PhoneOutgoing className="w-3 h-3" /> {isRTL ? 'هوية المتصل (Outbound)' : 'Outbound Caller ID'}</Label>
                <Input
                  value={formData.outbound_caller_id}
                  onChange={(e) => handleChange('outbound_caller_id', e.target.value)}
                  placeholder="+97150000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'الترميزات المدعومة (Codecs)' : 'Supported Codecs'}</Label>
              <Input
                value={formData.codecs}
                onChange={(e) => handleChange('codecs', e.target.value)}
                placeholder="ulaw,alaw,gsm"
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-gray-400">{isRTL ? 'افصل بينها بفاصلة (,)' : 'Comma separated values'}</p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <Label className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {isRTL ? 'الخط مفعل' : 'Trunk is Active'}
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
          <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
            {isLoading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الخط' : 'Save Trunk')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
