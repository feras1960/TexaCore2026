/**
 * Marketing Management Page
 * صفحة إدارة التسويق - تجمع الكوبونات والإحالات
 */

import React, { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Gift,
  Share2,
  Users,
  TrendingUp,
  DollarSign,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Copy,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import Coupon Management
import CouponManagement from './components/CouponManagement';

// Mock referral data
const mockReferrals = [
  { id: 1, referrerName: 'أحمد محمد', referrerEmail: 'ahmed@example.com', referredCount: 5, earnedAmount: 2500, status: 'active', joinDate: '2024-01-15' },
  { id: 2, referrerName: 'سارة علي', referrerEmail: 'sara@example.com', referredCount: 3, earnedAmount: 1500, status: 'active', joinDate: '2024-02-01' },
  { id: 3, referrerName: 'محمد خالد', referrerEmail: 'mohammed@example.com', referredCount: 8, earnedAmount: 4000, status: 'active', joinDate: '2023-12-20' },
  { id: 4, referrerName: 'فاطمة حسن', referrerEmail: 'fatima@example.com', referredCount: 2, earnedAmount: 1000, status: 'pending', joinDate: '2024-01-28' },
];

export default function Marketing() {
  const { t, language, direction } = useLanguage();
  const [activeTab, setActiveTab] = useState('coupons');
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const stats = {
    totalReferrers: mockReferrals.length,
    totalReferred: mockReferrals.reduce((sum, r) => sum + r.referredCount, 0),
    totalEarnings: mockReferrals.reduce((sum, r) => sum + r.earnedAmount, 0),
    conversionRate: 68,
  };

  const filteredReferrals = mockReferrals.filter(r =>
    r.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referrerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo flex items-center gap-3">
            <Gift className="w-7 h-7 text-erp-teal" />
            {language === 'ar' ? 'التسويق والعروض' : 'Marketing & Promotions'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-tajawal mt-1">
            {language === 'ar' ? 'إدارة الكوبونات وبرنامج الإحالة' : 'Manage coupons and referral program'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={direction}>
        <TabsList className="w-full justify-start bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
          <TabsTrigger value="coupons" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Gift className="w-4 h-4" />
            {language === 'ar' ? 'الكوبونات' : 'Coupons'}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2 data-[state=active]:bg-erp-navy data-[state=active]:text-white">
            <Share2 className="w-4 h-4" />
            {language === 'ar' ? 'الإحالات' : 'Referrals'}
          </TabsTrigger>
        </TabsList>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <CouponManagement />
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          {/* Referral Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{language === 'ar' ? 'المُحيلون' : 'Referrers'}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono">{stats.totalReferrers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400">{language === 'ar' ? 'المُحالون' : 'Referred'}</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300 font-mono">{stats.totalReferred}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400">{language === 'ar' ? 'الأرباح' : 'Earnings'}</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300 font-mono">{stats.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{language === 'ar' ? 'معدل التحويل' : 'Conversion'}</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300 font-mono">{stats.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                  <Input
                    placeholder={language === 'ar' ? 'بحث في المُحيلين...' : 'Search referrers...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 me-2" />
                    {t('common.refresh')}
                  </Button>
                  <Button size="sm" className="bg-erp-teal hover:bg-erp-teal/90">
                    <Plus className="w-4 h-4 me-2" />
                    {language === 'ar' ? 'إضافة مُحيل' : 'Add Referrer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referrals Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'المُحيل' : 'Referrer'}</TableHead>
                    <TableHead>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المُحالون' : 'Referred'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأرباح' : 'Earnings'}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{language === 'ar' ? 'تاريخ الانضمام' : 'Join Date'}</TableHead>
                    <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">{referral.referrerName}</TableCell>
                      <TableCell className="text-gray-500 font-mono text-sm">{referral.referrerEmail}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {referral.referredCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-erp-teal">
                        {referral.earnedAmount.toLocaleString()} SAR
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={referral.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                          }
                        >
                          {referral.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3 h-3 me-1" />
                              {t('saas.status.active')}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 me-1" />
                              {language === 'ar' ? 'معلق' : 'Pending'}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-500">{referral.joinDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 me-2" />
                              {t('common.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 me-2" />
                              {language === 'ar' ? 'نسخ رابط الإحالة' : 'Copy Referral Link'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
