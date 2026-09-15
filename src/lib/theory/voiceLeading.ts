import type { DiatonicChord } from '../../types';
import type { ChordVoicing, ChordVoicingType } from './chords';
import type { ParsedChordToken } from './chordSequence';

export type TriadInversion = 1 | 2 | 3;
export type TetradInversion = 1 | 2 | 3 | 4;

const TRIAD_TABLE: Record<1 | 2 | 3 | 4 | 5 | 6, readonly TriadInversion[]> = {
  1: [1, 3, 2],
  2: [3, 1, 2],
  3: [3, 1, 2],
  4: [2, 3, 1],
  5: [2, 3, 1],
  6: [1, 3, 2],
};

const TETRAD_TABLE: Record<1 | 2 | 3 | 4 | 5 | 6, readonly TetradInversion[]> = {
  1: [4, 1, 2, 3],
  2: [4, 1, 2, 3],
  3: [3, 4, 1, 2],
  4: [3, 4, 1, 2],
  5: [2, 3, 4, 1],
  6: [2, 3, 4, 1],
};

export function getDiatonicDelta(sourceDegree: number, targetDegree: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const delta = ((targetDegree - sourceDegree) % 7 + 7) % 7;
  if (delta === 0) return 6;
  return delta as 1 | 2 | 3 | 4 | 5 | 6;
}

export function getTriadLinkedInversion(
  sourceDegree: number,
  targetDegree: number,
  sourceInversion: TriadInversion
): TriadInversion {
  return TRIAD_TABLE[getDiatonicDelta(sourceDegree, targetDegree)][sourceInversion - 1];
}

export function getTetradLinkedInversion(
  sourceDegree: number,
  targetDegree: number,
  sourceInversion: TetradInversion
): TetradInversion {
  return TETRAD_TABLE[getDiatonicDelta(sourceDegree, targetDegree)][sourceInversion - 1];
}

export function getInversionFromVoicing(voicing: ChordVoicing): number {
  return voicing === 'closed' ? 1 : Number(voicing.at(-1));
}

function getCanonicalInversion(chord: DiatonicChord, inversion: number): number {
  return chord.quality === 'diminished7' ? 1 : inversion;
}

export interface LinkedChordStep {
  token: ParsedChordToken;
  chord: DiatonicChord | null;
  previousDegree: number | null;
  delta: number | null;
  sourceInversion: number | null;
  targetInversion: number | null;
  voicingType: ChordVoicingType;
  linkStatus: 'initial' | 'linked' | 'chromatic' | 'unavailable';
}

export function linkChordTransition(
  previous: LinkedChordStep | null,
  token: ParsedChordToken,
  voicing: ChordVoicing,
  extendedChords: boolean
): LinkedChordStep {
  const effectiveVoicing = extendedChords && voicing === 'closed' ? 'drop2-1' : voicing;
  const sourceInversion = previous?.targetInversion ?? getInversionFromVoicing(effectiveVoicing);
  const voicingType: ChordVoicingType = effectiveVoicing === 'closed'
    ? 'closed'
    : effectiveVoicing.startsWith('drop2') ? 'drop2' : 'drop3';

  if (!token.chord || token.status === 'invalid') {
    return {
      token,
      chord: token.chord,
      previousDegree: null,
      delta: null,
      sourceInversion: null,
      targetInversion: null,
      voicingType,
      linkStatus: 'unavailable',
    };
  }

  const previousDegree = previous?.previousDegree ?? null;
  if (previousDegree === null || token.rootDegree === null) {
    const targetInversion = getCanonicalInversion(token.chord, sourceInversion);
    return {
      token,
      chord: token.chord,
      previousDegree: token.rootDegree === null ? previousDegree : token.rootDegree,
      delta: null,
      sourceInversion,
      targetInversion,
      voicingType,
      linkStatus: token.status === 'chromatic' ? 'chromatic' : 'initial',
    };
  }

  const normalizedSourceInversion = extendedChords
    ? Math.min(4, Math.max(1, sourceInversion)) as TetradInversion
    : Math.min(3, Math.max(1, sourceInversion)) as TriadInversion;
  const sameRoot = previousDegree === token.rootDegree;
  const isDiatonicLink = !sameRoot
    && previous.token.status === 'diatonic'
    && token.status === 'diatonic';
  const delta = isDiatonicLink ? getDiatonicDelta(previousDegree, token.rootDegree) : null;
  const linkedInversion = !isDiatonicLink
    ? normalizedSourceInversion
    : extendedChords
      ? getTetradLinkedInversion(previousDegree, token.rootDegree, normalizedSourceInversion)
      : getTriadLinkedInversion(previousDegree, token.rootDegree, normalizedSourceInversion);

  return {
    token,
    chord: token.chord,
    previousDegree: token.rootDegree,
    delta,
    sourceInversion,
    targetInversion: isDiatonicLink
      ? getCanonicalInversion(token.chord, linkedInversion)
      : linkedInversion,
    voicingType,
    linkStatus: isDiatonicLink ? 'linked' : 'chromatic',
  };
}

export function linkChordSequence(
  analysis: ParsedChordToken[],
  voicing: ChordVoicing,
  extendedChords: boolean
): LinkedChordStep[] {
  let previous: LinkedChordStep | null = null;
  return analysis.map((token) => {
    const linked = linkChordTransition(previous, token, voicing, extendedChords);
    previous = linked;
    return linked;
  });
}
