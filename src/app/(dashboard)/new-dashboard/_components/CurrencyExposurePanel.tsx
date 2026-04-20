import { SectionCard } from './shared/SectionCard';
import { SkeletonBlock } from './shared/SkeletonBlock';
import { Wallet, Landmark, HelpCircle } from 'lucide-react';
import { CurrencyBreakdown } from '../_lib/dashboard-types';
import { EmptyState } from './shared/EmptyState';
import { formatCurrency } from '../_lib/formatters';

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  UAH: '🇺🇦',
  SYP: '🇸🇾',
  SAR: '🇸🇦',
  TRY: '🇹🇷',
  AED: '🇦🇪',
  GBP: '🇬🇧',
  CNY: '🇨🇳',
};

const ACCOUNT_ICONS: Record<string, typeof Wallet> = {
  '111': Wallet,   // صندوق
  '112': Landmark,  // بنك
};

function getAccountIcon(code: string) {
  if (code.startsWith('111')) return Wallet;
  if (code.startsWith('112')) return Landmark;
  return Wallet;
}

export function CurrencyExposurePanel({
  items,
  loading,
}: {
  items?: CurrencyBreakdown[];
  loading: boolean;
}) {
  return (
    <SectionCard
      title="أرصدة الصناديق والبنوك"
      action={
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-stone-400 cursor-help"
          title="رصيد كل صندوق وحساب بنكي مسجّل في شجرة الحسابات (111-112)"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="لا توجد صناديق مُسجّلة"
          description="أضف حسابات صندوق أو بنك في شجرة الحسابات."
        />
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {items.map((account) => {
            const Icon = getAccountIcon(account.accountCode);
            const hasBalance = account.balance !== 0;
            return (
              <li
                key={account.accountCode}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                {/* Icon */}
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    hasBalance
                      ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400'
                      : 'bg-stone-50 text-stone-400 dark:bg-stone-800 dark:text-stone-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                {/* Name & code */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {account.accountName}
                  </p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500">
                    {account.accountCode}
                  </p>
                </div>

                {/* Balance & currency */}
                <div className="text-left flex-shrink-0">
                  <p
                    className={`text-sm font-medium tabular-nums ${
                      hasBalance
                        ? 'text-stone-900 dark:text-stone-100'
                        : 'text-stone-400 dark:text-stone-500'
                    }`}
                  >
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 text-left">
                    {CURRENCY_FLAGS[account.currency] ?? '💱'} {account.currency}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
