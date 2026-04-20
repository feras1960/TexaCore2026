import { Plus, TrendingUp, Users, Package, Receipt, CircleDollarSign } from 'lucide-react';
import { motion } from 'framer-motion';


const QUICK_ACTIONS = [
  { label: 'فاتورة مبيعات', icon: Receipt, href: '/sales/invoices/new' },
  { label: 'قيد يومية', icon: TrendingUp, href: '/accounting/journal-entries/new' },
  { label: 'سند دفع', icon: CircleDollarSign, href: '/accounting/payments/new' },
  { label: 'عميل جديد', icon: Users, href: '/customers/new' },
  { label: 'أمر شراء', icon: Package, href: '/purchases/orders/new' },
];

export function QuickActionsBar() {
  return (
    <nav
      aria-label="إجراءات سريعة"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white/50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50"
    >
      <span className="me-1 text-xs font-medium text-stone-500 dark:text-stone-400">
        إجراءات سريعة
      </span>
      {QUICK_ACTIONS.map((a) => (
        <a
          key={a.label}
          href={a.href}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-stone-700 ring-1 ring-stone-200 transition hover:bg-teal-50 hover:text-teal-700 hover:ring-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-teal-950/30 dark:hover:text-teal-300 dark:hover:ring-teal-800"
        >
          <Plus className="h-3 w-3" />
          {a.label}
        </a>
      ))}
    </nav>
  );
}
