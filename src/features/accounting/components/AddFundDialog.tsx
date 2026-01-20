import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFundDialog({ open, onOpenChange }: AddFundDialogProps) {
  const { t, direction } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[425px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('addFund') || 'Add Fund/Bank'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">{t('type') || 'Type'}</Label>
            <Select defaultValue="cash">
              <SelectTrigger>
                <SelectValue placeholder={t('selectType') || 'Select Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('cashFund') || 'Cash Fund'}</SelectItem>
                <SelectItem value="bank">{t('bankAccount') || 'Bank Account'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">{t('name') || 'Name'}</Label>
            <Input id="name" placeholder={t('fundNamePlaceholder') || 'e.g. Main Cash / Bank Al-Bilad'} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">{t('currency') || 'Currency'}</Label>
            <Select defaultValue="SAR">
              <SelectTrigger>
                <SelectValue placeholder={t('selectCurrency') || 'Select Currency'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accountNumber">{t('accountNumber') || 'Account Number'}</Label>
            <Input id="accountNumber" placeholder="IBAN / Account No." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="initialBalance">{t('initialBalance') || 'Initial Balance'}</Label>
            <Input id="initialBalance" type="number" placeholder="0.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button className="bg-erp-navy hover:bg-erp-navy/90">{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
