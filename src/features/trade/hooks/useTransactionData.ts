/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 useTransactionData — جلب وإدارة بيانات المعاملات الموحدة
 * ═══════════════════════════════════════════════════════════════
 * - جلب معاملة واحدة مع البنود والسجلات
 * - جلب قائمة معاملات مع فلاتر
 * - تحديث متفائل (optimistic updates)
 * - إعادة تحميل تلقائية بعد التغييرات
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TradeService } from '../services/TradeService';
import type { PurchaseTransaction, PurchaseTransactionItem, TransactionStageLog } from '../types';
import type { PurchaseStage } from '../config/stageConfig';

// ═══ Single Transaction Hook ═══

interface UseTransactionOptions {
    /** Transaction ID (null = new/unsaved) */
    id: string | null;
    /** Transaction type */
    type?: 'purchase' | 'sale';
    /** Include items? */
    withItems?: boolean;
    /** Include stage logs? */
    withLogs?: boolean;
    /** Auto-fetch on mount? */
    enabled?: boolean;
}

interface UseTransactionReturn {
    transaction: PurchaseTransaction | null;
    items: PurchaseTransactionItem[];
    logs: TransactionStageLog[];
    isLoading: boolean;
    error: string | null;
    /** Reload data from server */
    refetch: () => Promise<void>;
    /** Update local state optimistically */
    setTransaction: React.Dispatch<React.SetStateAction<PurchaseTransaction | null>>;
    setItems: React.Dispatch<React.SetStateAction<PurchaseTransactionItem[]>>;
}

export function useTransactionData({
    id,
    type = 'purchase',
    withItems = true,
    withLogs = true,
    enabled = true,
}: UseTransactionOptions): UseTransactionReturn {
    const [transaction, setTransaction] = useState<PurchaseTransaction | null>(null);
    const [items, setItems] = useState<PurchaseTransactionItem[]>([]);
    const [logs, setLogs] = useState<TransactionStageLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchIdRef = useRef(0); // prevent race conditions

    const refetch = useCallback(async () => {
        if (!id) {
            setTransaction(null);
            setItems([]);
            setLogs([]);
            return;
        }

        const fetchId = ++fetchIdRef.current;
        setIsLoading(true);
        setError(null);

        try {
            const result = await TradeService.getUnifiedById(id, type, {
                withItems,
                withLogs,
            });

            // Only apply if this is still the most recent fetch
            if (fetchId === fetchIdRef.current) {
                setTransaction(result.transaction);
                setItems(result.items);
                setLogs(result.logs);
            }
        } catch (err: any) {
            if (fetchId === fetchIdRef.current) {
                setError(err?.message || 'Failed to load transaction');
                console.error('[useTransactionData] Fetch error:', err);
            }
        } finally {
            if (fetchId === fetchIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [id, type, withItems, withLogs]);

    // Auto-fetch on mount and when id changes
    useEffect(() => {
        if (enabled && id) {
            refetch();
        }
    }, [enabled, id, refetch]);

    return {
        transaction,
        items,
        logs,
        isLoading,
        error,
        refetch,
        setTransaction,
        setItems,
    };
}

// ═══ Transaction List Hook ═══

interface UseTransactionListOptions {
    type?: 'purchase' | 'sale';
    stage?: PurchaseStage | PurchaseStage[];
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    companyId?: string;
    limit?: number;
    enabled?: boolean;
}

interface UseTransactionListReturn {
    transactions: PurchaseTransaction[];
    totalCount: number;
    isLoading: boolean;
    error: string | null;
    page: number;
    setPage: (page: number) => void;
    refetch: () => Promise<void>;
}

export function useTransactionList({
    type = 'purchase',
    stage,
    supplierId,
    dateFrom,
    dateTo,
    search,
    companyId,
    limit = 50,
    enabled = true,
}: UseTransactionListOptions = {}): UseTransactionListReturn {
    const [transactions, setTransactions] = useState<PurchaseTransaction[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await TradeService.getUnifiedList(type, {
                stage,
                supplier_id: supplierId,
                dateFrom,
                dateTo,
                search,
                companyId,
                limit,
                offset: page * limit,
            });

            setTransactions(result.data);
            setTotalCount(result.count);
        } catch (err: any) {
            setError(err?.message || 'Failed to load transactions');
            console.error('[useTransactionList] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [type, stage, supplierId, dateFrom, dateTo, search, companyId, limit, page]);

    useEffect(() => {
        if (enabled) {
            refetch();
        }
    }, [enabled, refetch]);

    return {
        transactions,
        totalCount,
        isLoading,
        error,
        page,
        setPage,
        refetch,
    };
}

export default useTransactionData;
