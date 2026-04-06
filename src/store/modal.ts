import { create } from "zustand";
import type { ConfirmModalProps, SubModeModalProps, ResultModalProps } from "../types/modal";

type ModalType = "confirm" | "sub-mode" | "result" | null;

interface ModalState {
  currentModal: ModalType;
  confirmModalProps?: ConfirmModalProps;
  subModeProps?: SubModeModalProps;
  resultProps?: ResultModalProps;

  openModal: (modal: ModalType, props?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  currentModal: null,
  confirmModalProps: undefined,
  subModeProps: undefined,
  openModal: (modal, props) =>
    set(() => {
      if (modal === "confirm") {
        return { currentModal: "confirm", confirmModalProps: props };
      }
      if (modal === "sub-mode") {
        return { currentModal: "sub-mode", subModeProps: props };
      }
      if (modal === "result") {
        return { currentModal: "result", resultProps: props };
      }

      return { currentModal: null };
    }),

  closeModal: () =>
    set({
      currentModal: null,
      confirmModalProps: undefined,
      subModeProps: undefined,
      resultProps: undefined,
    }),
}));
