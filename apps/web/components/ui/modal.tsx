import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  bottomSheet?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  bottomSheet = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.classList.add('scroll-locked');
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.classList.remove('scroll-locked');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  const placementClass = bottomSheet
    ? 'items-end sm:items-center'
    : 'items-center';

  const shapeClass = bottomSheet
    ? 'rounded-t-2xl sm:rounded-xl'
    : 'rounded-xl';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex ${placementClass} justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200`}
    >
      {/* Backdrop overlay click */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div
        className={`relative w-full ${maxWidths[maxWidth]} bg-[#0f1115] border border-[#ffffff18] ${shapeClass} shadow-2xl z-10 max-h-[88vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-6 animate-in zoom-in-95 duration-200 text-left overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[#ffffff0e] pb-3 mb-3 shrink-0">
            <div className="pr-2">
              {title && (
                <h3 className="text-base font-bold text-[#f7f8f8] flex items-center gap-2">
                  {title}
                </h3>
              )}
              {description && <p className="text-xs text-[#8a8f98] mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-[#8a8f98] hover:text-[#f7f8f8] p-2 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-md hover:bg-[#ffffff0e] transition-colors shrink-0"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-xs">
          {children}
        </div>
      </div>
    </div>
  );
};
