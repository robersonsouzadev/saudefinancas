import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5 mb-6 ${className}`}
    >
      <div className="flex items-start gap-3 text-left">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-[#5e6ad215] border border-[#5e6ad230] text-[#818cf8] flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#f7f8f8] tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-[#8a8f98] mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
