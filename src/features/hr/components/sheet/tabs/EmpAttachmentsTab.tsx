/**
 * ════════════════════════════════════════════════════════════════
 * 📎 EmpAttachmentsTab — المرفقات والمستندات
 * يعرض مستندات الموظف مع إمكانية الرفع والحذف
 * 
 * المصدر: employee_documents
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
    FileText, Upload, Download, Trash2, Eye, Calendar,
    AlertTriangle, ChevronDown, File, Image, FileSpreadsheet,
    Clock, CheckCircle2, XCircle, Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
    employeeId?: string;
    isRTL: boolean;
    mode?: string;
}

const DOC_TYPES: Record<string, { ar: string; en: string; icon: React.ElementType; color: string }> = {
    national_id: { ar: 'هوية وطنية', en: 'National ID', icon: FileText, color: 'text-blue-600' },
    passport: { ar: 'جواز سفر', en: 'Passport', icon: FileText, color: 'text-indigo-600' },
    visa: { ar: 'تأشيرة', en: 'Visa', icon: FileText, color: 'text-purple-600' },
    iqama: { ar: 'إقامة', en: 'Iqama', icon: FileText, color: 'text-emerald-600' },
    contract: { ar: 'عقد', en: 'Contract', icon: FileSpreadsheet, color: 'text-amber-600' },
    certificate: { ar: 'شهادة', en: 'Certificate', icon: FileText, color: 'text-teal-600' },
    license: { ar: 'رخصة', en: 'License', icon: FileText, color: 'text-orange-600' },
    photo: { ar: 'صورة شخصية', en: 'Photo', icon: Image, color: 'text-pink-600' },
    medical: { ar: 'تقرير طبي', en: 'Medical Report', icon: FileText, color: 'text-red-600' },
    other: { ar: 'أخرى', en: 'Other', icon: File, color: 'text-gray-600' },
};

function Section({ title, icon: Icon, defaultOpen = false, children, badge, badgeClassName }: {
    title: string; icon: React.ElementType; defaultOpen?: boolean;
    children: React.ReactNode; badge?: string; badgeClassName?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden transition-all">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-start group">
                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm group-hover:shadow-md transition-shadow">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold text-sm flex-1">{title}</span>
                {badge && <Badge variant="secondary" className={`text-xs ${badgeClassName || ''}`}>{badge}</Badge>}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            </button>
            <div className={`transition-all duration-300 ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-5 space-y-4 border-t">{children}</div>
            </div>
        </div>
    );
}

export default function EmpAttachmentsTab({ employeeId, isRTL, mode }: Props) {
    const t = (ar: string, en: string) => isRTL ? ar : en;
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Check expiring documents
    const expiringDocs = documents.filter(d => {
        if (!d.expiry_date) return false;
        const expiry = new Date(d.expiry_date);
        const now = new Date();
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil > 0;
    });

    const expiredDocs = documents.filter(d => {
        if (!d.expiry_date) return false;
        return new Date(d.expiry_date) < new Date();
    });

    const validDocs = documents.filter(d => {
        if (!d.expiry_date) return true;
        return new Date(d.expiry_date) >= new Date();
    });

    function getExpiryStatus(expiryDate: string | null) {
        if (!expiryDate) return null;
        const expiry = new Date(expiryDate);
        const now = new Date();
        const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return { label: t('منتهي', 'Expired'), className: 'bg-red-100 text-red-700', icon: XCircle };
        if (daysUntil <= 30) return { label: t(`ينتهي خلال ${daysUntil} يوم`, `Expires in ${daysUntil} days`), className: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
        return { label: t('ساري', 'Valid'), className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* ═══ Stats Cards ═══ */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('إجمالي المستندات', 'Total Documents')}</p>
                            <p className="text-lg font-bold font-mono">{documents.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('تنتهي قريباً', 'Expiring Soon')}</p>
                            <p className="text-lg font-bold font-mono text-amber-600">{expiringDocs.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('منتهية', 'Expired')}</p>
                            <p className="text-lg font-bold font-mono text-red-600">{expiredDocs.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Expiry Alerts ═══ */}
            {(expiredDocs.length > 0 || expiringDocs.length > 0) && (
                <Section title={t('تنبيهات انتهاء الصلاحية', 'Expiry Alerts')} icon={AlertTriangle} defaultOpen={true}
                    badge={`${expiredDocs.length + expiringDocs.length}`} badgeClassName="bg-red-100 text-red-700">
                    <div className="space-y-2">
                        {expiredDocs.map(doc => {
                            const docType = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
                            return (
                                <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200/50">
                                    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.document_name || (isRTL ? docType.ar : docType.en)}</p>
                                        <p className="text-xs text-red-600">
                                            {t('انتهت في', 'Expired on')} {new Date(doc.expiry_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        {expiringDocs.map(doc => {
                            const docType = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
                            const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.document_name || (isRTL ? docType.ar : docType.en)}</p>
                                        <p className="text-xs text-amber-600">
                                            {t(`تنتهي خلال ${daysLeft} يوم`, `Expires in ${daysLeft} days`)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* ═══ All Documents ═══ */}
            <Section title={t('جميع المستندات', 'All Documents')} icon={FileText} defaultOpen={true}
                badge={`${documents.length}`}>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {t('لا توجد مستندات مرفقة', 'No documents attached')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => {
                            const docType = DOC_TYPES[doc.document_type] || DOC_TYPES.other;
                            const DocIcon = docType.icon;
                            const expiryStatus = getExpiryStatus(doc.expiry_date);
                            const ExpiryIcon = expiryStatus?.icon;

                            return (
                                <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted/40 ${docType.color}`}>
                                        <DocIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">
                                                {doc.document_name || (isRTL ? docType.ar : docType.en)}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] shrink-0">
                                                {isRTL ? docType.ar : docType.en}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {doc.document_number && (
                                                <span className="text-xs text-muted-foreground font-mono">#{doc.document_number}</span>
                                            )}
                                            {doc.issue_date && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(doc.issue_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {expiryStatus && ExpiryIcon && (
                                                <Badge className={`text-[10px] px-1.5 ${expiryStatus.className}`}>
                                                    <ExpiryIcon className="h-3 w-3 me-0.5" />
                                                    {expiryStatus.label}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {doc.file_url && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                                onClick={() => window.open(doc.file_url, '_blank')}>
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Section>
        </div>
    );
}
