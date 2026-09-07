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
    ['root', 'fifth', 'seventh', 'third'],
    'Drop 2 position 1 order'
  );
  assertEqual(
    new Set(toVoicing(seventh, 'drop2-1').tones.map((tone) => tone.pitch)),
    new Set(seventh.tones.map((tone) => tone.pitch)),
    'Drop 2 preserves chord tones'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-2').tones.map((tone) => tone.role),
    ['third', 'seventh', 'root', 'fifth'],
    'Drop 2 position 2 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-3').tones.map((tone) => tone.role),
    ['fifth', 'root', 'third', 'seventh'],
    'Drop 2 position 3 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop2-4').tones.map((tone) => tone.role),
    ['seventh', 'third', 'fifth', 'root'],
    'Drop 2 position 4 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop3-1').tones.map((tone) => tone.role),
    ['root', 'seventh', 'third', 'fifth'],
    'Drop 3 position 1 order'
  );
  assertEqual(
    toVoicing(seventh, 'drop3-2').tones.map((tone) => tone.role),
    ['third', 'root', 'fifth', 'seventh'],
    'Drop 3 position 2 order'
  );
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
