export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-stone-200 dark:bg-stone-700 ${className}`} />
  );
}
