import { useMemo, useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function MiniSparkline({
  data,
  color = '#0D9488',
  height = 32,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = useMemo(() => data.map((value, i) => ({ i, value })), [data]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Only render the chart once the container has stable positive dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const checkSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) {
        setIsReady(true);
      } else {
        rafId = requestAnimationFrame(checkSize);
      }
    };

    // Use ResizeObserver + rAF fallback for reliable detection
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 1 && h > 1) {
          setIsReady(true);
          observer.disconnect();
          return;
        }
      }
    });
    observer.observe(el);

    // Fallback: poll via rAF in case ResizeObserver fires before layout
    rafId = requestAnimationFrame(checkSize);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!isReady || chartData.length === 0) {
    return <div ref={containerRef} style={{ height, width: '100%', minWidth: 20 }} aria-hidden="true" />;
  }

  return (
    <div ref={containerRef} style={{ height, width: '100%', minWidth: 20 }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%" minWidth={20} minHeight={height}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

