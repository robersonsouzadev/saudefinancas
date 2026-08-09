import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#8a8f98] mb-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#575c66] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-[#080a0c] border text-[#f7f8f8] placeholder-[#575c66] text-xs rounded-md py-2 transition-all duration-150 focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] disabled:opacity-50 disabled:bg-[#0c0e12] ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} ${
              error ? 'border-[#f87171] focus:border-[#f87171] focus:ring-[#f87171]' : 'border-[#ffffff12]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#575c66] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] text-[#f87171] mt-1">{error}</p>}
        {!error && hint && <p className="text-[11px] text-[#575c66] mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
