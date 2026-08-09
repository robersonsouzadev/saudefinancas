import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div
      className="relative inline-flex cursor-pointer"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible((prev) => !prev)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-2.5 py-1 text-[11px] font-medium text-[#f7f8f8] bg-[#1d2127] border border-[#ffffff18] rounded-md shadow-xl max-w-[220px] break-words pointer-events-none ${positions[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
