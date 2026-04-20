import {
  NetPosition,
  KpiItem,
  CashFlowPoint,
  AttentionItem,
  TopCustomer,
  ActivityItem,
  CurrencyBreakdown,
} from './dashboard-types';

export const MOCK_NET_POSITION: NetPosition = {
  valueBase: 341900,
  baseCurrency: 'USD',
  deltaPct7d: 2.3,
  deltaAbs7d: 7650,
  sparkline: [320, 315, 325, 330, 328, 335, 340, 338, 342, 345, 343, 341, 344, 342],
  todayMovement: 12450,
  todayTxCount: 7,
};

export const MOCK_KPIS: KpiItem[] = [
  {
    id: 'cash',
    label: 'النقد في الصناديق',
    value: 128400,
    currency: 'USD',
    deltaPct7d: 4.2,
    sparkline: [118, 120, 122, 119, 124, 126, 128],
    breakdown: [
      { key: 'USD', label: 'USD', pct: 68 },
      { key: 'EUR', label: 'EUR', pct: 22 },
      { key: 'UAH', label: 'UAH', pct: 7 },
      { key: 'SYP', label: 'SYP', pct: 3 },
    ],
  },
  {
    id: 'receivables',
    label: 'الذمم المدينة',
    value: 87200,
    currency: 'USD',
    secondaryLabel: '$14,300 متأخرة +30 يومًا',
    secondaryTone: 'warning',
    deltaPct7d: -1.8,
    sparkline: [92, 91, 90, 89, 88, 88, 87],
  },
  {
    id: 'payables',
    label: 'الذمم الدائنة',
    value: 42800,
    currency: 'USD',
    secondaryLabel: '6 موردين نشطين',
    secondaryTone: 'neutral',
    deltaPct7d: 3.1,
    sparkline: [38, 39, 40, 41, 41, 42, 42],
  },
  {
    id: 'inventory',
    label: 'قيمة المخزون',
    value: 168100,
    currency: 'USD',
    secondaryLabel: '80 مادة · 3 تحتاج تجديد',
    secondaryTone: 'warning',
    deltaPct7d: 0.8,
    sparkline: [165, 166, 167, 168, 167, 168, 168],
  },
];

export const MOCK_CASH_FLOW: CashFlowPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const isWeekend = date.getDay() === 5 || date.getDay() === 6;
  return {
    date: date.toISOString().slice(0, 10),
    income: isWeekend ? 0 : 2000 + Math.random() * 6000,
    expense: isWeekend ? 0 : 800 + Math.random() * 3500,
  };
});

export const MOCK_ATTENTION: AttentionItem[] = [
  {
    id: '1',
    severity: 'danger',
    title: 'فاتورة متأخرة 45 يومًا',
    subtitle: 'شركة النسيج الأوكراني · $8,400',
    actionHref: '/accounting/invoices/inv-00234',
    actionLabel: 'مراجعة',
  },
  {
    id: '2',
    severity: 'warning',
    title: '3 قيود غير مرحّلة',
    subtitle: 'بانتظار المراجعة منذ أمس',
    actionHref: '/accounting/journal-entries?status=draft',
    actionLabel: 'عرض',
  },
  {
    id: '3',
    severity: 'warning',
    title: 'مخزون منخفض',
    subtitle: 'قماش قطن أبيض · تحت الحد الأدنى',
    actionHref: '/inventory/low-stock',
  },
  {
    id: '4',
    severity: 'info',
    title: 'عمليتان تنتظران المزامنة',
    subtitle: 'سيتم الرفع عند استعادة الاتصال',
  },
];

export const MOCK_TOP_CUSTOMERS: TopCustomer[] = [
  { id: '1', name: 'بورصة النسيج', outstanding: 18400, currency: 'USD' },
  { id: '2', name: 'أقمشة أوكرانيا', outstanding: 12200, currency: 'USD', daysOverdue: 15 },
  { id: '3', name: 'معمل الشرق', outstanding: 9800, currency: 'USD' },
  { id: '4', name: 'تجارة دمشق', outstanding: 7100, currency: 'USD' },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'sale',
    title: 'قيد مبيعات',
    amount: 4200,
    currency: 'USD',
    actorName: 'ديما',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'payment',
    title: 'دفعة مورد',
    amount: 2800,
    currency: 'EUR',
    actorName: 'د. فراس',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'inventory',
    title: 'استلام بضاعة · 40 لفة',
    actorName: 'الأخ',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_CURRENCIES: CurrencyBreakdown[] = [
  { currency: 'USD', valueBase: 232492, pct: 68 },
  { currency: 'EUR', valueBase: 75218, pct: 22 },
  { currency: 'UAH', valueBase: 23933, pct: 7 },
  { currency: 'SYP', valueBase: 10257, pct: 3 },
];
