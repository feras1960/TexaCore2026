/**
 * Agents Management Page
 * إدارة الوكلاء والمسوقين
 * 
 * Updated to use UniversalDetailSheet system
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { agentsService, type Agent } from '@/services/saas/agentsService';
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
  UserCog,
  DollarSign,
  Users,
  TrendingUp,
  Shield,
  Globe
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UniversalDetailSheet } from '@/components/sheets';
import { cn } from '@/lib/utils';

export default function Agents() {
  const { t, direction } = useLanguage();
  const { isSuperAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  // Filter agents by search query
  const filteredAgents = agents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      agent.code.toLowerCase().includes(query) ||
      (agent.phone && agent.phone.includes(query))
    );
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: t('saas.status.active'), className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      pending: { label: t('saas.status.pending'), className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      suspended: { label: t('saas.status.suspended'), className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      terminated: { label: t('saas.status.cancelled'), className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <Badge className={cn('text-xs font-medium', statusInfo.className)}>
        {statusInfo.label}
      </Badge>
    );
  };

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

  // Table columns
  const columns: Column<Agent>[] = [
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
      key: 'tier',
      title: t('saas.agents.tier'),
      width: '120px',
      sortable: true,
      render: (value) => getTierBadge(value),
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
      key: 'commission_percent',
      title: t('saas.agents.commissions'),
      width: '120px',
      align: 'end',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {value}%
        </span>
      ),
    },
    {
      key: 'current_balance',
      title: t('saas.agents.balance'),
      width: '150px',
      align: 'end',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col items-end">
          <span className="font-semibold text-green-600 dark:text-green-400">
            {value.toLocaleString()} {row.currency}
          </span>
          {row.pending_balance > 0 && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              {t('saas.agents.pendingBalance')}: {row.pending_balance.toLocaleString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'has_white_label',
      title: t('saas.whiteLabel.title'),
      width: '120px',
      align: 'center',
      render: (value, row) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Globe className="w-3 h-3 mr-1" />
            {t('saas.whiteLabel.title')}
          </Badge>
        );
      },
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
              setSelectedAgent(row);
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
            {row.status === 'pending' && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await agentsService.approve(row.id);
                  await loadAgents();
                } catch (err: any) {
                  setError(err.message);
                }
              }}>
                <Shield className="w-4 h-4 mr-2" />
                {t('saas.agents.approve')}
              </DropdownMenuItem>
            )}
            {row.status === 'active' && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await agentsService.suspend(row.id);
                  await loadAgents();
                } catch (err: any) {
                  setError(err.message);
                }
              }}>
                <Shield className="w-4 h-4 mr-2" />
                {t('saas.agents.suspend')}
              </DropdownMenuItem>
            )}
            {row.status === 'suspended' && (
              <DropdownMenuItem onClick={async () => {
                try {
                  await agentsService.activate(row.id);
                  await loadAgents();
                } catch (err: any) {
                  setError(err.message);
                }
              }}>
                <Shield className="w-4 h-4 mr-2" />
                {t('saas.agents.activate')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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
          <Plus className="w-4 h-4 mr-2" />
          {t('saas.agents.create')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.totalAgents')}
              </p>
              <p className="text-2xl font-bold text-erp-navy dark:text-white mt-1">
                {agents.length}
              </p>
            </div>
            <UserCog className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.activeAgents')}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {agents.filter(a => a.status === 'active').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.totalTenants')}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {agents.reduce((sum, a) => sum + (a.total_earned || 0), 0).toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.totalCommissions')}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {agents.reduce((sum, a) => sum + (a.total_earned || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-amber-500" />
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

      {/* Agents Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <NexaTable
          data={filteredAgents}
          columns={columns}
          loading={loading}
          onRowClick={(row) => {
            setSelectedAgent(row);
            setIsDetailsOpen(true);
          }}
          rowKey="id"
          emptyMessage={t('common.noData')}
          stickyHeader={true}
        />
      </div>

      {/* Agent Details Sheet - Using Universal Detail Sheet System */}
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
          // Handle edit - can open edit dialog
          console.log('Edit agent:', selectedAgent?.id);
        }}
      />
    </div>
  );
}
