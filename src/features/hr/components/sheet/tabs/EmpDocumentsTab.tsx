/**
 * 📁 EmpDocumentsTab — مستندات الموظف
 */

import { useState, useEffect } from 'react';
import { NexaListTable, NexaListColumn } from '@/components/ui/nexa-list-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, AlertTriangle, CheckCircle, ExternalLink, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props { employeeId?: string; isRTL: boolean; }

const DOC_TYPES: Record<string, { ar: string; en: string }> = {
    id_card: { ar: 'بطاقة هوية', en: 'ID Card' },
    passport: { ar: 'جواز سفر', en: 'Passport' },
    visa: { ar: 'تأشيرة', en: 'Visa' },
    work_permit: { ar: 'إذن عمل', en: 'Work Permit' },
    driving_license: { ar: 'رخصة قيادة', en: 'Driving License' },
    degree: { ar: 'شهادة علمية', en: 'Degree' },
    certificate: { ar: 'شهادة', en: 'Certificate' },
    contract: { ar: 'عقد', en: 'Contract' },
    resignation: { ar: 'استقالة', en: 'Resignation' },
    termination: { ar: 'إنهاء خدمة', en: 'Termination' },
    warning_letter: { ar: 'إنذار', en: 'Warning' },
    appreciation: { ar: 'شهادة تقدير', en: 'Appreciation' },
    medical: { ar: 'طبي', en: 'Medical' },
    insurance: { ar: 'تأمين', en: 'Insurance' },
    other: { ar: 'أخرى', en: 'Other' },
};

export default function EmpDocumentsTab({ employeeId, isRTL }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<any[]>([]);

    useEffect(() => {
        if (!employeeId) return;
        loadDocuments();
    }, [employeeId]);

    async function loadDocuments() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employee_documents')
                .select('*')
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setDocuments(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Find expiring documents (within 30 days)
    const expiringSoon = documents.filter(d => {
        if (!d.expiry_date) return false;
        const diff = new Date(d.expiry_date).getTime() - Date.now();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    });

    const expired = documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date());

    const columns: NexaListColumn<any>[] = [
        {
            id: 'type',
            header: t('النوع', 'Type'),
            width: 'w-28',
            cell: (row) => <span className="text-sm">{DOC_TYPES[row.document_type]?.[isRTL ? 'ar' : 'en'] || row.document_type}</span>,
        },
        {
            id: 'title',
            header: t('العنوان', 'Title'),
            width: 'min-w-[150px]',
            cell: (row) => <span className="text-sm font-medium">{row.title}</span>,
        },
        {
            id: 'number',
            header: t('الرقم', 'Number'),
            width: 'w-28',
            cell: (row) => <span className="font-mono text-xs">{row.document_number || '—'}</span>,
        },
        {
            id: 'expiry',
            header: t('الانتهاء', 'Expiry'),
            width: 'w-24',
            cell: (row) => {
                if (!row.expiry_date) return <span className="text-muted-foreground text-xs">—</span>;
                const isExpired = new Date(row.expiry_date) < new Date();
                const isSoon = !isExpired && (new Date(row.expiry_date).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                return (
                    <span className={`font-mono text-xs ${isExpired ? 'text-red-600 font-bold' : isSoon ? 'text-amber-600' : ''}`}>
                        {new Date(row.expiry_date).toLocaleDateString()}
                        {isExpired && ' ⚠️'}
                    </span>
                );
            },
        },
        {
            id: 'verified',
            header: t('التحقق', 'Verified'),
            width: 'w-16',
            align: 'center',
            cell: (row) => row.is_verified
                ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                : <span className="text-muted-foreground text-xs">—</span>,
        },
    ];

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Expiry Alerts */}
            {(expiringSoon.length > 0 || expired.length > 0) && (
                <div className="space-y-2">
                    {expired.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                            <span className="text-sm text-red-700">
                                {t(`${expired.length} مستند(ات) منتهية الصلاحية`, `${expired.length} document(s) expired`)}
                            </span>
                        </div>
                    )}
                    {expiringSoon.length > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="text-sm text-amber-700">
                                {t(`${expiringSoon.length} مستند(ات) تنتهي خلال 30 يوم`, `${expiringSoon.length} document(s) expiring in 30 days`)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <NexaListTable
                data={documents}
                columns={columns}
                isLoading={loading}
                isRTL={isRTL}
                direction={isRTL ? 'rtl' : 'ltr'}
                totalCount={documents.length}
                countLabel={t('مستند', 'documents')}
                getRowKey={(row) => row.id}
                emptyMessage={t('لا توجد مستندات', 'No documents')}
                getRowAccent={(row) => {
                    if (row.expiry_date && new Date(row.expiry_date) < new Date()) return 'border-s-red-400';
                    if (row.is_verified) return 'border-s-emerald-400';
                    return 'border-s-gray-300';
                }}
                renderActions={(row) => row.file_url ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={row.file_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                ) : null}
            />
        </div>
    );
}
