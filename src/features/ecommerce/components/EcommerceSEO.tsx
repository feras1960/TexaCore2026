/**
 * EcommerceSEO — SEO والتسويق
 */
import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Mail, Globe, BarChart3, Target, Users, Eye, MousePointer, Share2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function EcommerceSEO() {
    const { direction } = useLanguage();
    const isRTL = direction === 'rtl';

    const seoScore = 78;
    const keywords = [
        { keyword: isRTL ? 'أقمشة فاخرة' : 'premium fabrics', position: 3, volume: 12400, change: 2 },
        { keyword: isRTL ? 'قماش قطن مصري' : 'egyptian cotton', position: 5, volume: 8500, change: -1 },
        { keyword: isRTL ? 'أقمشة حرير' : 'silk fabrics', position: 8, volume: 6200, change: 3 },
        { keyword: isRTL ? 'أقمشة أوكرانيا' : 'fabrics ukraine', position: 12, volume: 3100, change: 5 },
    ];

    const campaigns = [
        { name: isRTL ? 'حملة الشتاء' : 'Winter Campaign', type: 'email', status: 'active', sent: 5420, opened: 2180, clicked: 890, revenue: 45600 },
        { name: isRTL ? 'إعلانات فيسبوك' : 'Facebook Ads', type: 'social', status: 'active', impressions: 125000, clicks: 3400, conversions: 156, revenue: 78900 },
        { name: 'Google Shopping', type: 'ppc', status: 'paused', impressions: 89000, clicks: 2100, conversions: 98, revenue: 34500 },
    ];

    return (
        <div className="space-y-6">
            {/* SEO Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5 text-center">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0ea5a0" strokeWidth="3" strokeDasharray={`${seoScore}, 100`} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{seoScore}%</span>
                        </div>
                        <p className="font-medium text-sm">{isRTL ? 'مؤشر SEO' : 'SEO Score'}</p>
                        <Badge className="bg-green-100 text-green-700 mt-1 text-[10px]">{isRTL ? 'جيد' : 'Good'}</Badge>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{isRTL ? 'الزوار (هذا الشهر)' : 'Visitors (this month)'}</p>
                            <p className="text-2xl font-bold font-mono">45,200</p>
                            <p className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> +12.5%</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{isRTL ? 'معدل التحويل' : 'Conversion Rate'}</p>
                            <p className="text-2xl font-bold font-mono">4.18%</p>
                            <p className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> +0.5%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Keywords */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Search className="w-5 h-5 text-erp-teal" /> {isRTL ? 'الكلمات المفتاحية' : 'Keywords'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                                    <th className="text-start px-4 py-2.5 text-xs font-medium text-gray-500">{isRTL ? 'الكلمة' : 'Keyword'}</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">{isRTL ? 'الترتيب' : 'Position'}</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">{isRTL ? 'حجم البحث' : 'Volume'}</th>
                                    <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500">{isRTL ? 'التغيير' : 'Change'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keywords.map((kw, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                                        <td className="px-4 py-3 text-center"><Badge variant="outline">#{kw.position}</Badge></td>
                                        <td className="px-4 py-3 text-center font-mono text-xs">{kw.volume.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs flex items-center justify-center gap-0.5 ${kw.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {kw.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {Math.abs(kw.change)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Marketing Campaigns */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> {isRTL ? 'الحملات التسويقية' : 'Marketing Campaigns'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {campaigns.map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : c.type === 'social' ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                        }`}>
                                        {c.type === 'email' ? <Mail className="w-5 h-5 text-blue-600" /> : c.type === 'social' ? <Share2 className="w-5 h-5 text-pink-600" /> : <Globe className="w-5 h-5 text-green-600" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {c.type === 'email' ? `${c.sent} ${isRTL ? 'رسالة' : 'sent'}` : `${(c as any).impressions?.toLocaleString()} ${isRTL ? 'ظهور' : 'impressions'}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-end">
                                        <p className="font-bold font-mono text-sm text-erp-teal">{c.revenue?.toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500">{isRTL ? 'الإيرادات' : 'Revenue'}</p>
                                    </div>
                                    <Badge className={c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                                        {c.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'متوقف' : 'Paused')}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
