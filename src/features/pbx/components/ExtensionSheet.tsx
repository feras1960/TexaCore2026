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
import { Phone, Lock, User, Mail, Settings, Voicemail, HelpCircle, Server } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtensionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  data?: any;
  companyId: string;
  onSuccess: () => void;
}

export function ExtensionSheet({
  isOpen,
  onClose,
  mode,
  data,
  companyId,
  onSuccess,
}: ExtensionSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    extension_number: '',
    display_name: '',
    secret_key: '',
    caller_id: '',
    voicemail_enabled: false,
    voicemail_email: '',
    recording_enabled: true,
    is_active: true,
    assigned_user_id: '',
  });

  // Fetch company users for assignment
  const { data: users = [] } = useCachedQuery({
    queryKey: ['company_users', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch company info to get short tenant slug/id
  const { data: companyData } = useCachedQuery({
    queryKey: ['company_info', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Generate Tenant Prefix (e.g., first 8 chars of company ID, or a specific slug if exists)
  const tenantPrefix = companyId ? companyId.substring(0, 8) : 'TENANT';
  const authUsername = formData.extension_number ? `${tenantPrefix}_${formData.extension_number}` : '';

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          extension_number: data.extension_number || '',
          display_name: data.display_name || '',
          secret_key: data.secret_key || '',
          caller_id: data.caller_id || '',
          voicemail_enabled: data.voicemail_enabled || false,
          voicemail_email: data.voicemail_email || '',
          recording_enabled: data.recording_enabled !== false,
          is_active: data.is_active !== false,
          assigned_user_id: data.assigned_user_id || '',
        });
      } else {
        // Generate a random 12-char secret key for new extensions
        const randomSecret = Math.random().toString(36).substring(2, 14);
        setFormData({
          extension_number: '',
          display_name: '',
          secret_key: randomSecret,
          caller_id: '',
          voicemail_enabled: false,
          voicemail_email: '',
          recording_enabled: true,
          is_active: true,
          assigned_user_id: '',
        });
      }
    }
  }, [isOpen, mode, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.extension_number) {
      toast.error(isRTL ? 'رقم التحويلة مطلوب' : 'Extension number is required');
      return;
    }

    if (!formData.secret_key) {
      toast.error(isRTL ? 'كلمة المرور (Secret) مطلوبة' : 'Secret key is required');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'create') {
        const { error } = await supabase.from('pbx_extensions').insert({
          company_id: companyId,
          ...formData,
        });
        if (error) throw error;
        toast.success(isRTL ? 'تم إنشاء الرقم الداخلي بنجاح' : 'Extension created successfully');
      } else {
        const { error } = await supabase
          .from('pbx_extensions')
          .update(formData)
          .eq('id', data.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث الرقم الداخلي بنجاح' : 'Extension updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving extension:', err);
      if (err.code === '23505') { // Unique violation
        toast.error(isRTL ? 'رقم التحويلة موجود مسبقاً' : 'Extension number already exists');
      } else {
        toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving extension');
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
              ? isRTL ? 'إضافة رقم داخلي جديد' : 'Add New Extension'
              : isRTL ? 'تعديل الرقم الداخلي' : 'Edit Extension'}
          </SheetTitle>
          <SheetDescription>
            {isRTL
              ? 'إعداد بيانات التحويلة وكلمة المرور الخاصة بها للاتصال'
              : 'Set up extension details and SIP secret key for connection'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Extension Number & Secret */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                {isRTL ? 'رقم التحويلة' : 'Extension Number'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.extension_number}
                onChange={(e) => handleChange('extension_number', e.target.value)}
                placeholder="e.g. 101"
                disabled={mode === 'edit'} // Usually shouldn't change extension number
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                {isRTL ? 'كلمة المرور (Secret)' : 'Secret Key'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.secret_key}
                onChange={(e) => handleChange('secret_key', e.target.value)}
                placeholder="Secret Key"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Display Name & Caller ID */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                {isRTL ? 'الاسم المعروض' : 'Display Name'}
              </Label>
              <Input
                value={formData.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                placeholder={isRTL ? 'مثال: محمد المبيعات' : 'e.g. John Sales'}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                {isRTL ? 'هوية المتصل الخارجي (Caller ID)' : 'External Caller ID'}
              </Label>
              <Input
                value={formData.caller_id}
                onChange={(e) => handleChange('caller_id', e.target.value)}
                placeholder={isRTL ? 'الرقم الذي يظهر عند الاتصال الخارجي' : 'Number shown on outbound calls'}
              />
              <p className="text-[10px] text-gray-500">{isRTL ? 'اتركه فارغاً لاستخدام رقم الشركة الافتراضي.' : 'Leave empty to use company default caller ID.'}</p>
            </div>
            
            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                {isRTL ? 'الموظف المربوط (مستخدم النظام)' : 'Assigned User (System User)'}
              </Label>
              <Select value={formData.assigned_user_id} onValueChange={(val) => handleChange('assigned_user_id', val === 'none' ? null : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? '-- اختر الموظف لربط الهاتف به --' : '-- Select user to assign --'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? 'بدون ربط (هاتف مادي فقط)' : 'Unassigned (Physical Phone Only)'}</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-500">
                {isRTL 
                  ? 'بربطك لهذا الرقم بموظف، سيتمكن الموظف من إجراء واستقبال المكالمات من المتصفح مباشرة (Softphone).' 
                  : 'By assigning this extension to a user, they can make and receive calls directly from their browser (Softphone).'}
              </p>
            </div>
          </div>

          {/* Credentials Display Alert */}
          {formData.extension_number && formData.secret_key && (
            <Alert className="bg-indigo-50 border-indigo-100 text-indigo-900 dark:bg-indigo-950/30 dark:border-indigo-900/50">
              <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <AlertDescription className="text-xs ms-2 space-y-1.5 mt-1">
                <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                  {isRTL ? 'بيانات برمجة الهاتف المكتبي (IP Phone)' : 'IP Phone Configuration Details'}
                </p>
                <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1 font-mono text-[11px]">
                  <span className="text-indigo-500">SIP Server:</span> <span>pbx.texacore.ai</span>
                  <span className="text-indigo-500">Auth Username:</span> <strong>{authUsername}</strong>
                  <span className="text-indigo-500">SIP Password:</span> <span>{formData.secret_key}</span>
                </div>
                <p className="text-[10px] text-indigo-600/80 mt-2">
                  {isRTL 
                    ? '* نستخدم نظام Tenant Prefix في اسم المستخدم لضمان عدم تعارض رقمك مع الشركات الأخرى.' 
                    : '* We use a Tenant Prefix in the Auth Username to prevent conflicts with other companies.'}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Feature Switches */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {isRTL ? 'الميزات والإعدادات' : 'Features & Settings'}
            </h3>
            
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4 text-blue-500" />
                {isRTL ? 'تسجيل المكالمات' : 'Call Recording'}
              </Label>
              <Switch
                checked={formData.recording_enabled}
                onCheckedChange={(val) => handleChange('recording_enabled', val)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Voicemail className="w-4 h-4 text-rose-500" />
                {isRTL ? 'البريد الصوتي' : 'Voicemail'}
              </Label>
              <Switch
                checked={formData.voicemail_enabled}
                onCheckedChange={(val) => handleChange('voicemail_enabled', val)}
              />
            </div>

            {formData.voicemail_enabled && (
              <div className="pt-2 pl-6 pr-6 animate-in slide-in-from-top-2">
                <Label className="flex items-center gap-2 text-xs mb-2">
                  <Mail className="w-3 h-3 text-gray-500" />
                  {isRTL ? 'إرسال البريد الصوتي إلى' : 'Send Voicemail to'}
                </Label>
                <Input
                  type="email"
                  value={formData.voicemail_email}
                  onChange={(e) => handleChange('voicemail_email', e.target.value)}
                  placeholder="email@example.com"
                  className="h-8 text-sm"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Label className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isRTL ? 'الرقم نشط ومتاح للعمل' : 'Extension is Active'}
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
          <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
            {isLoading ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ الرقم' : 'Save Extension')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
