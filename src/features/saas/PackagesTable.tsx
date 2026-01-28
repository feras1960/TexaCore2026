/**
 * Packages Table View - Enhanced with LedgerTable
 * عرض جدولي للباقات باستخدام LedgerTable المحسّن
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { plansService, type Plan } from '@/services/saas/plansService';
import { LedgerTable, type LedgerColumn, type LedgerFilters, type LedgerStats } from '@/components/shared/tables/LedgerTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Eye,
  Edit,
  Star,
  Building2,
  Sparkles,
  Check,
  X,
  Users,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SaaSDetailSheet } from '@/features/saas/components/SaaSDetailSheet';
import { supabase } from '@/lib/supabase';
import { getLocalizedField } from '@/lib/i18n-helpers';

// Product interface
interface Product {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
}

interface PlanWithProduct extends Plan {
  product?: Product;
}

export default function PackagesTable() {
  const { t, language } = useLanguage();
  const [plans, setPlans] = useState<PlanWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState<PlanWithProduct | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<LedgerFilters>({});

  // Load products from database
  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('saas_products')
        .select('id, code, name, name_ar')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setProducts([
        { id: 'all', code: 'all', name: 'All Companies', name_ar: 'كل الشركات' },
        ...(data || [])
      ]);
    } catch (err: any) {
      console.error('Error loading products:', err);
      toast.error(language === 'ar' ? 'فشل تحميل الشركات' : 'Failed to load companies');
      setProducts([
        { id: 'all', code: 'all', name: 'All Companies', name_ar: 'كل الشركات' }
      ]);
    }
  };

  // Load plans with product info
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          *,
          product:saas_products(id, code, name, name_ar)
        `)
        .order('display_order');

      if (error) throw error;
      
      setPlans(data || []);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      toast.error(language === 'ar' ? 'فشل تحميل الباقات' : 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    loadProducts();
    loadPlans();
  }, []);

  // Filtered plans based on product and filters
  const filteredPlans = useMemo(() => {
    let filtered = plans;

    // Filter by product
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(plan => plan.product?.id === selectedProduct);
    }

    // Filter by currency
    if (filters.currency) {
      filtered = filtered.filter(plan => plan.currency === filters.currency);
    }

    // Filter by status
    if (filters.status) {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(plan => plan.is_active === isActive);
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.name?.toLowerCase().includes(search) ||
        plan.name_ar?.toLowerCase().includes(search) ||
        plan.code?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [plans, selectedProduct, filters]);

  // Get unique currencies
  const currencies = useMemo(() => {
    const unique = [...new Set(plans.map(p => p.currency))];
    return unique.filter(Boolean);
  }, [plans]);

  // Statistics
  const stats: LedgerStats = useMemo(() => {
    const active = filteredPlans.filter(p => p.is_active).length;
    const inactive = filteredPlans.filter(p => !p.is_active).length;
    const popular = filteredPlans.filter(p => p.is_popular).length;
    const totalRevenue = filteredPlans.reduce((sum, p) => sum + (p.price_monthly || 0), 0);

    return {
      label1: {
        title: language === 'ar' ? 'إجمالي الباقات' : 'Total Plans',
        value: filteredPlans.length,
        color: 'blue' as const,
      },
      label2: {
        title: language === 'ar' ? 'باقات نشطة' : 'Active Plans',
        value: active,
        color: 'green' as const,
      },
      label3: {
        title: language === 'ar' ? 'باقات مميزة' : 'Popular Plans',
        value: popular,
        color: 'blue' as const,
      },
      label4: {
        title: language === 'ar' ? 'متوسط السعر الشهري' : 'Avg Monthly Price',
        value: filteredPlans.length > 0 
          ? `${Math.round(totalRevenue / filteredPlans.length).toLocaleString()}`
          : '0',
        color: 'green' as const,
      },
    };
  }, [filteredPlans, language]);

  // Columns configuration
  const columns: LedgerColumn<Plan>[] = [
    {
      key: 'name',
      title: language === 'ar' ? 'اسم الباقة' : 'Plan Name',
      width: '18%',
      type: 'text',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            row.code === 'starter' && 'bg-gray-100 dark:bg-gray-800',
            row.code === 'professional' && 'bg-blue-100 dark:bg-blue-900/30',
            row.code === 'enterprise' && 'bg-purple-100 dark:bg-purple-900/30'
          )}>
            <Package className={cn(
              'w-5 h-5',
              row.code === 'starter' && 'text-gray-600 dark:text-gray-400',
              row.code === 'professional' && 'text-blue-600 dark:text-blue-400',
              row.code === 'enterprise' && 'text-purple-600 dark:text-purple-400'
            )} />
          </div>
          <div>
            <div className="font-semibold text-base">
              {getLocalizedField(row, 'name', language, 'N/A')}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px]">
                {row.code?.toUpperCase()}
              </Badge>
              {row.is_popular && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                  <Star className="w-3 h-3 me-1 fill-current" />
                  {language === 'ar' ? 'مميز' : 'Popular'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      title: language === 'ar' ? 'الشركة الأم' : 'Parent Company',
      width: '15%',
      type: 'text',
      sortable: true,
      render: (value, row: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="font-medium">
            {language === 'ar' 
              ? (row.product?.name_ar || row.product?.name || '-')
              : (row.product?.name || '-')}
          </span>
        </div>
      ),
    },
    {
      key: 'description',
      title: language === 'ar' ? 'الوصف' : 'Description',
      width: '20%',
      type: 'text',
      render: (value, row) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {getLocalizedField(row, 'description', language, '')}
        </div>
      ),
    },
    {
      key: 'price_monthly',
      title: language === 'ar' ? 'السعر الشهري' : 'Monthly Price',
      width: '12%',
      type: 'currency',
      align: 'end',
      sortable: true,
      colorize: true,
      render: (value, row) => (
        <div className="text-end">
          <div className="font-bold text-lg text-erp-navy dark:text-white">
            {(value || 0).toLocaleString()} {row.currency}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            {(row.price_yearly || 0).toLocaleString()} {row.currency}/{language === 'ar' ? 'سنة' : 'year'}
          </div>
        </div>
      ),
    },
    {
      key: 'max_users',
      title: language === 'ar' ? 'المستخدمين' : 'Users',
      width: '8%',
      type: 'number',
      align: 'center',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">{value || 0}</span>
        </div>
      ),
    },
    {
      key: 'max_companies',
      title: language === 'ar' ? 'الشركات' : 'Companies',
      width: '8%',
      type: 'number',
      align: 'center',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-center gap-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">{value || 0}</span>
        </div>
      ),
    },
    {
      key: 'max_storage_gb',
      title: language === 'ar' ? 'التخزين' : 'Storage',
      width: '9%',
      type: 'number',
      align: 'center',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-center gap-2">
          <HardDrive className="w-4 h-4 text-gray-500" />
          <span className="font-semibold">{value || 0} GB</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      title: language === 'ar' ? 'الحالة' : 'Status',
      width: '10%',
      type: 'status',
      align: 'center',
      sortable: true,
      filterable: true,
      statusConfig: {
        true: { label: language === 'ar' ? 'نشط' : 'Active', color: 'green' },
        false: { label: language === 'ar' ? 'معطل' : 'Inactive', color: 'gray' },
      },
      render: (value) => (
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            value
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {value ? (
            <>
              <Check className="w-3 h-3 me-1" />
              {language === 'ar' ? 'نشط' : 'Active'}
            </>
          ) : (
            <>
              <X className="w-3 h-3 me-1" />
              {language === 'ar' ? 'معطل' : 'Inactive'}
            </>
          )}
        </Badge>
      ),
    },
  ];

  // Row actions
  const handleRowClick = (plan: PlanWithProduct) => {
    setSelectedPlan(plan);
    setIsDetailsOpen(true);
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    toast.info(`${language === 'ar' ? 'جاري التصدير إلى' : 'Exporting to'} ${format.toUpperCase()}...`);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: LedgerFilters) => {
    setFilters(newFilters);
  };

  // Sheet handlers - memoized to prevent re-renders
  const sheetHandlers = useMemo(() => ({
    onRefresh: loadPlans,
    onEdit: (plan: Plan) => {
      toast.info(language === 'ar' ? 'سيتم فتح dialog للتعديل قريباً' : 'Edit dialog coming soon');
    },
  }), [loadPlans, language]);

  return (
    <div className="space-y-6">
      {/* Header with Product Filter and Currency Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-erp-navy dark:text-white font-cairo">
              {language === 'ar' ? 'جدول الباقات' : 'Packages Table'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
              {language === 'ar' ? 'عرض وإدارة جميع الباقات' : 'View and manage all packages'}
            </p>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3">
            {/* Product Filter */}
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-500" />
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {getLocalizedField(product, 'name', language, product.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Filter */}
            {currencies.length > 1 && (
              <Select 
                value={filters.currency || 'all'} 
                onValueChange={(value) => handleFiltersChange({ ...filters, currency: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={language === 'ar' ? 'العملة' : 'Currency'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'كل العملات' : 'All Currencies'}
                  </SelectItem>
                  {currencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <LedgerTable
        data={filteredPlans}
        columns={columns}
        loading={loading}
        showStats={true}
        stats={stats}
        showFilters={true}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showQuickFilters={false}
        onRowClick={handleRowClick}
        onRefresh={loadPlans}
        onExport={handleExport}
        rowKey="id"
        emptyMessage={language === 'ar' ? 'لا توجد باقات' : 'No packages found'}
      />

      {/* Plan Details Sheet - SaaS Unified Version */}
      {selectedPlan && (
        <SaaSDetailSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedPlan(null);
          }}
          docType="plan"
          data={selectedPlan}
          onRefresh={loadPlans}
          onEdit={() => {
            toast.info(language === 'ar' ? 'سيتم فتح نافذة التعديل قريباً' : 'Edit dialog coming soon');
          }}
        />
      )}
    </div>
  );
}
