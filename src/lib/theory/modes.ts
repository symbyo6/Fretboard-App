export type ModeId =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

export interface ModeDefinition {
  id: ModeId;
  name: string;
  intervals: number[];
  characteristicDegree: number;
  characteristicLabel: string;
  brightness: number;
}

export const MODE_LIBRARY: Record<ModeId, ModeDefinition> = {
  lydian: {
    id: 'lydian',
    name: 'Lidio',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    characteristicDegree: 4,
    characteristicLabel: '#4 (tritono con la tónica)',
    brightness: 2,
  },
  ionian: {
    id: 'ionian',
    name: 'Jónico (Mayor)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    characteristicDegree: 7,
    characteristicLabel: '7ª mayor',
    brightness: 1,
  },
  mixolydian: {
    id: 'mixolydian',
    name: 'Mixolidio',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    characteristicDegree: 7,
    characteristicLabel: '♭7 (dominante)',
    brightness: 0,
  },
  dorian: {
    id: 'dorian',
    name: 'Dórico',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    characteristicDegree: 6,
    characteristicLabel: '6ª mayor sobre tríada menor',
    brightness: -1,
  },
  aeolian: {
    id: 'aeolian',
    name: 'Eólico (Menor Nat.)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    characteristicDegree: 6,
    characteristicLabel: '♭6',
    brightness: -2,
  },
  phrygian: {
    id: 'phrygian',
    name: 'Frigio',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    characteristicDegree: 2,
    characteristicLabel: '♭2 (color español)',
    brightness: -3,
  },
  locrian: {
    id: 'locrian',
    name: 'Locrio',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    characteristicDegree: 5,
    characteristicLabel: '♭5 (inestable)',
    brightness: -3.5,
  },
};

export const MODES_BY_BRIGHTNESS: ModeId[] = [
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
];

export const MODE_RING_STYLES: Record<ModeId, { stroke: string; dash: string }> = {
  ionian: { stroke: '#facc15', dash: '0' },
  lydian: { stroke: '#a78bfa', dash: '4 2' },
  mixolydian: { stroke: '#fb923c', dash: '2 2' },
  dorian: { stroke: '#38bdf8', dash: '6 2' },
  aeolian: { stroke: '#60a5fa', dash: '3 3' },
  phrygian: { stroke: '#f472b6', dash: '1 3' },
  locrian: { stroke: '#ef4444', dash: '1 1' },
};
