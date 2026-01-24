/**
 * Agent Details Sheet
 * شيت تفاصيل الوكيل
 */

import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { UnifiedSheet } from '@/components/shared/sheets/UnifiedSheet';
import { Badge } from '@/components/ui/badge';
import { UserCog, DollarSign, Users, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/services/saas/agentsService';

interface AgentDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
}

export function AgentDetailsSheet({ open, onOpenChange, agent }: AgentDetailsSheetProps) {
  const { t, direction } = useLanguage();

  if (!agent) return null;

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

  return (
    <UnifiedSheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="lg"
      icon={UserCog}
      title={agent.name}
      subtitle={agent.email}
    >
      <div className="space-y-6 py-4" dir={direction}>
        {/* Agent Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
              {t('common.code')}
            </p>
            <p className="font-semibold">{agent.code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
              {t('saas.agents.tier')}
            </p>
            <div className="mt-1">{getTierBadge(agent.tier)}</div>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
              {t('common.status._')}
            </p>
            <div className="mt-1">{getStatusBadge(agent.status)}</div>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
              {t('saas.agents.commissions')}
            </p>
            <p className="font-semibold">{agent.commission_percent}%</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            {t('saas.agents.contactInfo') || 'معلومات الاتصال'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {agent.email && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('common.email')}
                </p>
                <p className="font-semibold">{agent.email}</p>
              </div>
            )}
            {agent.phone && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('common.phone')}
                </p>
                <p className="font-semibold">{agent.phone}</p>
              </div>
            )}
            {agent.country && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('common.country')}
                </p>
                <p className="font-semibold">{agent.country}</p>
              </div>
            )}
            {agent.city && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('common.city') || 'المدينة'}
                </p>
                <p className="font-semibold">{agent.city}</p>
              </div>
            )}
          </div>
        </div>

        {/* Balance Info */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            {t('saas.agents.balance')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.balance')}
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {agent.current_balance.toLocaleString()} {agent.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.pendingBalance')}
              </p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {agent.pending_balance.toLocaleString()} {agent.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.totalEarned')}
              </p>
              <p className="text-lg font-bold">
                {agent.total_earned.toLocaleString()} {agent.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                {t('saas.agents.totalWithdrawn')}
              </p>
              <p className="text-lg font-bold">
                {agent.total_withdrawn.toLocaleString()} {agent.currency}
              </p>
            </div>
          </div>
        </div>

        {/* White Label Info */}
        {agent.has_white_label && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              {t('saas.whiteLabelDetails.title')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('saas.whiteLabel.status')}
                </p>
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {agent.white_label_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                  {t('saas.whiteLabelDetails.commission')}
                </p>
                <p className="font-semibold text-purple-600 dark:text-purple-400">
                  {agent.white_label_commission_percent || 50}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </UnifiedSheet>
  );
}
