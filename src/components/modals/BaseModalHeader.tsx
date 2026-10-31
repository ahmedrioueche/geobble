import { Edit3, X } from "lucide-react";
import React, { type ElementType, type ReactNode } from "react";

interface BaseModalHeaderProps {
  customHeader?: ReactNode;
  hideHeader: boolean;
  icon?: ElementType;
  displayTitle: string;
  isEditMode: boolean;
  onTitleChange?: (title: string) => void;
  subtitle?: string;
  showEditButton: boolean;
  onEditClick?: () => void;
  hideCloseButton: boolean;
  onClose: () => void;
}

export const BaseModalHeader: React.FC<BaseModalHeaderProps> = ({
  customHeader,
  hideHeader,
  icon: Icon,
  displayTitle,
  isEditMode,
  onTitleChange,
  subtitle,
  showEditButton,
  onEditClick,
  hideCloseButton,
  onClose,
}) => {
  if (hideHeader) return null;
  if (customHeader) return <>{customHeader}</>;

  return (
    <div className="bg-white/5 border-b border-white/5 p-6 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
              <Icon className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
          )}
          <div className="min-w-0">
            {isEditMode && onTitleChange ? (
              <input
                type="text"
                value={displayTitle}
                onChange={(event) => onTitleChange(event.target.value)}
                className="text-xl font-black text-white bg-white/5 rounded-xl px-3 py-1 border border-white/10 outline-none focus:border-[var(--color-accent)] mb-0.5 w-full uppercase tracking-tighter"
              />
            ) : (
              <h2 className="text-xl md:text-2xl font-black text-white mb-0.5 truncate uppercase tracking-tighter italic">
                {displayTitle}
              </h2>
            )}
            {subtitle && (
              <p className="text-[var(--color-text-secondary)] text-[10px] md:text-xs font-bold uppercase tracking-widest truncate opacity-60">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showEditButton && !isEditMode && onEditClick && (
            <button
              onClick={onEditClick}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10"
              title="Edit"
            >
              <Edit3 className="w-4 h-4 text-white" />
            </button>
          )}
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 hover:rotate-90"
            >
              <X className="w-5 h-5 text-white/40 group-hover:text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
