import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const styles = {
    info: {
      container: 'bg-[#60a5fa12] border-[#60a5fa30] text-[#60a5fa]',
      icon: <Info className="w-4 h-4 shrink-0 text-[#60a5fa]" />,
    },
    success: {
      container: 'bg-[#4ade8012] border-[#4ade8030] text-[#4ade80]',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />,
    },
    warning: {
      container: 'bg-[#fbbf2412] border-[#fbbf2430] text-[#fbbf24]',
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-[#fbbf24]" />,
    },
    error: {
      container: 'bg-[#f8717112] border-[#f8717130] text-[#f87171]',
      icon: <AlertCircle className="w-4 h-4 shrink-0 text-[#f87171]" />,
    },
  };

  return (
    <div
      className={`p-3.5 rounded-lg border flex items-start gap-3 text-xs leading-relaxed ${styles[variant].container} ${className}`}
    >
      {styles[variant].icon}
      <div className="flex-1 text-left">
        {title && <h5 className="font-semibold mb-0.5 text-[#f7f8f8]">{title}</h5>}
        <div className="text-[#8a8f98]">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#8a8f98] hover:text-[#f7f8f8] p-0.5 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
