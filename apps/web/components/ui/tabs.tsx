import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  return (
    <div
      className={`flex items-center gap-1 border-b border-[#ffffff10] overflow-x-auto no-scrollbar ${
        variant === 'pill' ? 'bg-[#0c0e12] p-1 rounded-lg border-none' : ''
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        if (variant === 'pill') {
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[36px] text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap touch-manipulation ${
                isActive
                  ? 'bg-[#16191e] text-[#f7f8f8] shadow-sm border border-[#ffffff12]'
                  : 'text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#ffffff08]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                    isActive ? 'bg-[#5e6ad2] text-white' : 'bg-[#16191e] text-[#8a8f98]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] sm:min-h-[38px] text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px touch-manipulation ${
              isActive
                ? 'border-[#5e6ad2] text-[#f7f8f8]'
                : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8] hover:border-[#ffffff20]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                  isActive ? 'bg-[#5e6ad2] text-white' : 'bg-[#16191e] text-[#8a8f98]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
