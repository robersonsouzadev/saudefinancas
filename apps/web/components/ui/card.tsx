import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'compact' | 'standard' | 'expanded' | 'none';
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', padding = 'standard', hoverEffect = false, ...props }, ref) => {
    const paddings = {
      none: 'p-0',
      compact: 'p-3 sm:p-4 xl:p-5 space-y-2.5',
      standard: 'p-4 sm:p-5 xl:p-6 space-y-3.5 sm:space-y-4.5',
      expanded: 'p-5 sm:p-6 xl:p-8 space-y-4 sm:space-y-6',
    };

    return (
      <div
        ref={ref}
        className={`bg-[#0f1115] border border-[#ffffff12] rounded-lg transition-all duration-200 ${
          hoverEffect ? 'hover:border-[#ffffff20] hover:bg-[#16191e]' : ''
        } ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-center justify-between pb-2 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base sm:text-lg font-semibold text-[#f7f8f8] ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-[#8a8f98] ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);
