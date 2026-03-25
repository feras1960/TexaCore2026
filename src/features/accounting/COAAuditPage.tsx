/**
 * COA Audit Page - Enhanced
 * صفحة تدقيق الشجرة المحاسبية - محسّنة
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditResults {
    templates?: any[];
    companyStats?: any;
    accounts?: any[];
    codeLengths?: Record<string, { count: number; examples: string[] }>;
    cashAccounts?: any[];
    costCenters?: any[];
    subLedgers?: any[];
    customersCount?: number;
    suppliersCount?: number;
}

interface TemplatePreview {
    template_code: string;
    template_name_ar: string;
    chart_type: string;
    accounts: any[];
    stats: {
        total: number;
        groups: number;
        details: number;
    };
}

export function COAAuditPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AuditResults>({});
    const [previewModal, setPreviewModal] = useState(false);
    const [previewData, setPreviewData] = useState<TemplatePreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    const runAudit = async () => {
        setLoading(true);
        const auditResults: AuditResults = {};

        try {
            // ⚡ Level 1: Two independent queries in parallel
            const [templatesRes, companyRes] = await Promise.all([
                supabase.from('chart_templates').select('template_code, template_name_ar, template_name_en, chart_type, include_demo_data, is_active').order('chart_type'),
                supabase.from('companies').select('id, name_ar, chart_type, is_active').eq('is_active', true).limit(1).single(),
            ]);

            auditResults.templates = templatesRes.data || [];
            const company = companyRes.data;

            if (company) {
                auditResults.companyStats = company;

                // ⚡ Level 2: All company-dependent queries in parallel
                const [accountsRes, cashRes, ccRes, subLedgersRes, customersRes, suppliersRes] = await Promise.all([
                    supabase.from('chart_of_accounts').select('id, account_code, name_ar, is_group, account_type_code, current_balance').eq('company_id', company.id),
                    supabase.from('chart_of_accounts').select('account_code, name_ar, is_group, current_balance').eq('company_id', company.id).or('account_code.like.111%,account_code.like.112%').order('account_code'),
                    supabase.from('cost_centers').select('code, name_ar, name_en, is_active').eq('company_id', company.id).order('code'),
                    supabase.from('chart_of_accounts').select('account_code, name_ar, is_group').eq('company_id', company.id).or('account_code.like.115%,account_code.like.211%').order('account_code'),
                    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                ]);

                auditResults.accounts = accountsRes.data || [];
                auditResults.cashAccounts = cashRes.data || [];
                auditResults.costCenters = ccRes.data || [];
                auditResults.subLedgers = subLedgersRes.data || [];
                auditResults.customersCount = customersRes.count || 0;
                auditResults.suppliersCount = suppliersRes.count || 0;

                // Analyze code lengths (JS processing, no DB)
                const lengthGroups: Record<string, { count: number; examples: string[] }> = {};
                (auditResults.accounts).forEach(acc => {
                    const len = String(acc.account_code?.length || 0);
                    if (!lengthGroups[len]) lengthGroups[len] = { count: 0, examples: [] };
                    lengthGroups[len].count++;
                    if (lengthGroups[len].examples.length < 5) lengthGroups[len].examples.push(acc.account_code || '');
                });
                auditResults.codeLengths = lengthGroups;
            }

            setResults(auditResults);
        } catch (error) {
            console.error('Audit error:', error);
            alert('حدث خطأ في التدقيق');
        } finally {
            setLoading(false);
        }
    };

    const previewTemplate = async (chartType: string, templateName: string) => {
        setLoadingPreview(true);
        setPreviewModal(true);

        try {
            // Create a temporary company to preview the template
            // We'll query the function that creates the chart
            const { data, error } = await supabase.rpc('get_template_preview', {
                p_chart_type: chartType
            });

            if (error) {
                console.error('Preview error:', error);
                // Fallback: show a message
                setPreviewData({
                    template_code: chartType,
                    template_name_ar: templateName,
                    chart_type: chartType,
                    accounts: [],
                    stats: { total: 0, groups: 0, details: 0 }
                });
            } else {
                setPreviewData(data);
            }
        } catch (error) {
            console.error('Preview error:', error);
            setPreviewData({
                template_code: chartType,
                template_name_ar: templateName,
                chart_type: chartType,
                accounts: [],
                stats: { total: 0, groups: 0, details: 0 }
            });
        } finally {
            setLoadingPreview(false);
        }
    };

    useEffect(() => {
        runAudit();
    }, []);

    const getCodeSystemLabel = (length: string) => {
        switch (length) {
            case '3': return 'نظام قديم (3 أرقام)';
            case '4': return 'نظام قياسي (4 أرقام)';
            case '7': return 'نظام موسع (7 أرقام) ✅';
            default: return 'غير قياسي';
        }
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">تدقيق الشجرة المحاسبية</h1>
                <Button onClick={runAudit} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'جاري التدقيق...' : 'إعادة التدقيق'}
                </Button>
            </div>

            {/* Explanation Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <strong>ملاحظة:</strong> هذا التدقيق يعرض بيانات الشركة النشطة حالياً ({results.companyStats?.name_ar || '...'}).
                    لمعاينة القوالب المتاحة (simple, extended) قبل تطبيقها، اضغط على زر "معاينة" بجانب كل قالب.
                </AlertDescription>
            </Alert>

            {/* Templates */}
            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-3">1️⃣ قوالب الشجرات المحاسبية المتاحة</h2>
                <p className="text-sm text-gray-600 mb-4">
                    هذه القوالب متاحة على مستوى النظام ويمكن تطبيقها على أي شركة جديدة
                </p>
                {results.templates && results.templates.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-start p-2">الكود</th>
                                    <th className="text-start p-2">الاسم بالعربي</th>
                                    <th className="text-start p-2">النوع</th>
                                    <th className="text-start p-2">بيانات تجريبية</th>
                                    <th className="text-start p-2">نشط</th>
                                    <th className="text-start p-2">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.templates.map((t, i) => (
                                    <tr key={i} className="border-b hover:bg-gray-50">
                                        <td className="p-2 font-mono">{t.template_code}</td>
                                        <td className="p-2">{t.template_name_ar}</td>
                                        <td className="p-2">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                {t.chart_type}
                                            </span>
                                        </td>
                                        <td className="p-2">{t.include_demo_data ? 'نعم ✅' : 'لا'}</td>
                                        <td className="p-2">{t.is_active ? '✅' : '❌'}</td>
                                        <td className="p-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => previewTemplate(t.chart_type, t.template_name_ar)}
                                            >
                                                <Eye className="w-4 h-4 ml-1" />
                                                معاينة
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">لا توجد قوالب</p>
                )}
            </Card>

            {/* Company Stats */}
            {results.companyStats && (
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-3">2️⃣ إحصائيات الشجرة الحالية للشركة</h2>
                    <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            البيانات التالية خاصة بالشركة: <strong>{results.companyStats.name_ar}</strong>
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <p><strong>نوع الشجرة المطبّق:</strong> {results.companyStats.chart_type || 'غير محدد'}</p>
                        {results.accounts && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="text-sm text-gray-600">إجمالي الحسابات</div>
                                    <div className="text-2xl font-bold">{results.accounts.length}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="text-sm text-gray-600">المجموعات</div>
                                    <div className="text-2xl font-bold">{results.accounts.filter(a => a.is_group).length}</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded">
                                    <div className="text-sm text-gray-600">الحسابات التفصيلية</div>
                                    <div className="text-2xl font-bold">{results.accounts.filter(a => !a.is_group).length}</div>
                                </div>
                                <div className="bg-amber-50 p-3 rounded">
                                    <div className="text-sm text-gray-600">الأصول</div>
                                    <div className="text-2xl font-bold">{results.accounts.filter(a => a.account_type_code?.includes('ASSET')).length}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Code Lengths */}
            {results.codeLengths && (
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-3">3️⃣ تحليل أطوال أكواد الحسابات</h2>
                    <div className="space-y-2">
                        {Object.entries(results.codeLengths).map(([length, data]) => (
                            <div key={length} className="border-b pb-2">
                                <div className="font-semibold">
                                    {length} أرقام: {data.count} حساب - {getCodeSystemLabel(length)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    أمثلة: {data.examples.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Cash Accounts */}
            {results.cashAccounts && results.cashAccounts.length > 0 && (
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-3">4️⃣ الحسابات النقدية والبنكية</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-start p-2">الكود</th>
                                    <th className="text-start p-2">الاسم</th>
                                    <th className="text-start p-2">النوع</th>
                                    <th className="text-end p-2">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.cashAccounts.map((acc, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2 font-mono">{acc.account_code}</td>
                                        <td className="p-2">{acc.name_ar}</td>
                                        <td className="p-2">{acc.is_group ? 'مجموعة' : 'حساب'}</td>
                                        <td className="p-2 text-end font-mono">{Number(acc.current_balance || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Cost Centers */}
            <Card className="p-4">
                <h2 className="text-lg font-semibold mb-3">5️⃣ مراكز التكلفة</h2>
                {results.costCenters && results.costCenters.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-start p-2">الكود</th>
                                    <th className="text-start p-2">الاسم بالعربي</th>
                                    <th className="text-start p-2">الاسم بالإنجليزي</th>
                                    <th className="text-start p-2">نشط</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.costCenters.map((cc, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">{cc.code}</td>
                                        <td className="p-2">{cc.name_ar}</td>
                                        <td className="p-2">{cc.name_en}</td>
                                        <td className="p-2">{cc.is_active ? '✅' : '❌'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500">لا توجد مراكز تكلفة</p>
                )}
            </Card>

            {/* Sub-ledgers */}
            {results.subLedgers && results.subLedgers.length > 0 && (
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-3">6️⃣ حسابات العملاء والموردين</h2>
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-start p-2">الكود</th>
                                    <th className="text-start p-2">الاسم</th>
                                    <th className="text-start p-2">النوع</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.subLedgers.map((acc, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2 font-mono">{acc.account_code}</td>
                                        <td className="p-2">{acc.name_ar}</td>
                                        <td className="p-2">{acc.is_group ? 'مجموعة' : 'حساب'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded">
                            <div className="text-sm text-gray-600">عدد العملاء</div>
                            <div className="text-2xl font-bold">{results.customersCount || 0}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded">
                            <div className="text-sm text-gray-600">عدد الموردين</div>
                            <div className="text-2xl font-bold">{results.suppliersCount || 0}</div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Preview Modal */}
            <Dialog open={previewModal} onOpenChange={setPreviewModal}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            معاينة القالب: {previewData?.template_name_ar}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingPreview ? (
                        <div className="flex items-center justify-center p-8">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="mr-3">جاري التحميل...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>ملاحظة:</strong> هذه معاينة للقالب "{previewData?.template_name_ar}".
                                    لتطبيقه على شركة، استخدم دالة <code className="bg-gray-100 px-1 rounded">apply_chart_template_to_company()</code>
                                </AlertDescription>
                            </Alert>

                            {previewData && previewData.accounts.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <div className="text-sm text-gray-600">إجمالي الحسابات</div>
                                            <div className="text-2xl font-bold">{previewData.stats.total}</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded">
                                            <div className="text-sm text-gray-600">المجموعات</div>
                                            <div className="text-2xl font-bold">{previewData.stats.groups}</div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded">
                                            <div className="text-sm text-gray-600">الحسابات التفصيلية</div>
                                            <div className="text-2xl font-bold">{previewData.stats.details}</div>
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-start p-2 border-b">الكود</th>
                                                    <th className="text-start p-2 border-b">الاسم</th>
                                                    <th className="text-start p-2 border-b">النوع</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.accounts.map((acc, i) => (
                                                    <tr key={i} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 font-mono">{acc.account_code}</td>
                                                        <td className="p-2">{acc.name_ar}</td>
                                                        <td className="p-2">
                                                            {acc.is_group ? (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">مجموعة</span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">حساب</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        معاينة القالب غير متاحة حالياً. يمكنك تطبيق القالب مباشرة على شركة جديدة.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default COAAuditPage;
