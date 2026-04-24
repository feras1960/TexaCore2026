/**
 * SafeChartContainer — Only renders children (charts) when the container
 * is visible AND has positive dimensions.
 * Prevents Recharts "width(-1) height(-1)" warnings when KeepAlive hides
 * components or when CSS animations haven't completed layout yet.
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

    // Check that the element both intersects AND has positive dimensions
    const checkReady = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) {
        setIsReady(true);
      } else {
        rafId = requestAnimationFrame(checkReady);
      }
    };

    // Use IntersectionObserver for initial visibility detection
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Visible — now verify dimensions are positive
          checkReady();
        } else {
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

