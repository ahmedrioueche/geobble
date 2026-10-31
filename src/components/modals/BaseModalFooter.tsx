import React, { type ElementType, type ReactNode } from "react";

export interface ModalFooterButton {
  label?: string;
  onClick?: (event?: React.MouseEvent) => void;
  icon?: ElementType;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  form?: string;
  variant?: "default" | "primary" | "danger" | "ghost";
  className?: string;
}

interface BaseModalFooterProps {
  footer?: ReactNode;
  showFooter: boolean;
  showSecondaryButton: boolean;
  secondaryButton?: ModalFooterButton;
  tertiaryButton?: ModalFooterButton;
  primaryButton?: ModalFooterButton;
  onClose: () => void;
}

const getButtonClasses = (
  variant: ModalFooterButton["variant"] = "default",
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

const FooterButton: React.FC<{
  config: ModalFooterButton;
  className: string;
  spinnerClassName: string;
  loadingLabel?: string;
}> = ({ config, className, spinnerClassName, loadingLabel }) => {
  const Icon = config.icon;

  return (
    <button
      type={config.type}
      form={config.form}
      onClick={config.onClick}
      disabled={config.disabled || config.loading}
      className={getButtonClasses(
        config.variant,
        config.disabled,
        config.loading,
        className,
      )}
    >
      {config.loading ? (
        loadingLabel ? (
          <>
            <div className={spinnerClassName} />
            {loadingLabel}
          </>
        ) : (
          <div className={spinnerClassName} />
        )
      ) : (
        <>
          {Icon && config.iconPosition !== "right" && (
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          )}
          {config.label}
          {Icon && config.iconPosition === "right" && (
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          )}
        </>
      )}
    </button>
  );
};

export const BaseModalFooter: React.FC<BaseModalFooterProps> = ({
  footer,
  showFooter,
  showSecondaryButton,
  secondaryButton,
  tertiaryButton,
  primaryButton,
  onClose,
}) => {
  const secondaryConfig: ModalFooterButton = {
    label: secondaryButton?.label || "CANCEL",
    onClick: onClose,
    type: "button",
    variant: "default",
    ...secondaryButton,
  };
  const primaryConfig: ModalFooterButton | undefined = primaryButton
    ? {
        label: "CONFIRM",
        type: "button",
        variant: "primary",
        disabled: primaryButton.disabled,
        ...primaryButton,
      }
    : undefined;
  const tertiaryConfig: ModalFooterButton | undefined = tertiaryButton
    ? {
        type: "button",
        variant: "danger",
        ...tertiaryButton,
      }
    : undefined;
  const hasFooter =
    showFooter &&
    (footer || showSecondaryButton || tertiaryButton || primaryButton);

  if (!hasFooter) return null;

  return (
    <div className="p-6 bg-slate-900 border-t border-white/5 flex-shrink-0">
      {footer ? (
        footer
      ) : (
        <div
          className={`flex gap-2 md:gap-3 ${!primaryConfig ? "justify-end" : ""}`}
        >
          {showSecondaryButton && (
            <FooterButton
              config={secondaryConfig}
              className={`${primaryConfig ? "flex-1" : ""} ${secondaryConfig.className}`}
              spinnerClassName="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
            />
          )}
          {tertiaryConfig && (
            <FooterButton
              config={tertiaryConfig}
              className={`flex-1 ${tertiaryConfig.className}`}
              spinnerClassName="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
            />
          )}
          {primaryConfig && (
            <FooterButton
              config={primaryConfig}
              className={`flex-1 ${primaryConfig.className}`}
              spinnerClassName="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
              loadingLabel="LOADING..."
            />
          )}
        </div>
      )}
    </div>
  );
};
