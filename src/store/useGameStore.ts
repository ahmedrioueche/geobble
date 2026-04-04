import { create } from 'zustand';

export type GameMode = 'flag' | 'name' | 'capital' | 'reverse';

interface GameState {
  score: number;
  streak: number;
  mode: GameMode;
  gameStatus: 'idle' | 'playing' | 'finished';
  currentCountryCode: string | null;
  choices: string[];
  
  // Actions
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setMode: (mode: GameMode) => void;
  setGameStatus: (status: 'idle' | 'playing' | 'finished') => void;
  setCurrentCountry: (code: string | null) => void;
  setChoices: (choices: string[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  streak: 0,
  mode: 'name',
  gameStatus: 'idle',
  currentCountryCode: null,
  choices: [],

  setScore: (score) => set({ score }),
  setStreak: (streak) => set({ streak }),
  setMode: (mode) => set({ mode }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setCurrentCountry: (code) => set({ currentCountryCode: code }),
  setChoices: (choices) => set({ choices }),
  resetGame: () => set({ score: 0, streak: 0, gameStatus: 'idle', currentCountryCode: null, choices: [] }),
}));
