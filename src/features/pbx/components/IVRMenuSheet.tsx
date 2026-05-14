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
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bot, Mic, Volume2, Music, AlignLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IVRMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  data?: any;
  companyId: string;
  onSuccess: () => void;
}

export function IVRMenuSheet({
  isOpen,
  onClose,
  mode,
  data,
  companyId,
  onSuccess,
}: IVRMenuSheetProps) {
  const { t, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'greeting',
    text_content: '',
    voice_id: 'pNInz6obpgDQGcFmaJcg', // Default to Adam
    bgm_enabled: false,
    bgm_track: 'calm_1',
    bgm_volume: 0.15,
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && data) {
        setFormData({
          name: data.name || '',
          type: data.type || 'greeting',
          text_content: data.text_content || '',
          voice_id: data.voice_id || 'pNInz6obpgDQGcFmaJcg',
          bgm_enabled: data.bgm_enabled || false,
          bgm_track: data.bgm_track || 'calm_1',
          bgm_volume: data.bgm_volume || 0.15,
          is_active: data.is_active !== false,
        });
      } else {
        setFormData({
          name: '',
          type: 'greeting',
          text_content: '',
          voice_id: 'pNInz6obpgDQGcFmaJcg',
          bgm_enabled: false,
          bgm_track: 'calm_1',
          bgm_volume: 0.15,
          is_active: true,
        });
      }
    }
  }, [isOpen, mode, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error(isRTL ? 'الاسم المعروض مطلوب' : 'Menu name is required');
      return;
    }

    if (!formData.text_content) {
      toast.error(isRTL ? 'نص الرسالة الصوتية مطلوب ليتم توليده' : 'Voice message text is required for AI generation');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Call Edge Function to generate audio via ElevenLabs
      const { data: session } = await supabase.auth.getSession();
      
      const functionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ivr-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`
          },
          body: JSON.stringify({
            text_content: formData.text_content,
            voice_id: formData.voice_id,
            company_id: companyId
          })
        }
      );

      const result = await functionResponse.json();

      if (!functionResponse.ok) {
        throw new Error(result.error || 'Failed to generate voice');
      }

      const audioUrl = result.audioUrl;
      const charsRemaining = result.charsRemaining;

      toast.success(isRTL ? `تم التوليد. الأحرف المتبقية: ${charsRemaining}` : `Generated. Chars remaining: ${charsRemaining}`);

      // 2. Save the rest to database
      const dbData = {
        company_id: companyId,
        ...formData,
        audio_url: audioUrl, // Save the generated URL
      };

      if (mode === 'create') {
        const { error } = await supabase.from('pbx_ivr_menus').insert(dbData);
        if (error) throw error;
        toast.success(isRTL ? 'تم إنشاء الرسالة بنجاح' : 'Menu created successfully');
      } else {
        const { error } = await supabase
          .from('pbx_ivr_menus')
          .update(dbData)
          .eq('id', data.id)
          .eq('company_id', companyId);
        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث الرسالة بنجاح' : 'Menu updated successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving IVR menu:', err);
      toast.error(err.message || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving IVR menu'));
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
              ? isRTL ? 'إضافة رسالة/رد آلي (IVR)' : 'Add Smart IVR Menu'
              : isRTL ? 'تعديل الرسالة/الرد الآلي' : 'Edit IVR Menu'}
          </SheetTitle>
          <SheetDescription>
            {isRTL
              ? 'أدخل النص وسيقوم الذكاء الاصطناعي بتوليد الصوت تلقائياً بصوت الشركة المعتمد'
              : 'Enter text and AI will automatically generate the voice audio using your company voice'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اسم الرسالة (للتمييز)' : 'Menu Name'} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={isRTL ? 'مثال: الترحيب الرئيسي يوروفيكس' : 'e.g. Main Greeting'}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'نوع الرسالة' : 'Menu Type'}</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => handleChange('type', val)}
                dir={direction}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greeting">{isRTL ? 'رسالة ترحيبية (Greeting)' : 'Greeting'}</SelectItem>
                  <SelectItem value="hold">{isRTL ? 'رسالة انتظار (Hold Music/Ads)' : 'Hold Message'}</SelectItem>
                  <SelectItem value="out_of_office">{isRTL ? 'خارج أوقات العمل (Out of Office)' : 'Out of Office'}</SelectItem>
                  <SelectItem value="busy">{isRTL ? 'الخط مشغول (Busy)' : 'Busy'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI Voice Generation Section */}
          <div className="space-y-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                {isRTL ? 'مولّد الصوت بالذكاء الاصطناعي' : 'AI Voice Generator'}
              </h3>
            </div>
            
            <div className="space-y-2">
              <Label>{isRTL ? 'الصوت المعتمد (Voice ID)' : 'Selected Voice'}</Label>
              <Select
                value={formData.voice_id}
                onValueChange={(val) => handleChange('voice_id', val)}
                dir={direction}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{isRTL ? 'الأصوات العربية (Arabic)' : 'Arabic Voices'}</SelectLabel>
                    <SelectItem value="pNInz6obpgDQGcFmaJcg">عربي رجال ١ (رسمي وثقة)</SelectItem>
                    <SelectItem value="ErXwobaYiN019PkySvjV">عربي رجال ٢ (أداء قوي)</SelectItem>
                    <SelectItem value="VR6AewLTigWG4xSOukaG">عربي رجال ٣ (عميق وهادئ)</SelectItem>
                    <SelectItem value="21m00Tcm4TlvDq8ikWAM">عربي نساء ١ (هادئ ومريح)</SelectItem>
                    <SelectItem value="AZnzlk1XvdvUeBnXmlld">عربي نساء ٢ (واضح ومحترف)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>{isRTL ? 'الأصوات الإنجليزية (English)' : 'English Voices'}</SelectLabel>
                    <SelectItem value="pNInz6obpgDQGcFmaJcg_en">English Male 1 (Adam - Professional)</SelectItem>
                    <SelectItem value="ErXwobaYiN019PkySvjV_en">English Male 2 (Antoni - Energetic)</SelectItem>
                    <SelectItem value="VR6AewLTigWG4xSOukaG_en">English Male 3 (Arnold - Deep)</SelectItem>
                    <SelectItem value="21m00Tcm4TlvDq8ikWAM_en">English Female 1 (Rachel - Calm)</SelectItem>
                    <SelectItem value="AZnzlk1XvdvUeBnXmlld_en">English Female 2 (Domi - Clear)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <Label>{isRTL ? 'نص الرسالة (سيتم قراءته تلقائياً)' : 'Message Text (Will be read by AI)'} <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.text_content}
                onChange={(e) => handleChange('text_content', e.target.value)}
                placeholder={isRTL 
                  ? 'أهلاً بكم في يوروفيكس العالمية، خياركم الأول لأعلى جودة...' 
                  : 'Welcome to EuroFix, your first choice for premium quality...'}
                className="min-h-[120px] bg-white dark:bg-gray-800 resize-none font-tajawal leading-relaxed"
              />
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400">
                {isRTL ? 'سيتم الخصم من رصيد الأحرف الخاص بك للذكاء الاصطناعي عند الحفظ.' : 'Characters will be deducted from your AI quota upon saving.'}
              </p>
            </div>
          </div>

          {/* BGM Settings */}
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Music className="w-4 h-4 text-emerald-500" />
                {isRTL ? 'دمج موسيقى بالخلفية (يتم تشغيلها بالمقسم)' : 'Merge Background Music (via Asterisk)'}
              </Label>
              <Switch
                checked={formData.bgm_enabled}
                onCheckedChange={(val) => handleChange('bgm_enabled', val)}
              />
            </div>

            {formData.bgm_enabled && (
              <div className="pt-2 pl-6 pr-6 animate-in slide-in-from-top-2 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{isRTL ? 'نوع الموسيقى' : 'Music Type'}</Label>
                  <Select
                    value={formData.bgm_track}
                    onValueChange={(val) => handleChange('bgm_track', val)}
                    dir={direction}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calm_1">{isRTL ? 'هادئة ١ (أجواء مريحة)' : 'Calm 1'}</SelectItem>
                      <SelectItem value="calm_2">{isRTL ? 'هادئة ٢ (بيانو)' : 'Calm 2 (Piano)'}</SelectItem>
                      <SelectItem value="upbeat_1">{isRTL ? 'حماسية ١ (إيقاع سريع)' : 'Upbeat 1'}</SelectItem>
                      <SelectItem value="upbeat_2">{isRTL ? 'حماسية ٢ (تفاؤل)' : 'Upbeat 2'}</SelectItem>
                      <SelectItem value="corporate_1">{isRTL ? 'أعمال ١ (رسمية)' : 'Corporate 1'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-xs text-gray-500">{isRTL ? 'مستوى صوت الموسيقى' : 'BGM Volume'}</Label>
                    <span className="text-xs font-mono text-gray-500">{Math.round(formData.bgm_volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.bgm_volume}
                    onChange={(e) => handleChange('bgm_volume', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <Label className="flex items-center gap-2 cursor-pointer">
                <span className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isRTL ? 'تفعيل الرسالة' : 'Activate Menu'}
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
          <Button onClick={handleSave} disabled={isLoading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
            {isLoading ? (isRTL ? 'جاري التوليد...' : 'Generating...') : (
              <>
                <Mic className="w-4 h-4" />
                {isRTL ? 'حفظ وتوليد الصوت' : 'Save & Generate Voice'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
