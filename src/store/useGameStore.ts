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
  revealed: boolean;
  
  // Actions
  setScore: (score: number) => void;
  setStreak: (streak: number) => void;
  setMode: (mode: GameMode) => void;
  setSubMode: (subMode: SubMode) => void;
  setGameStatus: (status: 'idle' | 'playing' | 'finished') => void;
  setCurrentCountry: (code: string | null) => void;
  setChoices: (choices: string[]) => void;
  setMissionId: (id: string | null) => void;
  setFeedback: (feedback: 'correct' | 'wrong' | null, clickedName?: string | null) => void;
  skipQuestion: (next: () => void) => void;
  setRevealed: (revealed: boolean) => void;
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
  revealed: false,

  setScore: (score) => set({ score }),
  setStreak: (streak) => set({ streak }),
  setMode: (mode) => set({ mode }),
  setSubMode: (subMode) => set({ subMode }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setCurrentCountry: (code) => set({ currentCountryCode: code }),
  setChoices: (choices) => set({ choices }),
  setMissionId: (id) => set({ missionId: id }),
  setFeedback: (feedback, clickedName = null) => set({ feedback, clickedName }),
  skipQuestion: (next) => {
    set({ streak: 0, revealed: false });
    next();
  },
  setRevealed: (revealed) => set({ revealed }),
  resetGame: () => set({ 
    score: 0, 
    streak: 0, 
    gameStatus: 'idle', 
    currentCountryCode: null, 
    choices: [], 
    missionId: null,
    feedback: null,
    clickedName: null,
    revealed: false
  }),
}));
