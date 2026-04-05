import { create } from 'zustand';

export type GameMode = 'identify' | 'reverse';
export type SubMode = 'name' | 'flag' | 'capital';

interface GameState {
  score: number;
  streak: number;
  mode: GameMode;
  subMode: SubMode;
  gameStatus: 'idle' | 'playing' | 'finished';
  currentCountryCode: string | null;
  choices: string[];
  missionId: string | null;
  feedback: 'correct' | 'wrong' | null;
  clickedName: string | null;
  clickedCode: string | null;
  revealed: boolean;
  pulseKey: number;
  
  // Actions
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setMode: (mode: GameMode) => void;
  setSubMode: (subMode: SubMode) => void;
  setGameStatus: (status: 'idle' | 'playing' | 'finished') => void;
  setCurrentCountry: (code: string | null) => void;
  setChoices: (choices: string[]) => void;
  setMissionId: (id: string | null) => void;
  setFeedback: (feedback: 'correct' | 'wrong' | null, clickedName?: string | null, clickedCode?: string | null) => void;
  skipQuestion: (next: () => void) => void;
  setRevealed: (revealed: boolean) => void;
  triggerPulse: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  streak: 0,
  mode: 'identify',
  subMode: 'name',
  gameStatus: 'idle',
  currentCountryCode: null,
  choices: [],
  missionId: null,
  feedback: null,
  clickedName: null,
  clickedCode: null,
  revealed: false,
  pulseKey: 0,

  setScore: (score) => set({ score }),
  setStreak: (streak) => set({ streak }),
  setMode: (mode) => set({ mode }),
  setSubMode: (subMode) => set({ subMode }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setCurrentCountry: (code) => set({ currentCountryCode: code }),
  setChoices: (choices) => set({ choices }),
  setMissionId: (id) => set({ missionId: id }),
  setFeedback: (feedback, clickedName = null, clickedCode = null) => set({ feedback, clickedName, clickedCode }),
  skipQuestion: (next) => {
    set({ streak: 0, revealed: false, feedback: null, clickedName: null, clickedCode: null });
    next();
  },
  setRevealed: (revealed) => set((state) => ({ 
    revealed, 
    pulseKey: revealed ? state.pulseKey + 1 : state.pulseKey 
  })),
  triggerPulse: () => set((state) => ({ pulseKey: state.pulseKey + 1 })),
  resetGame: () => set({ 
    score: 0, 
    streak: 0, 
    mode: 'identify',
    subMode: 'name',
    gameStatus: 'idle', 
    currentCountryCode: null, 
    choices: [], 
    missionId: null,
    feedback: null,
    clickedName: null,
    clickedCode: null,
    revealed: false,
    pulseKey: 0
  }),
}));
