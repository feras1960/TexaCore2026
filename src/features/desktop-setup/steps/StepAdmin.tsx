// Step 4: Admin User (Local Auth — no Supabase)
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DesktopSetupData } from '../types';

interface Props { data: DesktopSetupData; onChange: (f: string, v: any) => void; lang: string; }

export function StepAdmin({ data, onChange, lang }: Props) {
  const isAr = lang === 'ar';
  const [showPass, setShowPass] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
      <div className="text-center mb-4">
        <Shield className="w-10 h-10 mx-auto mb-3 text-teal-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? 'المستخدم الأساسي (المدير)' : 'Admin User'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? 'هذا الحساب سيكون مدير النظام بكامل الصلاحيات' : 'This account will have full system admin permissions'}
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <Label>{isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-500">*</span></Label>
          <Input value={data.adminName} onChange={e => onChange('adminName', e.target.value)}
            placeholder={isAr ? 'أدخل اسمك الكامل' : 'Enter your full name'} className="h-11 mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}</Label>
            <Input value={data.adminEmail} onChange={e => onChange('adminEmail', e.target.value)}
              type="email" placeholder="admin@company.com" className="h-11 mt-1" dir="ltr" />
          </div>
          <div>
            <Label>{isAr ? 'الهاتف (اختياري)' : 'Phone (Optional)'}</Label>
            <Input value={data.adminPhone} onChange={e => onChange('adminPhone', e.target.value.replace(/\D/g, ''))}
              className="h-11 mt-1" dir="ltr" inputMode="numeric" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{isAr ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span></Label>
            <div className="relative mt-1">
              <Input value={data.adminPassword} onChange={e => onChange('adminPassword', e.target.value)}
                type={showPass ? 'text' : 'password'} className="h-11 pe-10" />
              <button onClick={() => setShowPass(!showPass)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span></Label>
            <Input value={data.adminPasswordConfirm} onChange={e => onChange('adminPasswordConfirm', e.target.value)}
              type="password" className="h-11 mt-1" />
          </div>
        </div>

        {data.adminPassword && data.adminPasswordConfirm && data.adminPassword !== data.adminPasswordConfirm && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">
              {isAr ? '⚠️ كلمتا المرور غير متطابقتين' : '⚠️ Passwords do not match'}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
        <Shield className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
          {isAr
            ? '🔒 كلمة المرور تُحفظ مشفّرة محلياً على جهازك. لا يتم إرسالها لأي خادم خارجي.'
            : '🔒 Password is stored encrypted locally on your device. It is never sent to any external server.'}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
