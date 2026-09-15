import { analyzeChordSequence } from '../src/lib/theory/chordSequence';
import { toVoicing, type ChordVoicing } from '../src/lib/theory/chords';
import {
  getPitchAtPosition,
  STANDARD_TUNING,
  type FretboardPosition,
} from '../src/lib/theory/fretboardPositions';
import type { DiatonicChord, PitchClass, StringNumber } from '../src/types';

const roots: Array<[string, PitchClass]> = [
  ['C', 0], ['C#', 1], ['D', 2], ['D#', 3], ['E', 4], ['F', 5],
  ['F#', 6], ['G', 7], ['G#', 8], ['A', 9], ['A#', 10], ['B', 11],
];
const tetradSuffixes = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'aug7'];
const adjacentStringGroups: number[][] = [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1]];
const drop3StringGroups: number[][] = [[6, 4, 3, 2], [5, 3, 2, 1]];
const fretCount = 24;

type PhysicalCase = {
  family: 'closed' | 'drop2' | 'drop3';
  voicing: ChordVoicing;
  strings: number[];
};

function midi(position: FretboardPosition): number {
  const openMidiByString = [64, 59, 55, 50, 45, 40];
  return openMidiByString[position.string - 1] + position.fret;
}

function positionsForTone(pitch: PitchClass, string: number): FretboardPosition[] {
  const positions: FretboardPosition[] = [];
  for (let fret = 0; fret <= fretCount; fret += 1) {
    if (getPitchAtPosition(string as StringNumber, fret, STANDARD_TUNING) === pitch) {
      positions.push({ string: string as StringNumber, fret, pitch });
    }
  }
  return positions;
}

function allPhysicalCombinations(tones: DiatonicChord['tones'], strings: number[]): FretboardPosition[][] {
  const choices = tones.map((tone, toneIndex) => positionsForTone(tone.pitch, strings[toneIndex]));
  const combinations: FretboardPosition[][] = [];

  const visit = (toneIndex: number, selected: FretboardPosition[]) => {
    if (toneIndex === choices.length) {
      combinations.push(selected);
      return;
    }
    for (const position of choices[toneIndex]) {
      visit(toneIndex + 1, [...selected, position]);
    }
  };

  visit(0, []);
  return combinations;
}

function hasAscendingVoicing(combination: FretboardPosition[]): boolean {
  const midis = combination.map(midi);
  return midis.every((value, index) => index === 0 || value > midis[index - 1]);
}

function fretSpan(combination: FretboardPosition[]): number {
  const frets = combination.map((position) => position.fret);
  return Math.max(...frets) - Math.min(...frets);
}

function getCases(): PhysicalCase[] {
  const cases: PhysicalCase[] = [];
  for (const family of ['closed', 'drop2', 'drop3'] as const) {
    const groups = family === 'drop3' ? drop3StringGroups : adjacentStringGroups;
    for (let inversion = 1; inversion <= 4; inversion += 1) {
      const voicing = `${family}-${inversion}` as ChordVoicing;
      for (const strings of groups) cases.push({ family, voicing, strings });
    }
  }
  return cases;
}

let testedCases = 0;
let combinations = 0;
let ascendingCombinations = 0;
let zeroPositionCases = 0;
let malformedCases = 0;
const failures: unknown[] = [];
const physicalCases = getCases();

for (const [root] of roots) {
  for (const suffix of tetradSuffixes) {
    const symbol = `${root}${suffix}`;
    const token = analyzeChordSequence(symbol, [])[0];
    if (!token.chord || token.chord.tones.length !== 4 || token.chordSize !== 'tetrad') {
      malformedCases += 1;
      continue;
    }

    for (const physicalCase of physicalCases) {
      const chord = toVoicing(token.chord, physicalCase.voicing);
      const possible = allPhysicalCombinations(chord.tones, physicalCase.strings);
      const ascending = possible.filter(hasAscendingVoicing);
      testedCases += 1;
      combinations += possible.length;
      ascendingCombinations += ascending.length;

      if (possible.length === 0 || ascending.length === 0) {
        zeroPositionCases += 1;
        if (failures.length < 10) {
          failures.push({
            symbol,
            voicing: physicalCase.voicing,
            strings: physicalCase.strings,
            combinations: possible.length,
            ascendingCombinations: ascending.length,
          });
        }
      }
    }
  }
}

console.log(`tetrads=${roots.length * tetradSuffixes.length}`);
console.log(`physicalCasesPerTetrad=${physicalCases.length}`);
console.log(`testedCases=${testedCases}`);
console.log(`allFretCombinations=${combinations}`);
console.log(`ascendingFretCombinations=${ascendingCombinations}`);
console.log(`malformedCases=${malformedCases}`);
console.log(`zeroPositionCases=${zeroPositionCases}`);
if (failures.length > 0) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('ALL_FRETBOARD_TETRAD_CASES_PASSED');
}
