/**
 * White Label Management Page
 * إدارة نظام White Label
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { whiteLabelService, type WhiteLabelDomain, type WhiteLabelConfig } from '@/services/saas/whiteLabelService';
import { agentsService, type Agent } from '@/services/saas/agentsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Globe,
  Search,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Link,
  Palette,
  Settings,
  RefreshCw,
  ExternalLink,
  Shield,
  DollarSign,
  UserCog,
} from 'lucide-react';
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockWhiteLabelAgents = [
  {
    id: '1',
    agent_name: 'وكالة الأعمال الذهبية',
    agent_code: 'AGT-001',
    domain: 'gold-erp.com',
    brand_name: 'Gold ERP',
    status: 'active' as const,
    primary_color: '#D4AF37',
    logo_url: null,
    tenants_count: 15,
    commission_percent: 50,
    payment_status: 'paid' as const,
    expiry_date: '2026-12-31',
    created_at: '2025-06-01',
  },
  {
    id: '2',
    agent_name: 'مجموعة التقنية السحابية',
    agent_code: 'AGT-002',
    domain: 'cloud-business.sa',
    brand_name: 'Cloud Business',
    status: 'active' as const,
    primary_color: '#3B82F6',
    logo_url: null,
    tenants_count: 8,
    commission_percent: 45,
    payment_status: 'paid' as const,
    expiry_date: '2026-08-15',
    created_at: '2025-08-15',
  },
  {
    id: '3',
    agent_name: 'شركة الحلول المتكاملة',
    agent_code: 'AGT-003',
    domain: 'integrated-erp.net',
    brand_name: 'Integrated ERP',
    status: 'pending' as const,
    primary_color: '#10B981',
    logo_url: null,
    tenants_count: 0,
    commission_percent: 40,
    payment_status: 'pending' as const,
    expiry_date: null,
    created_at: '2026-01-10',
  },
  {
    id: '4',
    agent_name: 'مؤسسة البرمجيات المتقدمة',
    agent_code: 'AGT-004',
    domain: 'advanced-soft.com',
    brand_name: 'AdvancedSoft',
    status: 'suspended' as const,
    primary_color: '#EF4444',
    logo_url: null,
    tenants_count: 3,
    commission_percent: 35,
    payment_status: 'overdue' as const,
    expiry_date: '2025-12-01',
    created_at: '2025-03-20',
  },
];

export default function WhiteLabel() {
  const { t, language, direction } = useLanguage();
  const [whiteLabelAgents, setWhiteLabelAgents] = useState(mockWhiteLabelAgents);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<typeof mockWhiteLabelAgents[0] | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Calculate stats
  const stats = {
    total: whiteLabelAgents.length,
    active: whiteLabelAgents.filter(a => a.status === 'active').length,
    pending: whiteLabelAgents.filter(a => a.status === 'pending').length,
    suspended: whiteLabelAgents.filter(a => a.status === 'suspended').length,
    totalTenants: whiteLabelAgents.reduce((sum, a) => sum + a.tenants_count, 0),
  };

  // Filter agents
  const filteredAgents = whiteLabelAgents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.agent_name.toLowerCase().includes(query) ||
      agent.domain.toLowerCase().includes(query) ||
      agent.brand_name.toLowerCase().includes(query)
    );
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      active: {
        label: t('saas.status.active'),
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2,
      },
      pending: {
        label: t('saas.status.pending'),
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
      },
      suspended: {
        label: t('saas.status.suspended'),
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
      },
      expired: {
        label: t('saas.status.expired'),
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: AlertCircle,
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={cn('text-xs font-medium flex items-center gap-1', config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      paid: {
        label: language === 'ar' ? 'مدفوع' : 'Paid',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
      pending: {
        label: language === 'ar' ? 'معلق' : 'Pending',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      overdue: {
        label: language === 'ar' ? 'متأخر' : 'Overdue',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={cn('text-xs font-medium', config.className)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.whiteLabel.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {language === 'ar' 
              ? 'إدارة الوكلاء الذين لديهم نظام White Label' 
              : 'Manage agents with White Label system'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.refresh')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تفعيل White Label' : 'Activate White Label'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {language === 'ar' ? 'إجمالي White Label' : 'Total White Label'}
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {stats.total}
                </p>
              </div>
              <Globe className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('saas.status.active')}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('saas.status.pending')}
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.pending}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('saas.status.suspended')}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {stats.suspended}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {language === 'ar' ? 'إجمالي العملاء' : 'Total Tenants'}
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {stats.totalTenants}
                </p>
              </div>
              <UserCog className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* White Label Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'الوكيل' : 'Agent'}</TableHead>
                <TableHead>{language === 'ar' ? 'الدومين' : 'Domain'}</TableHead>
                <TableHead>{language === 'ar' ? 'العلامة التجارية' : 'Brand'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'العملاء' : 'Tenants'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'العمولة' : 'Commission'}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{language === 'ar' ? 'الدفع' : 'Payment'}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => {
                    setSelectedAgent(agent);
                    setIsDetailsOpen(true);
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: agent.primary_color }}
                      >
                        {agent.brand_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{agent.agent_name}</p>
                        <p className="text-xs text-gray-500">{agent.agent_code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`https://${agent.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {agent.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: agent.primary_color }}
                      />
                      {agent.brand_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {agent.tenants_count}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{agent.commission_percent}%</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(agent.status)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(agent.payment_status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgent(agent);
                          setIsDetailsOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          {t('common.details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Palette className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'تعديل العلامة التجارية' : 'Edit Branding'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Settings className="w-4 h-4 mr-2" />
                          {language === 'ar' ? 'إعدادات الدومين' : 'Domain Settings'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {agent.status === 'active' && (
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            {t('saas.suspend')}
                          </DropdownMenuItem>
                        )}
                        {agent.status === 'suspended' && (
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-green-600">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t('saas.activate')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Sheet */}
      {selectedAgent && (
        <UnifiedSheet
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedAgent(null);
          }}
          size="lg"
          icon={Globe}
          title={selectedAgent.brand_name}
          subtitle={selectedAgent.domain}
        >
          <div className="space-y-6 py-4">
            {/* Brand Preview */}
            <div 
              className="p-6 rounded-lg text-white text-center"
              style={{ backgroundColor: selectedAgent.primary_color }}
            >
              <h2 className="text-2xl font-bold">{selectedAgent.brand_name}</h2>
              <p className="text-sm opacity-80 mt-1">{selectedAgent.domain}</p>
            </div>

            {/* Agent Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{language === 'ar' ? 'الوكيل' : 'Agent'}</p>
                <p className="font-semibold">{selectedAgent.agent_name}</p>
                <p className="text-xs text-gray-400">{selectedAgent.agent_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('common.status')}</p>
                <div className="mt-1">{getStatusBadge(selectedAgent.status)}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">{language === 'ar' ? 'الإحصائيات' : 'Statistics'}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <UserCog className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{selectedAgent.tenants_count}</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'عميل' : 'Tenants'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <DollarSign className="w-6 h-6 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{selectedAgent.commission_percent}%</p>
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'عمولة' : 'Commission'}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Shield className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                  <p className="text-sm font-bold">{getPaymentStatusBadge(selectedAgent.payment_status)}</p>
                  <p className="text-xs text-gray-500 mt-1">{language === 'ar' ? 'حالة الدفع' : 'Payment'}</p>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">{language === 'ar' ? 'العلامة التجارية' : 'Branding'}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: selectedAgent.primary_color }}
                    />
                    <span className="font-mono text-sm">{selectedAgent.primary_color}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                  <span className="font-medium">
                    {selectedAgent.expiry_date 
                      ? new Date(selectedAgent.expiry_date).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'تاريخ التفعيل' : 'Activation Date'}</span>
                  <span className="font-medium">
                    {new Date(selectedAgent.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </UnifiedSheet>
      )}
    </div>
  );
}
