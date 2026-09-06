// src/lib/theory/caged.ts

import type {
  PitchClass,
  StringNumber,
  FretRange,
  FretboardPosition,
  CagedShapeId,
  CagedShapeGrip,
  CagedShapeInstance,
  GuitarTuning,
} from '../../types';

import {
  STANDARD_TUNING,
  DEFAULT_FRET_COUNT,
  getPitchAtPosition,
  buildPosition,
} from './fretboardPositions';

// ============================================================
// DIGITACIONES CRUDAS DE LOS 5 ACORDES ABIERTOS
// ============================================================

/** Digitaciones indexadas desde la cuerda 1 (Mi aguda) hasta la 6 (Mi grave). */
export const CAGED_SHAPE_GRIPS: Record<CagedShapeId, CagedShapeGrip> = {
  C: [0, 1, 0, 2, 3, null],
  A: [0, 2, 2, 2, 0, null],
  G: [3, 0, 0, 0, 2, 3],
  E: [0, 0, 1, 2, 2, 0],
  D: [2, 3, 2, 0, null, null],
};

/** Pitch class de la raíz de cada acorde abierto de referencia. */
export const CAGED_SHAPE_ROOT_PITCH: Record<CagedShapeId, PitchClass> = {
  C: 0,
  A: 9,
  G: 7,
  E: 4,
  D: 2,
};

/** Orden de aparición de las formas subiendo por el mástil. */
export const CAGED_SHAPE_ORDER: CagedShapeId[] = ['C', 'A', 'G', 'E', 'D'];

/** Nombre completo legible de cada forma. */
export const CAGED_SHAPE_FULL_NAME: Record<CagedShapeId, string> = {
  C: 'Forma de Do (C)',
  A: 'Forma de La (A)',
  G: 'Forma de Sol (G)',
  E: 'Forma de Mi (E)',
  D: 'Forma de Re (D)',
};

/** Color distintivo por forma. */
export const CAGED_SHAPE_COLORS: Record<CagedShapeId, string> = {
  C: '#ef4444',
  A: '#f59e0b',
  G: '#10b981',
  E: '#3b82f6',
  D: '#a855f7',
};

// ============================================================
// CUERDAS DE RAÍZ POR FORMA
// ============================================================

function computeShapeRootStrings(shapeId: CagedShapeId): StringNumber[] {
  const grip = CAGED_SHAPE_GRIPS[shapeId];
  const rootPitch = CAGED_SHAPE_ROOT_PITCH[shapeId];
  const roots: StringNumber[] = [];

  grip.forEach((relativeFret, index) => {
    if (relativeFret === null) return;
    const stringNumber = (index + 1) as StringNumber;
    const pitch = getPitchAtPosition(stringNumber, relativeFret, STANDARD_TUNING);
    if (pitch === rootPitch) {
      roots.push(stringNumber);
    }
  });

  return roots;
}

/** Cache calculada una sola vez al cargar el módulo. */
export const CAGED_SHAPE_ROOT_STRINGS: Record<CagedShapeId, StringNumber[]> = {
  C: computeShapeRootStrings('C'),
  A: computeShapeRootStrings('A'),
  G: computeShapeRootStrings('G'),
  E: computeShapeRootStrings('E'),
  D: computeShapeRootStrings('D'),
};

// ============================================================
// TRANSPOSICIÓN
// ============================================================

/** Calcula el desplazamiento de una forma para alcanzar una raíz objetivo. */
export function getShapeOffset(shapeId: CagedShapeId, targetRootPitch: PitchClass): number {
  const shapeRoot = CAGED_SHAPE_ROOT_PITCH[shapeId];
  return (((targetRootPitch - shapeRoot) % 12) + 12) % 12;
}

/** Construye una instancia concreta de una forma CAGED. */
export function buildShapeInstance(
  shapeId: CagedShapeId,
  targetRootPitch: PitchClass,
  cycle: number = 0,
  tuning: GuitarTuning = STANDARD_TUNING
): CagedShapeInstance {
  const offsetInCycle = getShapeOffset(shapeId, targetRootPitch);
  const totalOffset = offsetInCycle + cycle * 12;
  const grip = CAGED_SHAPE_GRIPS[shapeId];

  const gripPositions: FretboardPosition[] = [];
  const mutedStrings: StringNumber[] = [];

  grip.forEach((relativeFret, index) => {
    const stringNumber = (index + 1) as StringNumber;
    if (relativeFret === null) {
      mutedStrings.push(stringNumber);
      return;
    }

    gripPositions.push(buildPosition(stringNumber, relativeFret + totalOffset, tuning));
  });

  const rootStrings = CAGED_SHAPE_ROOT_STRINGS[shapeId];
  const rootPositions = gripPositions.filter((position) => rootStrings.includes(position.string));
  const frets = gripPositions.map((position) => position.fret);
  const gripWindow: FretRange = {
    minFret: Math.min(...frets),
    maxFret: Math.max(...frets),
  };

  const PADDING = 1;
  const window: FretRange = {
    minFret: Math.max(0, gripWindow.minFret - PADDING),
    maxFret: gripWindow.maxFret + PADDING,
  };

  return {
    shapeId,
    rootPitch: targetRootPitch,
    cycle,
    offsetInCycle,
    totalOffset,
    gripPositions,
    mutedStrings,
    rootPositions,
    window,
    gripWindow,
  };
}

