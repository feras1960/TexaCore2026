// Step 8: Google Drive Integration (optional — admin only)
import { motion } from 'framer-motion';
import { Cloud, Shield, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepGoogleDrive({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';

  const handleGoogleAuth = async () => {
    // Electron IPC: open Google OAuth window
    if ((window as any).electronAPI?.googleAuth) {
      const result = await (window as any).electronAPI.googleAuth();
      if (result?.email) {
        onChange('googleDriveEmail', result.email);
        onChange('googleDriveEnabled', true);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <Cloud className="w-10 h-10 mx-auto mb-3 text-blue-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? 'النسخ الاحتياطي السحابي' : 'Cloud Backup'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? 'اختياري — حفظ نسخة احتياطية مشفّرة على Google Drive' : 'Optional — save encrypted backup to Google Drive'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img src="https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png"
              alt="Google Drive" className="w-8 h-8" />
            <div>
              <p className="font-semibold text-sm">{isAr ? 'Google Drive' : 'Google Drive'}</p>
              <p className="text-xs text-gray-500">
                {isAr ? 'نسخ احتياطي سحابي تلقائي — للمدير فقط' : 'Automatic cloud backup — admin only'}
              </p>
            </div>
          </div>
          <Switch checked={data.googleDriveEnabled} onCheckedChange={v => onChange('googleDriveEnabled', v)} />
        </div>

        {data.googleDriveEnabled && (
          <div className="space-y-3 ps-4 border-s-2 border-blue-200">
            {data.googleDriveEmail ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    {isAr ? 'تم الربط بنجاح' : 'Connected successfully'}
                  </p>
                  <p className="text-xs text-green-600">{data.googleDriveEmail}</p>
                </div>
              </div>
            ) : (
              <Button onClick={handleGoogleAuth} variant="outline" className="w-full h-11 gap-2">
                <img src="https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png"
                  alt="" className="w-5 h-5" />
                {isAr ? 'ربط حساب Google' : 'Connect Google Account'}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
          <Shield className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
            {isAr
              ? '🔐 النسخ الاحتياطية مشفّرة بالكامل قبل الرفع. لا يمكن لـ Google قراءة بياناتك. يمكنك ربط الحساب لاحقاً من الإعدادات.'
              : '🔐 Backups are fully encrypted before upload. Google cannot read your data. You can connect later from Settings.'}
          </AlertDescription>
        </Alert>
      </div>
    </motion.div>
  );
}
