/**
 * Module Management Component
 * إدارة وحدات نظام SaaS
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter,
  Package,
  RefreshCw,
  Plus,
  Settings,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UniversalDetailSheet } from '@/components/sheets';
import ModuleDetailsContent from './ModuleDetailsContent';

// Types
export interface Module {
  id: number;
  name: string;
  nameAr: string;
  packages: string[];
  status: boolean;
  version: string;
  price: string;
  description?: string;
  lastUpdate?: string;
  developer?: string;
}

// Default modules data
const defaultModules: Module[] = [
  { id: 1, name: 'Accounting', nameAr: 'المحاسبة', packages: ['Starter', 'Professional', 'Enterprise'], status: true, version: '2.1.0', price: '0' },
  { id: 2, name: 'Inventory', nameAr: 'المستودعات', packages: ['Professional', 'Enterprise'], status: true, version: '1.5.2', price: '0' },
  { id: 3, name: 'Sales', nameAr: 'المبيعات', packages: ['Starter', 'Professional', 'Enterprise'], status: true, version: '2.0.1', price: '0' },
  { id: 4, name: 'Purchases', nameAr: 'المشتريات', packages: ['Professional', 'Enterprise'], status: true, version: '1.8.0', price: '0' },
  { id: 5, name: 'HR & Payroll', nameAr: 'الموارد البشرية', packages: ['Enterprise'], status: false, version: '1.0.0', price: '150' },
  { id: 6, name: 'CRM', nameAr: 'إدارة الزبائن', packages: ['Professional', 'Enterprise'], status: true, version: '1.2.0', price: '100' },
  { id: 7, name: 'AI Analytics', nameAr: 'تحليلات الذكاء الاصطناعي', packages: ['Enterprise'], status: true, version: '0.9.5', price: '200' },
  { id: 8, name: 'SaaS Control', nameAr: 'إدارة الاشتراكات', packages: ['Enterprise'], status: true, version: '1.1.0', price: '0' },
  { id: 9, name: 'POS', nameAr: 'نقاط البيع', packages: ['Professional', 'Enterprise'], status: true, version: '1.3.0', price: '50' },
  { id: 10, name: 'Manufacturing', nameAr: 'التصنيع', packages: ['Enterprise'], status: false, version: '0.8.0', price: '300' },
];

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export default function ModuleManagement() {
  const { t, language, direction } = useLanguage();
  
  const [modules, setModules] = useState<Module[]>(defaultModules);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...modules];

    // Apply Filters
    Object.keys(filters).forEach((key) => {
      const value = filters[key].toLowerCase();
      if (value && value !== 'all') {
        data = data.filter((item) => {
          const itemValue = key === 'name' && language === 'ar' ? item.nameAr : (item as any)[key];
          return String(itemValue).toLowerCase().includes(value);
        });
      }
    });

    // Apply Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [filters, sortConfig, language, modules]);

  const handleViewDetails = (module: Module) => {
    setSelectedModule(module);
    setIsDetailsOpen(true);
  };

  const handleSaveModule = (updatedModule: Module) => {
    setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
    setSelectedModule(updatedModule);
  };

  const handleToggleStatus = (moduleId: number) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, status: !m.status } : m
    ));
  };

  // Stats
  const stats = {
    total: modules.length,
    active: modules.filter(m => m.status).length,
    paid: modules.filter(m => parseInt(m.price) > 0).length,
    free: modules.filter(m => parseInt(m.price) === 0).length,
  };

  const renderHeader = (label: string, key: string, options?: string[]) => (
    <div className="flex items-center gap-2">
      <span 
        className="cursor-pointer hover:text-erp-navy flex items-center gap-1"
        onClick={() => handleSort(key)}
      >
        {label}
        {sortConfig?.key === key ? (
          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-300" />
        )}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${filters[key] ? 'text-erp-teal' : 'text-gray-300'}`}>
            <Filter className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-gray-500 mb-1">{t('common.filterBy')} {label}</h4>
            {options ? (
              <Select 
                value={filters[key] || "all"} 
                onValueChange={(value) => handleFilter(key, value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                placeholder={`${t('common.search')} ${label}...`} 
                value={filters[key] || ''}
                onChange={(e) => handleFilter(key, e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Package className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'إدارة الوحدات' : 'Module Management'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal mt-1">
            {language === 'ar' ? 'إدارة وحدات وميزات نظام SaaS' : 'Manage SaaS system modules and features'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">{t('common.refresh')}</span>
          </Button>
          <Button size="sm" className="h-9 gap-2 bg-erp-teal hover:bg-erp-teal/90">
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إضافة وحدة' : 'Add Module'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{language === 'ar' ? 'إجمالي الوحدات' : 'Total Modules'}</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 font-mono">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">{language === 'ar' ? 'نشطة' : 'Active'}</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">{language === 'ar' ? 'مدفوعة' : 'Paid'}</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 font-mono">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{language === 'ar' ? 'مجانية' : 'Free'}</p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 font-mono">{stats.free}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead className="text-start">{renderHeader(language === 'ar' ? 'اسم الوحدة' : 'Module Name', 'name')}</TableHead>
                <TableHead className="text-start">{language === 'ar' ? 'الباقات' : 'Packages'}</TableHead>
                <TableHead className="text-start">{renderHeader(language === 'ar' ? 'الإصدار' : 'Version', 'version')}</TableHead>
                <TableHead className="text-start">{renderHeader(language === 'ar' ? 'السعر' : 'Price', 'price')}</TableHead>
                <TableHead className="text-start">{renderHeader(t('common.status._'), 'status', ['Active', 'Inactive'])}</TableHead>
                <TableHead className="text-start w-[80px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((module) => (
                  <TableRow 
                    key={module.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => handleViewDetails(module)}
                  >
                    <TableCell className="font-medium font-tajawal">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${module.status ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {language === 'ar' ? module.nameAr : module.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {module.packages.map(pkg => (
                          <Badge key={pkg} variant="outline" className="text-xs">
                            {pkg}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      v{module.version}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseInt(module.price) > 0 ? (
                        <span className="text-erp-teal font-medium">{module.price} SAR</span>
                      ) : (
                        <span className="text-gray-400">{language === 'ar' ? 'مجاني' : 'Free'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={module.status ? 'default' : 'secondary'} 
                        className={module.status ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {module.status ? t('saas.status.active') : t('saas.status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(module);
                          }}>
                            <Eye className="w-4 h-4 me-2" />
                            {t('common.viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(module);
                          }}>
                            <Edit className="w-4 h-4 me-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(module.id);
                          }}>
                            {module.status ? (
                              <>
                                <XCircle className="w-4 h-4 me-2" />
                                {language === 'ar' ? 'تعطيل' : 'Deactivate'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 me-2" />
                                {language === 'ar' ? 'تفعيل' : 'Activate'}
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Module Details Sheet */}
      <UniversalDetailSheet
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        docType="module"
        data={selectedModule}
      />
    </div>
  );
}
