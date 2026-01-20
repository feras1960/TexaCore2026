/**
 * Coupon Management Component
 * إدارة كوبونات الخصم والعروض الترويجية
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Gift,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Percent,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  TrendingUp,
  Zap,
  RefreshCw,
} from 'lucide-react';

// Types
export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed' | 'trial_extension';
  value: number;
  description: string;
  descriptionEn: string;
  status: 'Active' | 'Inactive';
  usageLimit: number | null;
  usageCount: number;
  validFrom: string;
  validTo: string;
  minPurchase: number;
  applicablePlans: string[];
}

// Mock coupon data
const initialCoupons: Coupon[] = [
  {
    id: 1,
    code: 'WELCOME20',
    type: 'percentage',
    value: 20,
    description: 'خصم للعملاء الجدد',
    descriptionEn: 'Welcome discount for new customers',
    status: 'Active',
    usageLimit: 100,
    usageCount: 45,
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    minPurchase: 500,
    applicablePlans: ['professional', 'enterprise'],
  },
  {
    id: 2,
    code: 'ANNUAL50',
    type: 'percentage',
    value: 50,
    description: 'خصم الاشتراك السنوي',
    descriptionEn: 'Annual subscription discount',
    status: 'Active',
    usageLimit: null,
    usageCount: 23,
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    minPurchase: 0,
    applicablePlans: ['all'],
  },
  {
    id: 3,
    code: 'FLAT500',
    type: 'fixed',
    value: 500,
    description: 'خصم ثابت',
    descriptionEn: 'Fixed discount',
    status: 'Active',
    usageLimit: 50,
    usageCount: 50,
    validFrom: '2024-01-01',
    validTo: '2024-06-30',
    minPurchase: 1500,
    applicablePlans: ['enterprise'],
  },
  {
    id: 4,
    code: 'PARTNER10',
    type: 'percentage',
    value: 10,
    description: 'خصم الشركاء',
    descriptionEn: 'Partner discount',
    status: 'Inactive',
    usageLimit: null,
    usageCount: 156,
    validFrom: '2023-01-01',
    validTo: '2023-12-31',
    minPurchase: 0,
    applicablePlans: ['all'],
  },
  {
    id: 5,
    code: 'TRIAL30',
    type: 'trial_extension',
    value: 30,
    description: 'تمديد الفترة التجريبية',
    descriptionEn: 'Trial period extension',
    status: 'Active',
    usageLimit: 200,
    usageCount: 78,
    validFrom: '2024-01-01',
    validTo: '2024-06-30',
    minPurchase: 0,
    applicablePlans: ['all'],
  },
];

export default function CouponManagement() {
  const { t, language, direction } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as const,
    value: 0,
    description: '',
    descriptionEn: '',
    usageLimit: '',
    validFrom: '',
    validTo: '',
    minPurchase: 0,
    applicablePlans: ['all'],
    isActive: true,
  });

  const filteredCoupons = useMemo(() => {
    let data = [...coupons];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(c =>
        c.code.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.descriptionEn.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      data = data.filter(c => c.status === statusFilter);
    }

    return data;
  }, [coupons, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    totalCoupons: coupons.length,
    activeCoupons: coupons.filter(c => c.status === 'Active').length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usageCount, 0),
    expiringSoon: coupons.filter(c => {
      const validTo = new Date(c.validTo);
      const now = new Date();
      const daysUntil = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30 && c.status === 'Active';
    }).length,
  }), [coupons]);

  const getStatusBadge = (status: string) => {
    return status === 'Active' ? (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        {t('saas.status.active')}
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 gap-1">
        <XCircle className="w-3 h-3" />
        {t('saas.status.inactive')}
      </Badge>
    );
  };

  const getCouponTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return Percent;
      case 'fixed': return DollarSign;
      case 'trial_extension': return Clock;
      default: return Tag;
    }
  };

  const getCouponTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return language === 'ar' ? 'نسبة مئوية' : 'Percentage';
      case 'fixed': return language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount';
      case 'trial_extension': return language === 'ar' ? 'تمديد تجريبي' : 'Trial Extension';
      default: return type;
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleToggleStatus = (couponId: number) => {
    setCoupons(prev => prev.map(c =>
      c.id === couponId
        ? { ...c, status: c.status === 'Active' ? 'Inactive' : 'Active' }
        : c
    ));
  };

  const handleDelete = (couponId: number) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId));
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      descriptionEn: coupon.descriptionEn,
      usageLimit: coupon.usageLimit?.toString() || '',
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      minPurchase: coupon.minPurchase,
      applicablePlans: coupon.applicablePlans,
      isActive: coupon.status === 'Active',
    });
    setShowEditDialog(true);
  };

  const handleCreate = () => {
    const newCoupon: Coupon = {
      id: Date.now(),
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.value,
      description: formData.description,
      descriptionEn: formData.descriptionEn,
      status: formData.isActive ? 'Active' : 'Inactive',
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      usageCount: 0,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      minPurchase: formData.minPurchase,
      applicablePlans: formData.applicablePlans,
    };
    setCoupons(prev => [newCoupon, ...prev]);
    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      description: '',
      descriptionEn: '',
      usageLimit: '',
      validFrom: '',
      validTo: '',
      minPurchase: 0,
      applicablePlans: ['all'],
      isActive: true,
    });
  };

  const CouponForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'رمز الكوبون' : 'Coupon Code'}</Label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="WELCOME20"
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'نوع الخصم' : 'Discount Type'}</Label>
          <Select value={formData.type} onValueChange={(v: 'percentage' | 'fixed' | 'trial_extension') => setFormData({ ...formData, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{language === 'ar' ? 'نسبة مئوية' : 'Percentage'}</SelectItem>
              <SelectItem value="fixed">{language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount'}</SelectItem>
              <SelectItem value="trial_extension">{language === 'ar' ? 'تمديد تجريبي' : 'Trial Extension'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          {formData.type === 'percentage' ? (language === 'ar' ? 'نسبة الخصم' : 'Discount Percentage') :
           formData.type === 'fixed' ? (language === 'ar' ? 'مبلغ الخصم' : 'Discount Amount') :
           (language === 'ar' ? 'أيام إضافية' : 'Additional Days')}
        </Label>
        <Input
          type="number"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
          placeholder={formData.type === 'percentage' ? '20' : formData.type === 'fixed' ? '500' : '30'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
          <Input
            value={formData.descriptionEn}
            onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'صالح من' : 'Valid From'}</Label>
          <Input
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'صالح حتى' : 'Valid To'}</Label>
          <Input
            type="date"
            value={formData.validTo}
            onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'حد الاستخدام' : 'Usage Limit'}</Label>
          <Input
            type="number"
            value={formData.usageLimit}
            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
            placeholder={language === 'ar' ? 'غير محدود' : 'Unlimited'}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'الحد الأدنى للشراء' : 'Min Purchase'} (SAR)</Label>
          <Input
            type="number"
            value={formData.minPurchase}
            onChange={(e) => setFormData({ ...formData, minPurchase: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{language === 'ar' ? 'الباقات المطبقة' : 'Applicable Plans'}</Label>
        <Select
          value={formData.applicablePlans[0]}
          onValueChange={(v) => setFormData({ ...formData, applicablePlans: [v] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'كل الباقات' : 'All Plans'}</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <Label>{language === 'ar' ? 'حالة الكوبون' : 'Coupon Status'}</Label>
          <p className="text-xs text-gray-500">{language === 'ar' ? 'تفعيل أو تعطيل الكوبون' : 'Activate or deactivate coupon'}</p>
        </div>
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Gift className="w-6 h-6 text-erp-teal" />
            {language === 'ar' ? 'كوبونات الخصم' : 'Discount Coupons'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {language === 'ar' ? 'إدارة كوبونات الخصم والعروض الترويجية' : 'Manage discount coupons and promotions'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.refresh')}</span>
          </Button>
          <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إنشاء كوبون' : 'Create Coupon'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">{language === 'ar' ? 'إجمالي الكوبونات' : 'Total Coupons'}</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300 font-mono">{stats.totalCoupons}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">{language === 'ar' ? 'كوبونات نشطة' : 'Active Coupons'}</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 font-mono">{stats.activeCoupons}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{language === 'ar' ? 'إجمالي الاستخدام' : 'Total Usage'}</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">{stats.totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400">{language === 'ar' ? 'تنتهي قريباً' : 'Expiring Soon'}</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300 font-mono">{stats.expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <Input
                placeholder={language === 'ar' ? 'بحث في الكوبونات...' : 'Search coupons...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</SelectItem>
                <SelectItem value="Active">{t('saas.status.active')}</SelectItem>
                <SelectItem value="Inactive">{t('saas.status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">
              {filteredCoupons.length} {language === 'ar' ? 'كوبون' : 'coupons'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{language === 'ar' ? 'القيمة' : 'Value'}</TableHead>
                <TableHead>{language === 'ar' ? 'الاستخدام' : 'Usage'}</TableHead>
                <TableHead>{language === 'ar' ? 'الصلاحية' : 'Validity'}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => {
                const TypeIcon = getCouponTypeIcon(coupon.type);
                const usagePercent = coupon.usageLimit
                  ? Math.round((coupon.usageCount / coupon.usageLimit) * 100)
                  : null;
                const isExhausted = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
                return (
                  <TableRow key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono font-bold text-erp-navy dark:text-white">
                          {coupon.code}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(coupon.code)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{getCouponTypeLabel(coupon.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium text-erp-teal">
                        {coupon.type === 'percentage' ? `${coupon.value}%` :
                         coupon.type === 'fixed' ? `${coupon.value} SAR` :
                         `${coupon.value} ${language === 'ar' ? 'يوم' : 'days'}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="text-sm font-mono">
                          {coupon.usageCount}/{coupon.usageLimit || '∞'}
                        </span>
                        {usagePercent !== null && (
                          <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isExhausted ? 'bg-red-500' : 'bg-erp-teal'}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span className="font-mono">{coupon.validFrom}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="text-xs">{language === 'ar' ? 'إلى' : 'to'}</span>
                          <span className="font-mono">{coupon.validTo}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExhausted ? (
                        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 gap-1">
                          <Zap className="w-3 h-3" />
                          {language === 'ar' ? 'مستنفد' : 'Exhausted'}
                        </Badge>
                      ) : getStatusBadge(coupon.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(coupon)}>
                            <Edit className="w-4 h-4 me-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyCode(coupon.code)}>
                            <Copy className="w-4 h-4 me-2" />
                            {language === 'ar' ? 'نسخ الرمز' : 'Copy Code'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(coupon.id)}>
                            {coupon.status === 'Active' ? (
                              <>
                                <XCircle className="w-4 h-4 me-2" />
                                {language === 'ar' ? 'تعطيل' : 'Deactivate'}
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 me-2" />
                                {language === 'ar' ? 'تفعيل' : 'Activate'}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(coupon.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 me-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-erp-teal" />
              {language === 'ar' ? 'إنشاء كوبون جديد' : 'Create New Coupon'}
            </DialogTitle>
          </DialogHeader>
          <CouponForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} className="bg-erp-teal hover:bg-erp-teal/90">
              <Plus className="w-4 h-4 me-2" />
              {language === 'ar' ? 'إنشاء الكوبون' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg" dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-erp-teal" />
              {language === 'ar' ? 'تعديل الكوبون' : 'Edit Coupon'}
            </DialogTitle>
          </DialogHeader>
          <CouponForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button className="bg-erp-teal hover:bg-erp-teal/90">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
