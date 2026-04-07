import React from 'react';

interface StatItemProps {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatItem: React.FC<StatItemProps> = ({ 
  label, 
  value, 
  suffix = '', 
  color = 'var(--color-accent)',
  size = 'md'
}) => {
  const valueSizes = {
    sm: "text-xl md:text-2xl",
    md: "text-3xl",
    lg: "text-5xl"
  };

  const labelSizes = {
    sm: "text-[8px] md:text-[10px]",
    md: "text-[10px]",
    lg: "text-xs"
  };

  return (
    <div className="flex flex-col items-end">
      <span 
        className={`${labelSizes[size]} text-[var(--color-text-secondary)] uppercase font-black tracking-[0.2em] opacity-60`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span 
          className={`${valueSizes[size]} font-mono font-black border-none leading-tight tracking-tighter transition-all tabular-nums whitespace-nowrap min-w-[3.5ch] text-right`}
          style={{ color }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-bold opacity-50" style={{ color }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};
