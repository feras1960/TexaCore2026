import CountUp from 'react-countup';
import { useReducedMotion } from 'framer-motion';
import { formatCurrency } from '../../_lib/formatters';

export function CurrencyValue({
  value,
  currency = 'USD',
  size = 'md',
  animate = true,
}: {
  value: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  }[size];

  if (!animate || reducedMotion) {
    return (
      <span className={`font-medium tabular-nums ${sizeClass}`}>
        {formatCurrency(value, currency)}
      </span>
    );
  }

  return (
    <span className={`font-medium tabular-nums ${sizeClass}`}>
      <CountUp
        end={value}
        duration={0.8}
        separator=","
        prefix={currency === 'USD' ? '$' : ''}
        suffix={currency !== 'USD' ? ` ${currency}` : ''}
      />
    </span>
  );
}
