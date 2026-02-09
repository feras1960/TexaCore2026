import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Account, accountsService } from "@/services/accountsService";
import { useLanguage } from "@/app/providers/LanguageProvider";

interface SmartAccountSelectorProps {
    value?: string;
    onChange: (accountId: string, account?: Account) => void;
    companyId?: string;
    placeholder?: string;
    className?: string;
    error?: boolean;
    type?: 'all' | 'fund' | 'customer' | 'vendor' | string;
    disabled?: boolean;
}

export function SmartAccountSelector({
    value,
    onChange,
    companyId,
    placeholder,
    className,
    error
}: SmartAccountSelectorProps) {
    const { t, language } = useLanguage();
    const [open, setOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);

    // Initial Load
    useEffect(() => {
        if (!companyId) return;

        const loadAccounts = async () => {
            setLoading(true);
            try {
                // Ideally this should be cached or passed as prop to avoid fetching on every row
                // For now we rely on the service to handle caching or react-query if available
                const data = await accountsService.getAll(companyId);
                setAccounts(data || []);
            } catch (err) {
                console.error("Failed to load accounts", err);
            } finally {
                setLoading(false);
            }
        };

        loadAccounts();
    }, [companyId]);

    // Update selected object when value changes
    useEffect(() => {
        if (value && accounts.length > 0) {
            const found = accounts.find(a => a.id === value);
            setSelectedAccount(found);
        } else {
            setSelectedAccount(undefined);
        }
    }, [value, accounts]);

    const handleSelect = (account: Account) => {
        setValue(account.id); // For local optimistic update if needed
        onChange(account.id, account);
        setOpen(false);
    };

    // Helper to get display name
    const getAccountLabel = (acc?: Account) => {
        if (!acc) return placeholder || t('accounting.account.select');
        const name = language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar);
        // Truncate if too long
        return `${acc.code} - ${name}`;
    };

    // Helper for command items
    const [inputValue, setInputValue] = useState("");

    // Filtered accounts for performance
    const filteredAccounts = React.useMemo(() => {
        if (!inputValue) return accounts.slice(0, 50); // Limit initial render
        const lower = inputValue.toLowerCase();
        return accounts.filter(acc =>
            acc.code.includes(lower) ||
            (acc.name_ar && acc.name_ar.toLowerCase().includes(lower)) ||
            (acc.name_en && acc.name_en.toLowerCase().includes(lower))
        ).slice(0, 50);
    }, [accounts, inputValue]);

    // We need to sync the internal command input state to filter manually because
    // Accounts list can be large and default Command filter might be slow or we want custom logic

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal",
                        !value && "text-muted-foreground",
                        error && "border-red-500",
                        className
                    )}
                >
                    <span className="truncate">{getAccountLabel(selectedAccount)}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={t('ledger.searchPlaceholder')}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        {loading && (
                            <div className="py-6 text-center text-sm">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                {t('common.loading')}
                            </div>
                        )}
                        {!loading && filteredAccounts.length === 0 && (
                            <CommandEmpty>{t('accounting.account.notFound')}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {filteredAccounts.map((account) => (
                                <CommandItem
                                    key={account.id}
                                    value={account.id} // We use ID as value for selection
                                    onSelect={() => handleSelect(account)}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === account.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {language === 'ar' ? account.name_ar : account.name_en}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {account.code}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );

    function setValue(val: string) {
        // Just a helper to update local state if we were uncontrolled, but we are controlled
    }
}
