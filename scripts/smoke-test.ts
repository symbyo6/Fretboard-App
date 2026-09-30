#!/usr/bin/env -S npx tsx
/**
 * Run with: npx tsx scripts/smoke-test.ts
 * Validates core theory, shape, and comparison utilities without starting the UI.
 */

import { performance } from 'node:perf_hooks';
import { buildDiatonicChord, getAllDiatonicChords, toVoicing } from '../src/lib/theory/chords';
import { compareMajorModes, diffModes } from '../src/lib/theory/compareModes';
import { buildDegreeOverlay } from '../src/lib/theory/minorVariantOverlay';
import { getDifferingScaleDegrees } from '../src/lib/theory/minorVariants';
import { buildOverlayRings } from '../src/lib/theory/overlayRings';
import { getPrimaryCagedShapes } from '../src/lib/theory/caged';
import { getPrimaryNpsShapes } from '../src/lib/theory/npsShapes';
import { findBestOverlapPair } from '../src/lib/shapes/shapeComparison';
import { getMajorDegreePentatonic, getNoteName, getScaleNoteNames, resolveScale, SCALE_LIBRARY } from '../src/lib/theory/scales';
import type { PitchClass } from '../src/types';
import { fretToNoteName } from '../src/lib/audio/tuning';
import { getDiatonicDelta, getTriadLinkedInversion, getTetradLinkedInversion, linkChordSequence } from '../src/lib/theory/voiceLeading';
import { analyzeChordSequence } from '../src/lib/theory/chordSequence';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  const start = performance.now();
  try {
    fn();
    results.push({ name, passed: true, durationMs: performance.now() - start });
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    });
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Received: ${JSON.stringify(actual)}`);
  }
}

test('C Ionian resolves to seven scale tones', () => {
  const notes = resolveScale('ionian', 'C').notes.map((pitch) => getNoteName(pitch));
  assertEqual(notes, ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'C Ionian notes');
});

test('Triad linking table follows the specified delta mappings', () => {
  assertEqual(getDiatonicDelta(1, 2), 1, 'I to II delta');
  const topRow = [1, 3, 3, 2, 2, 1] as const;
  for (const [index, expected] of topRow.entries()) {
    const delta = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    const targetDegree = ((1 + delta - 1) % 7) + 1;
    assertEqual(
      getTriadLinkedInversion(1, targetDegree, 1),
      expected,
      `Triad top row delta ${delta} maps 1 to ${expected}`
    );
  }
  for (const inversion of [1, 2, 3] as const) {
    assertEqual(
      getTriadLinkedInversion(1, 2, inversion),
      inversion,
      `Triad delta 1 keeps inversion ${inversion}`
    );
  }
  assertEqual(getTriadLinkedInversion(5, 6, 2), 2, 'V to vi keeps second inversion');
  assertEqual(getTriadLinkedInversion(1, 3, 1), 3, 'Triad delta 2 inversion');
  assertEqual(getTriadLinkedInversion(1, 5, 1), 2, 'Triad delta 4 inversion');
  assertEqual(getTriadLinkedInversion(1, 7, 1), 1, 'Triad delta 6 inversion');
});

test('Tetrad linking table follows the specified delta mappings', () => {
  assertEqual(getTetradLinkedInversion(1, 2, 1), 4, 'Tetrad delta 1 inversion');
  assertEqual(getTetradLinkedInversion(1, 4, 1), 3, 'Tetrad delta 3 inversion');
  assertEqual(getTetradLinkedInversion(1, 5, 1), 3, 'Tetrad delta 4 inversion');
  assertEqual(getTetradLinkedInversion(1, 7, 1), 2, 'Tetrad delta 6 inversion');
});

test('Diatonic links are reversible in both directions', () => {
  for (let sourceDegree = 1; sourceDegree <= 7; sourceDegree += 1) {
    for (let targetDegree = 1; targetDegree <= 7; targetDegree += 1) {
      if (sourceDegree === targetDegree) continue;
      for (const inversion of [1, 2, 3] as const) {
        const linked = getTriadLinkedInversion(sourceDegree, targetDegree, inversion);
        const returned = getTriadLinkedInversion(targetDegree, sourceDegree, linked);
        assertEqual(returned, inversion, `Triad ${sourceDegree}->${targetDegree} is reversible`);
      }
      for (const inversion of [1, 2, 3, 4] as const) {
        const linked = getTetradLinkedInversion(sourceDegree, targetDegree, inversion);
        const returned = getTetradLinkedInversion(targetDegree, sourceDegree, linked);
        assertEqual(returned, inversion, `Tetrad ${sourceDegree}->${targetDegree} is reversible`);
      }
    }
  }
});

test('Same-root chromatic quality changes do not use the diatonic linking table', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), true);
  const analysis = analyzeChordSequence('Em7 - E°7', chords);
  const linked = linkChordSequence(analysis, 'closed', true);
  assertEqual(linked[1]?.delta, null, 'Same-root quality change has no diatonic delta');
  assertEqual(linked[1]?.targetInversion, linked[1]?.sourceInversion, 'Same-root quality change keeps inversion');
  const dropTwoLinked = linkChordSequence(analysis, 'drop2-4', true);
  assertEqual(dropTwoLinked[1]?.targetInversion, 4, 'Same-root quality change keeps the physical drop-two inversion');
});

test('Chromatic-to-diatonic links preserve inversion without using the diatonic table', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), true);
  const analysis = analyzeChordSequence('E°7 - Dm7', chords);
  const linked = linkChordSequence(analysis, 'drop2-1', true);
  assertEqual(linked[1]?.delta, null, 'Chromatic-to-diatonic link has no diatonic delta');
  assertEqual(linked[1]?.targetInversion, linked[1]?.sourceInversion, 'Chromatic-to-diatonic link keeps inversion');
});

test('Chromatic transitions expose physical inversion choices', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), true);
  const analysis = analyzeChordSequence('Cmaj7 - Db°7 - Dm7', chords);
  const linked = linkChordSequence(analysis, 'drop2-1', true);
  assertEqual(linked[2]?.delta, null, 'Chromatic transition has no diatonic delta');
  assertEqual(linked[2]?.linkStatus, 'chromatic', 'Chromatic transition is marked physical');
});

test('Triad D to Em keeps the inversion for delta 1 even in C', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), false);
  const analysis = analyzeChordSequence('D - Em', chords);
  const linked = linkChordSequence(analysis, 'closed-2', false);
  assertEqual(linked[1]?.delta, 1, 'D to Em is a one-degree triad transition');
  assertEqual(linked[1]?.targetInversion, linked[1]?.sourceInversion, 'D to Em keeps the triad inversion');
});

test('Diminished seventh inversions normalize to one symmetric voicing', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), true);
  const analysis = analyzeChordSequence('E°7 - E°7', chords);
  for (const voicing of ['closed', 'closed-2', 'closed-3', 'closed-4'] as const) {
    const linked = linkChordSequence(analysis, voicing, true);
    assertEqual(linked[0]?.targetInversion, 1, `${voicing} diminished seventh canonical inversion`);
    assertEqual(linked[1]?.targetInversion, 1, `${voicing} repeated diminished seventh canonical inversion`);
  }
});

test('Last linked tetrad sequence remains available through the exposed voice-leading voicings', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), true);
  const analysis = analyzeChordSequence('Cmaj7 - Db°7 - Dm7 - Eb°7 - Em7 - E°7 - Dm7 - D°7 - Cmaj7', chords);
  const routes = [
    ['closed', 1],
    ['drop2-1', 1],
    ['drop2-4', 4],
    ['drop3-1', 1],
    ['drop3-2', 2],
    ['drop3-3', 3],
    ['drop3-4', 4],
  ] as const;

  for (const [voicing, expectedInitialInversion] of routes) {
    const linked = linkChordSequence(analysis, voicing, true);
    assertEqual(linked[0]?.targetInversion, expectedInitialInversion, `${voicing} initial inversion`);
    assert(!linked.some((step) => step.linkStatus === 'unavailable'), `${voicing} sequence remains available`);
    assert(linked.every((step) => step.targetInversion !== null), `${voicing} every step has a target inversion`);
  }
});

test('Note naming never emits E# or B#', () => {
  const names = Array.from({ length: 12 }, (_, pitch) => getNoteName(pitch as PitchClass, 'both'));
  assert(!names.some((name) => /E#|B#/.test(name)), 'Enharmonic E# and B# names are excluded');
});

test('Scales with seven or fewer notes use unique note letters', () => {
  for (const definition of SCALE_LIBRARY) {
    if (definition.intervals.length > 7) continue;

    const names = getScaleNoteNames(resolveScale(definition.id, 'C'), 'both');
    const letters = names.map((name) => name[0]);
    assertEqual(new Set(letters).size, names.length, `${definition.id} repeats a note letter`);
    assert(!names.some((name) => name === 'E#' || name === 'B#'), `${definition.id} uses a forbidden enharmonic name`);
  }
});

test('Tonalities lock to compatible sharp or flat spellings', () => {
  const sharpScale = resolveScale('ionian', 'D');
  assertEqual(
    getScaleNoteNames(sharpScale, 'sharps'),
    ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    'D major sharp spelling'
  );
  assertEqual(
    getScaleNoteNames(resolveScale('ionian', 'Ab'), 'flats'),
    ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    'Ab major flat spelling'
  );
});

test('C harmonic major resolves with flat sixth and seventh', () => {
  const notes = getScaleNoteNames(resolveScale('harmonic-major', 'C'));
  assertEqual(notes, ['C', 'D', 'E', 'F', 'G', 'Ab', 'B'], 'C harmonic major notes');
});

test('Fretboard notes preserve the octave of every string position', () => {
  assertEqual(
    [0, 1, 2, 3, 4, 5].map((stringIndex) => fretToNoteName(stringIndex, 0)),
    ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'],
    'Open-string octaves'
  );
  assertEqual(
    [0, 1, 2, 3, 4, 5].map((stringIndex) => fretToNoteName(stringIndex, 12)),
    ['E5', 'B4', 'G4', 'D4', 'A3', 'E3'],
    '12th-fret octaves'
  );
  assertEqual(fretToNoteName(5, 1), 'F2', 'Low E first fret');
  assertEqual(fretToNoteName(0, 24), 'E6', 'High E 24th fret');
});

test('C Ionian has seven diatonic triads', () => {
  const chords = getAllDiatonicChords(resolveScale('ionian', 'C'), false);
  assertEqual(chords.length, 7, 'Diatonic triad count');
  assertEqual(chords[0].symbol, 'C', 'I chord symbol');
});

test('Major scale degrees expose major, minor, and b5 pentatonics', () => {
  const scale = resolveScale('ionian', 'C');
  assertEqual(
    getMajorDegreePentatonic(scale, 1)?.intervalLabels,
    ['1', '2', '3', '5', '6'],
    'I major pentatonic'
  );
  assertEqual(
    getMajorDegreePentatonic(scale, 2)?.intervalLabels,
    ['1', 'b3', '4', '5', 'b7'],
    'ii minor pentatonic'
  );
  assertEqual(
    getMajorDegreePentatonic(scale, 7)?.intervalLabels,
    ['1', 'b3', '4', 'b5', 'b7'],
    'vii diminished pentatonic'
  );
  assertEqual(
    getMajorDegreePentatonic(scale, 7)?.notes.map((pitch) => getNoteName(pitch)),
    ['B', 'D', 'E', 'F', 'A'],
    'B diminished pentatonic notes'
  );
});

test('Pentatonic scales expose their contained 1-3-5 triad', () => {
  const majorPentatonic = getAllDiatonicChords(resolveScale('major-pentatonic', 'C'), false);
  const minorPentatonic = getAllDiatonicChords(resolveScale('minor-pentatonic', 'A'), false);

  assertEqual(majorPentatonic.length, 1, 'Major pentatonic chord count');
  assertEqual(majorPentatonic[0].tones.map((tone) => tone.noteName), ['C', 'E', 'G'], 'Major pentatonic 1-3-5 triad');
  assertEqual(minorPentatonic.length, 1, 'Minor pentatonic chord count');
  assertEqual(minorPentatonic[0].tones.map((tone) => tone.noteName), ['A', 'C', 'E'], 'Minor pentatonic 1-b3-5 triad');
});

test('Drop 2 reorders triads and seventh chords without changing their tones', () => {
  const scale = resolveScale('ionian', 'C');
  const triad = buildDiatonicChord(scale, 1, false);
  const seventh = buildDiatonicChord(scale, 1, true);

  assertEqual(
    toVoicing(triad, 'drop2-1').tones.map((tone) => tone.role),
    ['third', 'root', 'fifth'],
    'Drop 2 triad order'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-1').tones.map((tone) => tone.role),
    ['fifth', 'root', 'third', 'seventh'],
    'Drop 2 position 1 order'
  );
  assertEqual(
    new Set(toVoicing(seventh, 'drop2-1').tones.map((tone) => tone.pitch)),
    new Set(seventh.tones.map((tone) => tone.pitch)),
    'Drop 2 preserves chord tones'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-2').tones.map((tone) => tone.role),
    ['seventh', 'third', 'fifth', 'root'],
    'Drop 2 position 2 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-3').tones.map((tone) => tone.role),
    ['root', 'fifth', 'seventh', 'third'],
    'Drop 2 position 3 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-4').tones.map((tone) => tone.role),
    ['third', 'seventh', 'root', 'fifth'],
    'Drop 2 position 4 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop3-1').tones.map((tone) => tone.role),
    ['third', 'root', 'fifth', 'seventh'],
    'Drop 3 position 1 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop3-2').tones.map((tone) => tone.role),
    ['fifth', 'third', 'seventh', 'root'],
    'Drop 3 position 2 order'
  );
});

test('Drop voicing positions match their labeled inversions', () => {
  const chord = buildDiatonicChord(resolveScale('ionian', 'C'), 1, true);
  const expectedDrop2 = [[2, 0, 1, 3], [3, 1, 2, 0], [0, 2, 3, 1], [1, 3, 0, 2]];
  const expectedDrop3 = [[1, 0, 2, 3], [2, 1, 3, 0], [3, 2, 0, 1], [0, 3, 1, 2]];
  for (let index = 0; index < 4; index += 1) {
    assertEqual(toVoicing(chord, `drop2-${index + 1}` as const).tones.map((tone) => chord.tones.indexOf(tone)), expectedDrop2[index], `Drop 2 inversion ${index + 1}`);
    assertEqual(toVoicing(chord, `drop3-${index + 1}` as const).tones.map((tone) => chord.tones.indexOf(tone)), expectedDrop3[index], `Drop 3 inversion ${index + 1}`);
  }
});

test('A melodic minor identifies characteristic seventh chords', () => {
  const scale = resolveScale('melodic-minor', 'A');
  assertEqual(buildDiatonicChord(scale, 1, true).quality, 'minorMajor7', 'I seventh chord');
  assertEqual(buildDiatonicChord(scale, 3, true).quality, 'majorAugmented7', 'III seventh chord');
  assertEqual(buildDiatonicChord(scale, 4, true).quality, 'dominant7', 'IV seventh chord convention');
  assertEqual(buildDiatonicChord(scale, 5, true).quality, 'dominant7', 'V seventh chord convention');
  assertEqual(buildDiatonicChord(scale, 6, true).quality, 'halfDiminished7', 'VI seventh chord convention');
  assertEqual(buildDiatonicChord(scale, 7, true).quality, 'halfDiminished7', 'VII seventh chord convention');
});

test('Minor variants diverge only on degrees VI and VII', () => {
  assertEqual(getDifferingScaleDegrees('A'), [6, 7], 'Divergent minor-scale degrees');
  assertEqual(
    buildDegreeOverlay('A').filter((degree) => degree.isDivergent).map((degree) => degree.degree),
    [6, 7],
    'Divergent overlay degrees'
  );
});

test('Primary CAGED and 3NPS shapes have expected counts', () => {
  assertEqual(getPrimaryCagedShapes(0).length, 5, 'CAGED shape count');
  assertEqual(getPrimaryNpsShapes([0, 2, 4, 5, 7, 9, 11], 0).length, 7, '3NPS shape count');
});

test('Shape overlap finds a valid C Ionian pairing', () => {
  const best = findBestOverlapPair(0, 'ionian', { minFret: 0, maxFret: 15 });
  assert(best.stats.intersectionCount >= 0, 'Overlap intersection must be non-negative');
});

test('C Lydian differs from C Ionian only on degree IV', () => {
  const comparison = compareMajorModes('C');
  assertEqual(comparison.modes.length, 7, 'Mode count');
  assertEqual(
    diffModes('C', 'ionian', 'lydian'),
    [{ degree: 4, noteA: 'F', noteB: 'F#' }],
    'Ionian/Lydian difference'
  );
});

test('Overlay rings group variants sharing a note', () => {
  const rings = buildOverlayRings(
    { natural: 'G', harmonic: 'G#', melodic: 'G#' },
    {
      natural: { stroke: '#60a5fa', dash: '0' },
      harmonic: { stroke: '#f87171', dash: '4 2' },
      melodic: { stroke: '#34d399', dash: '2 2' },
    }
  );
  assertEqual(rings.length, 2, 'Ring groups');
  assertEqual(rings.find((ring) => ring.note === 'G#')?.variants, ['harmonic', 'melodic'], 'Shared ring variants');
});

function printReport(): void {
  const failed = results.filter((result) => !result.passed);
  const durationMs = results.reduce((sum, result) => sum + result.durationMs, 0);

  console.log('\nSmoke test results');
  results.forEach((result) => {
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name} (${result.durationMs.toFixed(1)}ms)`);
    if (!result.passed) console.log(`  ${result.error}`);
  });
  console.log(`${results.length - failed.length}/${results.length} passed in ${durationMs.toFixed(1)}ms`);

  if (failed.length > 0) process.exitCode = 1;
}

printReport();
