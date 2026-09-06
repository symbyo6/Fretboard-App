// src/lib/shapes/shapeComparison.ts

import type {
  CagedShapeId,
  FretPosition,
  FretboardPosition,
  FretRange,
  PitchClass,
  NpsDegree,
  OverlapMembership,
  OverlapStats,
} from '../../types';

import { CAGED_SHAPE_ORDER, getCagedShapeFretRange } from './caged';
import { NPS_DEGREES, getNpsShapeFretRange } from './npsShapes';
import { getScalePitchClasses } from '../theory/scaleEngine';
import { getPositionsForPitchSet, filterPositionsByFretRange } from '../theory/fretboardPositions';

import { isPositionInShapeGrip } from '../theory/caged';
import { isPositionInNpsGrip } from '../theory/npsShapes';

import type { CagedShapeInstance, NpsShapeInstance } from '../../types';

// ============================================================
// UNIQUE POSITION KEY (string + fret)
// ============================================================

export function positionKey(stringIndex: number, fret: number): string;
export function positionKey(position: FretboardPosition): string;
export function positionKey(
  positionOrStringIndex: FretboardPosition | number,
  fret?: number
): string {
  if (typeof positionOrStringIndex === 'number') {
    return `${positionOrStringIndex}-${fret}`;
  }
  return `${positionOrStringIndex.string}-${positionOrStringIndex.fret}`;
}

export type ShapeSelection =
  | { system: 'caged'; shapeId: CagedShapeId }
  | { system: '3nps'; degree: NpsDegree };

export function shapeSelectionLabel(selection: ShapeSelection): string {
  return selection.system === 'caged'
    ? `Forma ${selection.shapeId}`
    : `Patrón NPS ${selection.degree}`;
}

export function getShapePositions(
  rootPitch: import('../../types').PitchClass,
  scaleId: string,
  selection: ShapeSelection,
  allScalePositions: FretPosition[]
): FretPosition[] {
  const range = selection.system === 'caged'
    ? getCagedShapeFretRange(rootPitch, scaleId, selection.shapeId)
    : getNpsShapeFretRange(rootPitch, scaleId, selection.degree);

  return filterPositionsByFretRange(allScalePositions, range);
}

// ============================================================
// MEMBERSHIP CLASSIFICATION
// ============================================================

/** Classifies a physical position against the active CAGED and 3NPS grips. */
export function classifyOverlapMembership(
  position: FretboardPosition,
  cagedShape: CagedShapeInstance | null,
  npsShape: NpsShapeInstance | null
): OverlapMembership {
  const inCaged = cagedShape ? isPositionInShapeGrip(position, cagedShape) : false;
  const inNps = npsShape ? isPositionInNpsGrip(position, npsShape) : false;

  if (inCaged && inNps) return 'both';
  if (inCaged) return 'caged-only';
  if (inNps) return 'nps-only';
  return 'none';
}

// ============================================================
// UNION OF POSITIONS
// ============================================================

/** Returns the deduplicated physical union of both shape grips. */
export function getUnionPositions(
  cagedShape: CagedShapeInstance | null,
  npsShape: NpsShapeInstance | null
): FretboardPosition[] {
  const positions = new Map<string, FretboardPosition>();

  cagedShape?.gripPositions.forEach((position) => {
    positions.set(positionKey(position), position);
  });
  npsShape?.positions.forEach((position) => {
    positions.set(positionKey(position), position);
  });

  return Array.from(positions.values());
}

/** Returns the fret window covering both shapes. */
export function getComparisonWindow(
  cagedShape: CagedShapeInstance,
  npsShape: NpsShapeInstance
): FretRange {
  return {
    minFret: Math.min(cagedShape.window.minFret, npsShape.window.minFret),
    maxFret: Math.max(cagedShape.window.maxFret, npsShape.window.maxFret),
  };
}

// ============================================================
// OVERLAP STATISTICS
// ============================================================

