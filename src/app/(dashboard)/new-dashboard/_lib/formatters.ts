const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

export function formatCurrency(value: number, currency = 'USD'): string {
  return currencyFormatter(currency).format(value);
}

export function formatRelativeTime(iso: string, language = 'ar'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  
  // Use Intl.RelativeTimeFormat for i18n support
  try {
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (mins < 1) return rtf.format(0, 'minute'); // "now" / "الآن"
    if (mins < 60) return rtf.format(-mins, 'minute');
    const hours = Math.floor(mins / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    const days = Math.floor(hours / 24);
    return rtf.format(-days, 'day');
  } catch {
    // Fallback to Arabic
    if (mins < 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `قبل ${days} يوم`;
  }
}
