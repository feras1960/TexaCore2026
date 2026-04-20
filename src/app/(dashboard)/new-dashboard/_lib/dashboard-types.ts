export interface NetPosition {
  valueBase: number;
  baseCurrency: string;
  deltaPct7d: number;
  deltaAbs7d: number;
  sparkline: number[];
  todayMovement: number;
  todayTxCount: number;
}

export type KpiId = 'cash' | 'receivables' | 'payables' | 'inventory';
export type Tone = 'neutral' | 'warning' | 'danger' | 'success';

export interface KpiItem {
  id: KpiId;
  label: string;
  value: number;
  currency: string;
  secondaryLabel?: string;
  secondaryTone?: Tone;
  deltaPct7d?: number;
  sparkline?: number[];
  breakdown?: Array<{ key: string; label: string; pct: number }>;
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

export interface AttentionItem {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  outstanding: number;
  currency: string;
  daysOverdue?: number;
}

export interface ActivityItem {
  id: string;
  type: 'sale' | 'payment' | 'receipt' | 'journal' | 'inventory';
  title: string;
  amount?: number;
  currency?: string;
  actorName: string;
  timestamp: string;
}

export interface CurrencyBreakdown {
  accountCode: string;
  accountName: string;
  currency: string;
  balance: number;
}

export interface KpiSummary {
  kpis: KpiItem[];
  asOf: string;
}
