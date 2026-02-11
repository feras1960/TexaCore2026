import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Palette
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCostCenterDialog } from './components/AddCostCenterDialog';
import { cn } from '@/lib/utils';

// Reconciliation Colors
const RECONCILIATION_COLORS = [
  { id: 'none', color: 'transparent', bg: 'bg-transparent', label: 'بدون', labelEn: 'None' },
  { id: 'green', color: '#22c55e', bg: 'bg-green-100', label: 'أخضر', labelEn: 'Green' },
  { id: 'red', color: '#ef4444', bg: 'bg-red-100', label: 'أحمر', labelEn: 'Red' },
  { id: 'yellow', color: '#eab308', bg: 'bg-yellow-100', label: 'أصفر', labelEn: 'Yellow' },
  { id: 'blue', color: '#3b82f6', bg: 'bg-blue-100', label: 'أزرق', labelEn: 'Blue' },
  { id: 'purple', color: '#a855f7', bg: 'bg-purple-100', label: 'بنفسجي', labelEn: 'Purple' },
  { id: 'orange', color: '#f97316', bg: 'bg-orange-100', label: 'برتقالي', labelEn: 'Orange' },
  { id: 'gray', color: '#6b7280', bg: 'bg-gray-200', label: 'رمادي', labelEn: 'Gray' },
  { id: 'pink', color: '#ec4899', bg: 'bg-pink-100', label: 'وردي', labelEn: 'Pink' },
  { id: 'cyan', color: '#06b6d4', bg: 'bg-cyan-100', label: 'سماوي', labelEn: 'Cyan' },
];

