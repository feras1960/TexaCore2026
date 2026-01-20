import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAccounts } from '@/hooks/useAccounts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar as CalendarIcon,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  Hash,
  Keyboard,
  X,
  Wallet
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { AccountCombobox } from './AccountCombobox';
import { AccountTreeSidePanel } from './AccountTreeSidePanel';
import { currencies, costCenters } from '../data/accountingData';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/services/accountsService';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  remainingAmount: number;
  date: string;
  accountId: string; // The customer or supplier account ID
}

interface Container {
  id: string;
  containerNumber: string;
  supplier: string;
  status: 'In Transit' | 'Arrived' | 'Customs' | 'Delivered';
  arrivalDate: string;
}

// أنواع مصاريف الكونتينر
const containerExpenseTypes = [
  { id: 'shipping', nameAr: 'مصاريف شحن', nameEn: 'Shipping Cost' },
  { id: 'customs', nameAr: 'رسوم جمركية', nameEn: 'Customs Duties' },
  { id: 'clearance', nameAr: 'تخليص جمركي', nameEn: 'Clearance Fees' },
  { id: 'transportation', nameAr: 'نقل داخلي', nameEn: 'Transportation' },
  { id: 'unloading', nameAr: 'تفريغ', nameEn: 'Unloading' },
  { id: 'storage', nameAr: 'تخزين', nameEn: 'Storage' },
  { id: 'insurance', nameAr: 'تأمين', nameEn: 'Insurance' },
  { id: 'inspection', nameAr: 'فحص ومعاينة', nameEn: 'Inspection' },
  { id: 'other', nameAr: 'أخرى', nameEn: 'Other' },
];

const mockInvoices: Invoice[] = [
  // Customer A Invoices
  { id: 'inv-1', number: 'INV-001', amount: 5000, remainingAmount: 5000, date: '2024-01-15', accountId: '1131' },
  { id: 'inv-2', number: 'INV-002', amount: 3000, remainingAmount: 1000, date: '2024-02-01', accountId: '1131' },
  // Customer B Invoices
  { id: 'inv-3', number: 'INV-003', amount: 7500, remainingAmount: 7500, date: '2024-01-20', accountId: '1132' },
  // Supplier X Bills
  { id: 'bill-1', number: 'BILL-001', amount: 2000, remainingAmount: 2000, date: '2024-01-10', accountId: '2111' },
  // Supplier Y Bills
  { id: 'bill-2', number: 'BILL-002', amount: 4500, remainingAmount: 4500, date: '2024-02-05', accountId: '2112' },
];

const mockContainers: Container[] = [
  { id: 'CN-1001', containerNumber: 'MSKU1234567', supplier: 'China Electronics', status: 'In Transit', arrivalDate: '2024-04-15' },
  { id: 'CN-1002', containerNumber: 'HLCU8901234', supplier: 'Global Textiles', status: 'Arrived', arrivalDate: '2024-03-28' },
  { id: 'CN-1003', containerNumber: 'COSU5678901', supplier: 'Raw Materials Co.', status: 'Customs', arrivalDate: '2024-03-30' },
  { id: 'CN-1004', containerNumber: 'MSKU4321098', supplier: 'Tech Parts Ltd', status: 'Delivered', arrivalDate: '2024-03-10' },
  { id: 'CN-1005', containerNumber: 'HLCU1122334', supplier: 'Auto Spares Inc', status: 'In Transit', arrivalDate: '2024-04-20' },
];

interface JournalEntryRow {
  id: number;
  debit: number | '';
  credit: number | '';
  accountId: string;
  description: string;
  currency: string;
  exchangeRate: number;
  costCenter: string;
  invoiceId?: string;
  // ربط بالكونتينر
  linkType?: 'invoice' | 'container' | 'none';
  containerId?: string;
  containerExpenseType?: string;
}

interface CashJournalFormProps {
  isActive: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  mode?: 'all' | 'receipt' | 'payment';
}

