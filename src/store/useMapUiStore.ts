import { create } from "zustand";

interface MapUiState {
  pulseKey: number;
  sonarKey: number;
  tempHighlightCode: string | null;
  triggerPulse: () => void;
  triggerSonar: () => void;
  setTempHighlightCode: (code: string | null) => void;
  resetMapUi: () => void;
}

export const useMapUiStore = create<MapUiState>((set) => ({
  pulseKey: 0,
  sonarKey: 0,
  tempHighlightCode: null,
  triggerPulse: () => set((state) => ({ pulseKey: state.pulseKey + 1 })),
  triggerSonar: () =>
    set((state) => ({
      sonarKey: state.sonarKey + 1,
      pulseKey: state.pulseKey + 1,
    })),
  setTempHighlightCode: (tempHighlightCode) => set({ tempHighlightCode }),
  resetMapUi: () =>
    set({ pulseKey: 0, sonarKey: 0, tempHighlightCode: null }),
}));
