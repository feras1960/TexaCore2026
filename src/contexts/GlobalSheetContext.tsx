/**
 * ════════════════════════════════════════════════════════════════
 * 🌐 GlobalSheetContext — فتح الشيتات من أي مكان بالتطبيق
 * ════════════════════════════════════════════════════════════════
 *
 * يسمح لأي مكوّن (CommandPalette, Dashboard, Sidebar) بفتح
 * شيت تفاصيل (عميل, مورد, حساب, مادة, فاتورة, قيد) بشكل فوري
 * من أي صفحة بالتطبيق بدون الحاجة للتنقل أولاً.
 *
 * ════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { UnifiedDocType } from '@/features/accounting/components/unified/types';

// Lazy-load the sheet
const UnifiedAccountingSheet = lazy(() =>
  import('@/features/accounting/components/unified/UnifiedAccountingSheet').then(m => ({ default: m.UnifiedAccountingSheet }))
);

// ─── Types ──────────────────────────────────────────────────────

export interface GlobalSheetState {
  isOpen: boolean;
  docType: UnifiedDocType;
  documentId?: string;
  data?: any;
  tradeMode?: 'sales' | 'purchase' | 'transfer';
  defaultTab?: string;
}

export type EntityType = 'customer' | 'supplier' | 'account' | 'fund' | 'material' | 'journal' | 'sales_invoice' | 'purchase_invoice';

interface GlobalSheetContextValue {
  sheetState: GlobalSheetState;
  openSheet: (state: GlobalSheetState) => void;
  closeSheet: () => void;
  /** فتح شيت الكيان مباشرة — يجلب البيانات تلقائياً ثم يفتح */
  openEntity: (type: EntityType, id: string, preloadedData?: any) => Promise<void>;
}

const INITIAL_STATE: GlobalSheetState = {
  isOpen: false,
  docType: 'account',
};

const GlobalSheetCtx = createContext<GlobalSheetContextValue>({
  sheetState: INITIAL_STATE,
  openSheet: () => {},
  closeSheet: () => {},
  openEntity: async () => {},
});

export function useGlobalSheet() {
  return useContext(GlobalSheetCtx);
}

// ─── Provider ───────────────────────────────────────────────────

