// src/lib/theory/fretboardPositions.ts

import type {
  PitchClass,
  StringNumber,
  FretNumber,
  FretboardPosition,
  FretPosition,
  FretRange,
  GuitarTuning,
  NotationPreference,
} from '../../types';

import { getNoteName } from './scales';

// ============================================================
// 🎼 CONSTANTES DE AFINACIÓN Y MÁSTIL
// ============================================================

/**
 * Afinación estándar E-A-D-G-B-E, indexada por número de cuerda (1-6).
 * Convención: cuerda 1 = Mi aguda (la más fina, la que suena más alto),
 * cuerda 6 = Mi grave (la más gruesa). Esta es la MISMA convención
 * usada en TAB y en la mayoría de diagramas de acordes.
 *
 * Índice del array = stringNumber - 1
 */
export const STANDARD_TUNING: GuitarTuning = [
  4,  // cuerda 1: E  (Mi aguda)
  11, // cuerda 2: B  (Si)
  7,  // cuerda 3: G  (Sol)
  2,  // cuerda 4: D  (Re)
  9,  // cuerda 5: A  (La)
  4,  // cuerda 6: E  (Mi grave)
];

/** Cantidad total de cuerdas de una guitarra estándar */
export const STRING_COUNT = 6;

/** Cantidad de trastes a renderizar por defecto */
export const DEFAULT_FRET_COUNT = 24;

/** El traste "0" es la cuerda al aire (nut) */
export const NUT_FRET = 0;

/** Trastes que tradicionalmente llevan marcador (dot) simple */
export const SINGLE_MARKER_FRETS: readonly number[] = [3, 5, 7, 9, 15, 17, 19, 21];

/** Trastes que llevan doble marcador (octava), típicamente 12 y 24 */
export const DOUBLE_MARKER_FRETS: readonly number[] = [12, 24];

/** Otras afinaciones comunes, preparadas para soporte futuro */
export const ALTERNATE_TUNINGS: Record<string, GuitarTuning> = {
  standard: STANDARD_TUNING,
  dropD: [4, 11, 7, 2, 9, 2],
  openG: [7, 11, 7, 2, 7, 2],
  halfStepDown: [3, 10, 6, 1, 8, 3],
};

// ============================================================
// 🧮 CONVERSIÓN CUERDA+TRASTE <-> PITCH CLASS
// ============================================================

/** Devuelve la nota que suena en una cuerda y traste dados. */
export function getPitchAtPosition(
  stringNumber: StringNumber,
  fret: FretNumber,
  tuning: GuitarTuning = STANDARD_TUNING
): PitchClass {
  const openPitch = tuning[stringNumber - 1];
  return (((openPitch + fret) % 12) + 12) % 12 as PitchClass;
}

/** Devuelve la nota al aire de una cuerda específica. */
export function getOpenStringPitch(
  stringNumber: StringNumber,
  tuning: GuitarTuning = STANDARD_TUNING
): PitchClass {
  return tuning[stringNumber - 1];
}

/** Construye una posición completa lista para usar en la UI. */
export function buildPosition(
  stringNumber: StringNumber,
  fret: FretNumber,
  tuning: GuitarTuning = STANDARD_TUNING
): FretboardPosition {
  return {
    string: stringNumber,
    fret,
    pitch: getPitchAtPosition(stringNumber, fret, tuning),
  };
}

// ============================================================
// 🔍 BÚSQUEDA DE POSICIONES POR NOTA
// ============================================================

/** Devuelve todas las posiciones de un pitch dentro de un rango de trastes. */
export function getAllPositionsForPitch(
  pitch: PitchClass,
  maxFret: FretNumber = DEFAULT_FRET_COUNT,
  minFret: FretNumber = 0,
  tuning: GuitarTuning = STANDARD_TUNING
): FretboardPosition[] {
  const positions: FretboardPosition[] = [];

  for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const notePitch = getPitchAtPosition(stringNumber as StringNumber, fret, tuning);
      if (notePitch === pitch) {
        positions.push(buildPosition(stringNumber as StringNumber, fret, tuning));
      }
    }
  }

  return positions;
}

// ============================================================
// 🪟 FILTRADO POR RANGO DE TRASTES
// ============================================================

/** Genera todas las posiciones del mástil dentro de un rango de trastes. */
export function getAllPositionsInFretRange(
  minFret: FretNumber,
  maxFret: FretNumber,
  tuning: GuitarTuning = STANDARD_TUNING
): FretboardPosition[] {
  const positions: FretboardPosition[] = [];

  for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      positions.push(buildPosition(stringNumber as StringNumber, fret, tuning));
    }
  }

  return positions;
}

/** Filtra posiciones para conservar solo las que están en un rango de trastes. */
export function filterPositionsByFretRange(
  positions: FretPosition[],
  range: FretRange
): FretPosition[];
export function filterPositionsByFretRange(
  positions: FretboardPosition[],
  range: FretRange
): FretboardPosition[];
export function filterPositionsByFretRange(
  positions: FretPosition[] | FretboardPosition[],
  range: FretRange
): FretPosition[] | FretboardPosition[] {
  return positions.filter((position) => (
    position.fret >= range.minFret && position.fret <= range.maxFret
  )) as FretPosition[] | FretboardPosition[];
}

// ============================================================
// 🎯 FILTRADO POR CONJUNTO DE NOTAS
// ============================================================

