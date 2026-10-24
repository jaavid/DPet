import type { PetState } from './core/behavior';
export {};
declare global {
  interface Window {
    dpet?: {
      onState: (listener: (state: PetState) => void) => () => void;
      onPat: (listener: () => void) => () => void;
      pat: () => void;
    };
  }
}
