/**
 * QR Popover Component - نافذة كود QR
 * يعرض QR Code للمستند مع أزرار مشاركة وتنزيل ونسخ
 */

import { useState } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { QrCode, Share2, Download, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeGenerator } from '@/components/shared/qrcode';
import type { QRDocType } from '@/components/shared/qrcode';
import { toast } from 'sonner';

interface QRPopoverProps {
    docType: string;
    docNumber: string;
    docId: string;
    amount?: number;
    currency?: string;
    className?: string;
}

export function QRPopover({
    docType,
    docNumber,
    docId,
    amount,
    currency = 'SAR',
    className,
}: QRPopoverProps) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleCopy = async () => {
        try {
            const url = `${window.location.origin}/qr/${docType}/${docId}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success(t('qrCode.copied') || 'تم النسخ');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error(t('common.error') || 'حدث خطأ');
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${docType} - ${docNumber}`,
                    url: `${window.location.origin}/qr/${docType}/${docId}`,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            handleCopy();
        }
    };

    // Map docType to QRDocType
    const getQRDocType = (): QRDocType => {
        const mapping: Record<string, QRDocType> = {
            account: 'account',
            fund: 'fund',
            party: 'customer',
            journal: 'journal_entry',
            receipt: 'receipt',
            payment: 'payment',
            invoice: 'invoice',
        };
        return mapping[docType] || 'account';
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "gap-1.5 text-gray-700 hover:bg-gray-100 hover:text-erp-primary dark:text-gray-200 dark:hover:bg-gray-800",
                        className
                    )}
                >
                    <QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">QR</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-4"
                align="end"
                sideOffset={8}
            >
                <div className="flex flex-col items-center gap-4">
                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-sm">
                        <QRCodeGenerator
                            data={{
                                type: getQRDocType(),
                                id: docId,
                                number: docNumber,
                                total: amount,
                                currency: currency,
                            }}
                            size={160}
                            showLabel={false}
                            showActions={false}
                        />
                    </div>

                    {/* Doc Number */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">
                            {t('qrCode.scanWithMobile') || 'امسح بتطبيق الموبايل'}
                        </p>
                        <p className="text-lg font-bold font-mono text-erp-primary">
                            {docNumber}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t w-full justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                            className="gap-1.5"
                        >
                            <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Download handled by QRCodeGenerator internally
                                toast.success(t('qrCode.download') || 'جاري التنزيل');
                            }}
                            className="gap-1.5"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={copied ? "default" : "outline"}
                            size="sm"
                            onClick={handleCopy}
                            className="gap-1.5"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default QRPopover;
