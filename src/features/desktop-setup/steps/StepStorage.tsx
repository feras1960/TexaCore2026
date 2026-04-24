// Step 7: Storage & Backup
import { motion } from 'framer-motion';
import { HardDrive, FolderOpen, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepStorage({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';

  const handleBrowse = async () => {
    // Electron IPC: open folder dialog
    if ((window as any).electronAPI?.selectFolder) {
      const path = await (window as any).electronAPI.selectFolder();
      if (path) onChange('storagePath', path);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <HardDrive className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'مكان الحفظ والنسخ الاحتياطي' : 'Storage & Backup'}</h2>
      </div>

      <div className="space-y-4">
        {/* Storage Path */}
        <div>
          <Label>{isAr ? 'مكان حفظ ملف الشركة' : 'Company File Location'}</Label>
          <div className="flex gap-2 mt-1">
            <Input value={data.storagePath} onChange={e => onChange('storagePath', e.target.value)}
              className="h-11 flex-1 font-mono text-sm" dir="ltr" />
            <Button variant="outline" onClick={handleBrowse} className="h-11 gap-2">
              <FolderOpen className="w-4 h-4" />
              {isAr ? 'اختيار' : 'Browse'}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isAr ? `سيتم إنشاء: ${data.storagePath}/${data.companyName || 'شركتي'}.texacore` : `Will create: ${data.storagePath}/${data.companyName || 'my-company'}.texacore`}
          </p>
        </div>

        {/* Auto Backup */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-teal-600" />
            <div>
              <p className="font-semibold text-sm">{isAr ? 'النسخ الاحتياطي التلقائي' : 'Auto Backup'}</p>
              <p className="text-xs text-gray-500">{isAr ? 'حفظ تلقائي للبيانات' : 'Automatic data backup'}</p>
            </div>
          </div>
          <Switch checked={data.autoBackup} onCheckedChange={v => onChange('autoBackup', v)} />
        </div>

        {data.autoBackup && (
          <div className="ps-4 border-s-2 border-teal-200">
            <Label>{isAr ? 'تردد النسخ الاحتياطي' : 'Backup Frequency'}</Label>
            <Select value={data.backupIntervalMinutes.toString()} onValueChange={v => onChange('backupIntervalMinutes', parseInt(v))}>
              <SelectTrigger className="h-11 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{isAr ? 'كل دقيقة' : 'Every minute'}</SelectItem>
                <SelectItem value="5">{isAr ? 'كل 5 دقائق (موصى)' : 'Every 5 min (recommended)'}</SelectItem>
                <SelectItem value="15">{isAr ? 'كل 15 دقيقة' : 'Every 15 min'}</SelectItem>
                <SelectItem value="30">{isAr ? 'كل 30 دقيقة' : 'Every 30 min'}</SelectItem>
                <SelectItem value="60">{isAr ? 'كل ساعة' : 'Every hour'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </motion.div>
  );
}
