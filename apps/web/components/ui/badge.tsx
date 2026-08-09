import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  dot = false,
  className = '',
  ...props
}) => {
  const variants = {
    success: 'bg-[#4ade8015] text-[#4ade80] border-[#4ade8030]',
    warning: 'bg-[#fbbf2415] text-[#fbbf24] border-[#fbbf2430]',
    error: 'bg-[#f8717115] text-[#f87171] border-[#f8717130]',
    info: 'bg-[#60a5fa15] text-[#60a5fa] border-[#60a5fa30]',
    accent: 'bg-[#5e6ad215] text-[#818cf8] border-[#5e6ad230]',
    neutral: 'bg-[#ffffff0a] text-[#8a8f98] border-[#ffffff12]',
  };

  const dotColors = {
    success: 'bg-[#4ade80]',
    warning: 'bg-[#fbbf24]',
    error: 'bg-[#f87171]',
    info: 'bg-[#60a5fa]',
    accent: 'bg-[#5e6ad2]',
    neutral: 'bg-[#8a8f98]',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium',
    md: 'text-[11px] px-2.5 py-0.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
