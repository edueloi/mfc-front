import React from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = 'max-w-3xl'
}) => {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full ${maxWidthClassName} max-h-[92vh] bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col`}>
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default ModalShell;