export default function CashJournalForm({ isActive, onDirtyChange, onSave, onCancel, mode = 'all', onVoucherNoChange }: CashJournalFormProps) {
  const { t, language, direction } = useLanguage();
  const { companyId } = useCompany();
  const { accounts, loading: accountsLoading } = useAccounts({ companyId: companyId || undefined, autoFetch: !!companyId });
  const [date, setDate] = useState<Date>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<JournalEntryRow[]>([]);
  const [treePanelOpen, setTreePanelOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Transform accounts from Supabase format to AccountCombobox format
  const accountsForCombobox = useMemo(() => {
    return accounts
      .filter(acc => !acc.is_group && acc.is_active) // Only active, non-group accounts
      .map(acc => ({
        id: acc.id,
        code: acc.code,
        name: acc.name_en || acc.name,
        nameAr: acc.name,
      }));
  }, [accounts]);

  // Filter for Cash and Bank accounts (Assets -> Current Assets -> Cash/Bank)
  // Filter by account_type = 'asset' and code starts with 11 (typically cash/bank accounts)
  const cashBankAccounts = useMemo(() => {
    return accounts
      .filter(acc => 
        acc.account_type === 'asset' && 
        !acc.is_group && 
        acc.is_active &&
        (acc.code.startsWith('11') || acc.code.startsWith('101') || acc.code.startsWith('102'))
      )
      .map(acc => ({
        id: acc.id,
        code: acc.code,
        name: acc.name_en || acc.name,
        nameAr: acc.name,
      }));
  }, [accounts]);

  const isDirty = React.useMemo(() => {
    if (reference || description || selectedAccountId) return true;
    return rows.some(row => 
      row.debit !== '' || 
      row.credit !== '' || 
      row.accountId !== '' || 
      row.description !== ''
    );
  }, [reference, description, rows]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // Get next voucher number automatically based on mode
  useEffect(() => {
    if (!companyId || !isActive) return;
    
    const fetchNextVoucherNo = async () => {
      try {
        const prefix = mode === 'receipt' ? 'RV' : mode === 'payment' ? 'PV' : 'CV';
        const { data, error } = await supabase
          .from('journal_entries')
          .select('voucher_no')
          .eq('company_id', companyId)
          .like('voucher_no', `${prefix}-%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data?.voucher_no) {
          const match = data.voucher_no.match(/(\d+)$/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            const year = new Date().getFullYear();
            const voucherNo = `${prefix}-${year}${String(nextNum).padStart(4, '0')}`;
            setReference(voucherNo);
            onVoucherNoChange?.(voucherNo);
          } else {
            const voucherNo = `${prefix}-${new Date().getFullYear()}0001`;
            setReference(voucherNo);
            onVoucherNoChange?.(voucherNo);
          }
        } else {
          const year = new Date().getFullYear();
          const voucherNo = `${prefix}-${year}0001`;
          setReference(voucherNo);
          onVoucherNoChange?.(voucherNo);
        }
      } catch (err) {
        console.error('Error fetching next voucher number:', err);
        const year = new Date().getFullYear();
        const prefix = mode === 'receipt' ? 'RV' : mode === 'payment' ? 'PV' : 'CV';
        const voucherNo = `${prefix}-${year}0001`;
        setReference(voucherNo);
        onVoucherNoChange?.(voucherNo);
      }
    };

    fetchNextVoucherNo();
  }, [companyId, isActive, mode, onVoucherNoChange]);

  // Initialize with 4 rows
  useEffect(() => {
    const initialRows = Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      debit: '' as const,
      credit: '' as const,
      accountId: '',
      description: '',
      currency: 'SAR',
      exchangeRate: 1,
      costCenter: ''
    }));
    setRows(initialRows);
    setDate(new Date());
    setSelectedAccountId('');
    if (!reference) {
      setReference('');
    }
    setDescription('');
  }, []);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        debit: '',
        credit: '',
        accountId: '',
        description: '',
        currency: 'SAR',
        exchangeRate: 1,
        costCenter: ''
      }
    ]);
  };

  const updateRow = (id: number, field: keyof JournalEntryRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updates: Partial<JournalEntryRow> = { [field]: value };
        
        // If updating accountId, clear invoiceId and container
        if (field === 'accountId') {
          updates.invoiceId = undefined;
          updates.containerId = undefined;
          updates.containerExpenseType = undefined;
          updates.linkType = undefined;
        }
        
        // If updating linkType, clear the opposite link
        if (field === 'linkType') {
          if (value === 'invoice') {
            updates.containerId = undefined;
            updates.containerExpenseType = undefined;
          } else if (value === 'container') {
            updates.invoiceId = undefined;
          } else {
            updates.invoiceId = undefined;
            updates.containerId = undefined;
            updates.containerExpenseType = undefined;
          }
        }
        
        // If updating debit and it has a value, clear credit
        if (field === 'debit' && value !== '') {
          updates.credit = '';
        }
        
        // If updating credit and it has a value, clear debit
        if (field === 'credit' && value !== '') {
          updates.debit = '';
        }
        
        return { ...row, ...updates };
      }
      return row;
    }));
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      const newRows = rows.filter(row => row.id !== id);
      setRows(newRows);
      // Force re-render to fix spacing and numbering
      setTimeout(() => {
        // Focus on the first field of the row that replaced the deleted one
        const deletedIndex = rows.findIndex(r => r.id === id);
        if (deletedIndex >= 0 && deletedIndex < newRows.length) {
          const firstField = mode === 'receipt' ? 'credit' : mode === 'payment' ? 'debit' : 'credit';
          const element = document.getElementById(`cell-${deletedIndex}-${firstField}`);
          element?.focus();
        }
      }, 0);
    }
  };

  // Balance entry - add difference to current row
  const balanceEntry = (rowIndex: number) => {
    const currentTotalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
    const currentTotalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
    const diff = currentTotalDebit - currentTotalCredit;
    
    if (Math.abs(diff) < 0.01) {
      return; // Already balanced
    }

    const row = rows[rowIndex];
    const currentDebit = Number(row.debit) || 0;
    const currentCredit = Number(row.credit) || 0;
    
    // If diff is positive, we need more credit (add to credit)
    // If diff is negative, we need more debit (add to debit)
    if (diff > 0) {
      // Need more credit
      if (currentDebit > 0) {
        // Clear debit and set credit
        updateRow(row.id, 'debit', '');
        updateRow(row.id, 'credit', Math.abs(diff).toFixed(2));
      } else {
        // Add to existing credit
        updateRow(row.id, 'credit', (currentCredit + Math.abs(diff)).toFixed(2));
      }
    } else {
      // Need more debit
      if (currentCredit > 0) {
        // Clear credit and set debit
        updateRow(row.id, 'credit', '');
        updateRow(row.id, 'debit', Math.abs(diff).toFixed(2));
      } else {
        // Add to existing debit
        updateRow(row.id, 'debit', (currentDebit + Math.abs(diff)).toFixed(2));
      }
    }
  };

  // Duplicate row
  const duplicateRow = (id: number) => {
    const rowToDuplicate = rows.find(r => r.id === id);
    if (rowToDuplicate) {
      const newRow: JournalEntryRow = {
        id: Date.now(),
        debit: rowToDuplicate.debit,
        credit: rowToDuplicate.credit,
        accountId: rowToDuplicate.accountId,
        description: rowToDuplicate.description,
        currency: rowToDuplicate.currency,
        exchangeRate: rowToDuplicate.exchangeRate,
        costCenter: rowToDuplicate.costCenter,
        linkType: rowToDuplicate.linkType,
        invoiceId: rowToDuplicate.invoiceId,
        containerId: rowToDuplicate.containerId,
        containerExpenseType: rowToDuplicate.containerExpenseType
      };
      const rowIndex = rows.findIndex(r => r.id === id);
      const newRows = [...rows];
      newRows.splice(rowIndex + 1, 0, newRow);
      setRows(newRows);
    }
  };

  // Handle account selection from tree panel - always add new row on double-click
  const handleAccountSelectFromTree = (account: Account) => {
    // Always add new row with selected account (double-click behavior)
    const newRow: JournalEntryRow = {
      id: Date.now(),
      debit: '',
      credit: '',
      accountId: account.id,
      description: '',
      currency: 'SAR',
      exchangeRate: 1,
      costCenter: ''
    };
    setRows([...rows, newRow]);
    setSelectedAccountIds(prev => new Set(prev).add(account.id));
    setActiveRowIndex(rows.length);
    
    // Close tree panel after selection
    setTreePanelOpen(false);
    setActiveRowIndex(null);
  };

  // Open tree panel for specific row
  const openTreePanel = (rowIndex: number) => {
    setActiveRowIndex(rowIndex);
    setTreePanelOpen(true);
  };

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  
  // For Cash Journal: Receipts (Credit) - Payments (Debit)
  // If mode is receipt, we only care about totalCredit (which are the lines) matching the header amount? 
  // Actually, usually in these forms you just enter the lines and the system calculates the total.
  // But here we have a "difference" check. 
  // Let's assume for Receipt/Payment modes, the user just enters lines and we don't enforce a header amount check unless we add a header amount field.
  // But the current form doesn't have a header amount field. It just has a "difference" check which implies the user must balance it manually in the table?
  // Wait, if mode is 'all', difference = Credit - Debit.
  // If mode is 'receipt', we are entering Credits. The Debit is the Cash Account.
  // Does the user enter the Cash Account amount? No.
  // So for Receipt/Payment modes, we probably don't need to check difference against 0, 
  // because the "other side" is implicit (the Header Account).
  // So difference should be 0 only for 'all' mode?
  // Or maybe we should show the "Total" and that's it.
  
  const difference = mode === 'all' ? totalCredit - totalDebit : 0;

  const handleSave = () => {
    if (Math.abs(difference) > 0.01) {
      // alert(`${t('difference')}: ${difference.toFixed(2)}`);
      // return;
    }
    // Close tree panel if open
    setTreePanelOpen(false);
    setActiveRowIndex(null);
    // Save logic here
    onSave();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    index: number,
    field: keyof JournalEntryRow
  ) => {
    // Debug: Log keyboard events (can be removed later)
    // console.log('KeyDown:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey, 'Index:', index, 'Field:', field);
    // Tab: Auto-add new row when at last row and last field
    if (e.key === 'Tab' && !e.shiftKey) {
      // Last field is always exchangeRate regardless of mode
      const isLastRow = index === rows.length - 1;
      const isLastField = field === 'exchangeRate';
      
      // If at last row and last field, add new row
      if (isLastRow && isLastField) {
        e.preventDefault();
        addRow();
        // Focus on first field of new row (depends on mode)
        setTimeout(() => {
          const newRowIndex = rows.length;
          const firstField = mode === 'receipt' ? 'credit' : mode === 'payment' ? 'debit' : 'credit';
          const element = document.getElementById(`cell-${newRowIndex}-${firstField}`);
          element?.focus();
        }, 0);
        return;
      }
    }

    // Keyboard Shortcuts
    // F2 or = : Balance entry (add difference to current row)
    if (e.key === 'F2' || (e.key === '=' && !e.shiftKey && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      balanceEntry(index);
      return;
    }

    // Ctrl+Enter or Ctrl+N: Add new row
    if ((e.key === 'Enter' || e.key === 'n') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addRow();
      // Focus on first field of new row
      setTimeout(() => {
        const newRowIndex = rows.length;
        const firstField = mode === 'receipt' ? 'credit' : mode === 'payment' ? 'debit' : 'credit';
        const element = document.getElementById(`cell-${newRowIndex}-${firstField}`);
        element?.focus();
      }, 0);
      return;
    }

    // Ctrl+D: Duplicate current row
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      duplicateRow(rows[index].id);
      return;
    }

    // Ctrl+S: Save
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }

    // Ctrl+ArrowDown: Copy current field from previous row to current row
    if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      // Copy the current field from previous row to current row
      if (index > 0) {
        const prevRow = rows[index - 1];
        const currentRow = rows[index];
        
        // Copy the field value from previous row to current row
        const prevValue = prevRow[field];
        if (prevValue !== undefined && prevValue !== null && prevValue !== '') {
          updateRow(currentRow.id, field, prevValue);
          
          // If copying accountId, also update selectedAccountIds
          if (field === 'accountId') {
            setSelectedAccountIds(prev => new Set(prev).add(prevValue as string));
          }
        }
        
        // Move focus to next row's same field (infinite loop capability)
        const nextRowIndex = index + 1;
        setTimeout(() => {
          if (nextRowIndex < rows.length) {
            const element = document.getElementById(`cell-${nextRowIndex}-${field}`);
            if (element) {
              element.focus();
              if (element instanceof HTMLInputElement) {
                element.select();
              }
            }
          } else {
            // Add new row and focus on same field
            const newRow: JournalEntryRow = {
              id: Date.now(),
              debit: '',
              credit: '',
              accountId: '',
              description: '',
              currency: 'SAR',
              exchangeRate: 1,
              costCenter: ''
            };
            setRows([...rows, newRow]);
            setTimeout(() => {
              const element = document.getElementById(`cell-${nextRowIndex}-${field}`);
              if (element) {
                element.focus();
                if (element instanceof HTMLInputElement) {
                  element.select();
                }
              }
            }, 10);
          }
        }, 0);
      }
      return;
    }

    // Delete: Remove row (only if not typing in input)
    if (e.key === 'Delete' && !(e.target instanceof HTMLInputElement && (e.target as HTMLInputElement).selectionStart !== (e.target as HTMLInputElement).selectionEnd)) {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (rows.length > 1) {
          removeRow(rows[index].id);
        }
        return;
      }
    }

    // Copy from above logic (= to copy from previous row)
    if ((e.key === 'Enter' || e.key === 'Tab') && (e.target as HTMLInputElement).value === '=') {
      e.preventDefault();
      if (index > 0) {
        const prevRow = rows[index - 1];
        updateRow(rows[index].id, field, prevRow[field]);
        
        // Move focus to next field if Tab
        if (e.key === 'Tab') {
             // Updated column order for Cash Journal
             const columns: (keyof JournalEntryRow)[] = [
                'credit', 'debit', 'accountId', 'linkType', 'invoiceId', 'containerId', 'containerExpenseType', 'description', 'costCenter', 'currency', 'exchangeRate'
              ];
             let nextColIndex = columns.indexOf(field);
             let nextRow = index;
             
             // Standard Tab behavior is always forward in DOM
             nextColIndex = nextColIndex + 1;
             
             if (nextColIndex >= columns.length) {
                 nextColIndex = 0;
                 nextRow = index + 1;
             }
             
             if (nextRow < rows.length) {
                 const nextField = columns[nextColIndex];
                 const element = document.getElementById(`cell-${nextRow}-${nextField}`);
                 element?.focus();
             }
        }
      }
      return;
    }

    // Arrow Navigation (only if not Ctrl/Cmd pressed)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
      const target = e.currentTarget as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // For Left/Right in inputs, only move if at boundary
      if (isInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const input = target as HTMLInputElement;
        if (e.key === 'ArrowLeft' && input.selectionStart !== 0) return;
        if (e.key === 'ArrowRight' && input.selectionStart !== input.value.length) return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Updated column order for Cash Journal
      const columns: (keyof JournalEntryRow)[] = [
        'credit', 'debit', 'accountId', 'linkType', 'invoiceId', 'containerId', 'containerExpenseType', 'description', 'costCenter', 'currency', 'exchangeRate'
      ];
      
      let nextRow = index;
      let nextColIndex = columns.indexOf(field);

      if (e.key === 'ArrowUp') {
        nextRow = Math.max(0, index - 1);
      }
      if (e.key === 'ArrowDown') {
        nextRow = Math.min(rows.length - 1, index + 1);
      }
      
      if (e.key === 'ArrowLeft') {
        if (direction === 'rtl') {
           nextColIndex = Math.min(columns.length - 1, nextColIndex + 1);
        } else {
           nextColIndex = Math.max(0, nextColIndex - 1);
        }
      }
      
      if (e.key === 'ArrowRight') {
        if (direction === 'rtl') {
           nextColIndex = Math.max(0, nextColIndex - 1);
        } else {
           nextColIndex = Math.min(columns.length - 1, nextColIndex + 1);
        }
      }

      const nextField = columns[nextColIndex];
      const elementId = `cell-${nextRow}-${nextField}`;
      
      // Try to find element by ID first
      let element = document.getElementById(elementId);
      
      // If not found, try to find input/select within the cell
      if (!element) {
        const cell = document.querySelector(`[id="${elementId}"]`);
        if (cell) {
          element = cell as HTMLElement;
        } else {
          // Try finding by data attribute or parent cell
          const allCells = document.querySelectorAll(`[id*="cell-${nextRow}-"]`);
          for (const cell of allCells) {
            if (cell.id.includes(`-${nextField}`)) {
              element = cell as HTMLElement;
              break;
            }
          }
        }
      }
      
      if (element) {
        element.focus();
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          setTimeout(() => {
            element.select();
          }, 0);
        }
      } else {
        // Fallback: try to find by querySelector
        const fallbackElement = document.querySelector(`#cell-${nextRow}-${nextField}`) as HTMLElement;
        if (fallbackElement) {
          fallbackElement.focus();
          if (fallbackElement instanceof HTMLInputElement) {
            setTimeout(() => fallbackElement.select(), 0);
          }
        }
      }
    }
  };


  // Mock fund balances
  const fundBalances: Record<string, number> = {
    '1111': 45000, // الصندوق الرئيسي
    '1112': 12000, // صندوق المبيعات
    '1121': 125000, // بنك الراجحي
    '1122': 85000, // بنك الأهلي
  };

  // Get selected fund balance
  const selectedFundBalance = selectedAccountId ? (fundBalances[selectedAccountId] || 0) : 0;
  
  // Calculate balance after transaction
  const balanceAfter = React.useMemo(() => {
    if (mode === 'receipt') {
      return selectedFundBalance + totalCredit;
    } else if (mode === 'payment') {
      return selectedFundBalance - totalDebit;
    } else {
      // For 'all' mode: Credits increase, Debits decrease
      return selectedFundBalance + totalCredit - totalDebit;
    }
  }, [selectedFundBalance, totalCredit, totalDebit, mode]);

  // Format number with English numerals
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <TooltipProvider>
    <div className={cn("flex flex-col h-full relative", !isActive && "hidden")} dir={direction}>
      {/* Account Tree Side Panel */}
      <AccountTreeSidePanel
        accounts={accounts}
        open={treePanelOpen}
        onClose={() => {
          setTreePanelOpen(false);
          setActiveRowIndex(null);
        }}
        onAccountSelect={handleAccountSelectFromTree}
        selectedAccountIds={selectedAccountIds}
      />
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Enhanced Header Form */}
          <Card className="p-4 bg-white dark:bg-gray-900/80 border-0 shadow-lg rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {t('date')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm rounded-lg border-gray-200 dark:border-gray-700",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className={cn("h-4 w-4 text-gray-400", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                      {date ? format(date, "dd/MM/yyyy") : <span>{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align={direction === 'rtl' ? 'end' : 'start'}>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      locale={language === 'ar' ? ar : undefined}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('reference')}
                </Label>
                <Input 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={language === 'ar' ? 'PMT-001' : 'PMT-001'}
                  className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-700"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <Wallet className="w-3 h-3" />
                  {language === 'ar' ? 'الصندوق/البنك' : 'Cash/Bank'}
                </Label>
                <AccountCombobox 
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  accounts={cashBankAccounts}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 h-9"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t('description')}
                </Label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={language === 'ar' ? 'الوصف...' : 'Description...'}
                  className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Fund Balance Display */}
            {selectedAccountId && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <Wallet className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-gray-600">{language === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}:</span>
                      <span className="font-mono text-sm font-bold text-purple-700" dir="ltr">{formatNumber(selectedFundBalance)}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-xs text-gray-600">{language === 'ar' ? 'الرصيد بعد' : 'Balance After'}:</span>
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        balanceAfter >= selectedFundBalance ? "text-green-600" : "text-orange-600"
                      )} dir="ltr">{formatNumber(balanceAfter)}</span>
                      {balanceAfter < 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5">
                          {language === 'ar' ? 'سالب!' : 'Negative!'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {cashBankAccounts.find(a => a.id === selectedAccountId)?.name || ''}
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Enhanced Lines Table */}
          <Card className="bg-white dark:bg-gray-900/80 rounded-2xl border-0 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 flex justify-between items-center">
              <div className={cn("flex items-center gap-2", direction === 'rtl' && "flex-row-reverse")}>
                <div className="p-1.5 rounded-lg bg-erp-navy/10 dark:bg-white/10">
                  <FileText className="w-4 h-4 text-erp-navy dark:text-white" />
                </div>
                <h3 className="font-bold text-erp-navy dark:text-white text-sm">
                  {language === 'ar' ? 'بنود السند' : 'Entry Lines'}
                </h3>
              </div>
              <div className={cn("flex items-center gap-2 text-xs text-gray-500", direction === 'rtl' && "flex-row-reverse")}>
                <Keyboard className="w-3 h-3" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted">
                      {language === 'ar' ? 'اختصارات' : 'Shortcuts'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">F2</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">=</kbd> {t('accounting.balanceEntry')}</div>
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Enter</kbd> {t('accounting.addRow')}</div>
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">D</kbd> {t('accounting.duplicateRow')}</div>
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">↓</kbd> {t('accounting.copyAccountDown')}</div>
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">S</kbd> {t('accounting.save')}</div>
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">=</kbd> {language === 'ar' ? 'نسخ من أعلى' : 'Copy from above'}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            <div className="overflow-x-auto border rounded-lg">
              <Table className="border-collapse w-full">
                <TableHeader className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <TableRow className="h-8">
                    <TableHead className="w-[40px] text-center text-xs font-bold border border-gray-300 p-1 px-2 text-erp-navy">#</TableHead>
                    {(mode === 'all' || mode === 'receipt') && (
                      <TableHead className="w-[120px] text-center text-xs font-bold border border-gray-300 p-1 px-2 text-erp-navy">
                        {mode === 'receipt' ? (language === 'ar' ? 'المبلغ' : 'Amount') : (language === 'ar' ? 'مقبوضات' : 'Credit')}
                      </TableHead>
                    )}
                    {(mode === 'all' || mode === 'payment') && (
                      <TableHead className="w-[120px] text-center text-xs font-bold border border-gray-300 p-1 px-2 text-erp-navy">
                        {mode === 'payment' ? (language === 'ar' ? 'المبلغ' : 'Amount') : (language === 'ar' ? 'مدفوعات' : 'Debit')}
                      </TableHead>
                    )}
                    <TableHead className="w-[180px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'الحساب' : 'Account'}
                    </TableHead>
                    <TableHead className="w-[90px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'الربط' : 'Link'}
                    </TableHead>
                    <TableHead className="w-[130px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'المستند' : 'Document'}
                    </TableHead>
                    {mode === 'payment' && (
                      <TableHead className="w-[110px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                        {language === 'ar' ? 'نوع المصروف' : 'Expense Type'}
                      </TableHead>
                    )}
                    <TableHead className="border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'البيان' : 'Description'}
                    </TableHead>
                    <TableHead className="w-[90px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'م.التكلفة' : 'Cost Center'}
                    </TableHead>
                    <TableHead className="w-[65px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'العملة' : 'Curr'}
                    </TableHead>
                    <TableHead className="w-[85px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'سعر الصرف' : 'Ex. Rate'}
                    </TableHead>
                    <TableHead className="w-[45px] border border-gray-300 p-1 px-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow 
                      key={row.id} 
                      className="hover:bg-gray-50/50"
                    >
                      <TableCell className="p-1 px-2 text-center border border-gray-300">
                        <span className="text-[11px] font-mono text-gray-500">
                          {index + 1}
                        </span>
                      </TableCell>
                      
                      {(mode === 'all' || mode === 'receipt') && (
                        <TableCell className="p-0 border border-gray-300">
                          <Input
                            id={`cell-${index}-credit`}
                            onKeyDown={(e) => handleKeyDown(e, index, 'credit')}
                            type="text"
                            inputMode="decimal"
                            value={row.credit}
                            onChange={(e) => updateRow(row.id, 'credit', e.target.value)}
                            className={cn(
                              "h-8 w-full text-center border-0 shadow-none rounded-none px-2 bg-transparent font-mono text-[11px]",
                              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500",
                              row.credit && "text-green-600 font-semibold"
                            )}
                            placeholder="0.00"
                            dir="ltr"
                          />
                        </TableCell>
                      )}
                      
                      {(mode === 'all' || mode === 'payment') && (
                        <TableCell className="p-0 border border-gray-300">
                          <Input
                            id={`cell-${index}-debit`}
                            onKeyDown={(e) => handleKeyDown(e, index, 'debit')}
                            type="text"
                            inputMode="decimal"
                            value={row.debit}
                            onChange={(e) => updateRow(row.id, 'debit', e.target.value)}
                            className={cn(
                              "h-8 w-full text-center border-0 shadow-none rounded-none px-2 bg-transparent font-mono text-[11px]",
                              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500",
                              row.debit && "text-rose-600 font-semibold"
                            )}
                            placeholder="0.00"
                            dir="ltr"
                          />
                        </TableCell>
                      )}
                      
                      <TableCell className="p-0 border border-gray-300">
                        <AccountCombobox 
                          id={`cell-${index}-accountId`}
                          onKeyDown={(e: any) => handleKeyDown(e, index, 'accountId')}
                          value={row.accountId}
                          onChange={(val: any) => {
                            updateRow(row.id, 'accountId', val);
                            if (val) {
                              setSelectedAccountIds(prev => new Set(prev).add(val));
                            }
                          }}
                          accounts={accountsForCombobox}
                          className="border-0 h-8 w-full text-[11px]"
                          onOpenTree={() => openTreePanel(index)}
                        />
                      </TableCell>
                      
                      {/* نوع الربط */}
                      <TableCell className="p-1 px-2 border border-gray-300">
                        <Select
                          value={row.linkType || 'none'}
                          onValueChange={(val) => updateRow(row.id, 'linkType', val)}
                          disabled={!row.accountId}
                        >
                          <SelectTrigger 
                            id={`cell-${index}-linkType`}
                            className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px]"
                            onKeyDown={(e) => handleKeyDown(e, index, 'linkType')}
                          >
                            <SelectValue placeholder={language === 'ar' ? "—" : "—"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="flex items-center gap-2">
                                <X className="w-3 h-3 text-gray-400" />
                                {language === 'ar' ? 'بدون' : 'None'}
                              </span>
                            </SelectItem>
                            {mockInvoices.some(inv => inv.accountId === row.accountId) && (
                              <SelectItem value="invoice">
                                <span className="flex items-center gap-2">
                                  <FileText className="w-3 h-3 text-blue-500" />
                                  {language === 'ar' ? 'فاتورة' : 'Invoice'}
                                </span>
                              </SelectItem>
                            )}
                            {mode === 'payment' && (
                              <SelectItem value="container">
                                <span className="flex items-center gap-2">
                                  <Package className="w-3 h-3 text-purple-500" />
                                  {language === 'ar' ? 'كونتينر' : 'Container'}
                                </span>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* المستند المرتبط */}
                      <TableCell className="p-1 px-2 border border-gray-300">
                        {row.linkType === 'invoice' && (
                          <Select
                            value={row.invoiceId}
                            onValueChange={(val) => updateRow(row.id, 'invoiceId', val)}
                          >
                            <SelectTrigger 
                              id={`cell-${index}-invoiceId`}
                              className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px]"
                              onKeyDown={(e) => handleKeyDown(e, index, 'invoiceId')}
                            >
                              <SelectValue placeholder={language === 'ar' ? "اختر..." : "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {mockInvoices
                                .filter(inv => inv.accountId === row.accountId)
                                .map(inv => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    <span className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{inv.number}</Badge>
                                      <span className="font-mono text-xs">{inv.remainingAmount.toLocaleString()}</span>
                                    </span>
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        )}
                        {row.linkType === 'container' && (
                          <Select
                            value={row.containerId}
                            onValueChange={(val) => updateRow(row.id, 'containerId', val)}
                          >
                            <SelectTrigger 
                              id={`cell-${index}-containerId`}
                              className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px]"
                              onKeyDown={(e) => handleKeyDown(e, index, 'containerId')}
                            >
                              <SelectValue placeholder={language === 'ar' ? "اختر..." : "Select..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {mockContainers
                                .filter(c => c.status !== 'Delivered')
                                .map(container => (
                                  <SelectItem key={container.id} value={container.id}>
                                    <span className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                        {container.containerNumber.slice(0, 8)}
                                      </Badge>
                                    </span>
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        )}
                        {(!row.linkType || row.linkType === 'none') && (
                          <div className="h-8 flex items-center justify-center text-[11px] text-gray-300 dark:text-gray-600">
                            —
                          </div>
                        )}
                      </TableCell>

                      {/* نوع المصروف (للكونتينر فقط) */}
                      {mode === 'payment' && (
                        <TableCell className="p-1 px-2 border border-gray-300">
                          {row.linkType === 'container' && row.containerId ? (
                            <Select
                              value={row.containerExpenseType}
                              onValueChange={(val) => updateRow(row.id, 'containerExpenseType', val)}
                            >
                              <SelectTrigger 
                                id={`cell-${index}-containerExpenseType`}
                                className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px]"
                              >
                                <SelectValue placeholder={language === 'ar' ? "اختر..." : "Select..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {containerExpenseTypes.map(type => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {language === 'ar' ? type.nameAr : type.nameEn}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-8 flex items-center justify-center text-[11px] text-gray-300 dark:text-gray-600">—</div>
                          )}
                        </TableCell>
                      )}
                      
                      <TableCell className="p-0 border border-gray-300">
                        <Input
                          id={`cell-${index}-description`}
                          onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                          value={row.description}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          className="h-8 w-full border-0 shadow-none rounded-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 px-2 bg-transparent text-[11px]"
                          placeholder={language === 'ar' ? 'البيان...' : 'Description...'}
                        />
                      </TableCell>
                      
                      <TableCell className="p-1 px-2 border border-gray-300">
                        <Select
                          value={row.costCenter}
                          onValueChange={(val) => updateRow(row.id, 'costCenter', val)}
                        >
                          <SelectTrigger 
                            id={`cell-${index}-costCenter`}
                            className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px]"
                            onKeyDown={(e) => handleKeyDown(e, index, 'costCenter')}
                          >
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map(cc => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {language === 'ar' ? cc.nameAr : cc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell className="p-0 border border-gray-300">
                        <Select
                          value={row.currency}
                          onValueChange={(val) => {
                            updateRow(row.id, 'currency', val);
                            // Auto-update exchange rate when currency changes
                            if (val === 'SAR') {
                              updateRow(row.id, 'exchangeRate', 1);
                            } else {
                              const defaultRates: Record<string, number> = {
                                'USD': 3.75,
                                'EUR': 4.10,
                                'GBP': 4.75,
                                'AED': 1.02,
                              };
                              updateRow(row.id, 'exchangeRate', defaultRates[val] || 1);
                            }
                          }}
                        >
                          <SelectTrigger 
                            id={`cell-${index}-currency`}
                            onKeyDown={(e) => handleKeyDown(e, index, 'currency')}
                            className="h-8 border-0 shadow-none rounded-none focus:ring-2 focus:ring-inset focus:ring-blue-500 w-full bg-transparent text-[11px] font-medium"
                          >
                            <SelectValue placeholder="SAR" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell className="p-0 border border-gray-300">
                        <Input
                          id={`cell-${index}-exchangeRate`}
                          onKeyDown={(e) => handleKeyDown(e, index, 'exchangeRate')}
                          type="number"
                          step="0.0001"
                          inputMode="decimal"
                          value={row.exchangeRate === 1 ? '' : row.exchangeRate}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 1 : parseFloat(e.target.value) || 1;
                            updateRow(row.id, 'exchangeRate', val);
                          }}
                          className={cn(
                            "h-8 w-full text-center border-0 shadow-none rounded-none px-2 bg-transparent font-mono text-[11px]",
                            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                            row.exchangeRate !== 1 && "text-blue-600 font-semibold"
                          )}
                          placeholder="1.0000"
                          dir="ltr"
                        />
                      </TableCell>
                      
                      <TableCell className="p-1 px-2 text-center border border-gray-300">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => removeRow(row.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>{language === 'ar' ? 'حذف السطر' : 'Delete row'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {/* Totals Footer */}
                <tfoot className="bg-gray-100 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                  <TableRow className="h-9 border-t-2 border-erp-navy">
                    <TableCell className="border border-gray-300 p-1 px-4 text-xs font-bold text-right bg-gray-100">
                      {language === 'ar' ? 'المجموع' : 'TOTALS'}
                    </TableCell>
                    {(mode === 'all' || mode === 'receipt') && (
                      <TableCell className="border border-gray-300 p-1 px-2 text-xs font-bold font-mono text-center bg-green-50 text-green-700" dir="ltr">
                        {formatNumber(totalCredit)}
                      </TableCell>
                    )}
                    {(mode === 'all' || mode === 'payment') && (
                      <TableCell className="border border-gray-300 p-1 px-2 text-xs font-bold font-mono text-center bg-orange-50 text-orange-700" dir="ltr">
                        {formatNumber(totalDebit)}
                      </TableCell>
                    )}
                    <TableCell colSpan={mode === 'payment' ? 7 : 6} className="border border-gray-300 p-1 px-2 text-xs bg-gray-100">
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-gray-500">{language === 'ar' ? 'عدد السطور' : 'Lines'}: <span className="font-mono font-bold text-gray-700">{rows.filter(r => r.accountId).length}</span></span>
                        {mode === 'all' && (
                          <>
                            <div className="w-px h-4 bg-gray-300"></div>
                            <span className="text-gray-500">
                              {language === 'ar' ? 'الفرق' : 'Diff'}: 
                              <span className={cn(
                                "font-mono font-bold ml-1",
                                Math.abs(difference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                              )} dir="ltr">{formatNumber(Math.abs(difference))}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border border-gray-300 p-1 px-2 bg-gray-100"></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
            
            {/* Add Row Button */}
            <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-800/30 dark:to-gray-900/30">
               <Button 
                 variant="ghost" 
                 className={cn(
                   "w-full text-erp-navy dark:text-white hover:bg-erp-teal/10 dark:hover:bg-erp-teal/20 hover:text-erp-teal dark:hover:text-erp-teal rounded-xl h-10 transition-all duration-200",
                   direction === 'rtl' && "flex-row-reverse"
                 )} 
                 onClick={addRow}
               >
                <Plus className={cn("w-4 h-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
                {t('accounting.addNewRow') || (language === 'ar' ? 'إضافة سطر جديد' : 'Add New Row')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Enhanced Footer */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 mt-auto sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className={cn("flex gap-3 w-full items-center", direction === 'rtl' ? 'flex-row-reverse' : '')}>
            {/* Keyboard Shortcut Hint */}
            <div className={cn("hidden sm:flex items-center gap-1.5 text-xs text-gray-400", direction === 'rtl' ? 'mr-auto' : 'mr-auto')}>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">Enter</kbd>
              <span className={direction === 'rtl' ? 'mr-1' : 'ml-1'}>{language === 'ar' ? 'للحفظ' : 'to save'}</span>
            </div>
            
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none sm:w-28 h-11 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800" 
              onClick={onCancel}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            
            <Button 
              onClick={handleSave} 
              className={cn(
                "flex-1 sm:flex-none sm:w-40 h-11 rounded-xl text-white shadow-lg transition-all duration-200",
                mode === 'payment' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25' 
                  : mode === 'receipt'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/25'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-500/25'
              )}
            >
              <Save className={cn("w-4 h-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
              {language === 'ar' ? 'حفظ السند' : 'Save Voucher'}
            </Button>
          </div>
        </div>
    </div>
    </TooltipProvider>
  );
}
