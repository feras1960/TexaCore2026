/**
 * Subscribers Management Page
 * إدارة المشتركين (Tenants)
 * 
 * Updated to use LedgerTable for consistent UI
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { tenantsService, type Tenant } from '@/services/saas/tenantsService';
import { LedgerTable, type LedgerColumn } from '@/components/shared/tables/LedgerTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { UniversalDetailSheet } from '@/components/sheets';
import { CreateTenantDialog } from './components/CreateTenantDialog';

export default function Subscribers() {
  const { t, direction } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

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

  // Columns configuration
  const columns: LedgerColumn<Tenant>[] = [
    {
      key: 'code',
      title: 'saas.tenants.code',
      type: 'text',
      width: '120px',
      sortable: true,
      filterable: true,
    },
    {
      key: 'name',
      title: 'saas.tenants.name',
      type: 'text',
      width: '250px',
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
      title: 'common.status._',
      type: 'status',
      width: '130px',
      sortable: true,
      filterable: true,
      statusConfig: {
        active: { 
          label: 'saas.status.active', 
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
        },
        inactive: { 
          label: 'saas.status.inactive', 
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' 
        },
        suspended: { 
          label: 'saas.status.suspended', 
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
        },
        expired: { 
          label: 'saas.status.expired', 
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
        },
      },
    },
    {
      key: 'country',
      title: 'common.country',
      type: 'text',
      width: '120px',
      sortable: true,
      filterable: true,
      render: (value) => value || '-',
    },
    {
      key: 'default_language',
      title: 'saas.tenants.language',
      type: 'text',
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
      title: 'common.createdAt',
      type: 'date',
      width: '120px',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  // Stats configuration
  const stats = {
    label1: {
      title: 'saas.status.active',
      value: tenants.filter(t => t.status === 'active').length,
      color: 'green' as const,
    },
    label2: {
      title: 'saas.tenants.total',
      value: tenants.length,
      color: 'blue' as const,
    },
    label3: {
      title: 'saas.status.suspended',
      value: tenants.filter(t => t.status === 'suspended').length,
      color: 'red' as const,
    },
    label4: {
      title: 'saas.status.expired',
      value: tenants.filter(t => t.status === 'expired').length,
      color: 'gray' as const,
    },
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
          <Plus className="w-4 h-4 me-2" />
          {t('saas.tenants.create')}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Tenants Table */}
      <div className="h-[calc(100vh-300px)]">
        <LedgerTable
          data={tenants}
          columns={columns}
          loading={loading}
          error={error}
          showFilters={false}
          showStats={true}
          stats={stats}
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          rowKey="id"
          onRowClick={(row) => {
            setSelectedTenant(row);
            setIsDetailsOpen(true);
          }}
          onRefresh={loadTenants}
          variant="default"
          stickyHeader={true}
          showRowNumbers={true}
          emptyMessage="table.noData"
        />
      </div>

      {/* Tenant Details Sheet */}
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
          // TODO: Implement edit dialog
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
