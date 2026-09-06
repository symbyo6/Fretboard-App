// src/lib/shapes/shapeUtils.ts

import type { CagedShapeId, NpsDegree, PitchClass, FretRange } from '../../types';
import {
  CAGED_SHAPE_ORDER,
  getCagedShapeFretRange,
} from '../theory/caged';
import {
  NPS_DEGREES,
  getNpsShapeFretRange,
} from '../theory/npsShapes';

export interface ShapeCandidate<T> {
  id: T;
  range: FretRange;
  distance: number;
}

/** Distancia en trastes entre un objetivo y una ventana de forma. */
function distanceToFret(range: FretRange, targetFret: number): number {
  if (targetFret >= range.minFret && targetFret <= range.maxFret) return 0;
  return Math.min(
    Math.abs(range.minFret - targetFret),
    Math.abs(range.maxFret - targetFret)
  );
}

/** Encuentra la forma CAGED más cercana a un traste objetivo. */
export function findNearestCagedShape(
  rootPitch: PitchClass,
  scaleId: string,
  targetFret: number
): ShapeCandidate<CagedShapeId> {
  const candidates = CAGED_SHAPE_ORDER.map((id) => {
    const range = getCagedShapeFretRange(rootPitch, scaleId, id);
    return { id, range, distance: distanceToFret(range, targetFret) };
  });

  return candidates.sort((a, b) => a.distance - b.distance)[0];
}

/** Encuentra el patrón 3NPS más cercano a un traste objetivo. */
export function findNearestNpsShape(
  rootPitch: PitchClass,
  scaleId: string,
  targetFret: number
): ShapeCandidate<NpsDegree> {
  const candidates = NPS_DEGREES.map((degree) => {
    const range = getNpsShapeFretRange(rootPitch, scaleId, degree);
    return { id: degree, range, distance: distanceToFret(range, targetFret) };
  });

  return candidates.sort((a, b) => a.distance - b.distance)[0];
}
