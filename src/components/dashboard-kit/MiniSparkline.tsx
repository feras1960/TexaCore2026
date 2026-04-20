import { useMemo } from 'react';
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
  return (
    <div style={{ height, width: '100%' }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
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
