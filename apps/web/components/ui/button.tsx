import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles following Design System Tokens
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:pointer-events-none select-none rounded-md';

    // Variants
    const variants = {
      primary: 'bg-[#5e6ad2] hover:bg-[#6e7be2] active:bg-[#4f5bc3] text-white shadow-sm',
      secondary: 'bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff12] hover:border-[#ffffff1f] text-[#f7f8f8]',
      ghost: 'bg-transparent hover:bg-[#ffffff0c] text-[#8a8f98] hover:text-[#f7f8f8]',
      danger: 'bg-[#f87171] hover:bg-[#ef4444] active:bg-[#dc2626] text-white shadow-sm',
      outline: 'bg-transparent border border-[#5e6ad2]/40 hover:border-[#5e6ad2] text-[#5e6ad2] hover:bg-[#5e6ad215]',
    };

    // Sizes
    const sizes = {
      sm: 'text-xs px-2.5 py-1 gap-1.5 h-7',
      md: 'text-xs px-3.5 py-1.5 gap-2 h-9',
      lg: 'text-sm px-4 py-2 gap-2 h-10',
      icon: 'p-1.5 h-9 w-9 justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
