import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-[#0f1115] border border-[#ffffff10] rounded-xl space-y-3 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#a1a1aa] mb-1">
          {icon}
        </div>
      )}
      <h4 className="text-sm sm:text-base font-semibold text-[#f7f8f8]">{title}</h4>
      {description && <p className="text-xs sm:text-sm text-[#a1a1aa] max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
