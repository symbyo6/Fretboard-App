import type { ChordQuality, DiatonicChord, KeyName, PitchClass } from '../../types';
import { getNoteName, KEY_TO_PITCH, normalizePitch } from './scales';

export type ChordSequenceStatus = 'diatonic' | 'chromatic' | 'invalid';

export interface ParsedChordToken {
  input: string;
  rootName: KeyName | null;
  rootPitch: PitchClass | null;
  quality: ChordQuality | null;
  chord: DiatonicChord | null;
  rootDegree: number | null;
  rootIsDiatonic: boolean;
  status: ChordSequenceStatus;
  reason?: string;
  chordSize?: 'triad' | 'tetrad';
}

const ROOT_NAMES = Object.keys(KEY_TO_PITCH) as KeyName[];

function resolveRoot(letter: string, accidental: string): KeyName | null {
  const normalizedAccidental = accidental === '♭' ? 'b' : accidental === '♯' ? '#' : accidental;
  const candidate = `${letter.toUpperCase()}${normalizedAccidental}` as KeyName;
  if (ROOT_NAMES.includes(candidate)) return candidate;
  if (accidental === 'b' || accidental === '#') return null;
  return letter.toUpperCase() as KeyName;
}

function resolveQuality(suffix: string): ChordQuality | null {
  const normalized = suffix.trim().toLowerCase();
  if (!normalized) return 'major';
  if (normalized === 'm' || normalized === 'min') return 'minor';
  if (normalized === 'dim' || normalized === 'o' || normalized === '°') return 'diminished';
  if (normalized === 'aug' || normalized === '+') return 'augmented';
  if (normalized === 'maj7' || normalized === 'ma7') return 'major7';
  if (normalized === 'm7' || normalized === 'min7') return 'minor7';
  if (normalized === '7') return 'dominant7';
  if (normalized === 'm7b5' || normalized === 'ø7') return 'halfDiminished7';
  if (normalized === 'dim7' || normalized === 'o7' || normalized === '°7') return 'diminished7';
  if (normalized === 'aug7' || normalized === '+7') return 'augmented7';
  return null;
}

function buildParsedChord(rootPitch: PitchClass, rootName: KeyName, quality: ChordQuality, input: string): DiatonicChord {
  const intervals: Record<ChordQuality, number[]> = {
    major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8],
    major7: [0, 4, 7, 11], minor7: [0, 3, 7, 10], dominant7: [0, 4, 7, 10],
    minorMajor7: [0, 3, 7, 11], halfDiminished7: [0, 3, 6, 10], diminished7: [0, 3, 6, 9],
    augmented7: [0, 4, 8, 10], majorAugmented7: [0, 4, 8, 11], dominant7Flat5: [0, 4, 6, 10],
  };
  const roles = ['root', 'third', 'fifth', 'seventh'] as const;
  const tones = intervals[quality].map((interval, index) => {
    const pitch = normalizePitch(rootPitch + interval);
    return { pitch, noteName: getNoteName(pitch, 'sharps'), role: roles[index] };
  });
  return { degree: 0, romanLabel: input, rootPitch, rootName, quality, symbol: input, tones, isExtended: tones.length === 4 };
}

export function parseChordToken(input: string, diatonicChords: DiatonicChord[]): ParsedChordToken {
  const token = input.trim();
  const match = token.match(/^([A-Ga-g])([#b♭♯]?)(.*)$/);
  if (!match) return { input: token, rootName: null, rootPitch: null, quality: null, chord: null, rootDegree: null, rootIsDiatonic: false, status: 'invalid', reason: 'Invalid chord symbol' };

  const rootName = resolveRoot(match[1], match[2]);
  if (match[3].includes('/')) {
    return {
      input: token,
      rootName,
      rootPitch: rootName ? KEY_TO_PITCH[rootName] : null,
      quality: null,
      chord: null,
      rootDegree: null,
      rootIsDiatonic: false,
      status: 'invalid',
      reason: 'Slash chords and explicit bass notes are not supported yet',
    };
  }
  const quality = resolveQuality(match[3]);
  if (!rootName || quality === null) {
    return { input: token, rootName, rootPitch: rootName ? KEY_TO_PITCH[rootName] : null, quality, chord: null, rootDegree: null, rootIsDiatonic: false, status: 'invalid', reason: 'Unsupported chord quality' };
  }

  const rootPitch = KEY_TO_PITCH[rootName];
  const rootChord = diatonicChords.find((candidate) => candidate.rootPitch === rootPitch);
  const chord = diatonicChords.find((candidate) => candidate.rootPitch === rootPitch && candidate.quality === quality)
    ?? buildParsedChord(rootPitch, rootName, quality, token);
  return {
    input: token,
    rootName,
    rootPitch,
    quality,
    chord,
    rootDegree: rootChord?.degree ?? null,
    rootIsDiatonic: rootChord !== undefined,
    status: diatonicChords.includes(chord) ? 'diatonic' : 'chromatic',
    chordSize: chord.isExtended ? 'tetrad' : 'triad',
    reason: diatonicChords.includes(chord) ? undefined : rootChord
      ? 'Diatonic root with non-diatonic chord quality'
      : 'Chord root is not diatonic in the active scale',
  };
}

export function analyzeChordSequence(input: string, diatonicChords: DiatonicChord[]): ParsedChordToken[] {
  return input
    .split(/[\s,;→>-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => parseChordToken(token, diatonicChords));
}
