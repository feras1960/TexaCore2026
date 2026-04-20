import { formatDateArabic } from '../_lib/formatters';
import { motion } from 'framer-motion';

export function DashboardHeader({
  userName,
  currency,
  supportedCurrencies = ['USD'],
  onCurrencyChange,
  isFetching,
}: {
  userName: string;
  currency: string;
  supportedCurrencies?: string[];
  onCurrencyChange: (c: string) => void;
  isFetching?: boolean;
}) {
  const greeting = useGreeting();
  const date = formatDateArabic();

  const getCurrencyLabel = (c: string) => {
    const labels: Record<string, string> = {
      USD: 'USD بالدولار',
      EUR: 'EUR باليورو',
      UAH: 'UAH بالهريفنا',
      SYP: 'SYP بالليرة'
    };
    return labels[c] || c;
  };

  const displayCurrencies = supportedCurrencies.length > 0 ? supportedCurrencies : [currency];

  return (
    <header className="flex flex-col gap-3 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {greeting}، {userName}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{date}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-900 transition hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-600"
          aria-label="العملة الأساسية للعرض"
        >
          {displayCurrencies.map(c => (
            <option key={c} value={c}>
              {getCurrencyLabel(c)}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}


function useGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'مساءً طيبًا';
  if (hour < 12) return 'صباح الخير';
  if (hour < 18) return 'مساء الخير';
  return 'مساءً طيبًا';
}
