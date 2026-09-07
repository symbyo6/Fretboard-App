// src/lib/theory/npsShapes.ts

import type {
  PitchClass,
  StringNumber,
  FretRange,
  FretboardPosition,
  NpsDegree,
  NpsShapeInstance,
  GuitarTuning,
} from '../../types';

import {
  STANDARD_TUNING,
  DEFAULT_FRET_COUNT,
  buildPosition,
  groupPositionsByString,
} from './fretboardPositions';
import { getScaleById } from './scales';

// ============================================================
// CONSTANTES DE ESTRUCTURA
// ============================================================

export const NPS_DEGREE_ORDER: NpsDegree[] = [1, 2, 3, 4, 5, 6, 7];

/** Alias de dominio para los siete grados de inicio del sistema 3NPS. */
export const NPS_DEGREES = NPS_DEGREE_ORDER;

/** Altura absoluta de cada cuerda al aire, relativa a la cuerda 6. */
export const STRING_OPEN_ABSOLUTE: Record<StringNumber, number> = {
  6: 0,
  5: 5,
  4: 10,
  3: 15,
  2: 19,
  1: 24,
};

const STRING_TRAVERSAL_ORDER: StringNumber[] = [6, 5, 4, 3, 2, 1];
export const NOTES_PER_STRING = 3;

export const NPS_SHAPE_COLORS: Record<NpsDegree, string> = {
  1: '#06b6d4',
  2: '#8b5cf6',
  3: '#f43f5e',
  4: '#eab308',
  5: '#22c55e',
  6: '#f97316',
  7: '#6366f1',
};

// ============================================================
// NOMBRES DE MODO PEDAGÓGICOS
// ============================================================

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 11];
const MELODIC_MINOR_INTERVALS = [0, 2, 3, 5, 7, 9, 11];

const MAJOR_MODE_NAMES = [
  'Jonio (1ª — Mayor)',
  'Dorio (2º)',
  'Frigio (3º)',
  'Lidio (4º)',
  'Mixolidio (5º)',
  'Eoleo (6º — menor natural)',
  'Locrio (7º)',
];

const HARMONIC_MINOR_MODE_NAMES = [
  'Menor armónica (1ª)',
  'Locrio #6 (2º)',
  'Jonio #5 (3º)',
  'Dorio #4 (4º)',
  'Frigio dominante (5º)',
  'Lidio #2 (6º)',
  'Ultralocrio (7º)',
];

const MELODIC_MINOR_MODE_NAMES = [
  'Menor melódica (1ª)',
  'Dorio b2 (2º)',
  'Lidio aumentado (3º)',
  'Lidio dominante (4º)',
  'Mixolidio b6 (5º)',
  'Locrio #2 (6º)',
  'Alterada (7º — Superlocrio)',
];

