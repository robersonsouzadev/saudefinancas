import React from 'react';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
  if (!label) {
    return <hr className={`border-t border-[#ffffff10] my-4 ${className}`} />;
  }

  return (
    <div className={`relative flex items-center my-4 ${className}`}>
      <div className="flex-grow border-t border-[#ffffff10]" />
      <span className="flex-shrink mx-3 text-[11px] font-medium text-[#8a8f98] uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-grow border-t border-[#ffffff10]" />
    </div>
  );
};
