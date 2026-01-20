/**
 * Module Details Content
 * محتوى تفاصيل الوحدة - يُستخدم داخل UnifiedSheet
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Package, 
  CheckCircle2, 
  XCircle,
  Edit,
  History,
  Code,
  Tag,
  Info,
  Save,
  X,
  Settings,
  Users,
  BarChart3,
  DollarSign
} from 'lucide-react';
import type { Module } from './ModuleManagement';

interface ModuleDetailsContentProps {
  module: Module;
  onSave?: (updatedModule: Module) => void;
}

export default function ModuleDetailsContent({ module: initialModule, onSave }: ModuleDetailsContentProps) {
  const { t, language, direction } = useLanguage();
  const [module, setModule] = useState<Module>({
    ...initialModule,
    description: initialModule.description || 'Standard ERP module with full functionality.',
    lastUpdate: initialModule.lastUpdate || '2024-01-15',
    developer: initialModule.developer || 'Namaa Systems',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: module.name,
    nameAr: module.nameAr,
    status: module.status ? 'Active' : 'Inactive',
    description: module.description || '',
    version: module.version,
    price: module.price,
  });

  // Mock Data for Packages using this module
  const linkedPackages = [
    { id: 1, name: 'Starter', status: module.packages.includes('Starter') },
    { id: 2, name: 'Professional', status: module.packages.includes('Professional') },
    { id: 3, name: 'Enterprise', status: module.packages.includes('Enterprise') },
  ];

  // Mock Data for Module History
  const moduleHistory = [
    { id: 1, date: '2024-01-15', version: '2.1.0', action: 'Update', user: 'System Admin', notes: 'Performance improvements' },
    { id: 2, date: '2023-10-01', version: '2.0.0', action: 'Feature', user: 'Dev Team', notes: 'Added new reports' },
    { id: 3, date: '2023-08-20', version: '1.0.0', action: 'Release', user: 'System', notes: 'Initial release' },
  ];

  // Mock stats
  const stats = {
    activeInstallations: 245,
    usageRate: 85,
    errorRate: 0.01,
    avgResponseTime: 120,
  };

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updatedModule: Module = { 
      ...module, 
      ...formData,
      status: formData.status === 'Active'
    };
    setModule(updatedModule);
    onSave?.(updatedModule);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setFormData({
      name: module.name,
      nameAr: module.nameAr,
      status: module.status ? 'Active' : 'Inactive',
      description: module.description || '',
      version: module.version,
      price: module.price,
    });
    setIsEditMode(false);
  };

  if (isEditMode) {
    return (
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 p-1" dir={direction}>
          {/* Edit Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Edit className="w-5 h-5 text-erp-teal" />
              <div>
                <h3 className="text-lg font-bold text-erp-navy dark:text-white font-cairo">
                  {language === 'ar' ? 'تعديل الوحدة' : 'Edit Module'}
                </h3>
                <p className="text-sm text-gray-500">{module.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 me-2" />
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-erp-teal hover:bg-erp-teal/90">
                <Save className="w-4 h-4 me-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-6">
            {/* Module Info */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-erp-navy dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-erp-teal" />
                  {language === 'ar' ? 'معلومات الوحدة' : 'Module Info'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                    <Input
                      value={formData.nameAr}
                      onChange={(e) => handleChange('nameAr', e.target.value)}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'ar' ? 'الإصدار' : 'Version'}</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => handleChange('version', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.status')}</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">{t('saas.status.active')}</SelectItem>
                        <SelectItem value="Inactive">{t('saas.status.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-erp-navy dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-erp-teal" />
                  {language === 'ar' ? 'التسعير' : 'Pricing'}
                </h4>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'السعر (ريال)' : 'Price (SAR)'}</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-erp-navy dark:text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-erp-teal" />
                  {language === 'ar' ? 'الوصف' : 'Description'}
                </h4>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  placeholder={language === 'ar' ? 'أدخل وصف الوحدة...' : 'Enter module description...'}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 p-1" dir={direction}>
        {/* Actions */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
            <Edit className="w-4 h-4 me-2" />
            {language === 'ar' ? 'تعديل' : 'Edit'}
          </Button>
        </div>

        {/* Header Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-erp-navy dark:text-white">
                  {language === 'ar' ? module.nameAr : module.name}
                </h3>
                <Badge variant={module.status ? 'default' : 'secondary'} 
                  className={module.status ? 'bg-green-500' : ''}>
                  {module.status ? t('saas.status.active') : t('saas.status.inactive')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Code className="w-4 h-4" />
                  <span>v{module.version}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Tag className="w-4 h-4" />
                  <span>{parseInt(module.price) > 0 ? `${module.price} SAR` : (language === 'ar' ? 'مجاني' : 'Free')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Info className="w-4 h-4" />
                  <span>{module.developer}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <History className="w-4 h-4" />
                  <span>{language === 'ar' ? 'آخر تحديث' : 'Updated'}: {module.lastUpdate}</span>
                </div>
              </div>
              <div className="pt-2 text-sm text-gray-500 dark:text-gray-400 border-t mt-2">
                {module.description}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 uppercase">
                {language === 'ar' ? 'إحصائيات الوحدة' : 'Module Stats'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'ar' ? 'التثبيتات النشطة' : 'Active Installations'}
                  </span>
                  <span className="font-bold text-erp-navy dark:text-white">{stats.activeInstallations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {language === 'ar' ? 'معدل الاستخدام' : 'Usage Rate'}
                  </span>
                  <span className="font-bold text-erp-navy dark:text-white">{stats.usageRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {language === 'ar' ? 'معدل الخطأ' : 'Error Rate'}
                  </span>
                  <span className="font-bold text-green-500">{stats.errorRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="packages" className="w-full" dir={direction}>
          <TabsList className="w-full justify-start bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-x-auto">
            <TabsTrigger value="packages" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
              <Package className="w-4 h-4" />
              {language === 'ar' ? 'الباقات' : 'Packages'}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
              <History className="w-4 h-4" />
              {language === 'ar' ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {linkedPackages.map((pkg) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${pkg.status ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <span className={`font-medium ${pkg.status ? 'text-erp-navy dark:text-white' : 'text-gray-500'}`}>
                      {pkg.name}
                    </span>
                  </div>
                  {pkg.status ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإصدار' : 'Version'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النشاط' : 'Activity'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                    <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleHistory.map((hist) => (
                    <TableRow key={hist.id}>
                      <TableCell className="font-mono text-xs">{hist.date}</TableCell>
                      <TableCell className="font-mono text-xs">{hist.version}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-gray-400" />
                          {hist.action}
                        </div>
                      </TableCell>
                      <TableCell>{hist.user}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{hist.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
