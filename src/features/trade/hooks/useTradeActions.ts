import { useCallback } from 'react';
import { TradeService } from '../services/TradeService';
import { TradeDocument } from '../types';
import { toast } from 'sonner';
import { useLanguage } from '@/app/providers/LanguageProvider';

export const useTradeActions = (mode: 'sales' | 'purchase') => {
    const { t } = useLanguage();

    const saveDocument = useCallback(async (doc: TradeDocument, isNew: boolean) => {
        try {
            if (isNew) {
                const result = await TradeService.createTradeDocument(doc, mode);
                toast.success(t('messages.savedSuccessfully') || 'Document saved successfully');
                return result;
            } else {
                if (!doc.id) throw new Error('Document ID missing for update');
                await TradeService.updateTradeDocument(doc.id, doc, mode);
                toast.success(t('messages.updatedSuccessfully') || 'Document updated successfully');
                return doc;
            }
        } catch (error: any) {
            console.error('Trade Save Error:', error);
            toast.error(error.message || t('errors.genericSaveError') || 'Failed to save document');
            throw error;
        }
    }, [mode, t]);

    const generateReference = useCallback(async () => {
        return await TradeService.getNextReferenceNumber(mode);
    }, [mode]);

    return {
        saveDocument,
        generateReference
    };
};
