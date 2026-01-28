import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  CalendarIcon, 
  Loader2, 
  Search, 
  Building2, 
  Package, 
  CreditCard,
  Wallet,
  Banknote,
  Upload,
  X,
  CheckCircle2,
  Info,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingPayment?: any;
}

interface TenantDetails {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  tax_number?: string;
  status: string;
  product_id: string;
  product_name?: string;
  subscription?: {
    id: string;
    plan_name: string;
    plan_code: string;
    status: string;
    start_date: string;
    end_date?: string;
    price_monthly?: number;
    price_yearly?: number;
    currency?: string;
  };
}

export function PaymentFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  editingPayment 
}: PaymentFormDialogProps) {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantDetails[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantDetails[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    tenant_id: editingPayment?.tenant_id || '',
    amount: editingPayment?.amount || '',
    currency: editingPayment?.currency || 'USD',
    payment_method: editingPayment?.payment_method || 'bank_transfer',
    status: editingPayment?.status || 'completed',
    collection_date: editingPayment?.collection_date ? new Date(editingPayment.collection_date) : new Date(),
    account_id: editingPayment?.account_id || '',
    account_name: editingPayment?.account_name || '',
    reference_number: editingPayment?.reference_number || '',
    notes: editingPayment?.notes || '',
    receipt_url: editingPayment?.receipt_url || '',
  });

  // Load data on dialog open
  useEffect(() => {
    if (open) {
      loadAllTenants();
      loadAccounts();
      
      if (editingPayment?.tenant_id) {
        loadTenantDetails(editingPayment.tenant_id);
      }
    } else {
      resetForm();
    }
  }, [open]);

  // Real-time filtering - يبحث في جميع الحقول
  useEffect(() => {
    console.log('🔍 Search query changed:', searchQuery);
    console.log('📊 Total tenants:', tenants.length);
    
    if (!searchQuery.trim()) {
      setFilteredTenants(tenants);
      console.log('✅ Showing all tenants:', tenants.length);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tenants.filter(tenant => 
      // البحث في الاسم
      tenant.name.toLowerCase().includes(query) ||
      // البحث في الكود
      tenant.code.toLowerCase().includes(query) ||
      // البحث في البريد الإلكتروني
      tenant.email?.toLowerCase().includes(query) ||
      // البحث في رقم الهاتف
      tenant.phone?.toLowerCase().includes(query) ||
      // البحث في الكنية (اسم الشخص المسؤول)
      tenant.contact_person?.toLowerCase().includes(query) ||
      // البحث في الرقم الضريبي
      tenant.tax_number?.toLowerCase().includes(query) ||
      // البحث في اسم الشركة/المنتج
      tenant.product_name?.toLowerCase().includes(query)
    );
    setFilteredTenants(filtered);
    console.log('🎯 Filtered results:', filtered.length);
  }, [searchQuery, tenants]);

  const loadAllTenants = async () => {
    setLoadingData(true);
    try {
      console.log('🔄 Starting to load tenants...');
      
      // جلب المشتركين مع المنتجات
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          *,
          saas_products (
            id,
            name,
            code
          )
        `)
        .in('status', ['active', 'trial', 'pending', 'suspended'])
        .order('name');

      if (tenantsError) {
        console.error('❌ Error loading tenants:', tenantsError);
        throw tenantsError;
      }

      if (!tenantsData || tenantsData.length === 0) {
        console.warn('⚠️ No tenants found');
        setTenants([]);
        setFilteredTenants([]);
        toast.info(language === 'ar' ? 'لا توجد عملاء' : 'No customers found');
        return;
      }

      console.log('✅ Loaded tenants:', tenantsData.length);

      // جلب الاشتراكات لكل مشترك
      const tenantsWithDetails: TenantDetails[] = [];
      
      for (const tenant of tenantsData) {
        // جلب الاشتراك النشط
        const { data: subscriptions } = await supabase
          .from('tenant_subscriptions')
          .select(`
            id,
            status,
            start_date,
            end_date,
            subscription_plans (
              id,
              name_en,
              name_ar,
              code,
              price_monthly,
              price_yearly,
              currency
            )
          `)
          .eq('tenant_id', tenant.id)
          .in('status', ['active', 'trial'])
          .limit(1)
          .maybeSingle();

        const subscription = subscriptions;

        tenantsWithDetails.push({
          id: tenant.id,
          name: tenant.name || 'Unknown',
          code: tenant.code || '',
          email: tenant.email || '',
          phone: tenant.phone || '',
          contact_person: tenant.contact_person || '',
          tax_number: tenant.tax_number || '',
          status: tenant.status || 'active',
          product_id: tenant.product_id,
          product_name: (tenant.saas_products as any)?.name,
          subscription: subscription ? {
            id: subscription.id,
            plan_name: getLocalizedField(subscription.subscription_plans, 'name', language, 'N/A'),
            plan_code: (subscription.subscription_plans as any)?.code,
            status: subscription.status,
            start_date: subscription.start_date,
            end_date: subscription.end_date,
            price_monthly: (subscription.subscription_plans as any)?.price_monthly,
            price_yearly: (subscription.subscription_plans as any)?.price_yearly,
            currency: (subscription.subscription_plans as any)?.currency,
          } : undefined,
        });
      }

      console.log('✅ Processed tenants with details:', tenantsWithDetails.length);

      setTenants(tenantsWithDetails);
      setFilteredTenants(tenantsWithDetails);
      
      toast.success(`${language === 'ar' ? 'تم تحميل' : 'Loaded'} ${tenantsWithDetails.length} ${language === 'ar' ? 'عميل' : 'customers'}`);
    } catch (error) {
      console.error('❌ Error loading tenants:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل العملاء' : 'Error loading customers');
    } finally {
      setLoadingData(false);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setSelectedTenant(tenant);
      setSearchQuery(tenant.name);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number, account_name, account_type')
        .in('account_type', ['cash', 'bank'])
        .eq('is_active', true)
        .order('account_number');

      if (error && error.code !== '42P01') throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleTenantSelect = (tenant: TenantDetails) => {
    setSelectedTenant(tenant);
    setSearchQuery(tenant.name);
    setFormData(prev => ({
      ...prev,
      tenant_id: tenant.id,
      currency: tenant.subscription?.currency || 'USD',
      amount: tenant.subscription?.price_monthly?.toString() || '',
    }));
    setComboboxOpen(false);
  };

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (comboboxOpen && !target.closest('.customer-search-container')) {
        setComboboxOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [comboboxOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'الرجاء اختيار صورة فقط' : 'Please select an image only');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الملف يجب أن يكون أقل من 2 ميجابايت' : 'File size must be less than 2MB');
      return;
    }

    setReceiptFile(file);
  };

  const uploadReceipt = async (tenantId: string, paymentNumber: string): Promise<string | null> => {
    if (!receiptFile) return null;

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${paymentNumber}-${Date.now()}.${fileExt}`;
      const filePath = `payment-receipts/${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('saas-documents')
        .upload(filePath, receiptFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('saas-documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenant_id || !formData.amount) {
      toast.error(language === 'ar' ? 'الرجاء اختيار العميل والمبلغ' : 'Please select customer and amount');
      return;
    }

    if (formData.payment_method === 'cash' && !formData.account_id && accounts.length > 0) {
      toast.error(language === 'ar' ? 'الرجاء اختيار الصندوق' : 'Please select cash account');
      return;
    }

    setLoading(true);
    try {
      let paymentNumber = editingPayment?.payment_number;
      if (!paymentNumber) {
        const { data: numberData } = await supabase.rpc('generate_payment_number');
        paymentNumber = numberData || `PAY-${Date.now()}`;
      }

      let receiptUrl = formData.receipt_url;
      if (receiptFile) {
        const uploadedUrl = await uploadReceipt(formData.tenant_id, paymentNumber);
        if (uploadedUrl) receiptUrl = uploadedUrl;
      }

      const paymentData = {
        tenant_id: formData.tenant_id,
        payment_number: paymentNumber,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_method: formData.payment_method,
        status: formData.status,
        collection_date: formData.collection_date.toISOString(),
        account_id: formData.account_id || null,
        account_name: formData.account_name || null,
        reference_number: formData.reference_number || null,
        receipt_url: receiptUrl || null,
        notes: formData.notes || null,
        subscription_id: selectedTenant?.subscription?.id || null,
        product_id: selectedTenant?.product_id || null,
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('saas_payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast.success(language === 'ar' ? 'تم تحديث الدفعة بنجاح' : 'Payment updated successfully');
      } else {
        // إنشاء دفعة جديدة
        const { data: newPayment, error: insertError } = await supabase
          .from('saas_payments')
          .insert(paymentData)
          .select()
          .single();

        if (insertError) throw insertError;

        // 🚀 تفعيل الاشتراك تلقائياً
        if (newPayment && formData.status === 'completed') {
          const { data: activationResult, error: activationError } = await supabase
            .rpc('activate_subscription_from_payment', {
              p_payment_id: newPayment.id
            });

          if (activationError) {
            console.error('Activation error:', activationError);
            toast.warning(
              language === 'ar' 
                ? 'تم حفظ الدفعة لكن فشل تفعيل الاشتراك' 
                : 'Payment saved but subscription activation failed'
            );
          } else if (activationResult?.success) {
            toast.success(
              language === 'ar'
                ? `تم إضافة الدفعة وتفعيل ${activationResult.days_purchased} يوم حتى ${activationResult.end_date}`
                : `Payment added and ${activationResult.days_purchased} days activated until ${activationResult.end_date}`
            );
          } else {
            toast.warning(
              language === 'ar'
                ? `تم حفظ الدفعة: ${activationResult?.error || 'خطأ غير معروف'}`
                : `Payment saved: ${activationResult?.error || 'Unknown error'}`
            );
          }
        } else {
          toast.success(language === 'ar' ? 'تم إضافة الدفعة بنجاح' : 'Payment added successfully');
        }
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast.error(error.message || (language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving payment'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: '',
      amount: '',
      currency: 'USD',
      payment_method: 'bank_transfer',
      status: 'completed',
      collection_date: new Date(),
      account_id: '',
      account_name: '',
      reference_number: '',
      notes: '',
      receipt_url: '',
    });
    setSelectedTenant(null);
    setSearchQuery('');
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingPayment 
              ? (language === 'ar' ? 'تعديل الدفعة' : 'Edit Payment')
              : (language === 'ar' ? 'إضافة دفعة جديدة' : 'Add New Payment')
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Customer Selection */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {language === 'ar' ? '1. اختيار العميل (إلزامي)' : '1. Select Customer (Required)'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'ابحث عن العميل بالاسم أو الكود' 
                  : 'Search for customer by name or code'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {language === 'ar' ? 'العميل' : 'Customer'} *
                </Label>
                <div className="relative customer-search-container">
                  {/* Input للبحث مع زرين */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setComboboxOpen(true);
                        }}
                        onFocus={() => setComboboxOpen(true)}
                        placeholder={language === 'ar' 
                          ? 'ابحث بالاسم، الهاتف، الشركة، الرقم الضريبي...' 
                          : 'Search by name, phone, company, tax number...'}
                        disabled={loadingData || !!editingPayment}
                        className="pe-10"
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute end-0 top-0 h-full px-3"
                          onClick={() => {
                            setSearchQuery('');
                            setComboboxOpen(true);
                          }}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    
                    {/* زر فتح القائمة الكاملة */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setComboboxOpen(!comboboxOpen);
                      }}
                      disabled={loadingData || !!editingPayment}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      {language === 'ar' ? 'كل العملاء' : 'All Customers'}
                    </Button>
                  </div>

                  {/* القائمة المنسدلة */}
                  {comboboxOpen && (
                    <Card className="absolute z-50 w-full mt-1 max-h-[400px] overflow-auto shadow-lg border-2">
                      {loadingData ? (
                        <CardContent className="p-8 text-center">
                          <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {language === 'ar' ? 'جاري تحميل العملاء...' : 'Loading customers...'}
                          </p>
                        </CardContent>
                      ) : filteredTenants.length > 0 ? (
                        <CardContent className="p-2">
                          <div className="text-xs text-muted-foreground px-2 py-1 sticky top-0 bg-background border-b mb-2">
                            {filteredTenants.length} {language === 'ar' ? 'عميل' : 'customer(s)'}
                          </div>
                          {filteredTenants.map((tenant) => (
                            <div
                              key={tenant.id}
                              onClick={() => handleTenantSelect(tenant)}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all",
                                "hover:bg-primary/10 hover:border-primary/20 border border-transparent",
                                formData.tenant_id === tenant.id && "bg-primary/20 border-primary"
                              )}
                            >
                              <Building2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* الاسم والكود */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm">{tenant.name}</span>
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {tenant.code}
                                  </Badge>
                                  {formData.tenant_id === tenant.id && (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                
                                {/* الشركة/المنتج */}
                                {tenant.product_name && (
                                  <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                                    <Building2 className="h-3 w-3" />
                                    <span>{tenant.product_name}</span>
                                  </div>
                                )}
                                
                                {/* الكنية/المسؤول */}
                                {tenant.contact_person && (
                                  <div className="flex items-center gap-1 text-xs text-foreground/80">
                                    <span>👤</span>
                                    <span>{tenant.contact_person}</span>
                                  </div>
                                )}
                                
                                {/* معلومات الاتصال */}
                                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                                  {tenant.email && (
                                    <span className="flex items-center gap-1">
                                      <span>📧</span>
                                      <span className="truncate max-w-[200px]">{tenant.email}</span>
                                    </span>
                                  )}
                                  
                                  {tenant.phone && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <span>📱</span>
                                      <span>{tenant.phone}</span>
                                    </span>
                                  )}
                                  
                                  {tenant.tax_number && (
                                    <span className="flex items-center gap-1 font-mono">
                                      <span>🔢</span>
                                      <span>{tenant.tax_number}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      ) : (
                        <CardContent className="p-8 text-center">
                          <div className="text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">
                              {language === 'ar' ? 'لا يوجد عملاء مطابقين' : 'No matching customers'}
                            </p>
                            {searchQuery && (
                              <p className="text-xs mt-1">
                                {language === 'ar' 
                                  ? `البحث عن: "${searchQuery}"` 
                                  : `Searching for: "${searchQuery}"`}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              </div>

              {/* Customer Details Card - بعد الاختيار */}
              {selectedTenant && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {language === 'ar' ? 'تفاصيل العميل المختار' : 'Selected Customer Details'}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* معلومات أساسية */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          {language === 'ar' ? 'اسم العميل' : 'Customer Name'}
                        </span>
                        <p className="font-bold text-lg">{selectedTenant.name}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          {language === 'ar' ? 'رمز العميل' : 'Customer Code'}
                        </span>
                        <p className="font-mono font-semibold text-lg">{selectedTenant.code}</p>
                      </div>
                    </div>

                    {/* المنتج والحالة */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTenant.product_name && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase font-medium">
                            {language === 'ar' ? 'المنتج' : 'Product'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <p className="font-semibold text-primary">{selectedTenant.product_name}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          {language === 'ar' ? 'الحالة' : 'Status'}
                        </span>
                        <Badge 
                          variant={selectedTenant.status === 'active' ? 'default' : 'secondary'}
                          className="text-sm"
                        >
                          {selectedTenant.status}
                        </Badge>
                      </div>
                    </div>

                    {/* معلومات الاشتراك */}
                    {selectedTenant.subscription && (
                      <div className="pt-3 border-t space-y-3">
                        <p className="text-sm font-semibold text-muted-foreground uppercase">
                          {language === 'ar' ? '📦 معلومات الباقة' : '📦 Subscription Info'}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'اسم الباقة' : 'Plan Name'}
                            </span>
                            <p className="font-medium">{selectedTenant.subscription.plan_name}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
                            </span>
                            <p className="font-bold text-primary text-lg">
                              {selectedTenant.subscription.price_monthly?.toLocaleString() || '0'}{' '}
                              <span className="text-sm">{selectedTenant.subscription.currency}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Payment Details */}
          {selectedTenant && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    {language === 'ar' ? '2. تفاصيل الدفعة' : '2. Payment Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {language === 'ar' ? 'المبلغ' : 'Amount'} *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {language === 'ar' ? 'العملة' : 'Currency'}
                      </Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - $</SelectItem>
                          <SelectItem value="EUR">EUR - €</SelectItem>
                          <SelectItem value="SAR">SAR - ر.س</SelectItem>
                          <SelectItem value="TRY">TRY - ₺</SelectItem>
                          <SelectItem value="GBP">GBP - £</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {language === 'ar' ? 'تاريخ الاستلام' : 'Collection Date'}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-start font-normal"
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {format(formData.collection_date, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.collection_date}
                          onSelect={(date) => date && setFormData({ ...formData, collection_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Payment Method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    {language === 'ar' ? '3. طريقة الدفع' : '3. Payment Method'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'} *
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            {language === 'ar' ? 'نقدي' : 'Cash'}
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}
                          </div>
                        </SelectItem>
                        <SelectItem value="credit_card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}
                          </div>
                        </SelectItem>
                        <SelectItem value="digital_wallet">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            {language === 'ar' ? 'محفظة رقمية' : 'Digital Wallet'}
                          </div>
                        </SelectItem>
                        <SelectItem value="check">
                          {language === 'ar' ? 'شيك' : 'Check'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Account Selection */}
                  {(formData.payment_method === 'cash' || formData.payment_method === 'bank_transfer') && accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label>
                        {formData.payment_method === 'cash' 
                          ? (language === 'ar' ? 'الصندوق' : 'Cash Account')
                          : (language === 'ar' ? 'الحساب البنكي' : 'Bank Account')
                        }
                      </Label>
                      <Select
                        value={formData.account_id}
                        onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select account'} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter(acc => 
                              formData.payment_method === 'cash' 
                                ? acc.account_type === 'cash' 
                                : acc.account_type === 'bank'
                            )
                            .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_number} - {account.account_name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {formData.payment_method === 'bank_transfer' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            {language === 'ar' ? 'اسم الحساب' : 'Account Name'}
                          </Label>
                          <Input
                            value={formData.account_name}
                            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                            placeholder={language === 'ar' ? 'مثال: بنك الراجحي' : 'e.g., Al Rajhi Bank'}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>
                            {language === 'ar' ? 'رقم المرجع' : 'Reference Number'}
                          </Label>
                          <Input
                            value={formData.reference_number}
                            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                            placeholder={language === 'ar' ? 'رقم التحويل' : 'Transfer number'}
                          />
                        </div>
                      </div>

                      {/* Receipt Upload */}
                      <div className="space-y-2">
                        <Label>
                          {language === 'ar' ? 'رفع إشعار الدفع (اختياري)' : 'Upload Payment Receipt (Optional)'}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="flex-1"
                          />
                          {receiptFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setReceiptFile(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {receiptFile && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              {language === 'ar' 
                                ? `تم اختيار: ${receiptFile.name} (${(receiptFile.size / 1024).toFixed(2)} KB)`
                                : `Selected: ${receiptFile.name} (${(receiptFile.size / 1024).toFixed(2)} KB)`
                              }
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Step 4: Notes & Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {language === 'ar' ? '4. ملاحظات وحالة الدفعة' : '4. Notes & Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">
                          {language === 'ar' ? 'مكتمل' : 'Completed'}
                        </SelectItem>
                        <SelectItem value="pending">
                          {language === 'ar' ? 'معلق' : 'Pending'}
                        </SelectItem>
                        <SelectItem value="failed">
                          {language === 'ar' ? 'فشل' : 'Failed'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {language === 'ar' ? 'ملاحظات' : 'Notes'}
                    </Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading || !selectedTenant}>
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {editingPayment
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إضافة الدفعة' : 'Add Payment')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
