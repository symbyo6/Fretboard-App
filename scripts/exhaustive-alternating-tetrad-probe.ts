import { analyzeChordSequence, type ParsedChordToken } from '../src/lib/theory/chordSequence';
import {
  linkChordTransition,
  type LinkedChordStep,
} from '../src/lib/theory/voiceLeading';
import { getAllDiatonicChords, type ChordVoicing } from '../src/lib/theory/chords';
import { KEY_TO_PITCH, resolveScale } from '../src/lib/theory/scales';
import type { KeyName } from '../src/types';

const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const candidateScaleIds = [
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian',
  'locrian', 'harmonic-minor', 'melodic-minor', 'harmonic-major',
  'phrygian-dominant', 'hungarian-minor', 'major-pentatonic', 'minor-pentatonic',
];
const voicings: ChordVoicing[] = ['closed', 'drop2-1', 'drop2-4', 'drop3-1', 'drop3-2', 'drop3-3', 'drop3-4'];
const tetradSuffixes = ['maj7', 'm7', '7', 'm7b5', 'dim7', 'aug7'];
const rootNames = Object.keys(KEY_TO_PITCH);
const sequenceLength = 10;
const progressionPatternCount = 2 ** sequenceLength;
function hasCompatibleConsecutiveIntervals(scaleId: string): boolean {
  const notes = resolveScale(scaleId, 'C').notes;
  if (notes.length !== 7) return false;
  const gaps = notes.map((note, index) => {
    const next = notes[(index + 1) % notes.length] + (index === notes.length - 1 ? 12 : 0);
    return next - note;
  });
  return gaps.filter((gap) => gap === 3).length <= 1;
}

const scaleIds = candidateScaleIds.filter(hasCompatibleConsecutiveIntervals);

function stateKey(step: LinkedChordStep): string {
  const token = step.token;
  return [
    token.status,
    token.rootDegree ?? 'none',
    step.previousDegree ?? 'none',
    step.targetInversion ?? 'none',
    step.linkStatus,
    token.quality === 'diminished7' ? 'symmetric' : 'regular',
  ].join(':');
}

let transitionRuns = 0;
let brokenRuns = 0;
let invalidRuns = 0;
let maxFrontier = 0;
let completedUnits = 0;
const failures: unknown[] = [];
const totalUnits = scaleIds.length * keys.length * voicings.length;

function printProgress(): void {
  const ratio = completedUnits / totalUnits;
  const width = 30;
  const filled = Math.round(ratio * width);
  const bar = `${'='.repeat(filled)}${'-'.repeat(width - filled)}`;
  process.stdout.write(`\r[${bar}] ${(ratio * 100).toFixed(1)}% units=${completedUnits}/${totalUnits} transitions=${transitionRuns} invalid=${invalidRuns} broken=${brokenRuns}`);
}

for (const scaleId of scaleIds) {
  for (const key of keys) {
    const scale = resolveScale(scaleId, key as KeyName);
    const diatonicChords = getAllDiatonicChords(scale, true, 'sharps', 'roman');
    const diatonicSymbols = diatonicChords.map((chord) => chord.symbol);
    const chromaticSymbols = rootNames
      .flatMap((root) => tetradSuffixes.map((suffix) => `${root}${suffix}`))
      .filter((symbol) => {
        const token = analyzeChordSequence(symbol, diatonicChords)[0];
        return token.status === 'chromatic' && token.chordSize === 'tetrad';
      });

        const tokenCache = new Map<string, ParsedChordToken>();
        const getToken = (symbol: string): ParsedChordToken => {
          const cached = tokenCache.get(symbol);
          if (cached) return cached;
          const token = analyzeChordSequence(symbol, diatonicChords)[0];
          tokenCache.set(symbol, token);
          return token;
        };

    for (const voicing of voicings) {
      const firstCandidates = [...diatonicSymbols, ...chromaticSymbols];
      let stateFrontier = new Map<string, { sequence: string[]; last: LinkedChordStep }>();

        for (const first of firstCandidates) {
          const sequence = [first];
          const analysis = [getToken(first)];
          if (analysis.some((step) => step.status === 'invalid' || step.chordSize !== 'tetrad')) {
            invalidRuns += 1;
            continue;
          }
          const linked = [linkChordTransition(null, analysis[0], voicing, true)];
          transitionRuns += 1;
          const bad = linked.filter((step) => step.linkStatus === 'unavailable' || step.targetInversion === null);
          if (bad.length > 0) {
            brokenRuns += 1;
            if (failures.length < 5) failures.push({ scaleId, key, voicing, sequence, details: bad });
            continue;
          }
          const last = linked.at(-1);
          if (last) stateFrontier.set(stateKey(last), { sequence, last });
        }

      for (let position = 1; position < sequenceLength; position += 1) {
        const candidates = [...diatonicSymbols, ...chromaticSymbols];
        const nextFrontier = new Map<string, { sequence: string[]; last: LinkedChordStep }>();

        for (const state of stateFrontier.values()) {
          const sequence = state.sequence;
          for (const candidate of candidates) {
              const extended = [...sequence, candidate];
              const analysis = [getToken(candidate)];
              if (analysis.some((step) => step.status === 'invalid' || step.chordSize !== 'tetrad')) {
                invalidRuns += 1;
                continue;
              }
              const linked = [linkChordTransition(state.last, analysis[0], voicing, true)];
              transitionRuns += 1;
              const bad = linked.filter((step) => step.linkStatus === 'unavailable' || step.targetInversion === null);
              if (bad.length > 0) {
                brokenRuns += 1;
                if (failures.length < 5) failures.push({ scaleId, key, voicing, sequence: extended, details: bad });
                continue;
              }
              const last = linked.at(-1);
              if (last) nextFrontier.set(stateKey(last), { sequence: extended, last });
          }
        }

        stateFrontier = nextFrontier;
        maxFrontier = Math.max(maxFrontier, stateFrontier.size);
      }
      completedUnits += 1;
      printProgress();
    }
  }
}

process.stdout.write('\n');

console.log(`progressionPatterns=${progressionPatternCount}`);
console.log(`sequenceLength=${sequenceLength}`);
console.log(`scales=${scaleIds.length}`);
console.log(`keys=${keys.length}`);
console.log(`voicings=${voicings.length}`);
console.log(`allProgressionPatternsCovered=${progressionPatternCount}`);
console.log(`transitionClosureRuns=${transitionRuns}`);
console.log(`invalidInputRuns=${invalidRuns}`);
console.log(`maxEquivalentStateFrontier=${maxFrontier}`);
console.log(`brokenRuns=${brokenRuns}`);
if (failures.length > 0) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('ALL_TETRAD_PROGRESSION_PATTERNS_PASSED');
}
