/**
 * ════════════════════════════════════════════════════════════════
 * 📋 AuditLogTab - تبويب سجل التدقيق
 * ════════════════════════════════════════════════════════════════
 * 
 * Connected to audit_logs table in Supabase.
 * Shows permission changes, role assignments, user status changes,
 * and resource linking events.
 * 
 * @module features/users-permissions/components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
    ClipboardList, Clock, Shield, Users, GitBranch,
    Eye, Zap, UserPlus, UserMinus, ToggleRight,
    Building2, Warehouse, Wallet, Edit2, Trash2,
    Loader2, RefreshCw, Search, Filter, ChevronDown,
    LucideIcon, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface AuditLogEntry {
    id: string;
    tenant_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    severity?: string;
    created_at: string;
    // Joined
    user_profile?: {
        full_name: string | null;
        email: string;
    };
}

// ═══════════════════════════════════════════════════════════
// Action Config (icons, colors, labels)
// ═══════════════════════════════════════════════════════════

interface ActionConfig {
    icon: LucideIcon;
    color: string;
    bg: string;
    labelAr: string;
    labelEn: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
    // Role actions
    update_role: { icon: Shield, color: 'text-violet-500', bg: 'bg-violet-500/10', labelAr: 'تحديث دور', labelEn: 'Update Role' },
    create_role: { icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10', labelAr: 'إنشاء دور', labelEn: 'Create Role' },
    delete_role: { icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10', labelAr: 'حذف دور', labelEn: 'Delete Role' },
    // User actions
    invite_user: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10', labelAr: 'دعوة مستخدم', labelEn: 'Invite User' },
    reassign_user: { icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10', labelAr: 'إعادة تعيين مستخدم', labelEn: 'Reassign User' },
    assign_role: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10', labelAr: 'تعيين دور', labelEn: 'Assign Role' },
    remove_role: { icon: UserMinus, color: 'text-orange-500', bg: 'bg-orange-500/10', labelAr: 'إزالة دور', labelEn: 'Remove Role' },
    update_user_roles: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', labelAr: 'تحديث أدوار المستخدم', labelEn: 'Update User Roles' },
    // Status
    activate_user: { icon: ToggleRight, color: 'text-green-500', bg: 'bg-green-500/10', labelAr: 'تفعيل مستخدم', labelEn: 'Activate User' },
    deactivate_user: { icon: ToggleRight, color: 'text-gray-500', bg: 'bg-gray-500/10', labelAr: 'تعطيل مستخدم', labelEn: 'Deactivate User' },
    // Resources
    update_resources: { icon: GitBranch, color: 'text-teal-500', bg: 'bg-teal-500/10', labelAr: 'تحديث الموارد', labelEn: 'Update Resources' },
    link_branch: { icon: Building2, color: 'text-green-500', bg: 'bg-green-500/10', labelAr: 'ربط فرع', labelEn: 'Link Branch' },
    link_warehouse: { icon: Warehouse, color: 'text-amber-500', bg: 'bg-amber-500/10', labelAr: 'ربط مستودع', labelEn: 'Link Warehouse' },
    link_fund: { icon: Wallet, color: 'text-cyan-500', bg: 'bg-cyan-500/10', labelAr: 'ربط صندوق', labelEn: 'Link Fund' },
    // Permissions
    update_permissions: { icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500/10', labelAr: 'تحديث صلاحيات', labelEn: 'Update Permissions' },
    update_special_permissions: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', labelAr: 'تحديث صلاحيات خاصة', labelEn: 'Update Special Permissions' },
    // Subscription
    renew: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', labelAr: 'تجديد اشتراك', labelEn: 'Renew Subscription' },
    upgrade: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10', labelAr: 'ترقية باقة', labelEn: 'Upgrade Plan' },
    cancel: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', labelAr: 'إلغاء اشتراك', labelEn: 'Cancel Subscription' },
    // Generic
    create: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', labelAr: 'إنشاء', labelEn: 'Create' },
    update: { icon: Edit2, color: 'text-blue-500', bg: 'bg-blue-500/10', labelAr: 'تحديث', labelEn: 'Update' },
    delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10', labelAr: 'حذف', labelEn: 'Delete' },
};

const DEFAULT_CONFIG: ActionConfig = {
    icon: Info, color: 'text-gray-500', bg: 'bg-gray-500/10', labelAr: 'حدث', labelEn: 'Event',
};

// ═══════════════════════════════════════════════════════════
// Time formatting
// ═══════════════════════════════════════════════════════════

function formatTimeAgo(dateStr: string, isAr: boolean): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return isAr ? 'الآن' : 'Just now';
    if (diffMin < 60) return isAr ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`;
    if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    return date.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildDescription(entry: AuditLogEntry, isAr: boolean): string {
    const entityType = entry.entity_type || '';
    const entityName = entry.entity_name || '';
    const action = entry.action;
    const newVals = entry.new_values || {};

    // Custom descriptions based on action
    if (action === 'invite_user' && newVals.email) {
        return isAr ? `تمت دعوة ${newVals.email}` : `Invited ${newVals.email}`;
    }
    if (action === 'update_role' && entityName) {
        return isAr ? `تم تعديل الدور: ${entityName}` : `Modified role: ${entityName}`;
    }
    if ((action === 'activate_user' || action === 'deactivate_user') && entityName) {
        return isAr
            ? `${action === 'activate_user' ? 'تم تفعيل' : 'تم تعطيل'}: ${entityName}`
            : `${action === 'activate_user' ? 'Activated' : 'Deactivated'}: ${entityName}`;
    }

    // Generic description
    const config = ACTION_CONFIG[action] || DEFAULT_CONFIG;
    const label = isAr ? config.labelAr : config.labelEn;
    if (entityName) return `${label}: ${entityName}`;
    if (entityType) return `${label} — ${entityType}`;
    return label;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export default function AuditLogTab() {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [limit, setLimit] = useState(50);

    // ─── Load Audit Logs ────────────────────────────
    const loadLogs = useCallback(async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            // Filter by action type
            if (filterAction !== 'all') {
                query = query.eq('action', filterAction);
            }

            // Search by entity_name or action
            if (searchQuery) {
                query = query.or(`entity_name.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading audit logs:', error);
                setLogs([]);
                return;
            }

            const rawLogs = (data || []) as AuditLogEntry[];

            // Enrich with user names from user_profiles
            const userIds = [...new Set(rawLogs.map(l => l.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p]));
                rawLogs.forEach(log => {
                    const profile = profileMap.get(log.user_id);
                    if (profile) {
                        log.user_profile = { full_name: profile.full_name, email: profile.email };
                    }
                });
            }

            setLogs(rawLogs);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [limit, filterAction, searchQuery]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Get unique actions for filter dropdown
    const actionOptions = [
        { value: 'all', label: isAr ? 'الكل' : 'All' },
        { value: 'invite_user', label: isAr ? 'دعوة مستخدم' : 'Invite User' },
        { value: 'update_role', label: isAr ? 'تحديث دور' : 'Update Role' },
        { value: 'create_role', label: isAr ? 'إنشاء دور' : 'Create Role' },
        { value: 'assign_role', label: isAr ? 'تعيين دور' : 'Assign Role' },
        { value: 'activate_user', label: isAr ? 'تفعيل مستخدم' : 'Activate User' },
        { value: 'deactivate_user', label: isAr ? 'تعطيل مستخدم' : 'Deactivate User' },
        { value: 'update_permissions', label: isAr ? 'تحديث صلاحيات' : 'Update Permissions' },
        { value: 'update_resources', label: isAr ? 'تحديث الموارد' : 'Update Resources' },
        { value: 'renew', label: isAr ? 'تجديد اشتراك' : 'Renew' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-tajawal">
                            {isAr ? 'سجل التدقيق' : 'Audit Log'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-tajawal">
                            {isAr
                                ? 'تتبع جميع التغييرات على الأدوار والصلاحيات والموارد'
                                : 'Track all changes to roles, permissions, and resources'}
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="icon" onClick={loadLogs} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={isAr ? 'البحث في السجل...' : 'Search logs...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-10 font-tajawal"
                    />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-[200px] font-tajawal">
                        <Filter className="w-4 h-4 me-2 text-gray-400" />
                        <SelectValue placeholder={isAr ? 'نوع الحدث' : 'Event type'} />
                    </SelectTrigger>
                    <SelectContent>
                        {actionOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="font-tajawal">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Timeline */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <ClipboardList className="w-12 h-12 mb-3 opacity-50" />
                            <p className="font-tajawal text-sm">
                                {isAr ? 'لا توجد أحداث مسجلة بعد' : 'No events logged yet'}
                            </p>
                            <p className="font-tajawal text-xs mt-1 text-gray-300">
                                {isAr
                                    ? 'ستظهر هنا تغييرات الصلاحيات والأدوار تلقائياً'
                                    : 'Permission and role changes will appear here automatically'}
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[600px]">
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {logs.map((entry) => {
                                    const config = ACTION_CONFIG[entry.action] || DEFAULT_CONFIG;
                                    const Icon = config.icon;
                                    const userName = entry.user_profile?.full_name || entry.user_profile?.email || '—';
                                    const description = buildDescription(entry, isAr);

                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        >
                                            {/* Icon */}
                                            <div className={cn(
                                                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                                config.bg
                                            )}>
                                                <Icon className={cn('w-5 h-5', config.color)} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white font-tajawal">
                                                    {description}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-tajawal">
                                                        {userName}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimeAgo(entry.created_at, isAr)}
                                                    </span>
                                                    {entry.severity && entry.severity !== 'info' && (
                                                        <Badge
                                                            variant={entry.severity === 'critical' ? 'destructive' : 'secondary'}
                                                            className="text-[10px] px-1.5 py-0"
                                                        >
                                                            {entry.severity}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Changes detail (collapsed) */}
                                                {entry.changes && Object.keys(entry.changes).length > 0 && (
                                                    <div className="mt-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded p-2 font-mono" dir="ltr">
                                                        {Object.entries(entry.changes).slice(0, 3).map(([key, val]) => (
                                                            <div key={key}>
                                                                <span className="text-gray-500">{key}:</span>{' '}
                                                                <span className="text-gray-700 dark:text-gray-300">{JSON.stringify(val)}</span>
                                                            </div>
                                                        ))}
                                                        {Object.keys(entry.changes).length > 3 && (
                                                            <span className="text-gray-400">...+{Object.keys(entry.changes).length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action badge */}
                                            <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                                                {entry.action}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Load more */}
            {logs.length >= limit && (
                <div className="text-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLimit(prev => prev + 50)}
                        className="font-tajawal gap-2"
                    >
                        <ChevronDown className="w-4 h-4" />
                        {isAr ? 'تحميل المزيد' : 'Load More'}
                    </Button>
                </div>
            )}

            {/* Stats footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 font-tajawal px-1">
                <span>{isAr ? `عدد الأحداث: ${logs.length}` : `Events: ${logs.length}`}</span>
                <span>{isAr ? 'يتم التسجيل تلقائياً عند أي تغيير' : 'Automatically logged on changes'}</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// 📝 Audit Helper — call from other components
// ═══════════════════════════════════════════════════════════

export async function logAuditEvent(params: {
    action: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: Record<string, any>;
    severity?: 'info' | 'warning' | 'critical';
}) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get tenant_id from user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        await supabase.from('audit_logs').insert({
            tenant_id: profile?.tenant_id || null,
            user_id: user.id,
            action: params.action,
            entity_type: params.entity_type,
            entity_id: params.entity_id || null,
            entity_name: params.entity_name || null,
            old_values: params.old_values || null,
            new_values: params.new_values || null,
            changes: params.changes || null,
            severity: params.severity || 'info',
            metadata: { source: 'frontend' },
        });
    } catch (err) {
        console.warn('Audit log failed (non-blocking):', err);
    }
}