/** Devuelve el rango exacto de trastes de la aparición primaria de una forma CAGED. */
export function getCagedShapeFretRange(
  rootPitch: PitchClass,
  scaleId: string,
  shapeId: CagedShapeId
): FretRange {
  // scaleId se conserva para que CAGED y 3NPS compartan el mismo contrato de UI.
  void scaleId;
  return buildShapeInstance(shapeId, rootPitch, 0).gripWindow;
}

// ============================================================
// LAS 5 FORMAS PARA UNA RAÍZ DADA
// ============================================================

/** Genera las instancias de las cinco formas a lo largo del mástil. */
export function getCagedShapesForRoot(
  targetRootPitch: PitchClass,
  maxFret: number = DEFAULT_FRET_COUNT,
  tuning: GuitarTuning = STANDARD_TUNING
): CagedShapeInstance[] {
  const instances: CagedShapeInstance[] = [];

  for (const shapeId of CAGED_SHAPE_ORDER) {
    let cycle = 0;
    while (true) {
      const instance = buildShapeInstance(shapeId, targetRootPitch, cycle, tuning);
      if (instance.gripWindow.minFret > maxFret) break;
      if (instance.gripWindow.maxFret <= maxFret) {
        instances.push(instance);
      }
      cycle += 1;
      if (cycle > 3) break;
    }
  }

  return instances.sort((a, b) => a.totalOffset - b.totalOffset);
}

/** Devuelve la primera aparición de cada forma, sin repeticiones de octava. */
export function getPrimaryCagedShapes(
  targetRootPitch: PitchClass,
  tuning: GuitarTuning = STANDARD_TUNING
): CagedShapeInstance[] {
  return CAGED_SHAPE_ORDER.map((shapeId) => (
    buildShapeInstance(shapeId, targetRootPitch, 0, tuning)
  ));
}

// ============================================================
// BÚSQUEDA Y MATCHING DE FORMAS
// ============================================================

/** Encuentra la forma cuya ventana contiene el traste indicado. */
export function findShapeContainingFret(
  instances: CagedShapeInstance[],
  fret: number
): CagedShapeInstance | null {
  const candidates = instances.filter((instance) => (
    fret >= instance.window.minFret && fret <= instance.window.maxFret
  ));

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const gripCenter = (instance: CagedShapeInstance): number => (
    (instance.gripWindow.minFret + instance.gripWindow.maxFret) / 2
  );

  return candidates.reduce((closest, current) => (
    Math.abs(gripCenter(current) - fret) < Math.abs(gripCenter(closest) - fret)
      ? current
      : closest
  ));
}

/** Encuentra la forma más cercana a un traste dado. */
export function findNearestCagedShape(
  instances: CagedShapeInstance[],
  fret: number
): CagedShapeInstance | null {
  if (instances.length === 0) return null;

  const distanceToInstance = (instance: CagedShapeInstance): number => {
    if (fret >= instance.window.minFret && fret <= instance.window.maxFret) return 0;
    if (fret < instance.window.minFret) return instance.window.minFret - fret;
    return fret - instance.window.maxFret;
  };

  return instances.reduce((closest, current) => (
    distanceToInstance(current) < distanceToInstance(closest) ? current : closest
  ));
}

/** Devuelve la instancia primaria más cercana al traste 0. */
export function getDefaultShapeForRoot(
  targetRootPitch: PitchClass,
  tuning: GuitarTuning = STANDARD_TUNING
): CagedShapeInstance {
  const primary = getPrimaryCagedShapes(targetRootPitch, tuning);
  return primary.reduce((lowest, current) => (
    current.totalOffset < lowest.totalOffset ? current : lowest
  ));
}

// ============================================================
// UTILIDADES DE MEMBRESÍA
// ============================================================

/** Verifica si una posición cae dentro de la ventana contextual de una forma. */
export function isPositionInShapeWindow(
  position: FretboardPosition,
  instance: CagedShapeInstance
): boolean {
  return position.fret >= instance.window.minFret && position.fret <= instance.window.maxFret;
}

/** Verifica si una posición exacta pertenece al grip de una forma. */
export function isPositionInShapeGrip(
  position: FretboardPosition,
  instance: CagedShapeInstance
): boolean {
  return instance.gripPositions.some((gripPosition) => (
    gripPosition.string === position.string && gripPosition.fret === position.fret
  ));
}

/** Verifica si una posición es una nota raíz dentro del grip. */
export function isPositionShapeRoot(
  position: FretboardPosition,
  instance: CagedShapeInstance
): boolean {
  return instance.rootPositions.some((rootPosition) => (
    rootPosition.string === position.string && rootPosition.fret === position.fret
  ));
}

// ============================================================
// UTILIDADES DE VISUALIZACIÓN
// ============================================================

/** Genera una etiqueta legible para una instancia. */
export function getShapeInstanceLabel(instance: CagedShapeInstance): string {
  const fullName = CAGED_SHAPE_FULL_NAME[instance.shapeId];
  const octaveSuffix = instance.cycle > 0 ? ` (8va +${instance.cycle})` : '';
  return `${fullName}${octaveSuffix} — trastes ${instance.window.minFret}-${instance.window.maxFret}`;
}

/** Genera la secuencia visual del orden de formas. */
export function getShapeSequenceLabel(): string {
  return CAGED_SHAPE_ORDER.join(' → ');
}

// ============================================================
// VALIDACIÓN DEFENSIVA
// ============================================================

/** Verifica que un string sea un CagedShapeId válido. */
export function isValidCagedShapeId(value: string): value is CagedShapeId {
  return CAGED_SHAPE_ORDER.includes(value as CagedShapeId);
}
