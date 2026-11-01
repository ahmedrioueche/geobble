import { create } from "zustand";
import type { ConfirmModalProps, SubModeModalProps, ResultModalProps } from "../types/modal";

type ModalType = "confirm" | "sub-mode" | "result" | null;
type OpenModalArgs =
  | [modal: "confirm", props?: ConfirmModalProps]
  | [modal: "sub-mode", props: SubModeModalProps]
  | [modal: "result", props: ResultModalProps]
  | [modal: null];

interface ModalState {
  currentModal: ModalType;
  confirmModalProps?: ConfirmModalProps;
  subModeProps?: SubModeModalProps;
  resultProps?: ResultModalProps;

  openModal: (...args: OpenModalArgs) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  currentModal: null,
  confirmModalProps: undefined,
  subModeProps: undefined,
  openModal: (...args) =>
    set(() => {
      if (args[0] === "confirm") {
        return { currentModal: "confirm", confirmModalProps: args[1] };
      }
      if (args[0] === "sub-mode") {
        return { currentModal: "sub-mode", subModeProps: args[1] };
      }
      if (args[0] === "result") {
        return { currentModal: "result", resultProps: args[1] };
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
