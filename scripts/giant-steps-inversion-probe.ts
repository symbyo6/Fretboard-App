import { analyzeChordSequence } from '../src/lib/theory/chordSequence';
import { toVoicing, type ChordVoicing, type ChordVoicingType } from '../src/lib/theory/chords';
import {
  getPitchAtPosition,
  STANDARD_TUNING,
  type FretboardPosition,
} from '../src/lib/theory/fretboardPositions';
import type { DiatonicChord, StringNumber } from '../src/types';

const sequence = [
  'Bmaj7', 'D7', 'Gmaj7', 'Bb7', 'Ebmaj7', 'F#7',
  'Bmaj7', 'D7', 'Gmaj7', 'Bb7', 'Ebmaj7', 'F#7', 'Bmaj7',
];
const MAX_FRET = 24;
const MAX_FRET_SPAN = 4;
const adjacentGroups = [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1]];
const drop3Groups = [[6, 4, 3, 2], [5, 3, 2, 1]];
const families: ChordVoicingType[] = ['closed', 'drop2', 'drop3'];

function midi(position: FretboardPosition): number {
  const openMidi = [64, 59, 55, 50, 45, 40];
  return openMidi[position.string - 1] + position.fret;
}

function positionsForTone(pitch: number, string: number): FretboardPosition[] {
  const positions: FretboardPosition[] = [];
  for (let fret = 0; fret <= MAX_FRET; fret += 1) {
    if (getPitchAtPosition(string as StringNumber, fret, STANDARD_TUNING) === pitch) {
      positions.push({ string: string as StringNumber, fret, pitch: pitch as FretboardPosition['pitch'] });
    }
  }
  return positions;
}

function findPositions(chord: DiatonicChord, strings: number[]): FretboardPosition[][] {
  const choices = chord.tones.map((tone, index) => positionsForTone(tone.pitch, strings[index]));
  const results: FretboardPosition[][] = [];
  const visit = (index: number, selected: FretboardPosition[]) => {
    if (index === choices.length) {
      const midis = selected.map(midi);
      const frets = selected.map((position) => position.fret);
      const ascending = midis.every((value, voiceIndex) => voiceIndex === 0 || value > midis[voiceIndex - 1]);
      const span = Math.max(...frets) - Math.min(...frets);
      if (ascending && span <= MAX_FRET_SPAN) results.push(selected);
      return;
    }
    for (const position of choices[index]) visit(index + 1, [...selected, position]);
  };
  visit(0, []);
  return results;
}

function voicing(family: ChordVoicingType, inversion: number): ChordVoicing {
  return family === 'closed'
    ? inversion === 1 ? 'closed' : `closed-${inversion}` as ChordVoicing
    : `${family}-${inversion}` as ChordVoicing;
}

const analysis = analyzeChordSequence(sequence.join(' - '), []);
const failures: Array<Record<string, unknown>> = [];
let tested = 0;
let valid = 0;

for (const [stepIndex, token] of analysis.entries()) {
  if (!token.chord) {
    failures.push({ stepIndex, symbol: token.input, reason: 'invalid chord' });
    continue;
  }
  for (const family of families) {
    const groups = family === 'drop3' ? drop3Groups : adjacentGroups;
    const inversionCount = token.chord.tones.length === 4 ? 4 : 3;
    for (let inversion = 1; inversion <= inversionCount; inversion += 1) {
      for (const strings of groups) {
        tested += 1;
        const result = findPositions(toVoicing(token.chord, voicing(family, inversion)), strings);
        if (result.length > 0) {
          valid += 1;
        } else if (failures.length < 40) {
          failures.push({ stepIndex, symbol: token.input, family, inversion, strings, reason: 'no physical position within five frets' });
        }
      }
    }
  }
}

console.log(`sequenceChords=${analysis.length}`);
console.log(`testedCombinations=${tested}`);
console.log(`validCombinations=${valid}`);
console.log(`failedCombinations=${tested - valid}`);
if (failures.length > 0) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('ALL_GIANT_STEPS_INVERSION_GROUP_CASES_PASSED');
}
