import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Printer,
    Copy,
    Edit,
    Trash2,
    FileText,
    Share2,
    QrCode,
    Download,
    Ban,
    CheckCircle2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/app/providers/LanguageProvider';

interface EntryActionToolbarProps {
    mode: 'view' | 'edit' | 'create';
    status?: string;
    onEdit?: () => void;
    onPrint?: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    onPost?: () => void;
    onUnpost?: () => void;
    onCancel?: () => void; // Cancel entry (void)
    onShare?: () => void;
    onToggleQR?: () => void;
    className?: string;
}

export function EntryActionToolbar({
    mode,
    status = 'draft',
    onEdit,
    onPrint,
    onCopy,
    onDelete,
    onPost,
    onUnpost,
    onCancel,
    onShare,
    onToggleQR,
    className
}: EntryActionToolbarProps) {
    const { t } = useLanguage();

    if (mode === 'create') return null;

    return (
        <div className={cn("flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg border shadow-sm", className)}>

            {/* Primary Actions */}
            <TooltipProvider delayDuration={0}>

                {/* Post/Unpost */}
                {status === 'posted' ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={onUnpost} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                                <Ban className="w-4 h-4 mr-1" />
                                <span className="text-xs">{t('accounting.unpost')}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('accounting.tooltips.unpost')}</TooltipContent>
                    </Tooltip>
                ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={onPost} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                <span className="text-xs">{t('actions.post')}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('accounting.tooltips.post')}</TooltipContent>
                    </Tooltip>
                )}

                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Edit (only if not posted) */}
                {status !== 'posted' && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={onEdit}>
                                <Edit className="w-4 h-4 mr-1" />
                                <span className="text-xs">{t('common.edit')}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('accounting.tooltips.edit')}</TooltipContent>
                    </Tooltip>
                )}

                {/* Print & Export */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrint}>
                            <Printer className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.print')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleQR}>
                            <QrCode className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('accounting.tooltips.showQR')}</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy}>
                            <Copy className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('accounting.tooltips.duplicate')}</TooltipContent>
                </Tooltip>

                {/* Danger Zone */}
                {status !== 'posted' && (
                    <>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('accounting.tooltips.delete')}</TooltipContent>
                        </Tooltip>
                    </>
                )}

            </TooltipProvider>
        </div>
    );
}
