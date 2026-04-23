/**
 * 🔑 Create License Dialog — New customer + license
 */
import { useState } from 'react';
import { useLanguage } from '@/hooks';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { licensingService, TIER_DEFAULTS } from '@/services/saas/licensingService';
import { Key, Copy } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLicenseDialog({ open, onOpenChange, onSuccess }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [step, setStep] = useState<'form' | 'result'>('form');
  const [loading, setLoading] = useState(false);
  const [resultKey, setResultKey] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [tier, setTier] = useState<string>('pro');
  const [duration, setDuration] = useState(365);

  const resetForm = () => {
    setStep('form');
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setCountry('');
    setTier('pro');
    setDuration(365);
    setResultKey('');
  };

  const handleCreate = async () => {
    if (!companyName.trim() || !contactName.trim() || !email.trim()) {
      toast.error(isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Create customer
      const customer = await licensingService.createCustomer({
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
      });

      // 2. Create license
      const license = await licensingService.createLicense({
        customer_id: customer.id,
        tier: tier as any,
        duration_days: duration,
      });

      setResultKey(license.license_key);
      setStep('result');
      toast.success(isAr ? 'تم إنشاء الترخيص بنجاح!' : 'License created successfully!');
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'حدث خطأ' : 'Error occurred'));
    }
    setLoading(false);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(resultKey);
    toast.success(isAr ? 'تم نسخ المفتاح' : 'Key copied');
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      if (step === 'result') onSuccess();
      resetForm();
    }
    onOpenChange(v);
  };

  const tierInfo = TIER_DEFAULTS[tier as keyof typeof TIER_DEFAULTS];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-500" />
            {step === 'form'
              ? (isAr ? 'إنشاء ترخيص جديد' : 'Create New License')
              : (isAr ? '✅ تم الإنشاء!' : '✅ Created!')}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'اسم الشركة *' : 'Company *'}</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label>{isAr ? 'اسم المسؤول *' : 'Contact *'}</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{isAr ? 'البريد الإلكتروني *' : 'Email *'}</Label>
              <Input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'الهاتف' : 'Phone'}</Label>
                <Input dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>{isAr ? 'الدولة' : 'Country'}</Label>
                <Input value={country} onChange={e => setCountry(e.target.value)} />
              </div>
            </div>

            <hr className="border-border" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isAr ? 'الباقة' : 'Tier'}</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{isAr ? 'مجاني' : 'Free'}</SelectItem>
                    <SelectItem value="starter">{isAr ? 'أساسي' : 'Starter'}</SelectItem>
                    <SelectItem value="pro">{isAr ? 'احترافي' : 'Pro'}</SelectItem>
                    <SelectItem value="enterprise">{isAr ? 'مؤسسي' : 'Enterprise'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isAr ? 'المدة (أيام)' : 'Duration (days)'}</Label>
                <Input type="number" dir="ltr" value={duration} onChange={e => setDuration(+e.target.value)} />
              </div>
            </div>

            {tierInfo && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded space-y-1">
                <p>👥 {isAr ? 'المستخدمين' : 'Users'}: {tierInfo.max_users} | 🏢 {isAr ? 'شركات' : 'Companies'}: {tierInfo.max_companies}</p>
                <p>📦 {isAr ? 'مخازن' : 'Warehouses'}: {tierInfo.max_warehouses} | 💾 {isAr ? 'تخزين' : 'Storage'}: {tierInfo.max_storage_gb}GB</p>
                <p>🧩 {tierInfo.enabled_modules.join(', ')}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? '⏳' : '⚡'} {isAr ? 'إنشاء' : 'Create'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'مفتاح الترخيص:' : 'License Key:'}
            </p>
            <div className="flex items-center gap-2 justify-center p-3 bg-muted rounded-lg">
              <code className="text-lg font-mono tracking-widest font-bold">{resultKey}</code>
              <Button size="sm" variant="ghost" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'أرسل هذا المفتاح للعميل عبر البريد الإلكتروني' : 'Send this key to the customer via email'}
            </p>
            <Button onClick={() => handleClose(false)} className="w-full">
              {isAr ? 'تم' : 'Done'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
