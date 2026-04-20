export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-200/60 dark:bg-stone-800/60 ${className}`}
      aria-hidden="true"
    />
  );
}
