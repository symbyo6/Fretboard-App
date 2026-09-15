import { getAllDiatonicChords } from '../src/lib/theory/chords';
import { resolveScale } from '../src/lib/theory/scales';
import { analyzeChordSequence } from '../src/lib/theory/chordSequence';
import { linkChordSequence } from '../src/lib/theory/voiceLeading';

const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
const scaleIds = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'harmonic-minor', 'melodic-minor'];
const voicings = ['closed', 'drop2-1', 'drop2-4', 'drop3-1', 'drop3-2', 'drop3-3', 'drop3-4'] as const;

const commonPatterns = [
  [1, 2, 3, 4, 5, 6, 7, 1, 4, 5],
  [1, 5, 6, 4, 2, 5, 1, 3, 4, 1],
  [1, 6, 4, 5, 1, 2, 5, 6, 4, 1],
  [1, 2, 5, 1, 6, 4, 5, 1, 2, 5],
  [1, 4, 2, 5, 1, 3, 6, 2, 5, 1],
  [1, 3, 4, 5, 6, 4, 2, 1, 5, 1],
  [1, 2, 3, 4, 5, 4, 2, 1, 6, 5],
  [1, 5, 1, 4, 2, 5, 1, 6, 4, 1],
  [1, 7, 6, 5, 4, 3, 2, 1, 5, 1],
  [1, 4, 5, 1, 2, 5, 4, 3, 2, 1],
  [1, 2, 5, 6, 1, 4, 2, 5, 1, 4],
  [1, 5, 6, 2, 3, 4, 5, 1, 4, 1],
];

const seen = new Set<string>();
let tested = 0;
let validSequences = 0;
let broken = 0;
const failures: Array<{ key: string; scaleId: string; sequence: string; voicing: string; details: unknown[] }> = [];

for (const scaleId of scaleIds) {
  for (const key of keys) {
    const scale = resolveScale(scaleId, key);
    const chords = getAllDiatonicChords(scale, true, 'sharps', 'roman');
    const chordByDegree = new Map(chords.map((chord) => [chord.degree, chord]));
    const baseDegrees = [1, 2, 3, 4, 5, 6, 7];

    const generatedSequences = new Set<string>();
    for (const pattern of commonPatterns) {
      generatedSequences.add(pattern.join(','));
    }
    for (let offset = 0; offset < 7; offset += 1) {
      const rotated = [...baseDegrees.slice(offset), ...baseDegrees.slice(0, offset)];
      const cycle = Array.from({ length: 10 }, (_, index) => rotated[index % rotated.length]);
      generatedSequences.add(cycle.join(','));
      for (let step = 1; step <= 3; step += 1) {
        const modded = Array.from({ length: 10 }, (_, index) => rotated[(index * step) % rotated.length]);
        generatedSequences.add(modded.join(','));
      }
    }

    for (const seq of generatedSequences) {
      const degreeSeq = seq.split(',').map((value) => Number(value));
      const spelled = degreeSeq.map((degree) => chordByDegree.get(degree)?.symbol ?? '').filter(Boolean);
      if (spelled.length !== 10) continue;
      const signature = `${scaleId}-${key}-${spelled.join('|')}`;
      if (seen.has(signature)) continue;
      seen.add(signature);

      const analysis = analyzeChordSequence(spelled.join(' - '), chords);
      if (analysis.some((step) => step.status === 'invalid')) {
        continue;
      }

      validSequences += 1;
      tested += 1;
      for (const voicing of voicings) {
        const linked = linkChordSequence(analysis, voicing, true);
        const bad = linked.filter((step) => step.linkStatus === 'unavailable' || step.targetInversion === null);
        if (bad.length > 0) {
          broken += 1;
          failures.push({
            key,
            scaleId,
            sequence: spelled.join(' - '),
            voicing,
            details: linked.map((step) => ({
              input: step.token.input,
              status: step.linkStatus,
              delta: step.delta,
              sourceInversion: step.sourceInversion,
              targetInversion: step.targetInversion,
            })),
          });
        }
      }
    }
  }
}

console.log(`validSequences=${validSequences}`);
console.log(`testedVoicingRuns=${tested * 7}`);
console.log(`brokenVoicingRuns=${broken}`);
if (failures.length > 0) {
  console.log(JSON.stringify(failures.slice(0, 5), null, 2));
  process.exitCode = 1;
} else {
  console.log('ALL_VALID_EXTENDED_CYCLE_PROBES_PASSED');
}
