/**
 * Dashboard Kit — Formatters (shared across all dashboards)
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string) {
  if (!formatterCache.has(currency)) {
    formatterCache.set(
      currency,
      new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    );
  }
  return formatterCache.get(currency)!;
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return getFormatter(currency).format(value);
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export function formatDateArabic(d = new Date()): string {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}
