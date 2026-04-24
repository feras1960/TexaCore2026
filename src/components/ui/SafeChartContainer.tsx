/**
 * SafeChartContainer — Only renders children (charts) when the container
 * is visible AND has positive dimensions.
 *
 * Prevents Recharts "width(-1) height(-1)" warnings caused by:
 * 1. KeepAlive hiding pages with `contentVisibility: hidden`
 * 2. CSS animations not yet completing layout
 * 3. ResponsiveContainer's internal ResizeObserver measuring hidden containers
 *
 * Strategy: unmount children when the container leaves the viewport,
 * so ResponsiveContainer's internal observer is destroyed.
 */
import { useRef, useState, useEffect, ReactNode } from 'react';

interface SafeChartContainerProps {
  children: ReactNode;
  className?: string;
  fallbackHeight?: string;
}

export function SafeChartContainer({ children, className = 'h-64', fallbackHeight = '256px' }: SafeChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number;

    // Check that the element has positive dimensions after becoming visible
    const checkReady = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) {
        setIsReady(true);
      } else {
        rafId = requestAnimationFrame(checkReady);
      }
    };

    // Use IntersectionObserver for visibility detection
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Visible — verify dimensions are positive before rendering
          checkReady();
        } else {
          // Hidden (KeepAlive switched page, scrolled out, etc.)
          // UNMOUNT children so ResponsiveContainer's internal ResizeObserver
          // is destroyed and can't fire with -1 dimensions
          setIsReady(false);
          cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ minHeight: fallbackHeight, minWidth: 20 }}>
      {isReady ? children : null}
    </div>
  );
}
