
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { supabase } from '@/lib/supabase';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAccountingSettings } from '@/hooks/useAccountingSettings';

interface AddPartySheetProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'customer' | 'supplier';
    onComplete: () => void;
}

export function AddPartySheet({ isOpen, onClose, type, onComplete }: AddPartySheetProps) {
    const { t, language } = useLanguage();
    const { companyId, company } = useCompany();
    const { defaultReceivableAccountId, defaultPayableAccountId } = useAccountingSettings();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);

    // Validation Schema
    const schema = z.object({
        name_ar: z.string().min(1, t('accounting.errors.fillRequiredFields')),
        name_en: z.string().optional(),
        party_type: z.string().min(1, t('accounting.errors.fillRequiredFields')),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        account_id: z.string().min(1, t('accounting.errors.fillRequiredFields')),
        tax_number: z.string().optional(),
        credit_limit: z.string().optional(),
        payment_terms_days: z.string().optional(),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name_ar: '',
            name_en: '',
            party_type: '',
            phone: '',
            email: '',
            address: '',
            account_id: '',
            tax_number: '',
            credit_limit: '',
            payment_terms_days: '',
        },
    });

    // Reset form and set defaults when opening
    useEffect(() => {
        if (isOpen) {
            form.reset({
                name_ar: '',
                name_en: '',
                party_type: '',
                phone: '',
                email: '',
                address: '',
                account_id: type === 'customer' ? (defaultReceivableAccountId || '') : (defaultPayableAccountId || ''),
                tax_number: '',
                credit_limit: '',
                payment_terms_days: '',
            });
        }
    }, [isOpen, type, defaultReceivableAccountId, defaultPayableAccountId]);

    // Fetch Accounts
    useEffect(() => {
        if (isOpen && companyId) {
            const fetchAccounts = async () => {
                const { data } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code, name_ar, name_en')
                    .eq('company_id', companyId)
                    .eq('is_active', true)
                    // Filter for relevant accounts (Receivables/Payables) mostly
                    .or(type === 'customer'
                        ? `name_en.ilike.%receivable%,name_ar.ilike.%عملاء%,name_ar.ilike.%ذمم%,account_code.like.1%`
                        : `name_en.ilike.%payable%,name_ar.ilike.%موردين%,name_ar.ilike.%دائن%,account_code.like.2%`
                    );

                if (data) setAccounts(data);
            };
            fetchAccounts();
        }
    }, [isOpen, companyId, type]);

    // Auto-Select Account Logic
    const handleTypeChange = (value: string) => {
        form.setValue('party_type', value);

        // Smart Linking Logic
        if (type === 'customer') {
            if (value === 'wholesale') {
                const acc = accounts.find(a => a.name_en.toLowerCase().includes('wholesale') || a.name_ar.includes('جملة'));
                if (acc) form.setValue('account_id', acc.id);
            } else if (value === 'retail') {
                const acc = accounts.find(a => a.name_en.toLowerCase().includes('retail') || a.name_ar.includes('تجزئة'));
                if (acc) form.setValue('account_id', acc.id);
            }
        } else {
            // Supplier logic
            const acc = accounts.find(a => a.name_en.toLowerCase().includes('payable') || a.name_ar.includes('موردين'));
            if (acc) form.setValue('account_id', acc.id);
        }
    };

    const onSubmit = async (values: z.infer<typeof schema>) => {
        if (!companyId) return;
        setLoading(true);
        try {
            const payload: any = {
                company_id: companyId,
                tenant_id: company?.tenant_id,
                code: `${type === 'customer' ? 'C' : 'S'}-${Date.now()}`,
                name_ar: values.name_ar,
                name_en: values.name_en || values.name_ar, // Fallback
                phone: values.phone,
                email: values.email || null,
                address: values.address,
                status: 'active',
                // Specific fields
                ...(type === 'customer' ? {
                    customer_type: values.party_type,
                    receivable_account_id: values.account_id,
                    credit_limit: values.credit_limit ? parseFloat(values.credit_limit) : 0,
                } : {
                    supplier_type: values.party_type,
                    payable_account_id: values.account_id,
                }),
                payment_terms_days: values.payment_terms_days ? parseInt(values.payment_terms_days) : 0,
                tax_number: values.tax_number,
            };

            const table = type === 'customer' ? 'customers' : 'suppliers';

            const { error } = await supabase.from(table).insert(payload);
            if (error) throw error;

            toast.success(t('common.savedSuccessfully'));
            onComplete();
            onClose();
            form.reset();
        } catch (error: any) {
            console.error('Error saving party:', error);
            toast.error(t('accounting.errors.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {type === 'customer' ? t('parties.addCustomer') : t('parties.addSupplier')}
                    </SheetTitle>
                    <SheetDescription>
                        {t('parties.partiesDescription')}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('parties.form.nameAr')} <span className="text-red-500">*</span></Label>
                            <Input {...form.register('name_ar')} className="text-right" dir="rtl" />
                            {form.formState.errors.name_ar && <p className="text-xs text-red-500">{form.formState.errors.name_ar.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('parties.form.nameEn')}</Label>
                            <Input {...form.register('name_en')} className="text-left" dir="ltr" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('parties.form.type')} <span className="text-red-500">*</span></Label>
                            <Select onValueChange={handleTypeChange} value={form.watch('party_type')}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('parties.form.selectType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {type === 'customer' ? (
                                        <>
                                            <SelectItem value="wholesale">{t('parties.form.types.wholesale')}</SelectItem>
                                            <SelectItem value="retail">{t('parties.form.types.retail')}</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="fabric">{t('parties.form.types.fabric')}</SelectItem>
                                            <SelectItem value="accessories">{t('parties.form.types.accessories')}</SelectItem>
                                            <SelectItem value="service">{t('parties.form.types.service')}</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.party_type && <p className="text-xs text-red-500">{form.formState.errors.party_type.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('parties.form.linkedAccount')} <span className="text-red-500">*</span></Label>
                            <Select
                                onValueChange={(val) => form.setValue('account_id', val)}
                                value={form.watch('account_id')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('parties.form.selectAccount')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.account_code} - {language === 'ar' ? acc.name_ar : acc.name_en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.account_id && <p className="text-xs text-red-500">{form.formState.errors.account_id.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('parties.form.phone')}</Label>
                            <Input {...form.register('phone')} dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('parties.form.email')}</Label>
                            <Input {...form.register('email')} dir="ltr" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('parties.form.address')}</Label>
                        <Textarea {...form.register('address')} />
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>{t('parties.form.taxNumber')}</Label>
                            <Input {...form.register('tax_number')} className="font-mono text-left" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('parties.form.creditLimit')}</Label>
                            <Input {...form.register('credit_limit')} type="number" className="font-mono text-left" dir="ltr" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('parties.form.paymentTerms')}</Label>
                            <Input {...form.register('payment_terms_days')} type="number" className="font-mono text-left" dir="ltr" />
                        </div>
                    </div>

                    <SheetFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
                        <Button type="submit" disabled={loading} className="bg-erp-navy hover:bg-erp-navy/90">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {t('common.save')}
                        </Button>
                    </SheetFooter>

                </form>
            </SheetContent>
        </Sheet>
    );
}