/** Devuelve las posiciones cuya nota pertenece a un conjunto de pitch classes. */
export function getPositionsForPitchSet(
  pitchClasses: PitchClass[],
  minFret: FretNumber,
  maxFret: FretNumber
): FretPosition[];
export function getPositionsForPitchSet(
  pitchSet: Set<PitchClass>,
  minFret: FretNumber,
  maxFret: FretNumber,
  tuning?: GuitarTuning
): FretboardPosition[];
export function getPositionsForPitchSet(
  pitchSetOrClasses: Set<PitchClass> | PitchClass[],
  minFret: FretNumber = 0,
  maxFret: FretNumber = DEFAULT_FRET_COUNT,
  tuning: GuitarTuning = STANDARD_TUNING
): FretboardPosition[] | FretPosition[] {
  if (Array.isArray(pitchSetOrClasses)) {
    const pitchSet = new Set(pitchSetOrClasses);
    return getAllPositionsInFretRange(minFret, maxFret, tuning)
      .filter((position) => pitchSet.has(position.pitch))
      .map((position) => ({
        stringIndex: position.string - 1,
        fret: position.fret,
        pitchClass: position.pitch,
        scaleDegree: pitchSetOrClasses.indexOf(position.pitch) + 1,
      }));
  }

  const pitchSet = pitchSetOrClasses;
  const positions: FretboardPosition[] = [];

  for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const pitch = getPitchAtPosition(stringNumber as StringNumber, fret, tuning);
      if (pitchSet.has(pitch)) {
        positions.push(buildPosition(stringNumber as StringNumber, fret, tuning));
      }
    }
  }

  return positions;
}

// ============================================================
// 🧰 UTILIDADES DE RANGO / SPAN
// ============================================================

/** Calcula el rango de trastes ocupados, ignorando las cuerdas al aire. */
export function getFretSpan(positions: FretboardPosition[]): FretRange {
  const frettedPositions = positions.filter((position) => position.fret > 0);

  if (frettedPositions.length === 0) {
    return { minFret: 0, maxFret: 0 };
  }

  const frets = frettedPositions.map((position) => position.fret);
  return {
    minFret: Math.min(...frets),
    maxFret: Math.max(...frets),
  };
}

/** Calcula cuántos trastes ocupa un grupo de posiciones. */
export function getFretStretch(positions: FretboardPosition[]): number {
  const { minFret, maxFret } = getFretSpan(positions);
  return maxFret - minFret;
}

/** Agrupa posiciones por cuerda y ordena cada grupo por traste ascendente. */
export function groupPositionsByString(
  positions: FretboardPosition[]
): Map<StringNumber, FretboardPosition[]> {
  const grouped = new Map<StringNumber, FretboardPosition[]>();

  for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
    grouped.set(stringNumber as StringNumber, []);
  }

  for (const position of positions) {
    grouped.get(position.string)!.push(position);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => a.fret - b.fret);
  }

  return grouped;
}

/** Devuelve la posición más baja de cada cuerda para un conjunto de notas. */
export function getLowestPositionPerString(
  pitchSet: Set<PitchClass>,
  minFret: FretNumber,
  maxFret: FretNumber,
  tuning: GuitarTuning = STANDARD_TUNING
): Map<StringNumber, FretboardPosition | null> {
  const result = new Map<StringNumber, FretboardPosition | null>();

  for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
    let found: FretboardPosition | null = null;

    for (let fret = minFret; fret <= maxFret; fret++) {
      const pitch = getPitchAtPosition(stringNumber as StringNumber, fret, tuning);
      if (pitchSet.has(pitch)) {
        found = buildPosition(stringNumber as StringNumber, fret, tuning);
        break;
      }
    }

    result.set(stringNumber as StringNumber, found);
  }

  return result;
}

// ============================================================
// ⚪ MARCADORES VISUALES DEL DIAPASÓN
// ============================================================

/** Devuelve true si un traste debe llevar un marcador visual. */
export function hasSingleMarker(fret: FretNumber): boolean {
  return SINGLE_MARKER_FRETS.includes(fret);
}

/** Devuelve true si un traste debe llevar dos marcadores. */
export function hasDoubleMarker(fret: FretNumber): boolean {
  return DOUBLE_MARKER_FRETS.includes(fret);
}

// ============================================================
// 🎨 UTILIDADES DE VISUALIZACIÓN / NOMBRADO
// ============================================================

/** Genera el nombre legible completo de una posición. */
export function getPositionLabel(
  position: FretboardPosition,
  notation: NotationPreference = 'sharps'
): string {
  const noteName = getNoteName(position.pitch, notation);
  const fretLabel = position.fret === 0 ? 'al aire' : `traste ${position.fret}`;
  return `Cuerda ${position.string}, ${fretLabel} (${noteName})`;
}

/** Nombre corto de cuerda para encabezados de diagrama. */
export function getStringLabel(
  stringNumber: StringNumber,
  tuning: GuitarTuning = STANDARD_TUNING,
  notation: NotationPreference = 'sharps'
): string {
  return getNoteName(tuning[stringNumber - 1], notation);
}

// ============================================================
// ✅ VALIDACIÓN DEFENSIVA
// ============================================================

/** Verifica que un número de cuerda sea válido (1-6). */
export function isValidStringNumber(value: number): value is StringNumber {
  return Number.isInteger(value) && value >= 1 && value <= STRING_COUNT;
}

/** Verifica que un traste sea válido dentro de un rango razonable. */
export function isValidFret(
  value: number,
  maxFret: FretNumber = DEFAULT_FRET_COUNT
): boolean {
  return Number.isInteger(value) && value >= 0 && value <= maxFret;
}
