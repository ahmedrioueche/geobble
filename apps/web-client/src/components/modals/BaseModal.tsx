import React, { type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BaseModalFooter,
  type ModalFooterButton,
} from "./BaseModalFooter";
import { BaseModalHeader } from "./BaseModalHeader";

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
  customHeader?: ReactNode;
  hideHeader?: boolean;

  // Footer configuration
  footer?: ReactNode;
  showFooter?: boolean;
  showSecondaryButton?: boolean;
  secondaryButton?: ModalFooterButton;
  tertiaryButton?: ModalFooterButton;
  primaryButton?: ModalFooterButton;

  // Sizing
  maxWidth?: string;
  hideCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  noPadding?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title = "",
  subtitle,
  icon,
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
        onClick={(event) => event.stopPropagation()}
      >
        <BaseModalHeader
          customHeader={customHeader}
          hideHeader={hideHeader}
          icon={icon}
          displayTitle={displayTitle}
          isEditMode={isEditMode}
          onTitleChange={onTitleChange}
          subtitle={subtitle}
          showEditButton={showEditButton}
          onEditClick={onEditClick}
          hideCloseButton={hideCloseButton}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className={noPadding ? "" : "p-4 md:p-6"}>{children}</div>
        </div>

        <BaseModalFooter
          footer={footer}
          showFooter={showFooter}
          showSecondaryButton={showSecondaryButton}
          secondaryButton={secondaryButton}
          tertiaryButton={tertiaryButton}
          primaryButton={primaryButton}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body,
  );
};

export default BaseModal;
