import { useLanguage } from '@/app/providers/LanguageProvider';

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
  const { t, language } = useLanguage();
  const greeting = useGreeting(language);

  const date = new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const displayCurrencies = supportedCurrencies.length > 0 ? supportedCurrencies : [currency];

  return (
    <header className="flex flex-col gap-3 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {greeting}{language === 'ar' ? '،' : ','} {userName}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{date}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-900 transition hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-600"
          aria-label={t('dashboard.displayCurrency')}
        >
          {displayCurrencies.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}


function useGreeting(language: string): string {
  const hour = new Date().getHours();
  const greetings: Record<string, { morning: string; afternoon: string; evening: string }> = {
    ar: { morning: 'صباح الخير', afternoon: 'مساء الخير', evening: 'مساءً طيبًا' },
    en: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening' },
    ru: { morning: 'Доброе утро', afternoon: 'Добрый день', evening: 'Добрый вечер' },
    uk: { morning: 'Доброго ранку', afternoon: 'Доброго дня', evening: 'Доброго вечора' },
    tr: { morning: 'Günaydın', afternoon: 'İyi günler', evening: 'İyi akşamlar' },
    de: { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend' },
    it: { morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera' },
    pl: { morning: 'Dzień dobry', afternoon: 'Dzień dobry', evening: 'Dobry wieczór' },
    ro: { morning: 'Bună dimineața', afternoon: 'Bună ziua', evening: 'Bună seara' },
  };
  const g = greetings[language] || greetings.en;
  if (hour < 5) return g.evening;
  if (hour < 12) return g.morning;
  if (hour < 18) return g.afternoon;
  return g.evening;
}
