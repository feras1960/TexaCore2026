import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
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
  RefreshCw,
  Palette,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { ExchangeRatesService, ExchangeRate } from '@/services/data/ExchangeRatesService';
import { useToast } from '@/components/ui/use-toast';

// Reconciliation Colors
const RECONCILIATION_COLORS = [
  { id: 'none', color: 'transparent', bg: 'bg-transparent', label: 'بدون', labelEn: 'None' },
  { id: 'green', color: '#22c55e', bg: 'bg-green-100', label: 'أخضر', labelEn: 'Green' },
  { id: 'red', color: '#ef4444', bg: 'bg-red-100', label: 'أحمر', labelEn: 'Red' },
  { id: 'yellow', color: '#eab308', bg: 'bg-yellow-100', label: 'أصفر', labelEn: 'Yellow' },
  { id: 'blue', color: '#3b82f6', bg: 'bg-blue-100', label: 'أزرق', labelEn: 'Blue' },
];

export default function ExchangeRates() {
  const { t, language } = useLanguage();
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedReconciliationColor, setSelectedReconciliationColor] = useState<string>('green');
  const [markedRates, setMarkedRates] = useState<Record<string, string>>({});

  const { data: rates = [], isLoading: loading } = useCachedQuery({
    queryKey: ['accounting', 'exchange-rates', company?.id],
    queryFn: async () => {
      const data = await ExchangeRatesService.getRates(company!.id);
      return data;
    },
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000,       // 5 min
    gcTime: 24 * 60 * 60 * 1000,
  });

  const refreshRates = () => {
    queryClient.invalidateQueries({ queryKey: ['accounting', 'exchange-rates', company?.id] });
  };

  const filteredRates = rates.filter(rate =>
    rate.from_currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rate.to_currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle reconciliation mark
  const toggleReconciliationMark = (rateId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMarkedRates(prev => {
      const newMarked = { ...prev };
      if (newMarked[rateId] === selectedReconciliationColor) {
        delete newMarked[rateId];
      } else {
        newMarked[rateId] = selectedReconciliationColor;
      }
      return newMarked;
    });
  };

  // Get background class for marked rate
  const getReconciliationBg = (rateId: string) => {
    const colorId = markedRates[rateId];
    if (!colorId) return '';
    const color = RECONCILIATION_COLORS.find(c => c.id === colorId);
    return color?.bg || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-erp-navy font-cairo mb-1">{t('exchangeRates') || 'Exchange Rates'}</h2>
          <p className="text-gray-500 font-tajawal text-sm">{t('exchangeRatesDesc') || 'Manage currency exchange rates.'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={refreshRates} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {t('updateRates') || 'Refresh'}
          </Button>
          <Button className="bg-erp-navy hover:bg-erp-navy/90">
            <Plus className="w-4 h-4 mr-2" />
            {t('addCurrency') || 'Add Rate'}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-cairo">{t('exchangeRates') || 'Exchange Rates'}</CardTitle>
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
          <div className="overflow-x-auto overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
            <Table className="border-collapse">
              <TableHeader className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                <TableRow className="h-12 border-b-2 border-slate-300 dark:border-slate-600">
                  <TableHead className="w-[40px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">✓</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('pair') || 'Pair'}</TableHead>
                  <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('midRate') || 'Mid Rate'}</TableHead>
                  <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('buyRate') || 'Buy'}</TableHead>
                  <TableHead className="w-[100px] text-center border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('sellRate') || 'Sell'}</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('effectiveFrom') || 'Date'}</TableHead>
                  <TableHead className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('source') || 'Source'}</TableHead>
                  <TableHead className="w-[50px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-erp-teal" />
                    </TableCell>
                  </TableRow>
                ) : filteredRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500">
                      No exchange rates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRates.map((rate, index) => (
                    <TableRow
                      key={rate.id}
                      className={cn(
                        `h-12 hover:bg-blue-50/80 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/50'}`,
                        getReconciliationBg(rate.id)
                      )}
                    >
                      <TableCell className="text-center border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <Checkbox
                          checked={!!markedRates[rate.id]}
                          onCheckedChange={() => toggleReconciliationMark(rate.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "w-4 h-4",
                            markedRates[rate.id] && "border-2"
                          )}
                          style={{
                            borderColor: markedRates[rate.id]
                              ? RECONCILIATION_COLORS.find(c => c.id === markedRates[rate.id])?.color
                              : undefined,
                            backgroundColor: markedRates[rate.id]
                              ? RECONCILIATION_COLORS.find(c => c.id === markedRates[rate.id])?.color
                              : undefined,
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm font-bold border border-slate-200 dark:border-slate-700 px-4 py-2.5">
                        {rate.from_currency} <span className='text-gray-400'>→</span> {rate.to_currency}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-erp-navy border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        {rate.mid_rate?.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm text-green-600 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        {rate.buy_rate?.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm text-red-600 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        {rate.sell_rate?.toFixed(4)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        {new Date(rate.effective_from).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        {rate.source}
                      </TableCell>
                      <TableCell className="border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-erp-navy">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-sm">
                              <Edit className="mr-2 h-4 w-4" />
                              {t('edit') || 'Edit'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 text-sm">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
