/**
 * AccountCombobox - Account selection combobox
 * Used in journal entry forms for account selection
 * Supports:
 * - Typing to filter accounts
 * - Enter key to show popup with matches
 * - Single click to add account to current row
 * - Double click to add account as new row
 * - Auto-close popup when clicking outside
 * - Tree panel support (when onOpenTree is provided)
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/app/providers/LanguageProvider';

interface AccountComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    nameAr?: string;
    isGroup?: boolean;
  }>;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  onOpenTree?: () => void;
  onAddAccount?: (accountId: string) => void; // Callback to add account as new row
}

export function AccountCombobox({ 
  value, 
  onChange, 
  accounts, 
  id, 
  onKeyDown, 
  className,
  onOpenTree,
  onAddAccount
}: AccountComboboxProps) {
  const { t, language, direction } = useLanguage();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  // Initialize input value from selected account
  useEffect(() => {
    if (value) {
      const selected = accounts.find((acc) => acc.id === value);
      if (selected) {
        setInputValue(language === 'ar' 
          ? `${selected.code} - ${selected.nameAr || selected.name}` 
          : `${selected.code} - ${selected.name}`
        );
      }
    } else if (!value && inputValue && !open) {
      // Clear input when value is cleared
      setInputValue("");
    }
  }, [value, accounts, language]);

  // When typing: filter accounts by search. When clicking arrow (empty input): show all accounts
  const filteredAccounts = inputValue.trim() === '' 
    ? accounts // Show all accounts when input is empty (arrow click)
    : accounts.filter((account) => {
        const searchStr = `${account.code} ${account.name} ${account.nameAr || ''}`.toLowerCase();
        return searchStr.includes(inputValue.toLowerCase());
      });

  // Handle Enter key to show popup if there are matches
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always call external onKeyDown first for ALL keys
    // This allows parent to handle shortcuts, navigation, etc.
    if (onKeyDown) {
      onKeyDown(e);
      // If parent handled it (prevented default or stopped propagation), don't process further
      if (e.defaultPrevented) {
        return;
      }
    }
    
    // Only process Enter key for showing popup if parent didn't handle it
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (filteredAccounts.length > 0 && inputValue.trim() !== '') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
        return;
      }
    }
  };

  // Render with Popover support (works with or without onOpenTree)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex items-center w-full h-full">
          <Input 
            id={id}
            onKeyDown={(e) => {
              // Always call handleKeyDownInternal which will call onKeyDown if provided
              handleKeyDownInternal(e);
            }}
            placeholder={t('accounting.account.select') || 'Select account...'}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Auto-open popup when typing (if there are matches)
              if (e.target.value.trim() !== '') {
                const hasMatches = accounts.some(acc => {
                  const searchStr = `${acc.code} ${acc.name} ${acc.nameAr || ''}`.toLowerCase();
                  return searchStr.includes(e.target.value.toLowerCase());
                });
                if (hasMatches) {
                  setOpen(true);
                }
              }
              if (value) onChange('');
            }}
            onFocus={() => {
              // Only auto-open if there's input value
              if (inputValue.trim() !== '') {
                setOpen(true);
              }
            }}
            className={cn(
              "h-10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 px-2",
              !className && "border-none shadow-none rounded-none bg-transparent",
              className
            )}
            dir={direction}
          />
          {onOpenTree ? (
            // If onOpenTree is provided, button opens tree panel
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-9 shrink-0 rounded-none text-gray-500 hover:text-erp-navy hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenTree();
              }}
              type="button"
              title={t('accounting.account.treeSelector')}
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          ) : (
            // Otherwise, button opens popover
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-9 shrink-0 rounded-none text-gray-500 hover:text-erp-navy"
                onClick={(e) => {
                  e.stopPropagation();
                  if (inputValue.trim() !== '') {
                    setInputValue('');
                  }
                  setOpen(true);
                }}
              >
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          )}
        </div>
      </PopoverAnchor>
      
      <PopoverContent 
        className="p-0 w-[300px] z-[10000]" 
        align={direction === 'rtl' ? 'end' : 'start'}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Close popup when clicking outside
          setOpen(false);
        }}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filteredAccounts.length === 0 ? (
              <CommandEmpty>{t('accounting.account.notFound') || "No account found."}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredAccounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`${account.code} ${account.name} ${account.nameAr || ''}`}
                    onSelect={() => {
                      // Single click: add to current row
                      onChange(account.id);
                      setInputValue(language === 'ar' 
                        ? `${account.code} - ${account.nameAr || account.name}` 
                        : `${account.code} - ${account.name}`
                      );
                      setOpen(false);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Double click: add as new row (only for non-group accounts)
                      if (!account.isGroup && onAddAccount) {
                        onAddAccount(account.id);
                        // Keep popup open for multiple selections
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        direction === 'rtl' ? 'ml-2' : 'mr-2',
                        value === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">
                        {language === 'ar' ? (account.nameAr || account.name) : account.name}
                        {account.isGroup && (
                          <span className="ml-1 text-[10px] text-gray-400">({language === 'ar' ? 'مجموعة' : 'Group'})</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {account.code}
                      </span>
                    </div>
                    {!account.isGroup && onAddAccount && (
                      <span className={cn(
                        "text-[10px] text-gray-400 flex-shrink-0",
                        direction === 'rtl' ? 'mr-auto' : 'ml-auto'
                      )}>
                        {language === 'ar' ? 'انقر مرتين لإضافة' : 'Double-click to add'}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
