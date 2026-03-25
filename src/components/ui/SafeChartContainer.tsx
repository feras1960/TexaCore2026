/**
 * SafeChartContainer — Only renders children (charts) when the container is visible.
 * Prevents Recharts warnings when KeepAlive hides components with contentVisibility:hidden.
 */
import { useRef, useState, useEffect, ReactNode } from 'react';

interface SafeChartContainerProps {
  children: ReactNode;
  className?: string;
  fallbackHeight?: string;
}

export function SafeChartContainer({ children, className = 'h-64', fallbackHeight = '256px' }: SafeChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Use IntersectionObserver to detect visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: fallbackHeight }}>
      {isVisible ? children : null}
    </div>
  );
}
