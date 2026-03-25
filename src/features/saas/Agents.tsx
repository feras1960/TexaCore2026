/**
 * Agents Management Page
 * إدارة الوكلاء والمسوقين
 * 
 * Updated to use LedgerTable for consistent UI
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { agentsService, type Agent } from '@/services/saas/agentsService';
import { LedgerTable, type LedgerColumn } from '@/components/shared/tables/LedgerTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe } from 'lucide-react';
import { UniversalDetailSheet } from '@/components/sheets';
import { cn } from '@/lib/utils';

export default function Agents() {
  const { t, direction } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Load agents
  const loadAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentsService.getAll();
      setAgents(data);
    } catch (err: any) {
      console.error('Error loading agents:', err);
      setError(err.message || t('saas.agents.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Get tier badge
  const getTierBadge = (tier: string) => {
    const tierMap: Record<string, { labelKey: string; className: string }> = {
      bronze: { labelKey: 'saas.agents.tiers.bronze', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      silver: { labelKey: 'saas.agents.tiers.silver', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
      gold: { labelKey: 'saas.agents.tiers.gold', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      platinum: { labelKey: 'saas.agents.tiers.platinum', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      diamond: { labelKey: 'saas.agents.tiers.diamond', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    };
    const tierInfo = tierMap[tier] || tierMap.bronze;
    return (
      <Badge className={cn('text-xs font-medium', tierInfo.className)}>
        {t(tierInfo.labelKey)}
      </Badge>
    );
  };

  // Columns configuration
  const columns: LedgerColumn<Agent>[] = [
    {
      key: 'code',
      title: 'saas.agentsGrid.code',
      type: 'text',
      width: '120px',
      sortable: true,
      filterable: true,
    },
    {
      key: 'name',
      title: 'saas.agentsGrid.name',
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
      key: 'tier',
      title: 'saas.agentsGrid.tier',
      type: 'text',
      width: '120px',
      sortable: true,
      filterable: true,
      render: (value) => getTierBadge(value as string),
    },
    {
      key: 'status',
      title: 'common.status._',
      type: 'status',
      width: '130px',
      sortable: true,
      filterable: true,
      statusConfig: {
        active: { label: 'saas.status.active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        pending: { label: 'saas.status.pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        suspended: { label: 'saas.status.suspended', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        terminated: { label: 'saas.status.cancelled', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
      },
    },
    {
      key: 'commission_percent',
      title: 'saas.agentsGrid.commission',
      type: 'number',
      width: '120px',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {value}%
        </span>
      ),
    },
    {
      key: 'current_balance',
      title: 'saas.agentsGrid.balance',
      type: 'currency',
      width: '180px',
      sortable: true,
      colorize: true,
      render: (value, row) => (
        <div className="flex flex-col items-end">
          <span className="font-semibold text-green-600 dark:text-green-400 font-mono">
            {value.toLocaleString()} {row.currency}
          </span>
          {row.pending_balance > 0 && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {row.pending_balance.toLocaleString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'has_white_label',
      title: 'saas.whiteLabel',
      type: 'text',
      width: '110px',
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Globe className="w-3 h-3 me-1" />
            WL
          </Badge>
        );
      },
    },
  ];

  // Stats configuration
  const stats = {
    label1: {
      title: 'saas.status.active',
      value: agents.filter(a => a.status === 'active').length,
      color: 'green' as const,
    },
    label2: {
      title: 'common.total',
      value: agents.length,
      color: 'blue' as const,
    },
    label3: {
      title: 'saas.whiteLabel',
      value: agents.filter(a => a.has_white_label).length,
      color: 'gray' as const,
    },
    label4: {
      title: 'saas.agentsGrid.balance',
      value: agents.reduce((sum, a) => sum + (a.current_balance || 0), 0).toLocaleString(),
      color: 'gray' as const,
    },
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-erp-navy dark:text-white font-cairo">
            {t('saas.agents.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-tajawal">
            {t('saas.agents.description')}
          </p>
        </div>
        <Button onClick={() => {/* TODO: Open create dialog */}}>
          <Plus className="w-4 h-4 me-2" />
          {t('saas.agents.create')}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Agents Table */}
      <div className="h-[calc(100vh-300px)]">
        <LedgerTable
          data={agents}
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
            setSelectedAgent(row);
            setIsDetailsOpen(true);
          }}
          onRefresh={loadAgents}
          variant="default"
          stickyHeader={true}
          showRowNumbers={true}
          emptyMessage="table.noData"
        />
      </div>

      {/* Agent Details Sheet */}
      <UniversalDetailSheet
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedAgent(null);
        }}
        docType="agent"
        data={selectedAgent}
        onRefresh={loadAgents}
        onEdit={() => {
          // TODO: Implement edit dialog
        }}
      />
    </div>
  );
}
