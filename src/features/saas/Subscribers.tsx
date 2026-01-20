/**
 * Subscribers Management Page
 * إدارة المشتركين (Tenants)
 * 
 * Updated to use UniversalDetailSheet system
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { tenantsService, type Tenant } from '@/services/saas/tenantsService';
import { NexaTable, Column } from '@/components/shared/tables/NexaTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  MoreHorizontal,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  Users,
  HardDrive,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UniversalDetailSheet } from '@/components/sheets';
import { CreateTenantDialog } from './components/CreateTenantDialog';
import { cn } from '@/lib/utils';

export default function Subscribers() {
  const { t, direction } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Load tenants
  const loadTenants = async () => {
    if (!isSuperAdmin) {
      setError(t('saas.tenants.error.noPermission'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await tenantsService.getAll();
      setTenants(data);
    } catch (err: any) {
      console.error('Error loading tenants:', err);
      setError(err.message || t('saas.tenants.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [isSuperAdmin]);

  // Filter tenants by search query
  const filteredTenants = tenants.filter(tenant => {
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.code.toLowerCase().includes(query) ||
      (tenant.email && tenant.email.toLowerCase().includes(query)) ||
      (tenant.phone && tenant.phone.includes(query))
    );
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      active: { 
        label: t('saas.status.active'), 
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle2
      },
      inactive: { 
        label: t('saas.status.inactive'), 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        icon: XCircle
      },
      suspended: { 
        label: t('saas.status.suspended'), 
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        icon: PauseCircle
      },
      expired: { 
        label: t('saas.status.expired'), 
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: AlertCircle
      },
    };
    const statusInfo = statusMap[status] || statusMap.inactive;
    const Icon = statusInfo.icon;
    return (
      <Badge className={cn('text-xs font-medium flex items-center gap-1', statusInfo.className)}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  // Table columns
  const columns: Column<Tenant>[] = [
    {
      key: 'code',
      title: t('common.code'),
      width: '120px',
      sortable: true,
      filterable: true,
      render: (value) => (
        <span className="font-mono text-sm font-semibold">{value}</span>
      ),
    },
    {
      key: 'name',
      title: t('common.name'),
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{value}</span>
          {row.email && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{row.email}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: t('common.status'),
      width: '120px',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'country',
      title: t('common.country'),
      width: '120px',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'default_language',
      title: t('common.language'),
      width: '100px',
      sortable: true,
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {value?.toUpperCase() || 'AR'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: t('common.date'),
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('common.actions'),
      width: '120px',
      align: 'center',
      render: (_value, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedTenant(row);
              setIsDetailsOpen(true);
            }}>
              <Eye className="w-4 h-4 mr-2" />
              {t('common.view')}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status === 'active' && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await tenantsService.suspend(row.id);
                  await loadTenants();
                } catch (err: any) {
                  setError(err.message);
                }
              }}>
                <PauseCircle className="w-4 h-4 mr-2" />
                {t('saas.tenants.suspend')}
              </DropdownMenuItem>
            )}
            {(row.status === 'suspended' || row.status === 'inactive') && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await tenantsService.activate(row.id);
                  await loadTenants();
                } catch (err: any) {
                  setError(err.message);
                }
              }}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('saas.tenants.activate')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Stats
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status === 'inactive').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
    expired: tenants.filter(t => t.status === 'expired').length,
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.tenants.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('saas.tenants.description')}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('saas.tenants.create')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.tenants.total')}
              </p>
              <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.status.active')}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.active}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.status.inactive')}
              </p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {stats.inactive}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.status.suspended')}
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.suspended}
              </p>
            </div>
            <PauseCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.status.expired')}
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {stats.expired}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <NexaTable
          data={filteredTenants}
          columns={columns}
          loading={loading}
          onRowClick={(row) => {
            setSelectedTenant(row);
            setIsDetailsOpen(true);
          }}
          rowKey="id"
          emptyMessage={t('common.noData')}
          stickyHeader={true}
        />
      </div>

      {/* Tenant Details Sheet - Using Universal Detail Sheet System */}
      <UniversalDetailSheet
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTenant(null);
        }}
        docType="tenant"
        data={selectedTenant}
        onRefresh={loadTenants}
        onEdit={() => {
          // Handle edit - can open edit dialog
          console.log('Edit tenant:', selectedTenant?.id);
        }}
      />

      {/* Create Tenant Dialog */}
      <CreateTenantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadTenants}
      />
    </div>
  );
}
