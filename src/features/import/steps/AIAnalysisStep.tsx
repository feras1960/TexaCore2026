/**
 * AI Analysis Step - خطوة تحليل AI
 * تحليل ذكي للبيانات للكشف عن التكرارات والأخطاء والاقتراحات
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, 
  AlertTriangle, 
  Copy, 
  Users, 
  CheckCircle,
  ArrowRight,
  Loader2,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ImportJob, ImportRow, EntityDefinition, AISuggestions } from '@/services/importService';

interface AIAnalysisStepProps {
  importJob: ImportJob | null;
  importRows: ImportRow[];
  entityDefinition: EntityDefinition | null;
  onContinue: () => void;
  onApplySuggestions: (rowNumbers: number[]) => void;
  isLoading: boolean;
}

interface AIAnalysisResult {
  row_number: number;
  corrections: Array<{
    field: string;
    original: string;
    suggested: string;
    confidence: number;
    reason: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  potential_duplicates: Array<{
    existing_id: string;
    existing_name: string;
    similarity: number;
  }>;
}

export function AIAnalysisStep({
  importJob,
  importRows,
  entityDefinition,
  onContinue,
  onApplySuggestions,
  isLoading
}: AIAnalysisStepProps) {
  const { t, language } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AIAnalysisResult[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'corrections' | 'duplicates' | 'warnings'>('all');
  const [error, setError] = useState<string | null>(null);

  // Summary stats
  const totalCorrections = results.reduce((sum, r) => sum + r.corrections.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const totalDuplicates = results.reduce((sum, r) => sum + r.potential_duplicates.length, 0);
  const rowsWithIssues = results.length;

  // Filter results based on active tab
  const filteredResults = results.filter(r => {
    switch (activeTab) {
      case 'corrections':
        return r.corrections.length > 0;
      case 'duplicates':
        return r.potential_duplicates.length > 0;
      case 'warnings':
        return r.warnings.length > 0;
      default:
        return true;
    }
  });

  const startAnalysis = async () => {
    if (!importJob || !entityDefinition) return;

    setAnalyzing(true);
    setError(null);
    setProgress(0);

    try {
      // Prepare rows for analysis
      const rowsToAnalyze = importRows.map(row => ({
        row_number: row.row_number,
        data: row.mapped_data || row.raw_data
      }));

      // Call AI analyze edge function
      const { data, error: fnError } = await supabase.functions.invoke('import-ai-analyze', {
        body: {
          job_id: importJob.id,
          entity_type: importJob.entity_type,
          rows: rowsToAnalyze
        }
      });

      if (fnError) throw fnError;

      if (data?.suggestions) {
        setResults(data.suggestions);
        setAnalysisComplete(true);
      }
      
      setProgress(100);
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError(t('import.aiAnalysisError') || 'Failed to analyze data');
      
      // Perform basic local analysis as fallback
      performLocalAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  // Fallback local analysis when edge function is not available
  const performLocalAnalysis = () => {
    const analysisResults: AIAnalysisResult[] = [];

    for (const row of importRows) {
      const warnings: AIAnalysisResult['warnings'] = [];
      const data = row.mapped_data || row.raw_data;

      // Check for empty important fields
      if (entityDefinition?.entity_type === 'customers' || entityDefinition?.entity_type === 'suppliers') {
        const hasContact = data.phone || data.mobile || data.email;
        if (!hasContact) {
          warnings.push({
            type: 'incomplete',
            message: language === 'ar' 
              ? 'لا توجد معلومات اتصال (هاتف أو إيميل)'
              : 'No contact information (phone or email)',
            severity: 'low'
          });
        }
      }

      // Check for suspicious numeric values
      const price = Number(data.sale_price || data.price || 0);
      if (price < 0) {
        warnings.push({
          type: 'anomaly',
          message: language === 'ar' ? 'السعر سالب' : 'Price is negative',
          severity: 'high'
        });
      } else if (price === 0 && (data.sale_price !== undefined || data.price !== undefined)) {
        warnings.push({
          type: 'anomaly',
          message: language === 'ar' ? 'السعر صفر' : 'Price is zero',
          severity: 'medium'
        });
      }

      const qty = Number(data.quantity || data.opening_qty || 0);
      if (qty < 0) {
        warnings.push({
          type: 'anomaly',
          message: language === 'ar' ? 'الكمية سالبة' : 'Quantity is negative',
          severity: 'high'
        });
      }

      if (warnings.length > 0) {
        analysisResults.push({
          row_number: row.row_number,
          corrections: [],
          warnings,
          potential_duplicates: []
        });
      }
    }

    setResults(analysisResults);
    setAnalysisComplete(true);
    setProgress(100);
  };

  const toggleRowSelection = (rowNumber: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowNumber)) {
      newSelection.delete(rowNumber);
    } else {
      newSelection.add(rowNumber);
    }
    setSelectedRows(newSelection);
  };

  const selectAll = () => {
    const allRowNumbers = results.filter(r => r.corrections.length > 0).map(r => r.row_number);
    setSelectedRows(new Set(allRowNumbers));
  };

  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  const handleApplySuggestions = () => {
    if (selectedRows.size > 0) {
      onApplySuggestions(Array.from(selectedRows));
    }
    onContinue();
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (!importJob || !entityDefinition) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Sparkles className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              {t('import.aiAnalysis')}
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {t('common.optional')}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('import.aiAnalysisDescription')}
            </p>
          </div>

          {!analysisComplete && !analyzing && (
            <Button onClick={startAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {t('import.startAIAnalysis')}
            </Button>
          )}

          {analysisComplete && (
            <Button variant="outline" onClick={startAnalysis} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('import.reanalyze')}
            </Button>
          )}
        </div>
      </Card>

      {/* Analysis Progress */}
      {analyzing && (
        <Card className="p-6">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-purple-600 mb-4" />
            <h4 className="font-medium mb-2">{t('import.analyzingData')}</h4>
            <Progress value={progress} className="w-64 mx-auto mb-2 [&>div]:bg-purple-600" />
            <p className="text-sm text-muted-foreground">
              {t('import.pleaseWait')}
            </p>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisComplete && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="p-2 bg-purple-100 rounded-lg inline-block mb-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold">{rowsWithIssues}</div>
              <div className="text-xs text-muted-foreground">{t('import.rowsWithSuggestions')}</div>
            </Card>
            
            <Card className="p-4 text-center border-blue-200 bg-blue-50/50">
              <div className="p-2 bg-blue-100 rounded-lg inline-block mb-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{totalCorrections}</div>
              <div className="text-xs text-muted-foreground">{t('import.corrections')}</div>
            </Card>
            
            <Card className="p-4 text-center border-orange-200 bg-orange-50/50">
              <div className="p-2 bg-orange-100 rounded-lg inline-block mb-2">
                <Copy className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{totalDuplicates}</div>
              <div className="text-xs text-muted-foreground">{t('import.potentialDuplicates')}</div>
            </Card>
            
            <Card className="p-4 text-center border-yellow-200 bg-yellow-50/50">
              <div className="p-2 bg-yellow-100 rounded-lg inline-block mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">{totalWarnings}</div>
              <div className="text-xs text-muted-foreground">{t('import.warnings')}</div>
            </Card>
          </div>

          {/* Results Tabs */}
          {results.length > 0 ? (
            <Card>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <div className="border-b p-2 flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="all">
                      {t('import.all')} ({results.length})
                    </TabsTrigger>
                    <TabsTrigger value="corrections">
                      {t('import.corrections')} ({results.filter(r => r.corrections.length > 0).length})
                    </TabsTrigger>
                    <TabsTrigger value="duplicates">
                      {t('import.duplicates')} ({results.filter(r => r.potential_duplicates.length > 0).length})
                    </TabsTrigger>
                    <TabsTrigger value="warnings">
                      {t('import.warnings')} ({results.filter(r => r.warnings.length > 0).length})
                    </TabsTrigger>
                  </TabsList>

                  {totalCorrections > 0 && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAll}>
                        {t('common.selectAll')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAll}>
                        {t('common.deselectAll')}
                      </Button>
                    </div>
                  )}
                </div>

                <ScrollArea className="h-[400px]">
                  <TabsContent value={activeTab} className="m-0 p-4 space-y-4">
                    {filteredResults.map((result) => (
                      <Card key={result.row_number} className="p-4">
                        <div className="flex items-start gap-3">
                          {result.corrections.length > 0 && (
                            <Checkbox
                              checked={selectedRows.has(result.row_number)}
                              onCheckedChange={() => toggleRowSelection(result.row_number)}
                            />
                          )}
                          
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {t('import.row')} #{result.row_number}
                              </Badge>
                            </div>

                            {/* Corrections */}
                            {result.corrections.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-blue-600" />
                                  {t('import.suggestedCorrections')}
                                </h5>
                                {result.corrections.map((correction, idx) => (
                                  <div 
                                    key={idx}
                                    className="p-2 bg-blue-50 rounded-lg text-sm"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{correction.field}:</span>
                                      <span className="line-through text-muted-foreground">
                                        {correction.original}
                                      </span>
                                      <ArrowRight className="h-3 w-3" />
                                      <span className="text-blue-600 font-medium">
                                        {correction.suggested}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {correction.confidence}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {correction.reason}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Potential Duplicates */}
                            {result.potential_duplicates.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium flex items-center gap-2">
                                  <Users className="h-4 w-4 text-orange-600" />
                                  {t('import.potentialDuplicates')}
                                </h5>
                                {result.potential_duplicates.map((dup, idx) => (
                                  <div 
                                    key={idx}
                                    className="p-2 bg-orange-50 rounded-lg text-sm flex items-center justify-between"
                                  >
                                    <span>{dup.existing_name}</span>
                                    <Badge variant="outline" className="bg-orange-100">
                                      {dup.similarity}% {t('import.similar')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  {t('import.warnings')}
                                </h5>
                                {result.warnings.map((warning, idx) => (
                                  <div 
                                    key={idx}
                                    className={`p-2 rounded-lg text-sm border ${getSeverityColor(warning.severity)}`}
                                  >
                                    {warning.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}

                    {filteredResults.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>{t('import.noIssuesFound')}</p>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <h4 className="font-medium mb-2">{t('import.analysisComplete')}</h4>
              <p className="text-muted-foreground">
                {t('import.noIssuesFound')}
              </p>
            </Card>
          )}
        </>
      )}

      {/* Skip / Continue */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onContinue}>
          {t('import.skipAIAnalysis')}
        </Button>

        <Button 
          onClick={handleApplySuggestions}
          disabled={analyzing}
          className="gap-2"
        >
          {selectedRows.size > 0 ? (
            <>
              <CheckCircle className="h-4 w-4" />
              {t('import.applyAndContinue')} ({selectedRows.size})
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              {t('import.continueToPreview')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
