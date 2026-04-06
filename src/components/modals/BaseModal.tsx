import { Edit3, X } from "lucide-react";
import React, { type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface FooterButton {
  label?: string;
  onClick?: (e?: React.MouseEvent) => void;
  icon?: ElementType;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
  variant?: "default" | "primary" | "danger" | "ghost";
  className?: string;
}

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ElementType;
  children: ReactNode;

  // Edit mode support
  isEditMode?: boolean;
  editTitle?: string;
  onTitleChange?: (title: string) => void;
  onEditClick?: () => void;
  showEditButton?: boolean;

  // Header configuration
  customHeader?: ReactNode; // Completely replaces the default header
  hideHeader?: boolean;

  // Footer configuration
  footer?: ReactNode; // Custom footer (overrides button props)
  showFooter?: boolean;

  // Secondary button (left)
  showSecondaryButton?: boolean;
  secondaryButton?: FooterButton;

  // Tertiary button (middle/left of primary)
  tertiaryButton?: FooterButton;

  // Primary button (right) - only renders if primaryButton is provided
  primaryButton?: FooterButton;

  // Sizing
  maxWidth?: string;
  // Display options
  hideCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  noPadding?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title = "",
  subtitle,
  icon: Icon,
  children,
  isEditMode = false,
  editTitle,
  onTitleChange,
  onEditClick,
  showEditButton = false,
  customHeader,
  hideHeader = false,
  footer,
  showFooter = true,
  showSecondaryButton = true,
  secondaryButton,
  tertiaryButton,
  primaryButton,
  maxWidth = "max-w-3xl",
  hideCloseButton = false,
  closeOnOutsideClick = true,
  noPadding = false,
}) => {

  if (!isOpen) return null;

  const displayTitle =
    isEditMode && editTitle !== undefined ? editTitle : title;

  // Helper to get button classes based on variant
  const getButtonClasses = (
    variant: FooterButton["variant"] = "default",
    disabled?: boolean,
    loading?: boolean,
    className?: string,
  ) => {
    const baseClasses =
      "px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";

    if (disabled || loading) {
      return `${baseClasses} bg-slate-800 text-white/20 cursor-not-allowed opacity-50 ${className || ""}`;
    }

    switch (variant) {
      case "primary":
        return `${baseClasses} bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-hover)] shadow-lg shadow-sky-500/20 ${className || ""}`;
      case "danger":
        return `${baseClasses} bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 ${className || ""}`;
      case "ghost":
        return `${baseClasses} bg-transparent hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white ${className || ""}`;
      case "default":
      default:
        return `${baseClasses} bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-white/10 hover:border-white/20 ${className || ""}`;
    }
  };

  // Default button configurations
  const secondaryConfig: FooterButton = {
    label: secondaryButton?.label || "CANCEL",
    onClick: onClose,
    type: "button",
    variant: "default",
    ...secondaryButton,
  };

  const primaryConfig: FooterButton | undefined = primaryButton
    ? {
        label: "CONFIRM",
        type: "button",
        variant: "primary",
        disabled: primaryButton.disabled,
        ...primaryButton,
      }
    : undefined;

  const tertiaryConfig: FooterButton | undefined = tertiaryButton
    ? {
        type: "button",
        variant: "danger",
        ...tertiaryButton,
      }
    : undefined;

  const PrimaryIcon = primaryConfig?.icon;
  const TertiaryIcon = tertiaryConfig?.icon;

  // Footer shows if: custom footer provided, or secondary/tertiary/primary button shown
  const hasFooter =
    showFooter &&
    (footer || showSecondaryButton || tertiaryButton || primaryButton);

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={!closeOnOutsideClick || hideCloseButton ? undefined : onClose}
    >
      <div
        className={`bg-slate-900/95 backdrop-blur-3xl shadow-2xl ${maxWidth} w-full border-t-2 md:border border-white/10 overflow-hidden animate-in fade-in duration-300 flex flex-col
          rounded-t-[40px] md:rounded-[40px]
          max-h-[92vh] md:max-h-[95vh]
          slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {!hideHeader &&
          (customHeader ? (
            customHeader
          ) : (
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
                        onChange={(e) => onTitleChange(e.target.value)}
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
          ))}

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className={noPadding ? "" : "p-4 md:p-6"}>{children}</div>
        </div>

        {/* Footer */}
        {hasFooter && (
          <div className="p-6 bg-slate-900 border-t border-white/5 flex-shrink-0">
            {footer ? (
              footer
            ) : (
              <div
                className={`flex gap-2 md:gap-3 ${!primaryConfig ? "justify-end" : ""}`}
              >
                {showSecondaryButton && (
                  <button
                    type={secondaryConfig.type}
                    form={secondaryConfig.form}
                    onClick={secondaryConfig.onClick}
                    className={getButtonClasses(
                      secondaryConfig.variant,
                      secondaryConfig.disabled,
                      secondaryConfig.loading,
                      `${primaryConfig ? "flex-1" : ""} ${secondaryConfig.className}`,
                    )}
                    disabled={
                      secondaryConfig.disabled || secondaryConfig.loading
                    }
                  >
                    {secondaryConfig.loading ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        {secondaryConfig.icon &&
                          secondaryConfig.iconPosition !== "right" && (
                            <secondaryConfig.icon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                        {secondaryConfig.label}
                        {secondaryConfig.icon &&
                          secondaryConfig.iconPosition === "right" && (
                            <secondaryConfig.icon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                      </>
                    )}
                  </button>
                )}

                {tertiaryConfig && (
                  <button
                    type={tertiaryConfig.type}
                    form={tertiaryConfig.form}
                    onClick={tertiaryConfig.onClick}
                    className={getButtonClasses(
                      tertiaryConfig.variant,
                      tertiaryConfig.disabled,
                      tertiaryConfig.loading,
                      `flex-1 ${tertiaryConfig.className}`,
                    )}
                    disabled={tertiaryConfig.disabled || tertiaryConfig.loading}
                  >
                    {tertiaryConfig.loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {TertiaryIcon &&
                          tertiaryConfig.iconPosition !== "right" && (
                            <TertiaryIcon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                        {tertiaryConfig.label}
                        {TertiaryIcon &&
                          tertiaryConfig.iconPosition === "right" && (
                            <TertiaryIcon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                      </>
                    )}
                  </button>
                )}

                {primaryConfig && (
                  <button
                    type={primaryConfig.type}
                    form={primaryConfig.form}
                    onClick={primaryConfig.onClick}
                    disabled={primaryConfig.disabled || primaryConfig.loading}
                    className={getButtonClasses(
                      primaryConfig.variant,
                      primaryConfig.disabled,
                      primaryConfig.loading,
                      `flex-1 ${primaryConfig.className}`,
                    )}
                  >
                    {primaryConfig.loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        LOADING...
                      </>
                    ) : (
                      <>
                        {PrimaryIcon &&
                          primaryConfig.iconPosition !== "right" && (
                            <PrimaryIcon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                        {primaryConfig.label}
                        {PrimaryIcon &&
                          primaryConfig.iconPosition === "right" && (
                            <PrimaryIcon className="w-4 h-4 md:w-5 md:h-5" />
                          )}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default BaseModal;
