const RANDOM_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 0x100000000;

export interface SeededRandomResult {
  value: number;
  state: number;
}

export const createRandomSeed = (): number =>
  Math.floor(Math.random() * UINT32_RANGE) >>> 0;

export const getNextSeededRandom = (state: number): SeededRandomResult => {
  const nextState = (state + RANDOM_INCREMENT) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return {
    value: ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE,
    state: nextState,
  };
};
