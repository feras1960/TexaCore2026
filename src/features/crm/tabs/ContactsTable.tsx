/**
 * ContactsTable — جدول جهات الاتصال CRM
 * 
 * ✅ NexaDataTable مع البحث والفلتر والتصدير
 * ✅ بطاقات إحصائية Pipeline
 * ✅ دعم 9 لغات
 * ✅ فلاتر متقدمة (المصدر، المرحلة، الأولوية)
 * ✅ نافذة إضافة/تعديل جهة اتصال
 * ✅ تحويل إلى عميل
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NexaDataTable } from '@/components/ui/nexa-data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    Users, Plus, Phone, Mail, Building2,
    UserPlus, TrendingUp, UserCheck, Clock,
    Star, ArrowUpDown, PhoneIncoming, PhoneOutgoing,
    Globe, MessageSquare, Filter, X,
    Sparkles, AlertCircle, Target, Archive,
} from 'lucide-react';

import { contactsService, getContactName, type Contact, type ContactFilters, type LifecycleStage, type ContactSource } from '@/services/contactsService';
import { UnifiedAccountingSheet } from '@/features/accounting/components/unified/UnifiedAccountingSheet';
import type { SheetMode } from '@/features/accounting/components/unified/types';

// === Stage Badge Config ===
const STAGE_CONFIG: Record<string, { color: string; icon: React.ElementType; labelAr: string; labelEn: string }> = {
    new: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Sparkles, labelAr: 'جديد', labelEn: 'New' },
    contacted: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', icon: Phone, labelAr: 'تم التواصل', labelEn: 'Contacted' },
    interested: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Star, labelAr: 'مهتم', labelEn: 'Interested' },
    qualified: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: Target, labelAr: 'مؤهل', labelEn: 'Qualified' },
    negotiation: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: ArrowUpDown, labelAr: 'تفاوض', labelEn: 'Negotiation' },
    converted: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: UserCheck, labelAr: 'محوّل', labelEn: 'Converted' },
    lost: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertCircle, labelAr: 'خسارة', labelEn: 'Lost' },
    archived: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: Archive, labelAr: 'مؤرشف', labelEn: 'Archived' },
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
    phone_inbound: PhoneIncoming,
    phone_outbound: PhoneOutgoing,
    google_ads: Globe,
    facebook_ads: Globe,
    instagram_ads: Globe,
    website: Globe,
    telegram: MessageSquare,
    whatsapp: MessageSquare,
    referral: Users,
    walk_in: Users,
    exhibition: Users,
    email_campaign: Mail,
    manual: UserPlus,
    online_store: Globe,
};

const PRIORITY_CONFIG: Record<string, { color: string; labelAr: string; labelEn: string }> = {
    low: { color: 'bg-gray-100 text-gray-600', labelAr: 'منخفض', labelEn: 'Low' },
    medium: { color: 'bg-blue-100 text-blue-600', labelAr: 'متوسط', labelEn: 'Medium' },
    high: { color: 'bg-orange-100 text-orange-600', labelAr: 'عالي', labelEn: 'High' },
    urgent: { color: 'bg-red-100 text-red-600', labelAr: 'عاجل', labelEn: 'Urgent' },
};

// === Source Labels ===
const SOURCE_LABELS: Record<string, { ar: string; en: string }> = {
    phone_inbound: { ar: 'مكالمة واردة', en: 'Inbound Call' },
    phone_outbound: { ar: 'مكالمة صادرة', en: 'Outbound Call' },
    google_ads: { ar: 'إعلانات جوجل', en: 'Google Ads' },
    facebook_ads: { ar: 'فيسبوك', en: 'Facebook Ads' },
    instagram_ads: { ar: 'انستغرام', en: 'Instagram Ads' },
    website: { ar: 'الموقع', en: 'Website' },
    telegram: { ar: 'تلغرام', en: 'Telegram' },
    online_store: { ar: 'المتجر', en: 'Online Store' },
    referral: { ar: 'إحالة', en: 'Referral' },
    walk_in: { ar: 'زيارة', en: 'Walk-in' },
    exhibition: { ar: 'معرض', en: 'Exhibition' },
    whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    email_campaign: { ar: 'حملة بريدية', en: 'Email Campaign' },
    manual: { ar: 'يدوي', en: 'Manual' },
};

export default function ContactsTable() {
    const { t, language, direction } = useLanguage();
    const { companyId } = useCompany();
    const queryClient = useQueryClient();
    const isRTL = direction === 'rtl';

    // State
    const [showSheet, setShowSheet] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [sheetMode, setSheetMode] = useState<SheetMode>('view');
    const [filters, setFilters] = useState<ContactFilters>({});
    const [showFilters, setShowFilters] = useState(false);

    // Fetch Contacts
    const { data: contacts = [], isLoading } = useQuery({
        queryKey: ['crm_contacts', companyId, filters],
        queryFn: () => contactsService.getContacts(companyId!, filters),
        enabled: !!companyId,
    });

    // Fetch Pipeline Stats
    const { data: pipelineStats } = useQuery({
        queryKey: ['crm_pipeline_stats', companyId],
        queryFn: () => contactsService.getPipelineStats(companyId!),
        enabled: !!companyId,
    });

    // Active (non-archived, non-converted) count
    const activeCount = useMemo(() =>
        contacts.filter(c => !['archived', 'converted'].includes(c.lifecycle_stage)).length,
        [contacts]
    );

    // === Columns ===
    const columns = useMemo(() => [
        {
            accessorKey: 'display_name',
            header: t('crm.contactName') || (isRTL ? 'اسم جهة الاتصال' : 'Contact Name'),
            cell: (info: any) => {
                const row = info.row.original as Contact;
                const name = getContactName(row, language);
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-erp-navy dark:text-white truncate">
                                {name}
                            </span>
                            {row.organization && (
                                <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                                    <Building2 className="w-3 h-3 shrink-0" /> {row.organization}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
            size: 250,
        },
        {
            accessorKey: 'phone',
            header: t('common.phone') || 'Phone',
            cell: (info: any) => {
                const row = info.row.original as Contact;
                const phone = row.phone || row.mobile;
                return phone ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 text-green-500" />
                        <span dir="ltr">{phone}</span>
                    </div>
                ) : <span className="text-gray-300">—</span>;
            },
            size: 150,
        },
        {
            accessorKey: 'email',
            header: t('common.email') || 'Email',
            cell: (info: any) => info.getValue() ? (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 truncate">
                    <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{info.getValue()}</span>
                </div>
            ) : <span className="text-gray-300">—</span>,
            size: 200,
        },
        {
            accessorKey: 'source',
            header: t('crm.source') || (isRTL ? 'المصدر' : 'Source'),
            cell: (info: any) => {
                const source = info.getValue() as string;
                const Icon = SOURCE_ICONS[source] || Globe;
                const label = SOURCE_LABELS[source];
                return (
                    <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                            {label ? (isRTL ? label.ar : label.en) : source}
                        </span>
                    </div>
                );
            },
            size: 140,
        },
        {
            accessorKey: 'lifecycle_stage',
            header: t('crm.stage') || (isRTL ? 'المرحلة' : 'Stage'),
            cell: (info: any) => {
                const stage = info.getValue() as string;
                const cfg = STAGE_CONFIG[stage];
                if (!cfg) return stage;
                const StageIcon = cfg.icon;
                return (
                    <Badge variant="outline" className={`${cfg.color} border-0 gap-1 text-xs font-medium px-2 py-0.5`}>
                        <StageIcon className="w-3 h-3" />
                        {isRTL ? cfg.labelAr : cfg.labelEn}
                    </Badge>
                );
            },
            size: 130,
        },
        {
            accessorKey: 'priority',
            header: t('crm.priority') || (isRTL ? 'الأولوية' : 'Priority'),
            cell: (info: any) => {
                const priority = info.getValue() as string;
                const cfg = PRIORITY_CONFIG[priority];
                if (!cfg) return priority;
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {isRTL ? cfg.labelAr : cfg.labelEn}
                    </span>
                );
            },
            size: 100,
        },
        {
            accessorKey: 'interaction_count',
            header: t('crm.interactions') || (isRTL ? 'التفاعلات' : 'Interactions'),
            cell: (info: any) => {
                const count = info.getValue() as number;
                const row = info.row.original as Contact;
                return (
                    <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-mono text-sm font-bold ${count > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            {count}
                        </span>
                        {row.total_calls > 0 && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" /> {row.total_calls}
                            </span>
                        )}
                    </div>
                );
            },
            size: 100,
        },
        {
            accessorKey: 'last_interaction_at',
            header: t('crm.lastActivity') || (isRTL ? 'آخر نشاط' : 'Last Activity'),
            cell: (info: any) => {
                const date = info.getValue() as string;
                if (!date) return <span className="text-gray-300">—</span>;
                const d = new Date(date);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                let label: string;
                if (diffDays === 0) label = isRTL ? 'اليوم' : 'Today';
                else if (diffDays === 1) label = isRTL ? 'أمس' : 'Yesterday';
                else if (diffDays < 7) label = isRTL ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
                else label = d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });

                return (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {label}
                    </div>
                );
            },
            size: 120,
        },
    ], [t, language, isRTL]);

    // === Handlers ===
    const handleRowClick = useCallback((row: Contact) => {
        setSelectedContact(row);
        setSheetMode('view');
        setShowSheet(true);
    }, []);

    const handleCreate = useCallback(() => {
        setSelectedContact(null);
        setSheetMode('create');
        setShowSheet(true);
    }, []);

    const handleSave = useCallback(async (data: any) => {
        try {
            if (sheetMode === 'create') {
                await contactsService.createContact({
                    ...data,
                    company_id: companyId,
                    tenant_id: data.tenant_id,
                });
                toast.success(isRTL ? 'تم إضافة جهة الاتصال' : 'Contact added');
            } else if (sheetMode === 'edit' && selectedContact) {
                await contactsService.updateContact(selectedContact.id, data);
                toast.success(isRTL ? 'تم تحديث جهة الاتصال' : 'Contact updated');
            }
            queryClient.invalidateQueries({ queryKey: ['crm_contacts'] });
            queryClient.invalidateQueries({ queryKey: ['crm_pipeline_stats'] });
            setShowSheet(false);
            setSelectedContact(null);
        } catch (err: any) {
            toast.error(err.message);
            throw err; // re-throw so UnifiedAccountingSheet shows error
        }
    }, [sheetMode, selectedContact, companyId, isRTL, queryClient]);

    const handleDelete = useCallback(async () => {
        if (!selectedContact) return;
        try {
            await contactsService.archiveContact(selectedContact.id);
            toast.success(isRTL ? 'تم حذف جهة الاتصال' : 'Contact deleted');
            queryClient.invalidateQueries({ queryKey: ['crm_contacts'] });
            queryClient.invalidateQueries({ queryKey: ['crm_pipeline_stats'] });
            setShowSheet(false);
            setSelectedContact(null);
        } catch (err: any) {
            toast.error(err.message);
            throw err;
        }
    }, [selectedContact, isRTL, queryClient]);

    const clearFilters = useCallback(() => {
        setFilters({});
    }, []);

    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

    // === Pipeline Stats Cards ===
    const statCards = useMemo(() => {
        if (!pipelineStats) return [];
        return [
            { key: 'new', count: pipelineStats.new || 0, icon: Sparkles, color: 'from-blue-500 to-blue-600' },
            { key: 'contacted', count: pipelineStats.contacted || 0, icon: Phone, color: 'from-cyan-500 to-cyan-600' },
            { key: 'qualified', count: pipelineStats.qualified || 0, icon: Target, color: 'from-green-500 to-green-600' },
            { key: 'negotiation', count: pipelineStats.negotiation || 0, icon: ArrowUpDown, color: 'from-purple-500 to-purple-600' },
            { key: 'converted', count: pipelineStats.converted || 0, icon: UserCheck, color: 'from-emerald-500 to-emerald-600' },
        ];
    }, [pipelineStats]);

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-erp-navy dark:text-white">
                        <Users className="w-7 h-7 text-indigo-600" />
                        {t('crm.contacts') || 'Contacts'}
                        <Badge variant="secondary" className="ms-2 text-xs">
                            {activeCount}
                        </Badge>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {t('crm.contactsSubtitle') || (isRTL ? 'إدارة العملاء المحتملين وجهات الاتصال' : 'Manage leads and contacts')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`gap-1.5 ${hasActiveFilters ? 'border-indigo-500 text-indigo-600' : ''}`}
                        id="crm-contacts-filter-btn"
                    >
                        <Filter className="w-4 h-4" />
                        {t('common.filter') || 'Filter'}
                        {hasActiveFilters && (
                            <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 ms-1">
                                {Object.values(filters).filter(v => v).length}
                            </Badge>
                        )}
                    </Button>
                    <Button id="crm-add-contact-btn" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5">
                        <Plus className="w-4 h-4" />
                        {t('crm.addContact') || (isRTL ? 'إضافة جهة اتصال' : 'Add Contact')}
                    </Button>
                </div>
            </div>

            {/* Pipeline Stats */}
            {statCards.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {statCards.map(card => {
                        const cfg = STAGE_CONFIG[card.key];
                        const Icon = card.icon;
                        const isActive = filters.lifecycle_stage === card.key;
                        return (
                            <Card
                                key={card.key}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${isActive ? 'ring-2 ring-indigo-500 shadow-md' : ''
                                    }`}
                                onClick={() => setFilters(prev => ({
                                    ...prev,
                                    lifecycle_stage: isActive ? undefined : card.key as LifecycleStage,
                                }))}
                            >
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-erp-navy dark:text-white">{card.count}</p>
                                        <p className="text-xs text-gray-500">
                                            {cfg ? (isRTL ? cfg.labelAr : cfg.labelEn) : card.key}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Advanced Filters */}
            {showFilters && (
                <Card className="border-dashed">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={filters.source || ''}
                                onValueChange={(v) => setFilters(prev => ({ ...prev, source: v as ContactSource || undefined }))}
                            >
                                <SelectTrigger className="w-[160px] h-9 text-xs">
                                    <SelectValue placeholder={isRTL ? 'المصدر' : 'Source'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                            {isRTL ? label.ar : label.en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.priority || ''}
                                onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v || undefined }))}
                            >
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                    <SelectValue placeholder={isRTL ? 'الأولوية' : 'Priority'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                            {isRTL ? cfg.labelAr : cfg.labelEn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status || ''}
                                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v || undefined }))}
                            >
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                    <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active" className="text-xs">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                                    <SelectItem value="inactive" className="text-xs">{isRTL ? 'غير نشط' : 'Inactive'}</SelectItem>
                                    <SelectItem value="converted" className="text-xs">{isRTL ? 'محوّل' : 'Converted'}</SelectItem>
                                    <SelectItem value="blacklisted" className="text-xs">{isRTL ? 'محظور' : 'Blacklisted'}</SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 gap-1">
                                    <X className="w-3.5 h-3.5" />
                                    {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Data Table */}
            <div className="border rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                <NexaDataTable
                    data={contacts}
                    columns={columns}
                    onRowClick={handleRowClick}
                    enableSearch
                    searchPlaceholder={isRTL ? 'بحث عن جهة اتصال...' : 'Search contacts...'}
                    enablePagination
                    pageSize={25}
                    persistKey="crm_contacts_table"
                />
            </div>

            {/* Contact Sheet — UnifiedAccountingSheet (docType='contact') */}
            <UnifiedAccountingSheet
                isOpen={showSheet}
                onClose={() => {
                    setShowSheet(false);
                    setSelectedContact(null);
                }}
                docType="contact"
                mode={sheetMode}
                data={selectedContact || {}}
                documentId={selectedContact?.id}
                companyId={companyId}
                onSave={handleSave}
                onDelete={handleDelete}
                onRefresh={() => {
                    queryClient.invalidateQueries({ queryKey: ['crm_contacts'] });
                    queryClient.invalidateQueries({ queryKey: ['crm_pipeline_stats'] });
                }}
                onModeChange={(mode) => setSheetMode(mode as SheetMode)}
            />
        </div>
    );
}
