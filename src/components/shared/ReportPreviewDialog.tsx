import React, { useRef, useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Printer,
  Download,
  X,
  FileText,
  Calendar,
  Building2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface ReportData {
  title: string;
  subtitle?: string;
  date?: string;
  period?: string;
  company?: string;
  branch?: string;
  type: 'table' | 'summary' | 'chart' | 'custom';
  headers?: string[];
  rows?: (string | number)[][];
  summaryItems?: {
    label: string;
    value: string | number;
    type?: 'positive' | 'negative' | 'neutral';
  }[];
  totals?: {
    label: string;
    value: string | number;
    highlight?: boolean;
  }[];
  customContent?: React.ReactNode;
  footer?: string;
}

interface DetailTab {
  id: string;
  title: string;
  data: Record<string, string | number>;
}

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  reportData,
}: ReportPreviewDialogProps) {
  const { language, direction } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('main');
  const [detailTabs, setDetailTabs] = useState<DetailTab[]>([]);

  const handleRowClick = (rowIndex: number) => {
    if (!reportData.rows || !reportData.headers) return;
    
    const row = reportData.rows[rowIndex];
    const data: Record<string, string | number> = {};
    reportData.headers.forEach((header, idx) => {
      data[header] = row[idx];
    });
    
    const tabId = `detail-${rowIndex}`;
    const existingTab = detailTabs.find(t => t.id === tabId);
    
    if (existingTab) {
      setActiveTab(tabId);
    } else {
      const newTab: DetailTab = {
        id: tabId,
        title: String(row[0] || row[1] || `#${rowIndex + 1}`).substring(0, 15),
        data,
      };
      setDetailTabs(prev => [...prev, newTab]);
      setActiveTab(tabId);
    }
  };

  const closeDetailTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab('main');
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printStyles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Cairo', 'Tajawal', sans-serif;
          direction: ${direction};
          padding: 20px;
          background: white;
          color: #0A2540;
        }
        
        .report-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #0A2540;
        }
        
        .report-title {
          font-size: 24px;
          font-weight: 700;
          color: #0A2540;
          margin-bottom: 8px;
        }
        
        .report-subtitle {
          font-size: 14px;
          color: #6b7280;
        }
        
        .report-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 12px;
          color: #6b7280;
        }
        
        .report-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th, td {
          border: 1px solid #e5e7eb;
          padding: 10px 12px;
          text-align: ${direction === 'rtl' ? 'right' : 'left'};
          font-size: 12px;
        }
        
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        
        tr:nth-child(even) {
          background: #fafafa;
        }
        
        .totals-row {
          background: #0A2540 !important;
          color: white;
          font-weight: 700;
        }
        
        .totals-row td {
          border-color: #0A2540;
        }
        
        .summary-section {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .summary-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        
        .summary-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #0A2540;
        }
        
        .summary-value.positive { color: #059669; }
        .summary-value.negative { color: #dc2626; }
        
        .report-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
          text-align: center;
        }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${direction}" lang="${language}">
        <head>
          <title>${reportData.title}</title>
          ${printStyles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportExcel = () => {
    if (!reportData.headers || !reportData.rows) return;

    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += reportData.headers.join(',') + '\n';
    reportData.rows.forEach((row) => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportData.title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = () => {
    const now = new Date();
    if (language === 'ar') {
      return now.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setDetailTabs([]);
        setActiveTab('main');
      }
      onOpenChange(isOpen);
    }}>
      <SheetContent 
        side={direction === 'rtl' ? 'left' : 'right'} 
        className="w-full sm:w-[50vw] sm:max-w-[50vw] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-erp-navy/10 rounded-md">
                <FileText className="w-4 h-4 text-erp-navy dark:text-erp-teal" />
              </div>
              <SheetTitle className="text-sm font-bold text-erp-navy dark:text-white font-cairo">
                {reportData.title}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-7 px-2 gap-1 text-[10px] text-gray-600 border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'Excel' : 'Excel'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-7 px-2 gap-1 text-[10px] text-erp-teal border-erp-teal/30 hover:bg-erp-teal/10"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'طباعة' : 'Print'}</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-2 shrink-0">
            <TabsList className="h-9 bg-transparent gap-1 p-0">
              <TabsTrigger 
                value="main" 
                className="h-8 px-3 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-erp-teal"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                {language === 'ar' ? 'التقرير' : 'Report'}
              </TabsTrigger>
              {detailTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  className="h-8 px-2 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-erp-teal group"
                >
                  <span className="max-w-[80px] truncate">{tab.title}</span>
                  <button
                    onClick={(e) => closeDetailTab(tab.id, e)}
                    className="ml-1.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-50 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Main Report Tab */}
          <TabsContent value="main" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full bg-gray-50 dark:bg-gray-900/50">
              <div className="p-4">
                <div
                  ref={printRef}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
                >
                  {/* Report Header for Print */}
                  <div className="report-header text-center mb-4 pb-3 border-b-2 border-erp-navy">
                    <h1 className="report-title text-lg font-bold text-erp-navy dark:text-white font-cairo">
                      {reportData.title}
                    </h1>
                    {reportData.subtitle && (
                      <p className="report-subtitle text-xs text-gray-500 mt-1">
                        {reportData.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Report Meta */}
                  <div className="report-meta flex flex-wrap items-center gap-2 mb-4 text-[10px] text-gray-500">
                    <div className="report-meta-item flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{reportData.date || formatDate()}</span>
                    </div>
                    {reportData.period && (
                      <Badge variant="outline" className="text-[9px] h-5">
                        {reportData.period}
                      </Badge>
                    )}
                    {reportData.company && (
                      <div className="report-meta-item flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{reportData.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary Section */}
                  {reportData.summaryItems && reportData.summaryItems.length > 0 && (
                    <div className="summary-section grid grid-cols-2 gap-2 mb-4">
                      {reportData.summaryItems.map((item, index) => (
                        <div
                          key={index}
                          className="summary-item bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md p-2 text-center"
                        >
                          <div className="summary-label text-[9px] text-gray-500 mb-0.5">
                            {item.label}
                          </div>
                          <div
                            className={`summary-value text-sm font-bold font-mono ${
                              item.type === 'positive'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.type === 'negative'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-erp-navy dark:text-white'
                            }`}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Table Content */}
                  {reportData.type === 'table' &&
                    reportData.headers &&
                    reportData.rows && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              {reportData.headers.map((header, index) => (
                                <th
                                  key={index}
                                  className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-start"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.rows.map((row, rowIndex) => (
                              <tr
                                key={rowIndex}
                                onClick={() => handleRowClick(rowIndex)}
                                className="hover:bg-erp-teal/5 dark:hover:bg-erp-teal/10 cursor-pointer transition-colors"
                              >
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-[10px] text-gray-600 dark:text-gray-400"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          {reportData.totals && (
                            <tfoot>
                              {reportData.totals.map((total, index) => (
                                <tr
                                  key={index}
                                  className={
                                    total.highlight
                                      ? 'totals-row bg-erp-navy text-white'
                                      : 'bg-gray-100 dark:bg-gray-800'
                                  }
                                >
                                  <td
                                    colSpan={reportData.headers!.length - 1}
                                    className={`border px-2 py-1.5 text-[10px] font-semibold ${
                                      total.highlight
                                        ? 'border-erp-navy text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {total.label}
                                  </td>
                                  <td
                                    className={`border px-2 py-1.5 text-[10px] font-bold font-mono ${
                                      total.highlight
                                        ? 'border-erp-navy text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-erp-navy dark:text-white'
                                    }`}
                                  >
                                    {total.value}
                                  </td>
                                </tr>
                              ))}
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}

                  {/* Custom Content */}
                  {reportData.type === 'custom' && reportData.customContent && (
                    <div className="custom-content">{reportData.customContent}</div>
                  )}

                  {/* Hint */}
                  <div className="mt-4 text-center">
                    <p className="text-[9px] text-gray-400 flex items-center justify-center gap-1">
                      {direction === 'rtl' ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                      {language === 'ar' ? 'اضغط على أي صف لعرض التفاصيل' : 'Click any row to view details'}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="report-footer mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-[9px] text-gray-400">
                      {language === 'ar'
                        ? `تم إنشاء هذا التقرير بواسطة نظام ERP في ${formatDate()}`
                        : `Generated by ERP System on ${formatDate()}`}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Detail Tabs */}
          {detailTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full bg-gray-50 dark:bg-gray-900/50">
                <div className="p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                    <h2 className="text-base font-bold text-erp-navy dark:text-white font-cairo mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                      {language === 'ar' ? 'تفاصيل السجل' : 'Record Details'}
                    </h2>
                    <div className="space-y-2">
                      {Object.entries(tab.data).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 font-medium">{key}</span>
                          <span className="text-xs font-bold text-erp-navy dark:text-white font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('main')}
                        className="h-8 gap-1.5 text-xs flex-1"
                      >
                        {direction === 'rtl' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                        {language === 'ar' ? 'العودة للتقرير' : 'Back to Report'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="h-8 gap-1.5 text-xs text-erp-teal border-erp-teal/30 hover:bg-erp-teal/10"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'طباعة' : 'Print'}
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default ReportPreviewDialog;
