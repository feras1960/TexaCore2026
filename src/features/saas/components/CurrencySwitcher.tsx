import { DollarSign, Euro, Coins, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/hooks';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  name_ar: string;
  icon: typeof DollarSign;
}

const CURRENCIES: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    name_ar: 'دولار أمريكي',
    icon: DollarSign,
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    name_ar: 'يورو',
    icon: Euro,
  },
  {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    name_ar: 'ريال سعودي',
    icon: Coins,
  },
];

interface CurrencySwitcherProps {
  selectedCurrency: string;
  onCurrencyChange: (currencyCode: string) => void;
  className?: string;
}

export function CurrencySwitcher({
  selectedCurrency,
  onCurrencyChange,
  className = '',
}: CurrencySwitcherProps) {
  const { language } = useLanguage();

  const currentCurrency = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];
  const Icon = currentCurrency.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between min-w-[160px] ${className}`}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{currentCurrency.code}</span>
            <span className="text-muted-foreground text-sm">
              ({currentCurrency.symbol})
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={language === 'ar' ? 'end' : 'start'} className="w-[160px]">
        {CURRENCIES.map((currency) => {
          const CurrencyIcon = currency.icon;
          return (
            <DropdownMenuItem
              key={currency.code}
              onClick={() => onCurrencyChange(currency.code)}
              className={`cursor-pointer ${
                currency.code === selectedCurrency ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <CurrencyIcon className="h-4 w-4" />
                <span className="flex-1">{currency.code}</span>
                <span className="text-muted-foreground text-sm">{currency.symbol}</span>
                {currency.code === selectedCurrency && (
                  <span className="text-primary">✓</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { CURRENCIES };

// Helper function to format amount with currency
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  if (!currency) return `${amount}`;
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  return `${currency.symbol}${formatted}`;
}