/** Computes physical string-fret overlap, rather than pitch-class overlap. */
export function computeOverlapStats(
  positionsA: FretPosition[],
  positionsB: FretPosition[]
): ShapeOverlapStats;
export function computeOverlapStats(
  cagedShape: CagedShapeInstance,
  npsShape: NpsShapeInstance
): OverlapStats;
export function computeOverlapStats(
  first: FretPosition[] | CagedShapeInstance,
  second: FretPosition[] | NpsShapeInstance
): ShapeOverlapStats | OverlapStats {
  if (Array.isArray(first) && Array.isArray(second)) {
    const keysA = new Set(first.map((position) => positionKey(position.stringIndex, position.fret)));
    const keysB = new Set(second.map((position) => positionKey(position.stringIndex, position.fret)));
    const intersectionKeys = [...keysA].filter((key) => keysB.has(key));
    const unionCount = new Set([...keysA, ...keysB]).size;
    const sharedPitchClasses = new Set<PitchClass>();

    first.forEach((position) => {
      if (keysB.has(positionKey(position.stringIndex, position.fret))) {
        sharedPitchClasses.add(position.pitchClass);
      }
    });

    return {
      countA: keysA.size,
      countB: keysB.size,
      intersectionCount: intersectionKeys.length,
      unionCount,
      overlapPercentage: unionCount === 0
        ? 0
        : Math.round((intersectionKeys.length / unionCount) * 100),
      sharedPitchClasses: [...sharedPitchClasses],
    };
  }

  const cagedShape = first as CagedShapeInstance;
  const npsShape = second as NpsShapeInstance;
  const cagedKeys = new Set(cagedShape.gripPositions.map(positionKey));
  const npsKeys = new Set(npsShape.positions.map(positionKey));

  let sharedCount = 0;
  for (const key of cagedKeys) {
    if (npsKeys.has(key)) sharedCount += 1;
  }

  const cagedOnlyCount = cagedKeys.size - sharedCount;
  const npsOnlyCount = npsKeys.size - sharedCount;
  const unionCount = sharedCount + cagedOnlyCount + npsOnlyCount;

  return {
    cagedTotal: cagedKeys.size,
    npsTotal: npsKeys.size,
    sharedCount,
    cagedOnlyCount,
    npsOnlyCount,
    unionCount,
    overlapPercentage: unionCount === 0
      ? 0
      : Math.round((sharedCount / unionCount) * 100),
  };
}

export interface ShapeOverlapStats {
  countA: number;
  countB: number;
  intersectionCount: number;
  unionCount: number;
  overlapPercentage: number;
  sharedPitchClasses: PitchClass[];
}

export interface BestOverlapResult {
  cagedShapeId: CagedShapeId;
  npsDegree: NpsDegree;
  stats: ShapeOverlapStats;
}

export function findBestOverlapPair(
  rootPitch: import('../../types').PitchClass,
  scaleId: string,
  searchRange: { minFret: number; maxFret: number } = { minFret: 0, maxFret: 15 }
): BestOverlapResult {
  const scalePitchClasses = getScalePitchClasses(rootPitch, scaleId);
  const allScalePositions = getPositionsForPitchSet(
    scalePitchClasses,
    searchRange.minFret,
    searchRange.maxFret
  );
  let best: BestOverlapResult | null = null;

  for (const cagedShapeId of CAGED_SHAPE_ORDER) {
    const positionsA = getShapePositions(
      rootPitch,
      scaleId,
      { system: 'caged', shapeId: cagedShapeId },
      allScalePositions
    );

    for (const npsDegree of NPS_DEGREES) {
      const positionsB = getShapePositions(
        rootPitch,
        scaleId,
        { system: '3nps', degree: npsDegree },
        allScalePositions
      );
      const stats = computeOverlapStats(positionsA, positionsB);

      if (
        !best
        || stats.intersectionCount > best.stats.intersectionCount
        || (
          stats.intersectionCount === best.stats.intersectionCount
          && stats.overlapPercentage > best.stats.overlapPercentage
        )
      ) {
        best = { cagedShapeId, npsDegree, stats };
      }
    }
  }

  return best as BestOverlapResult;
}

/** Returns a concise UI label for overlap statistics. */
export function getOverlapSummaryLabel(stats: OverlapStats): string {
  return `${stats.sharedCount} de ${stats.unionCount} notas compartidas (${stats.overlapPercentage}%)`;
}

// ============================================================
// ACCESSIBILITY
// ============================================================

/** Returns an accessible description for a membership value. */
export function getMembershipDescription(membership: OverlapMembership): string {
  switch (membership) {
    case 'both':
      return 'Nota compartida por ambos sistemas de digitación';
    case 'caged-only':
      return 'Nota exclusiva del sistema CAGED';
    case 'nps-only':
      return 'Nota exclusiva del sistema 3 notas por cuerda';
    default:
      return 'Nota fuera de ambas formas';
  }
}