function intervalsMatch(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function getNpsModeNames(scaleIntervals: readonly number[]): string[] {
  if (intervalsMatch(scaleIntervals, MAJOR_SCALE_INTERVALS)) return MAJOR_MODE_NAMES;
  if (intervalsMatch(scaleIntervals, HARMONIC_MINOR_INTERVALS)) return HARMONIC_MINOR_MODE_NAMES;
  if (intervalsMatch(scaleIntervals, MELODIC_MINOR_INTERVALS)) return MELODIC_MINOR_MODE_NAMES;
  return NPS_DEGREE_ORDER.map((degree) => `Grado ${degree}`);
}

export function getModeNameForDegree(
  scaleIntervals: readonly number[],
  degree: NpsDegree
): string {
  return getNpsModeNames(scaleIntervals)[degree - 1];
}

// ============================================================
// ALGORITMO CENTRAL: CONSTRUCCIÓN DE UN SHAPE 3NPS
// ============================================================

function scaleStepAbsolute(scaleIntervals: readonly number[], index: number): number {
  const scaleLength = scaleIntervals.length;
  const octave = Math.floor(index / scaleLength);
  const intervalIndex = ((index % scaleLength) + scaleLength) % scaleLength;
  return scaleIntervals[intervalIndex] + 12 * octave;
}

export function buildNpsShapeInstance(
  scaleIntervals: readonly number[],
  rootPitch: PitchClass,
  degree: NpsDegree,
  cycle: number = 0,
  tuning: GuitarTuning = STANDARD_TUNING
): NpsShapeInstance {
  const degreeIndex = degree - 1;
  const openLowEPitchClass = tuning[5];
  const rootOffsetFromOpenE = ((rootPitch - openLowEPitchClass) % 12 + 12) % 12;

  function heightForNoteIndex(noteIndex: number): number {
    return rootOffsetFromOpenE
      + scaleStepAbsolute(scaleIntervals, degreeIndex + noteIndex)
      + 12 * cycle;
  }

  const positions: FretboardPosition[] = [];
  let noteIndex = 0;

  for (const stringNumber of STRING_TRAVERSAL_ORDER) {
    for (let noteOnString = 0; noteOnString < NOTES_PER_STRING; noteOnString++) {
      const height = heightForNoteIndex(noteIndex);
      const fret = height - STRING_OPEN_ABSOLUTE[stringNumber];
      positions.push(buildPosition(stringNumber, fret, tuning));
      noteIndex += 1;
    }
  }

  const frets = positions.map((position) => position.fret);
  const gripWindow: FretRange = {
    minFret: Math.min(...frets),
    maxFret: Math.max(...frets),
  };

  const PADDING = 1;
  const window: FretRange = {
    minFret: Math.max(0, gripWindow.minFret - PADDING),
    maxFret: gripWindow.maxFret + PADDING,
  };

  const rootPositions = positions.filter((position) => position.pitch === rootPitch);
  const positionsByString = groupPositionsByString(positions);
  const modeName = getModeNameForDegree(scaleIntervals, degree);

  return {
    degree,
    rootPitch,
    scaleIntervals,
    cycle,
    positions,
    positionsByString,
    gripWindow,
    window,
    rootPositions,
    modeName,
  };
}

/** Devuelve el rango exacto de trastes de la aparición primaria de un shape 3NPS. */
export function getNpsShapeFretRange(
  rootPitch: PitchClass,
  scaleId: string,
  degree: NpsDegree
): FretRange {
  const scale = getScaleById(scaleId);
  if (!scale) {
    throw new Error(`[npsShapes.ts] Escala desconocida: "${scaleId}"`);
  }

  return buildNpsShapeInstance(scale.intervals, rootPitch, degree, 0).gripWindow;
}

// ============================================================
// LOS 7 SHAPES Y SUS REPETICIONES
// ============================================================

export function getNpsShapesForRoot(
  scaleIntervals: readonly number[],
  rootPitch: PitchClass,
  maxFret: number = DEFAULT_FRET_COUNT,
  tuning: GuitarTuning = STANDARD_TUNING
): NpsShapeInstance[] {
  const instances: NpsShapeInstance[] = [];

  for (const degree of NPS_DEGREE_ORDER) {
    let cycle = 0;
    while (true) {
      const instance = buildNpsShapeInstance(scaleIntervals, rootPitch, degree, cycle, tuning);
      if (instance.gripWindow.minFret > maxFret) break;

      if (instance.gripWindow.minFret >= 0 && instance.gripWindow.maxFret <= maxFret) {
        instances.push(instance);
      }

      cycle += 1;
      if (cycle > 3) break;
    }
  }

  return instances.sort((a, b) => a.gripWindow.minFret - b.gripWindow.minFret);
}

export function getPrimaryNpsShapes(
  scaleIntervals: readonly number[],
  rootPitch: PitchClass,
  tuning: GuitarTuning = STANDARD_TUNING
): NpsShapeInstance[] {
  return NPS_DEGREE_ORDER.map((degree) => (
    buildNpsShapeInstance(scaleIntervals, rootPitch, degree, 0, tuning)
  ));
}

// ============================================================
// BÚSQUEDA Y MATCHING DE SHAPES
// ============================================================

export function findNpsShapeContainingFret(
  instances: NpsShapeInstance[],
  fret: number
): NpsShapeInstance | null {
  const candidates = instances.filter((instance) => (
    fret >= instance.window.minFret && fret <= instance.window.maxFret
  ));

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const gripCenter = (instance: NpsShapeInstance): number => (
    (instance.gripWindow.minFret + instance.gripWindow.maxFret) / 2
  );

  return candidates.reduce((closest, current) => (
    Math.abs(gripCenter(current) - fret) < Math.abs(gripCenter(closest) - fret)
      ? current
      : closest
  ));
}

export function findNearestNpsShape(
  instances: NpsShapeInstance[],
  fret: number
): NpsShapeInstance | null {
  if (instances.length === 0) return null;

  const distanceToInstance = (instance: NpsShapeInstance): number => {
    if (fret >= instance.window.minFret && fret <= instance.window.maxFret) return 0;
    if (fret < instance.window.minFret) return instance.window.minFret - fret;
    return fret - instance.window.maxFret;
  };

  return instances.reduce((closest, current) => (
    distanceToInstance(current) < distanceToInstance(closest) ? current : closest
  ));
}

export function getDefaultNpsShapeForRoot(
  scaleIntervals: readonly number[],
  rootPitch: PitchClass,
  tuning: GuitarTuning = STANDARD_TUNING
): NpsShapeInstance {
  const primary = getPrimaryNpsShapes(scaleIntervals, rootPitch, tuning);
  return primary.reduce((lowest, current) => (
    current.gripWindow.minFret < lowest.gripWindow.minFret ? current : lowest
  ));
}

// ============================================================
// UTILIDADES DE MEMBRESÍA
// ============================================================

export function isPositionInNpsWindow(
  position: FretboardPosition,
  instance: NpsShapeInstance
): boolean {
  return position.fret >= instance.window.minFret && position.fret <= instance.window.maxFret;
}

export function isPositionInNpsGrip(
  position: FretboardPosition,
  instance: NpsShapeInstance
): boolean {
  return instance.positions.some((shapePosition) => (
    shapePosition.string === position.string && shapePosition.fret === position.fret
  ));
}

export function isPositionNpsRoot(
  position: FretboardPosition,
  instance: NpsShapeInstance
): boolean {
  return instance.rootPositions.some((rootPosition) => (
    rootPosition.string === position.string && rootPosition.fret === position.fret
  ));
}

// ============================================================
// UTILIDADES DE VISUALIZACIÓN Y VALIDACIÓN
// ============================================================

export function getNpsShapeInstanceLabel(instance: NpsShapeInstance): string {
  const octaveSuffix = instance.cycle > 0 ? ` (8va +${instance.cycle})` : '';
  return `Shape ${instance.degree} — ${instance.modeName}${octaveSuffix} — trastes ${instance.window.minFret}-${instance.window.maxFret}`;
}

export function getNpsShapeSequenceLabel(): string {
  return NPS_DEGREE_ORDER.join(' → ');
}

export function getNpsShapeStretch(instance: NpsShapeInstance): number {
  return instance.gripWindow.maxFret - instance.gripWindow.minFret;
}

export function isValidNpsDegree(value: number): value is NpsDegree {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

export function isValidNpsScale(scaleIntervals: readonly number[]): boolean {
  return (
    scaleIntervals.length === 7
    && scaleIntervals[0] === 0
    && scaleIntervals.every((value, index) => (
      index === 0 || value > scaleIntervals[index - 1]
    ))
  );
}
