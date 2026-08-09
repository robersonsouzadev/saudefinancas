import React from 'react';

export interface StatusDotProps {
  status?: 'online' | 'offline' | 'warning' | 'error' | 'accent';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'online',
  pulse = false,
  size = 'md',
  label,
  className = '',
}) => {
  const colors = {
    online: 'bg-[#4ade80]',
    offline: 'bg-[#575c66]',
    warning: 'bg-[#fbbf24]',
    error: 'bg-[#f87171]',
    accent: 'bg-[#5e6ad2]',
  };

  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span className={`inline-flex items-center gap-2 text-xs text-[#8a8f98] ${className}`}>
      <span className="relative flex items-center justify-center">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colors[status]}`}
          />
        )}
        <span className={`relative inline-block rounded-full ${sizes[size]} ${colors[status]}`} />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
};
