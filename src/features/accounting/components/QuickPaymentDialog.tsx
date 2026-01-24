import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowUpRight, 
  Calendar as CalendarIcon, 
  Building2, 
  Wallet,
  FileText,
  Printer,
  Save,
  X,
  AlertTriangle,
  CreditCard,
  Banknote,
  Send
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Currency configuration
const currencyInfo: Record<string, { symbol: string; flag: string; name: { ar: string; en: string } }> = {
  SAR: { symbol: 'ر.س', flag: '🇸🇦', name: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  USD: { symbol: '$', flag: '🇺🇸', name: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  EUR: { symbol: '€', flag: '🇪🇺', name: { ar: 'يورو', en: 'Euro' } },
  GBP: { symbol: '£', flag: '🇬🇧', name: { ar: 'جنيه إسترليني', en: 'British Pound' } },
  AED: { symbol: 'د.إ', flag: '🇦🇪', name: { ar: 'درهم إماراتي', en: 'UAE Dirham' } }
};

const availableCurrencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];

interface QuickPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFundId?: number;
  funds: Array<{ id: number; name: string; type: string; balance: number; currency?: string }>;
}

export default function QuickPaymentDialog({ 
  open, 
  onOpenChange, 
  selectedFundId,
  funds 
}: QuickPaymentDialogProps) {
  const { language, direction } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    fundId: selectedFundId?.toString() || '',
    amount: '',
    currency: 'SAR',
    paymentType: 'supplier',
    supplierId: '',
    paymentMethod: 'cash',
    reference: `PAY-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    description: '',
    contraAccount: '',
    costCenter: '',
    createEntry: true,
    printAfterSave: false
  });

  const paymentTypes = [
    { value: 'supplier', label: language === 'ar' ? 'دفع لمورد' : 'Supplier Payment' },
    { value: 'withdrawal', label: language === 'ar' ? 'سحب نقدي' : 'Cash Withdrawal' },
    { value: 'transfer', label: language === 'ar' ? 'تحويل صادر' : 'Outgoing Transfer' },
    { value: 'expense', label: language === 'ar' ? 'مصروف' : 'Expense' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  const paymentMethods = [
    { value: 'cash', label: language === 'ar' ? 'نقداً' : 'Cash', icon: Banknote },
    { value: 'check', label: language === 'ar' ? 'شيك' : 'Check', icon: FileText },
    { value: 'transfer', label: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer', icon: Send },
    { value: 'card', label: language === 'ar' ? 'بطاقة' : 'Card', icon: CreditCard },
  ];

  const suppliers = [
    { id: '1', name: language === 'ar' ? 'مؤسسة الفجر للتوريدات' : 'Al-Fajr Supplies Est.' },
    { id: '2', name: language === 'ar' ? 'شركة السلام التجارية' : 'Al-Salam Trading Co.' },
    { id: '3', name: language === 'ar' ? 'مصنع الإتقان' : 'Al-Itqan Factory' },
  ];

  const accounts = [
    { id: '2010', name: language === 'ar' ? '2010 - الدائنون' : '2010 - Payables' },
    { id: '5010', name: language === 'ar' ? '5010 - مصروفات إدارية' : '5010 - Admin Expenses' },
    { id: '5020', name: language === 'ar' ? '5020 - مصروفات تشغيلية' : '5020 - Operating Expenses' },
    { id: '5030', name: language === 'ar' ? '5030 - مصروفات تسويق' : '5030 - Marketing Expenses' },
  ];

  const costCenters = [
    { id: 'cc1', name: language === 'ar' ? 'المركز الرئيسي' : 'Main Center' },
    { id: 'cc2', name: language === 'ar' ? 'فرع الرياض' : 'Riyadh Branch' },
    { id: 'cc3', name: language === 'ar' ? 'فرع جدة' : 'Jeddah Branch' },
  ];

  const selectedFund = funds.find(f => f.id.toString() === formData.fundId);
  const amount = parseFloat(formData.amount) || 0;
  const isOverBalance = selectedFund && amount > selectedFund.balance;

  const handleSubmit = (_asDraft: boolean = false) => {
    // TODO: Implement actual payment submission
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 overflow-hidden"
        dir={direction}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 bg-gradient-to-r from-red-600 to-red-500 text-white flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-cairo text-white">
                  {language === 'ar' ? 'سند صرف جديد' : 'New Payment Voucher'}
                </SheetTitle>
                <SheetDescription className="text-white/80 mt-1">
                  {language === 'ar' ? 'تسجيل مدفوعات نقدية أو تحويلات' : 'Record cash payments or transfers'}
                </SheetDescription>
              </div>
            </div>
            <Badge variant="secondary" className="absolute top-6 left-6 bg-white/20 text-white border-0">
              {formData.reference}
            </Badge>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Fund Selection with Balance */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'الصندوق/البنك' : 'Fund/Bank'}</Label>
              <Select 
                value={formData.fundId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, fundId: v }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الصندوق أو البنك' : 'Select Fund or Bank'} />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(fund => (
                    <SelectItem key={fund.id} value={fund.id.toString()}>
                      <span className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${fund.type === 'bank' ? 'text-blue-600' : 'text-green-600'}`} />
                        {fund.name}
                        <span className="text-gray-400 font-mono text-xs">({fund.balance.toLocaleString()} SAR)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFund && (
                <Card className={`${isOverBalance ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className={`text-sm ${isOverBalance ? 'text-red-700' : 'text-blue-700'}`}>
                      {language === 'ar' ? 'الرصيد المتاح' : 'Available Balance'}
                    </span>
                    <span className={`font-mono font-bold ${isOverBalance ? 'text-red-700' : 'text-blue-700'}`}>
                      {selectedFund.balance.toLocaleString()} SAR
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Amount, Currency and Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className={`font-mono text-lg font-bold ${isOverBalance ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {isOverBalance && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {language === 'ar' ? 'المبلغ أكبر من الرصيد المتاح!' : 'Amount exceeds available balance!'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map(curr => (
                      <SelectItem key={curr} value={curr}>
                        <span className="flex items-center gap-2">
                          <span>{currencyInfo[curr].flag}</span>
                          <span>{curr}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'نوع المدفوعات' : 'Payment Type'}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {paymentTypes.map(type => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.paymentType === type.value ? 'default' : 'outline'}
                    size="sm"
                    className={formData.paymentType === type.value ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setFormData(prev => ({ ...prev, paymentType: type.value }))}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Supplier Selection (if supplier type) */}
            {formData.paymentType === 'supplier' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {language === 'ar' ? 'المورد' : 'Supplier'}
                </Label>
                <Select 
                  value={formData.supplierId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, supplierId: v }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={language === 'ar' ? 'اختر المورد' : 'Select Supplier'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map(method => {
                  const IconComponent = method.icon;
                  return (
                    <Button
                      key={method.value}
                      type="button"
                      variant={formData.paymentMethod === method.value ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-col h-auto py-3 ${formData.paymentMethod === method.value ? 'bg-erp-navy' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                    >
                      <IconComponent className="w-5 h-5 mb-1" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {language === 'ar' ? 'البيان' : 'Description'}
              </Label>
              <Textarea 
                placeholder={language === 'ar' ? 'وصف المدفوعات...' : 'Payment description...'}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Contra Account */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'الحساب المقابل' : 'Contra Account'}</Label>
              <Select 
                value={formData.contraAccount} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, contraAccount: v }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select Account'} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Center (Optional) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                {language === 'ar' ? 'مركز التكلفة (اختياري)' : 'Cost Center (Optional)'}
              </Label>
              <Select 
                value={formData.costCenter} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, costCenter: v }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder={language === 'ar' ? 'اختر مركز التكلفة' : 'Select Cost Center'} />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="createEntry" 
                  checked={formData.createEntry}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createEntry: checked as boolean }))}
                />
                <Label htmlFor="createEntry" className="text-sm cursor-pointer">
                  {language === 'ar' ? 'إنشاء قيد محاسبي تلقائياً' : 'Create accounting entry automatically'}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="printAfterSave" 
                  checked={formData.printAfterSave}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, printAfterSave: checked as boolean }))}
                />
                <Label htmlFor="printAfterSave" className="text-sm cursor-pointer">
                  {language === 'ar' ? 'طباعة السند بعد الحفظ' : 'Print voucher after saving'}
                </Label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex-none border-t bg-gray-50 dark:bg-slate-800 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="outline" onClick={() => handleSubmit(true)} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'حفظ كمسودة' : 'Save as Draft'}
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" 
                onClick={() => handleSubmit(false)}
                disabled={isOverBalance}
              >
                {formData.printAfterSave && <Printer className="w-4 h-4 mr-2" />}
                {language === 'ar' ? 'حفظ وترحيل' : 'Save & Post'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
