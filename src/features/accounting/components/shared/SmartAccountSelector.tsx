import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    /** إظهار المجموعات أيضاً — افتراضياً false = حسابات تفصيلية فقط */
    showGroups?: boolean;
}

export function SmartAccountSelector({
    value,
    onChange,
    companyId,
    placeholder,
    className,
    error,
    disabled,
    showGroups = false,
}: SmartAccountSelectorProps) {
    const { t, language } = useLanguage();
    const [open, setOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        if (!companyId) return;

        const loadAccounts = async () => {
            setLoading(true);
            try {
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

    // Focus input when opening
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setInputValue("");
        }
    }, [open]);

    const handleSelect = (account: Account) => {
        onChange(account.id, account);
        setOpen(false);
    };

    // Helper to get display name
    const getAccountLabel = (acc?: Account) => {
        if (!acc) return placeholder || t('accounting.account.select');
        const name = language === 'ar' ? acc.name_ar : (acc.name_en || acc.name_ar);
        return `${acc.code} - ${name}`;
    };

    // فلترة الحسابات: حذف المجموعات + بحث
    const filteredAccounts = React.useMemo(() => {
        // أولاً: إخفاء المجموعات (is_group = true) إلا إذا طُلب showGroups
        let filtered = showGroups ? accounts : accounts.filter(acc => !acc.is_group);

        // ثانياً: فلترة بالبحث
        if (inputValue.trim()) {
            const lower = inputValue.toLowerCase().trim();
            filtered = filtered.filter(acc =>
                acc.code?.includes(lower) ||
                (acc.name_ar && acc.name_ar.toLowerCase().includes(lower)) ||
                (acc.name_en && acc.name_en.toLowerCase().includes(lower))
            );
        }

        return filtered.slice(0, 60); // حد أقصى 60 نتيجة
    }, [accounts, inputValue, showGroups]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
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
            <PopoverContent
                className="w-[350px] p-0"
                align="start"
                sideOffset={4}
                style={{ zIndex: 9999 }}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* ═══ حقل البحث ═══ */}
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder || t('ledger.search_placeholder')}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                </div>

                {/* ═══ قائمة الحسابات ═══ */}
                <div
                    ref={listRef}
                    style={{
                        maxHeight: '280px',
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                        WebkitOverflowScrolling: 'touch',
                    }}
                    onWheel={(e) => {
                        // منع Radix من اعتراض حدث السكرول
                        e.stopPropagation();
                    }}
                >
                    {loading && (
                        <div className="py-6 text-center text-sm">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            {t('common.loading')}
                        </div>
                    )}

                    {!loading && filteredAccounts.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {t('accounting.account.notFound')}
                        </div>
                    )}

                    {!loading && filteredAccounts.map((account) => (
                        <div
                            key={account.id}
                            onClick={() => handleSelect(account)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                                "hover:bg-accent hover:text-accent-foreground transition-colors",
                                value === account.id && "bg-accent"
                            )}
                        >
                            <Check
                                className={cn(
                                    "h-4 w-4 shrink-0",
                                    value === account.id ? "opacity-100 text-emerald-600" : "opacity-0"
                                )}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">
                                    {language === 'ar' ? account.name_ar : (account.name_en || account.name_ar)}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                    {account.code}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
