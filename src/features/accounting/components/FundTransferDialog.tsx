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
  ArrowRightLeft, 
  Calendar as CalendarIcon, 
  Wallet,
  ArrowRight,
  AlertTriangle,
  X,
  Landmark
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface FundTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFundId?: number;
  funds: Array<{ id: number; name: string; type: string; balance: number }>;
}

export default function FundTransferDialog({ 
  open, 
  onOpenChange, 
  selectedFundId,
  funds 
}: FundTransferDialogProps) {
  const { language, direction } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    fromFundId: selectedFundId?.toString() || '',
    toFundId: '',
    amount: '',
    hasCommission: false,
    commissionAmount: '',
    reference: `TRF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    description: ''
  });

  const fromFund = funds.find(f => f.id.toString() === formData.fromFundId);
  const toFund = funds.find(f => f.id.toString() === formData.toFundId);
  const amount = parseFloat(formData.amount) || 0;
  const commission = formData.hasCommission ? (parseFloat(formData.commissionAmount) || 0) : 0;
  const totalDeduction = amount + commission;
  const isOverBalance = fromFund && totalDeduction > fromFund.balance;
  const isSameFund = formData.fromFundId && formData.fromFundId === formData.toFundId;

  const handleSubmit = () => {
    console.log('Transfer submitted:', { ...formData, date });
    onOpenChange(false);
  };

  const FundIcon = ({ type }: { type: string }) => 
    type === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:w-[85vw] md:w-[70vw] lg:w-[50vw] max-w-none sm:max-w-[85vw] md:max-w-[70vw] lg:max-w-[50vw] p-0 overflow-hidden"
        dir={direction}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-cairo text-white">
                  {language === 'ar' ? 'تحويل بين الحسابات' : 'Account Transfer'}
                </SheetTitle>
                <SheetDescription className="text-white/80 mt-1">
                  {language === 'ar' ? 'تحويل أموال بين الصناديق والبنوك' : 'Transfer funds between accounts'}
                </SheetDescription>
              </div>
            </div>
            <Badge variant="secondary" className="absolute top-6 left-6 bg-white/20 text-white border-0">
              {formData.reference}
            </Badge>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Transfer Visual */}
            <div className="flex items-center gap-4">
              {/* From Fund */}
              <Card className={`flex-1 ${isOverBalance ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    {language === 'ar' ? 'من' : 'From'}
                  </Label>
                  <Select 
                    value={formData.fromFundId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, fromFundId: v }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الصندوق' : 'Select Fund'} />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map(fund => (
                        <SelectItem key={fund.id} value={fund.id.toString()} disabled={fund.id.toString() === formData.toFundId}>
                          <span className="flex items-center gap-2">
                            <FundIcon type={fund.type} />
                            {fund.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fromFund && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                        <span className={`font-mono font-bold ${isOverBalance ? 'text-red-600' : 'text-gray-900'}`}>
                          {fromFund.balance.toLocaleString()}
                        </span>
                      </div>
                      {amount > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{language === 'ar' ? 'بعد التحويل' : 'After Transfer'}</span>
                          <span className={`font-mono text-sm ${isOverBalance ? 'text-red-600' : 'text-green-600'}`}>
                            {(fromFund.balance - totalDeduction).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Arrow */}
              <div className="flex-none">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                </div>
              </div>

              {/* To Fund */}
              <Card className="flex-1 border-gray-200">
                <CardContent className="p-4">
                  <Label className="text-xs text-gray-500 mb-2 block">
                    {language === 'ar' ? 'إلى' : 'To'}
                  </Label>
                  <Select 
                    value={formData.toFundId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, toFundId: v }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الصندوق' : 'Select Fund'} />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map(fund => (
                        <SelectItem key={fund.id} value={fund.id.toString()} disabled={fund.id.toString() === formData.fromFundId}>
                          <span className="flex items-center gap-2">
                            <FundIcon type={fund.type} />
                            {fund.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {toFund && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                        <span className="font-mono font-bold text-gray-900">
                          {toFund.balance.toLocaleString()}
                        </span>
                      </div>
                      {amount > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{language === 'ar' ? 'بعد التحويل' : 'After Transfer'}</span>
                          <span className="font-mono text-sm text-green-600">
                            {(toFund.balance + amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Same Fund Warning */}
            {isSameFund && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' ? 'لا يمكن التحويل إلى نفس الحساب!' : 'Cannot transfer to the same account!'}
                </AlertDescription>
              </Alert>
            )}

            {/* Amount and Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{language === 'ar' ? 'مبلغ التحويل' : 'Transfer Amount'}</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className={`pl-16 font-mono text-lg font-bold ${isOverBalance ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">SAR</span>
                </div>
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

            {/* Commission */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="hasCommission" 
                  checked={formData.hasCommission}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasCommission: checked as boolean, commissionAmount: '' }))}
                />
                <Label htmlFor="hasCommission" className="text-sm cursor-pointer">
                  {language === 'ar' ? 'هناك عمولة تحويل' : 'Transfer has commission/fee'}
                </Label>
              </div>
              
              {formData.hasCommission && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{language === 'ar' ? 'مبلغ العمولة' : 'Commission Amount'}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      placeholder="0.00"
                      value={formData.commissionAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, commissionAmount: e.target.value }))}
                      className="pl-16 font-mono"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">SAR</span>
                  </div>
                </div>
              )}
            </div>

            {/* Over Balance Warning */}
            {isOverBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' 
                    ? `المبلغ الإجمالي (${totalDeduction.toLocaleString()}) أكبر من الرصيد المتاح (${fromFund?.balance.toLocaleString()})!`
                    : `Total amount (${totalDeduction.toLocaleString()}) exceeds available balance (${fromFund?.balance.toLocaleString()})!`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{language === 'ar' ? 'البيان' : 'Description'}</Label>
              <Textarea 
                placeholder={language === 'ar' ? 'وصف التحويل...' : 'Transfer description...'}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Summary */}
            {amount > 0 && fromFund && toFund && !isSameFund && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <h4 className="font-bold text-purple-900 mb-3 font-cairo">
                    {language === 'ar' ? 'ملخص التحويل' : 'Transfer Summary'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">{language === 'ar' ? 'مبلغ التحويل' : 'Transfer Amount'}</span>
                      <span className="font-mono font-bold text-purple-900">{amount.toLocaleString()} SAR</span>
                    </div>
                    {commission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-purple-700">{language === 'ar' ? 'العمولة' : 'Commission'}</span>
                        <span className="font-mono text-purple-900">{commission.toLocaleString()} SAR</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-purple-200">
                      <span className="text-purple-700 font-bold">{language === 'ar' ? 'إجمالي الخصم' : 'Total Deduction'}</span>
                      <span className="font-mono font-bold text-purple-900">{totalDeduction.toLocaleString()} SAR</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex-none border-t bg-gray-50 dark:bg-slate-800 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" 
                onClick={handleSubmit}
                disabled={isOverBalance || isSameFund || !formData.fromFundId || !formData.toFundId || !amount}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تنفيذ التحويل' : 'Execute Transfer'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