export default function CostCentersList() {
  const { t, language } = useLanguage();
  const { currencyCode: companyCurrency } = useCompanyCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);

  // Reconciliation
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState<string>('green');
  const [markedCostCenters, setMarkedCostCenters] = useState<Record<number, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Mock Data
  const [costCenters, setCostCenters] = useState([
    { id: 1, code: 'CC-001', name: 'Administration', parent: '-', budget: 500000, status: 'Active' },
    { id: 2, code: 'CC-002', name: 'Sales Department', parent: '-', budget: 300000, status: 'Active' },
    { id: 3, code: 'CC-003', name: 'Marketing', parent: '-', budget: 200000, status: 'Active' },
    { id: 4, code: 'CC-001-01', name: 'HR', parent: 'Administration', budget: 150000, status: 'Active' },
    { id: 5, code: 'CC-001-02', name: 'IT Support', parent: 'Administration', budget: 100000, status: 'Active' },
  ]);

  const filteredCostCenters = costCenters.filter(cc =>
    cc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cc.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (cc: any) => {
    setEditingCostCenter(cc);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this cost center?')) {
      setCostCenters(costCenters.filter(cc => cc.id !== id));
    }
  };

  // Toggle reconciliation mark
  const toggleReconciliationMark = (ccId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedCostCenters(prev => {
      const newMarked = { ...prev };
      if (newMarked[ccId] === selectedReconciliationColor) {
        delete newMarked[ccId];
      } else {
        newMarked[ccId] = selectedReconciliationColor;
      }
      return newMarked;
    });
  };

  // Get background class for marked cost center
  const getReconciliationBg = (ccId: number) => {
    const colorId = markedCostCenters[ccId];
    if (!colorId) return '';
    const color = RECONCILIATION_COLORS.find(c => c.id === colorId);
    return color?.bg || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-erp-navy font-cairo mb-1">{t('costCenters')}</h2>
          <p className="text-gray-500 font-tajawal text-sm">{t('costCenterDesc')}</p>
        </div>
        <Button className="bg-erp-navy hover:bg-erp-navy/90" onClick={() => {
          setEditingCostCenter(null);
          setIsAddDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('addCostCenter')}
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-cairo">{t('costCenters')}</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={t('search') || "Search..."}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Reconciliation Colors */}
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9 px-3">
                    <Palette className="w-4 h-4" />
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ backgroundColor: RECONCILIATION_COLORS.find(c => c.id === selectedReconciliationColor)?.color }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="flex gap-2">
                    {RECONCILIATION_COLORS.slice(1).map((color) => (
                      <button
                        key={color.id}
                        onClick={() => {
                          setSelectedReconciliationColor(color.id);
                          setShowColorPicker(false);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                          selectedReconciliationColor === color.id
                            ? "ring-2 ring-offset-2 ring-erp-navy scale-110"
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: color.color }}
                        title={language === 'ar' ? color.label : color.labelEn}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="border-collapse">
            <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
              <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
                <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">✓</TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('costCenterCode')}</TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('costCenterName')}</TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('parentCostCenter')}</TableHead>
                <TableHead className="w-[120px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('budget') || 'Budget'}</TableHead>
                <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('status') || 'Status'}</TableHead>
                <TableHead className="w-[50px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCostCenters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-slate-500">
                    No cost centers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCostCenters.map((cc, index) => (
                  <TableRow
                    key={cc.id}
                    className={cn(
                      `h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50'}`,
                      getReconciliationBg(cc.id)
                    )}
                  >
                    <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                      <Checkbox
                        checked={!!markedCostCenters[cc.id]}
                        onCheckedChange={() => toggleReconciliationMark(cc.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "w-4 h-4",
                          markedCostCenters[cc.id] && "border-2"
                        )}
                        style={{
                          borderColor: markedCostCenters[cc.id]
                            ? RECONCILIATION_COLORS.find(c => c.id === markedCostCenters[cc.id])?.color
                            : undefined,
                          backgroundColor: markedCostCenters[cc.id]
                            ? RECONCILIATION_COLORS.find(c => c.id === markedCostCenters[cc.id])?.color
                            : undefined,
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm border border-slate-200 dark:border-slate-700 px-4 py-2.5">{cc.code}</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5">{cc.name}</TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5">{cc.parent}</TableCell>
                    <TableCell className="text-center font-mono text-sm font-semibold text-emerald-600 border border-slate-200 dark:border-slate-700 px-3 py-2.5">{cc.budget.toLocaleString()}</TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                      <span className={`text-sm font-medium ${cc.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {cc.status === 'Active' ? '✓ نشط' : '○ غير نشط'}
                      </span>
                    </TableCell>
                    <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-erp-navy">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-sm" onClick={() => handleEdit(cc)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('edit') || 'Edit'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 text-sm" onClick={() => handleDelete(cc.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('delete') || 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* Footer Totals - Aligned to columns */}
          <div className="shrink-0 border-t-2 border-erp-navy bg-erp-navy text-white">
            <div className="grid grid-cols-[40px_1fr_1fr_1fr_120px_1fr_50px] gap-0 py-2">
              <div className="text-center border-l border-gray-600 px-2">
                <span className="font-mono font-bold text-sm">{Object.keys(markedCostCenters).length}</span>
              </div>
              <div className="border-l border-gray-600 px-3">
                <span className="text-[10px] text-gray-300">{language === 'ar' ? 'عدد:' : 'Count:'} </span>
                <span className="font-mono font-bold">{filteredCostCenters.length}</span>
              </div>
              <div className="border-l border-gray-600 px-2"></div>
              <div className="border-l border-gray-600 px-2"></div>
              <div className="text-center border-l border-gray-600 px-2">
                <span className="font-mono font-bold text-green-300">
                  {filteredCostCenters.reduce((sum, cc) => sum + cc.budget, 0).toLocaleString()}
                </span>
              </div>
              <div className="border-l border-gray-600 px-3">
                <span className="font-mono font-bold text-green-300">
                  {filteredCostCenters.filter(cc => cc.status === 'Active').length}
                </span>
                <span className="text-[10px] text-gray-400 mr-1"> نشط</span>
              </div>
              <div className="px-2">
                <span className="text-[10px] text-gray-400">{companyCurrency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddCostCenterDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        initialData={editingCostCenter}
      />
    </div>
  );
}
