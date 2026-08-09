import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', checked, disabled, id, onChange, ...props }, ref) => {
    const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label htmlFor={checkboxId} className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        <div className="relative flex items-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div className="w-4 h-4 rounded border border-[#ffffff20] bg-[#080a0c] peer-checked:bg-[#5e6ad2] peer-checked:border-[#5e6ad2] peer-focus-visible:ring-2 peer-focus-visible:ring-[#5e6ad260] transition-all flex items-center justify-center">
            {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <div className="text-left">
            {label && <span className="block text-xs font-medium text-[#f7f8f8]">{label}</span>}
            {description && <span className="block text-[11px] text-[#8a8f98]">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