export function GlobalSheetProvider({ children }: { children: React.ReactNode }) {
  const [sheetState, setSheetState] = useState<GlobalSheetState>(INITIAL_STATE);
  const { companyId } = useAuth();

  const openSheet = useCallback((state: GlobalSheetState) => {
    setSheetState(state);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetState(INITIAL_STATE);
  }, []);

  // ─── Smart Entity Opener ─────────────────────────────────────
  const openEntity = useCallback(async (type: EntityType, id: string, preloadedData?: any) => {
    if (!companyId) return;

    try {
      switch (type) {
        case 'customer': {
          // Open immediately with basic data (skeleton)
          setSheetState({
            isOpen: true,
            docType: 'party',
            documentId: id,
            data: { id, type: 'customer', _partyType: 'customer', company_id: companyId, ...(preloadedData || {}) },
          });
          // Fetch full customer data (with receivable account for ledger)
          const { data: fullCustomer } = await supabase
            .from('customers')
            .select('*, account:chart_of_accounts!receivable_account_id(id, name_ar, name_en, account_code)')
            .eq('id', id)
            .single();
          if (fullCustomer) {
            setSheetState(prev => ({
              ...prev,
              data: { ...fullCustomer, type: 'customer', _partyType: 'customer', is_active: fullCustomer.status === 'active' },
            }));
          }
          break;
        }

        case 'supplier': {
          setSheetState({
            isOpen: true,
            docType: 'party',
            documentId: id,
            data: { id, type: 'supplier', _partyType: 'supplier', company_id: companyId, ...(preloadedData || {}) },
          });
          const { data: fullSupplier } = await supabase
            .from('suppliers')
            .select('*, account:chart_of_accounts!payable_account_id(id, name_ar, name_en, account_code)')
            .eq('id', id)
            .single();
          if (fullSupplier) {
            setSheetState(prev => ({
              ...prev,
              data: { ...fullSupplier, type: 'supplier', _partyType: 'supplier', is_active: fullSupplier.status === 'active' },
            }));
          }
          break;
        }

        case 'account': {
          setSheetState({
            isOpen: true,
            docType: 'account',
            documentId: id,
            data: { id, company_id: companyId, ...(preloadedData || {}) },
            defaultTab: 'ledger',
          });
          break;
        }

        case 'fund': {
          // Fetch full fund account data
          const { data: fundAcct } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('id', id)
            .single();
          setSheetState({
            isOpen: true,
            docType: 'fund',
            documentId: id,
            data: {
              id,
              name: fundAcct?.name_ar || preloadedData?.name_ar || '',
              name_ar: fundAcct?.name_ar,
              name_en: fundAcct?.name_en,
              accountId: id,
              account_code: fundAcct?.account_code,
              current_balance: fundAcct?.current_balance || 0,
              currency: fundAcct?.currency || 'USD',
              is_bank_account: fundAcct?.is_bank_account,
              is_cash_account: fundAcct?.is_cash_account,
              company_id: companyId,
            },
            defaultTab: 'ledger',
          });
          break;
        }

        case 'material': {
          setSheetState({
            isOpen: true,
            docType: 'material',
            documentId: id,
            data: { id, company_id: companyId, ...(preloadedData || {}) },
          });
          break;
        }

        case 'journal': {
          // Fetch full journal entry with lines
          const [entryRes, linesRes] = await Promise.all([
            supabase.from('journal_entries').select('*').eq('id', id).single(),
            supabase.from('journal_entry_lines')
              .select('*, account:chart_of_accounts(id, account_code, name_ar, name_en)')
              .eq('entry_id', id)
              .order('line_number', { ascending: true }),
          ]);
          const entry = entryRes.data;
          const lines = (linesRes.data || []).filter((l: any) => l.is_fund_line !== true);
          setSheetState({
            isOpen: true,
            docType: 'journal',
            documentId: id,
            data: {
              ...(entry || {}),
              id,
              lines,
              company_id: entry?.company_id || companyId,
            },
          });
          break;
        }

        case 'sales_invoice': {
          const { TradeService } = await import('@/features/trade/services/TradeService');
          const result = await TradeService.getTradeDocumentWithItems(id, 'invoice');
          const items = (result.items || []).map((dbItem: any) => ({
            item_id: dbItem.product_id || dbItem.material_id || dbItem.id,
            material_id: dbItem.material_id,
            item_name: dbItem.description || dbItem.material_name_ar || '',
            item_code: dbItem.item_code || dbItem.product_code || '',
            quantity: Number(dbItem.quantity) || 0,
            unit_price: Number(dbItem.unit_price) || 0,
            subtotal: Number(dbItem.subtotal) || 0,
            total: Number(dbItem.total) || Number(dbItem.subtotal) || 0,
            unit: dbItem.unit || '',
            discount_pct: Number(dbItem.discount_pct) || 0,
            tax_rate: Number(dbItem.tax_rate) || 0,
            tax_amount: Number(dbItem.tax_amount) || 0,
            currency: dbItem.currency || result.header?.currency || '',
            exchange_rate: Number(dbItem.exchange_rate) || 1,
          }));
          setSheetState({
            isOpen: true,
            docType: 'trade_invoice',
            documentId: id,
            tradeMode: 'sales',
            data: {
              ...(result.header || {}),
              id,
              items,
              type: 'sales',
              subType: 'invoice',
              status: result.header?.status || 'draft',
              company_id: result.header?.company_id || companyId,
            },
          });
          break;
        }

        case 'purchase_invoice': {
          const { TradeService } = await import('@/features/trade/services/TradeService');
          const result = await TradeService.getTradeDocumentWithItems(id, 'purchase_invoice');
          const items = (result.items || []).map((dbItem: any) => ({
            item_id: dbItem.product_id || dbItem.material_id || dbItem.id,
            material_id: dbItem.material_id,
            item_name: dbItem.description || dbItem.material_name_ar || '',
            item_code: dbItem.item_code || '',
            quantity: Number(dbItem.quantity) || 0,
            unit_price: Number(dbItem.unit_price) || 0,
            subtotal: Number(dbItem.subtotal) || 0,
            total: Number(dbItem.total) || Number(dbItem.subtotal) || 0,
            unit: dbItem.unit || '',
            discount_pct: Number(dbItem.discount_pct) || 0,
            tax_rate: Number(dbItem.tax_rate) || 0,
            tax_amount: Number(dbItem.tax_amount) || 0,
            currency: dbItem.currency || result.header?.currency || '',
            exchange_rate: Number(dbItem.exchange_rate) || 1,
          }));
          setSheetState({
            isOpen: true,
            docType: 'trade_invoice',
            documentId: id,
            tradeMode: 'purchase',
            data: {
              ...(result.header || {}),
              id,
              items,
              type: 'purchase',
              subType: 'invoice',
              status: result.header?.status || 'draft',
              company_id: result.header?.company_id || companyId,
            },
          });
          break;
        }
      }
    } catch (err) {
      console.warn('[GlobalSheet] Failed to open entity:', type, id, err);
      // Still show sheet with basic data on error
      setSheetState({
        isOpen: true,
        docType: type === 'customer' || type === 'supplier' ? 'party' : (type as UnifiedDocType),
        documentId: id,
        data: { id, company_id: companyId, ...(preloadedData || {}) },
      });
    }
  }, [companyId]);

  return (
    <GlobalSheetCtx.Provider value={{ sheetState, openSheet, closeSheet, openEntity }}>
      {children}

      {/* ═══ Global Sheet — renders on top of everything ═══ */}
      {sheetState.isOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        }>
          <UnifiedAccountingSheet
            isOpen={sheetState.isOpen}
            onClose={closeSheet}
            docType={sheetState.docType}
            documentId={sheetState.documentId}
            data={sheetState.data}
            tradeMode={sheetState.tradeMode}
            mode="view"
            companyId={companyId}
            enableEditFlow
            defaultTab={sheetState.defaultTab}
          />
        </Suspense>
      )}
    </GlobalSheetCtx.Provider>
  );
}
