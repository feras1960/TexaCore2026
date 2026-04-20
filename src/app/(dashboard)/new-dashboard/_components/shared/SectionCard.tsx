import { ReactNode } from 'react';

export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
