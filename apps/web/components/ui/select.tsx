import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options = [], children, className = '', id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#8a8f98] mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full bg-[#080a0c] border text-[#f7f8f8] text-xs rounded-md pl-3 pr-8 py-2 appearance-none transition-all duration-150 focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] disabled:opacity-50 cursor-pointer ${
              error ? 'border-[#f87171]' : 'border-[#ffffff12]'
            } ${className}`}
            {...props}
          >
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0f1115] text-[#f7f8f8]">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-2.5 w-4 h-4 text-[#575c66] pointer-events-none" />
        </div>
        {error && <p className="text-[11px] text-[#f87171] mt-1">{error}</p>}
        {!error && hint && <p className="text-[11px] text-[#575c66] mt-1">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
