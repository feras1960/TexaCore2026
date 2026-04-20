import { type LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-3 rounded-full bg-stone-100 p-3 dark:bg-stone-800">
        <Icon className="h-5 w-5 text-stone-500 dark:text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
