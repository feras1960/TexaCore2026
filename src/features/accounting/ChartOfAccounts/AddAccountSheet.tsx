/**
 * AddAccountSheet Component
 * Side sheet for adding/editing accounts
 */

import React, { useState, useEffect } from 'react';
// UnifiedSheet has been removed - TODO: Convert to UniversalDetailSheet
// import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Plus, Save, RefreshCw } from 'lucide-react';
import type { Account, CreateAccountInput } from '@/services/accountsService';
import { accountsService } from '@/services/accountsService';
import { SmartCurrencySelector } from '../components/shared/CurrencySelector';

// Account type from database
interface AccountType {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  classification: string;
  normal_balance: string;
  display_order: number;
}

// Internal form data interface
interface FormData {
  company_id: string;
  code: string;
  name: string;
  name_en: string;
  account_type_id: string;
  parent_id?: string;
  level: number;
  is_group: boolean;
  currency: string;
  description?: string;
}

interface AddAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: CreateAccountInput) => Promise<void>;
  parentAccount?: Account | null;
  editingAccount?: Account | null;
  allAccounts: Account[];
  companyId: string | undefined;
  isGroupMode?: boolean;
}

export function AddAccountSheet({
  isOpen,
  onClose,
  onSave,
  parentAccount,
  editingAccount,
  allAccounts,
  companyId,
  isGroupMode = false,
}: AddAccountSheetProps) {
  const { t, language, direction } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [accountTypesLoading, setAccountTypesLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    company_id: companyId || '',
    code: '',
    name: '',
    name_en: '',
    account_type_id: '',
    parent_id: parentAccount?.id,
    level: parentAccount ? parentAccount.level + 1 : 1,
    is_group: false,
    currency: 'SAR',
    description: '',
  });

  // Fetch account types from database
  useEffect(() => {
    const fetchAccountTypes = async () => {
      try {
        setAccountTypesLoading(true);
        const types = await accountsService.getAccountTypes();
        setAccountTypes(types);
        // Set default account type if available
        if (types.length > 0 && !formData.account_type_id) {
          const assetType = types.find((t: AccountType) => t.code === 'ASSET');
          if (assetType) {
            setFormData(prev => ({ ...prev, account_type_id: assetType.id }));
          }
        }
      } catch (error) {
        console.error('Error fetching account types:', error);
      } finally {
        setAccountTypesLoading(false);
      }
    };

    if (isOpen) {
      fetchAccountTypes();
    }
  }, [isOpen]);

  // Update form when editing
  useEffect(() => {
    if (editingAccount) {
      setFormData({
        company_id: editingAccount.company_id,
        code: editingAccount.code || editingAccount.account_code || '',
        name: editingAccount.name || editingAccount.name_ar || '',
        name_en: editingAccount.name_en || '',
        account_type_id: editingAccount.account_type_id || '',
        parent_id: editingAccount.parent_id || undefined,
        level: editingAccount.level,
        is_group: editingAccount.is_group,
        currency: editingAccount.currency || 'SAR',
        description: editingAccount.description || '',
      });
    } else {
      // Reset form for new account
      // Find default account type (ASSET)
      const defaultTypeId = accountTypes.find(t => t.code === 'ASSET')?.id || '';
      setFormData({
        company_id: companyId || '',
        code: '',
        name: '',
        name_en: '',
        account_type_id: defaultTypeId,
        parent_id: parentAccount?.id,
        level: parentAccount ? parentAccount.level + 1 : 1,
        is_group: isGroupMode || false,
        currency: 'SAR',
        description: '',
      });
    }
  }, [editingAccount, parentAccount, companyId, isGroupMode, accountTypes]);

  /**
   * Get account type code from ID
   */
  const getAccountTypeCode = (typeId: string): string => {
    const accountType = accountTypes.find(t => t.id === typeId);
    return accountType?.code?.toLowerCase() || 'asset';
  };

  /**
   * Calculate next account code (ERPNext style)
   * If parentAccount exists, generate code based on parent's code
   * Otherwise, use account type prefix
   */
  const getNextAccountCode = (accountTypeId?: string, overrideParent?: Account): string => {
    if (editingAccount) return editingAccount.code || editingAccount.account_code || '';

    // Use overrideParent if provided, otherwise use parentAccount from props
    const effectiveParent = overrideParent || parentAccount;

    // If parent account exists, generate code based on parent
    if (effectiveParent && effectiveParent.code) {
      const parentCode = effectiveParent.code;

      // Get all children of the parent account
      const parentChildren = allAccounts.filter(
        (a) => a.parent_id === effectiveParent.id
      );

      if (parentChildren.length === 0) {
        // First child: parent code + 10 (e.g., 1100 -> 1110)
        const baseCode = parseInt(parentCode) || 0;
        const nextCode = baseCode + 10;
        return nextCode.toString().padStart(parentCode.length, '0');
      }

      // Find max code among children
      const maxCode = parentChildren
        .map((a) => {
          const codeNum = parseInt(a.code || '0');
          return isNaN(codeNum) ? 0 : codeNum;
        })
        .reduce((max, n) => Math.max(max, n), parseInt(parentCode) || 0);

      // Next code: max + 10 (e.g., 1110 -> 1120, 1120 -> 1130)
      const nextCode = maxCode + 10;
      return nextCode.toString().padStart(parentCode.length, '0');
    }

    // No parent: use account type prefix
    const accountTypePrefix: Record<string, string> = {
      asset: '1',
      current_asset: '1',
      fixed_asset: '1',
      liability: '2',
      current_liability: '2',
      long_term_liability: '2',
      equity: '3',
      revenue: '4',
      other_income: '4',
      expense: '5',
      cogs: '5',
      other_expense: '5',
    };

    const typeCode = getAccountTypeCode(accountTypeId || formData.account_type_id);
    const prefix = accountTypePrefix[typeCode] || '1';

    // Get accounts of same type (root level only)
    const rootAccounts = allAccounts.filter(
      (a) => !a.parent_id && a.account_type_id === (accountTypeId || formData.account_type_id) && (a.code || '').startsWith(prefix)
    );

    if (rootAccounts.length === 0) {
      return `${prefix}000`;
    }

    // Find max code
    const maxCode = rootAccounts
      .map((a) => {
        const codeNum = parseInt(a.code || '0');
        return isNaN(codeNum) ? 0 : codeNum;
      })
      .reduce((max, n) => Math.max(max, n), 0);

    // Next code
    const nextCode = maxCode + 100;
    return nextCode.toString().padStart(4, '0');
  };

  // Auto-generate code when type or parent changes
  useEffect(() => {
    if (!editingAccount && accountTypes.length > 0) {
      try {
        // Always generate code when parent account or account type changes (for new accounts)
        if (formData.account_type_id) {
          const nextCode = getNextAccountCode(formData.account_type_id);
          setFormData((prev) => ({ ...prev, code: nextCode }));
        }
      } catch (error) {
        console.error('Error generating account code:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.account_type_id, parentAccount?.id, editingAccount?.id, accountTypes, allAccounts]);

  // Function to regenerate account code
  const regenerateCode = () => {
    if (!editingAccount && formData.account_type_id) {
      const nextCode = getNextAccountCode(formData.account_type_id);
      setFormData((prev) => ({ ...prev, code: nextCode }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      console.error('Company ID is required');
      alert(t('accounting.errors.companyRequired') || 'Company ID is required. Please refresh the page.');
      return;
    }

    // Validate required fields
    if (!formData.code || !formData.name || !formData.account_type_id) {
      alert(t('accounting.errors.fillRequiredFields') || 'Please fill all required fields.');
      return;
    }

    setLoading(true);

    try {
      // Transform form data to match CreateAccountInput expected by service
      const accountInput: CreateAccountInput = {
        company_id: companyId,
        account_code: formData.code,
        name_ar: formData.name,
        name_en: formData.name_en || undefined,
        account_type_id: formData.account_type_id,
        parent_id: formData.parent_id,
        is_group: formData.is_group,
        level: formData.level,
        currency: formData.currency,
        description: formData.description,
      };

      await onSave(accountInput);
      onClose();
    } catch (error: any) {
      console.error('Error saving account:', error);
      const errorMessage = error?.message || t('accounting.errors.saveFailed') || 'Failed to save account. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get parent options (only groups)
  const parentOptions = allAccounts.filter((a) => a.is_group);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="w-[600px] sm:max-w-[600px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {editingAccount ? t('accounting.editAccount') : t('accounting.addAccount')}
          </h2>
          {parentAccount && (
            <p className="text-sm text-gray-500">
              {t('accounting.account.parent')}: {parentAccount.name}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Account Code - Auto-generated */}
          <div className="space-y-2">
            <Label htmlFor="code">{t('accounting.account.code')} *</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="1000"
                required
                readOnly={!editingAccount}
                className={`font-mono flex-1 ${!editingAccount ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
              />
              {!editingAccount && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={regenerateCode}
                  title={t('accounting.regenerateCode') || 'Regenerate Code'}
                  className="shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {!editingAccount
                ? (t('accounting.accountCodeAutoGenerated') || 'Account code is auto-generated based on parent account or account type')
                : (t('accounting.accountCodeHint') || 'Account code cannot be changed after creation')
              }
            </p>
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('accounting.account.name')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('accounting.account.name')}
              required
            />
          </div>

          {/* Account Name (English) */}
          <div className="space-y-2">
            <Label htmlFor="name_en">{t('accounting.account.nameEn')}</Label>
            <Input
              id="name_en"
              value={formData.name_en || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))}
              placeholder="Account Name (English)"
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="account_type">{t('accounting.account.type')} *</Label>
            <Select
              value={formData.account_type_id}
              onValueChange={(value: string) =>
                setFormData((prev) => ({ ...prev, account_type_id: value }))
              }
              disabled={accountTypesLoading}
            >
              <SelectTrigger id="account_type" className="w-full">
                <SelectValue placeholder={accountTypesLoading ? t('common.loading') : t('accounting.account.type')} />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {accountTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {language === 'ar' ? type.name_ar : (type.name_en || type.name_ar)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Account */}
          <div className="space-y-2">
            <Label htmlFor="parent_id">{t('accounting.account.parent')}</Label>
            <Select
              value={formData.parent_id || '__none__'}
              onValueChange={(value) => {
                const newParentId = value === '__none__' ? undefined : value;
                const newParent = newParentId
                  ? allAccounts.find(a => a.id === newParentId)
                  : null;

                setFormData((prev) => {
                  const updated = {
                    ...prev,
                    parent_id: newParentId,
                    level: newParent ? newParent.level + 1 : 1,
                  };

                  // تحديث رقم الحساب تلقائياً عند تغيير المجموعة
                  if (!editingAccount && formData.account_type_id) {
                    const nextCode = getNextAccountCode(
                      formData.account_type_id,
                      newParent || undefined
                    );
                    updated.code = nextCode;
                  }

                  return updated;
                });
              }}
            >
              <SelectTrigger id="parent_id" className="w-full">
                <SelectValue placeholder={t('accounting.noParent')} />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="__none__">{t('accounting.noParent')}</SelectItem>
                {parentOptions.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Is Group */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_group"
              checked={formData.is_group}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_group: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="is_group" className="cursor-pointer">
              {t('accounting.isGroup')}
            </Label>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">{t('accounting.account.currency')}</Label>
            <SmartCurrencySelector
              value={formData.currency}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, currency: value }))
              }
              showAllOption={false}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="teal" disabled={loading}>
              <Save className="w-4 h-4 me-2" />
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default AddAccountSheet;
