import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { useCompany } from '@/hooks/useCompany';
import { useAccounts } from '@/hooks/useAccounts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Hash,
  Keyboard
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

interface JournalEntryRow {
  id: number;
  debit: number | '';
  credit: number | '';
  accountId: string;
  description: string;
  currency: string;
  exchangeRate: number;
  costCenter: string;
}

interface JournalEntryFormProps {
  isActive: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onVoucherNoChange?: (voucherNo: string) => void;
}

export default function JournalEntryForm({ isActive, onDirtyChange, onSave, onCancel, onVoucherNoChange }: JournalEntryFormProps) {
  const { t, language, direction } = useLanguage();
  const { companyId } = useCompany();
  const { accounts, loading: accountsLoading } = useAccounts({ companyId: companyId || undefined, autoFetch: !!companyId });
  const [date, setDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<JournalEntryRow[]>([]);
  const [treePanelOpen, setTreePanelOpen] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Transform accounts from Supabase format to AccountCombobox format
  // For journal entries (debit/credit), allow selection of ANY account from chart of accounts
  // This includes both group accounts and non-group accounts, as journal entries can use any account
  const accountsForCombobox = useMemo(() => {
    return accounts
      .filter(acc => acc.is_active) // All active accounts (including groups) - no restrictions for journal entries
      .map(acc => ({
        id: acc.id,
        code: acc.code,
        name: acc.name_en || acc.name,
        nameAr: acc.name,
        isGroup: acc.is_group, // Keep track for display purposes
      }));
  }, [accounts]);

  const isDirty = React.useMemo(() => {
    if (reference || description) return true;
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

  // Get next voucher number automatically
  useEffect(() => {
    if (!companyId || !isActive) return;
    
    const fetchNextVoucherNo = async () => {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('voucher_no')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data?.voucher_no) {
          // Extract number from voucher_no (e.g., "JV-20240001" -> 1)
          const match = data.voucher_no.match(/(\d+)$/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            const year = new Date().getFullYear();
            const voucherNo = `JV-${year}${String(nextNum).padStart(4, '0')}`;
            setReference(voucherNo);
            onVoucherNoChange?.(voucherNo);
          } else {
            const voucherNo = `JV-${new Date().getFullYear()}0001`;
            setReference(voucherNo);
            onVoucherNoChange?.(voucherNo);
          }
        } else {
          // First entry
          const year = new Date().getFullYear();
          const voucherNo = `JV-${year}0001`;
          setReference(voucherNo);
          onVoucherNoChange?.(voucherNo);
        }
      } catch (err) {
        console.error('Error fetching next voucher number:', err);
        const year = new Date().getFullYear();
        const voucherNo = `JV-${year}0001`;
        setReference(voucherNo);
        onVoucherNoChange?.(voucherNo);
      }
    };

    fetchNextVoucherNo();
  }, [companyId, isActive, onVoucherNoChange]);

  // Initialize with 4 rows
  useEffect(() => {
    if (!isActive) return;
    
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
    if (!reference) {
      setReference('');
    }
    setDescription('');
  }, [isActive]);

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

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      const newRows = rows.filter(row => row.id !== id);
      setRows(newRows);
      // Force re-render to fix spacing and numbering
      setTimeout(() => {
        // Focus on the first field of the row that replaced the deleted one
        const deletedIndex = rows.findIndex(r => r.id === id);
        if (deletedIndex >= 0 && deletedIndex < newRows.length) {
          const element = document.getElementById(`cell-${deletedIndex}-debit`);
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
        costCenter: rowToDuplicate.costCenter
      };
      const rowIndex = rows.findIndex(r => r.id === id);
      const newRows = [...rows];
      newRows.splice(rowIndex + 1, 0, newRow);
      setRows(newRows);
    }
  };

  const updateRow = (id: number, field: keyof JournalEntryRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updates: Partial<JournalEntryRow> = { [field]: value };
        
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

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  const difference = totalDebit - totalCredit;

  const handleSave = () => {
    if (Math.abs(difference) > 0.01) {
      // In a real app, show toast
      alert(`${t('difference')}: ${difference.toFixed(2)}`);
      return;
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
      const columns: (keyof JournalEntryRow)[] = [
        'debit', 'credit', 'accountId', 'description', 'currency', 'exchangeRate', 'costCenter'
      ];
      const currentColIndex = columns.indexOf(field);
      const isLastRow = index === rows.length - 1;
      const isLastField = currentColIndex === columns.length - 1;
      
      // If at last row and last field, add new row
      if (isLastRow && isLastField) {
        e.preventDefault();
        addRow();
        // Focus on first field of new row
        setTimeout(() => {
          const newRowIndex = rows.length;
          const element = document.getElementById(`cell-${newRowIndex}-debit`);
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
        const element = document.getElementById(`cell-${newRowIndex}-debit`);
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
             const columns: (keyof JournalEntryRow)[] = [
                'debit', 'credit', 'accountId', 'description', 'currency', 'exchangeRate', 'costCenter'
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
      
      const columns: (keyof JournalEntryRow)[] = [
        'debit', 'credit', 'accountId', 'description', 'currency', 'exchangeRate', 'costCenter'
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
            <div className="grid grid-cols-3 gap-3 items-end">
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
                  placeholder={language === 'ar' ? 'JE-001' : 'JE-001'}
                  className="h-9 text-sm rounded-lg border-gray-200 dark:border-gray-700"
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
          </Card>

          {/* Enhanced Lines Table */}
          <Card className="bg-white dark:bg-gray-900/80 rounded-2xl border-0 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 flex justify-between items-center">
              <div className={cn("flex items-center gap-2", direction === 'rtl' && "flex-row-reverse")}>
                <div className="p-1.5 rounded-lg bg-erp-navy/10 dark:bg-white/10">
                  <FileText className="w-4 h-4 text-erp-navy dark:text-white" />
                </div>
                <h3 className="font-bold text-erp-navy dark:text-white text-sm">
                  {language === 'ar' ? 'بنود القيد' : 'Entry Lines'}
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
                      <div><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">F2</kbd> / <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">=</kbd> {language === 'ar' ? 'موازنة القيد' : 'Balance entry'}</div>
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
                    <TableHead className="w-[120px] text-center text-xs font-bold border border-gray-300 p-1 px-2 text-erp-navy">
                      {language === 'ar' ? 'مدين' : 'Debit'}
                    </TableHead>
                    <TableHead className="w-[120px] text-center text-xs font-bold border border-gray-300 p-1 px-2 text-erp-navy">
                      {language === 'ar' ? 'دائن' : 'Credit'}
                    </TableHead>
                    <TableHead className="w-[180px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'الحساب' : 'Account'}
                    </TableHead>
                    <TableHead className="border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'البيان' : 'Description'}
                    </TableHead>
                    <TableHead className="w-[70px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'العملة' : 'Curr'}
                    </TableHead>
                    <TableHead className="w-[90px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'سعر الصرف' : 'Ex. Rate'}
                    </TableHead>
                    <TableHead className="w-[100px] border border-gray-300 p-1 px-2 text-xs font-bold text-erp-navy">
                      {language === 'ar' ? 'م.التكلفة' : 'Cost Center'}
                    </TableHead>
                    <TableHead className="w-[50px] border border-gray-300 p-1 px-2"></TableHead>
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
                            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500",
                            row.debit && "text-green-600 font-semibold"
                          )}
                          placeholder="0.00"
                          dir="ltr"
                        />
                      </TableCell>
                      
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
                            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500",
                            row.credit && "text-rose-600 font-semibold"
                          )}
                          placeholder="0.00"
                          dir="ltr"
                        />
                      </TableCell>
                      
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
                          value={row.currency}
                          onValueChange={(val) => {
                            updateRow(row.id, 'currency', val);
                            // Auto-update exchange rate when currency changes
                            if (val === 'SAR') {
                              updateRow(row.id, 'exchangeRate', 1);
                            } else {
                              // Default exchange rates (can be fetched from API later)
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
                      
                      <TableCell className="p-1 px-2 border border-gray-300">
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
                            "h-8 text-center border-0 shadow-none rounded-none px-2 bg-transparent font-mono text-[11px] w-full",
                            "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500",
                            row.exchangeRate !== 1 && "text-blue-600 font-semibold"
                          )}
                          placeholder="1.0000"
                          dir="ltr"
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
                            onKeyDown={(e) => {
                              handleKeyDown(e, index, 'costCenter');
                              if (e.key === 'Tab' && !e.shiftKey && index === rows.length - 1) {
                                e.preventDefault();
                                addRow();
                              }
                            }}
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
                    <TableCell className="border border-gray-300 p-1 px-2 text-xs font-bold font-mono text-center bg-red-50 text-red-700" dir="ltr">
                      {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="border border-gray-300 p-1 px-2 text-xs font-bold font-mono text-center bg-green-50 text-green-700" dir="ltr">
                      {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={5} className="border border-gray-300 p-1 px-2 text-xs bg-gray-100">
                      <div className="flex items-center justify-end gap-4">
                        <span className="text-gray-500">{language === 'ar' ? 'عدد السطور' : 'Lines'}: <span className="font-mono font-bold text-gray-700">{rows.filter(r => r.accountId).length}</span></span>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <span className="text-gray-500">
                          {language === 'ar' ? 'الفرق' : 'Diff'}: 
                          <span className={cn(
                            "font-mono font-bold ml-1",
                            Math.abs(difference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                          )} dir="ltr">{Math.abs(difference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {Math.abs(difference) < 0.01 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] ml-2">
                              {language === 'ar' ? 'متوازن' : 'Balanced'}
                            </Badge>
                          )}
                        </span>
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
                "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25",
                Math.abs(difference) > 0.01 && "opacity-50 cursor-not-allowed"
              )}
              disabled={Math.abs(difference) > 0.01}
            >
              <Save className={cn("w-4 h-4", direction === 'rtl' ? 'ml-2' : 'mr-2')} />
              {language === 'ar' ? 'حفظ القيد' : 'Save Entry'}
            </Button>
          </div>
        </div>
    </div>
    </TooltipProvider>
  );
}
