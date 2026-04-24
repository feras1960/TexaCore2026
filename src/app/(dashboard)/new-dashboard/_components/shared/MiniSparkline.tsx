import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line } from 'recharts';

/**
 * MiniSparkline — Tiny inline sparkline chart
 *
 * ⚠️ Does NOT use Recharts' ResponsiveContainer to avoid the
 *    "width(-1) height(-1)" warning that fires when KeepAlive
 *    hides the page with `contentVisibility: hidden`.
 *    Instead, we measure the container ourselves via ResizeObserver
 *    and pass explicit pixel width/height to LineChart.
 */
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
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const updateDims = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 1 && rect.height > 1) {
      setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement via rAF (waits for layout)
    const rafId = requestAnimationFrame(updateDims);

    // Track resize for responsive behavior
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 1 && h > 1) {
          setDims({ w: Math.floor(w), h: Math.floor(h) });
        }
        // If dimensions become 0 (e.g. KeepAlive hiding), keep last valid dims
        // to avoid re-render with bad values
      }
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updateDims]);

  return (
    <div ref={containerRef} style={{ height, width: '100%', minWidth: 20 }} aria-hidden="true">
      {dims && chartData.length > 0 && (
        <LineChart width={dims.w} height={dims.h} data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </div>
  );
}
