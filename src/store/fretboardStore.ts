import { create } from 'zustand';
import type { NoteName, ScaleId, ShareableState } from '../types';

interface FretboardStore extends ShareableState {
  setKey: (key: NoteName) => void;
  setScaleId: (scaleId: ScaleId) => void;
  setDegree: (degree: number) => void;
  toggleExtendedChords: () => void;
  setNotation: (notation: ShareableState['notation']) => void;
}

export const useFretboardStore = create<FretboardStore>((set) => ({
  key: 'C',
  scaleId: 'ionian',
  degree: 1,
  extendedChords: false,
  notation: 'sharps',
  positionSystem: 'none',
  v: 1,

  setKey: (key) => set({ key }),
  setScaleId: (scaleId) => set({ scaleId }),
  setDegree: (degree) => set({ degree }),
  toggleExtendedChords: () => set((state) => ({ extendedChords: !state.extendedChords })),
  setNotation: (notation) => set({ notation }),
}));
