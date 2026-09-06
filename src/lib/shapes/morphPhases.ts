// src/lib/shapes/morphPhases.ts

/** Fases del morfing entre dos formas calculadas. */
export type MorphPhase = 'shapeA' | 'shared' | 'shapeB' | 'both';

export const MORPH_PHASE_ORDER: MorphPhase[] = ['shapeA', 'shared', 'shapeB', 'both'];

export const MORPH_PHASE_LABEL: Record<MorphPhase, string> = {
  shapeA: '🔵 Forma A',
  shared: '🎯 Compartidas',
  shapeB: '🟠 Forma B',
  both: '🔗 Ambas',
};

export const MORPH_PHASE_DESCRIPTION: Record<MorphPhase, string> = {
  shapeA: 'Solo las notas de la Forma A se destacan por completo.',
  shared: 'Solo las notas que EXISTEN EN AMBAS formas brillan — el corazón de la comparación.',
  shapeB: 'Solo las notas de la Forma B se destacan por completo.',
  both: 'Vista completa: ambas formas visibles simultáneamente, sin atenuar nada.',
};

/** Categoría de una posición según su pertenencia a A y/o B. */
export type NoteMembership = 'onlyA' | 'onlyB' | 'shared' | 'neither';

export function classifyMembership(inA: boolean, inB: boolean): NoteMembership {
  if (inA && inB) return 'shared';
  if (inA) return 'onlyA';
  if (inB) return 'onlyB';
  return 'neither';
}

/** Pesos de opacidad para cada categoría durante una fase. */
export type EmphasisWeights = Record<NoteMembership, number>;

const GHOST_WEIGHT = 0.16;
const CONTEXT_WEIGHT = 0.22;

export const MORPH_PHASE_WEIGHTS: Record<MorphPhase, EmphasisWeights> = {
  shapeA: { onlyA: 1, shared: 1, onlyB: GHOST_WEIGHT, neither: CONTEXT_WEIGHT },
  shared: { onlyA: GHOST_WEIGHT, shared: 1, onlyB: GHOST_WEIGHT, neither: CONTEXT_WEIGHT },
  shapeB: { onlyA: GHOST_WEIGHT, shared: 1, onlyB: 1, neither: CONTEXT_WEIGHT },
  both: { onlyA: 1, shared: 1, onlyB: 1, neither: CONTEXT_WEIGHT },
};

/** Interpola linealmente los pesos de dos fases. */
export function interpolateWeights(
  fromPhase: MorphPhase,
  toPhase: MorphPhase,
  t: number
): EmphasisWeights {
  const from = MORPH_PHASE_WEIGHTS[fromPhase];
  const to = MORPH_PHASE_WEIGHTS[toPhase];
  const clampedT = Math.max(0, Math.min(1, t));
  const lerp = (fromValue: number, toValue: number) => (
    fromValue + (toValue - fromValue) * clampedT
  );

  return {
    onlyA: lerp(from.onlyA, to.onlyA),
    onlyB: lerp(from.onlyB, to.onlyB),
    shared: lerp(from.shared, to.shared),
    neither: lerp(from.neither, to.neither),
  };
}

export function nextPhase(current: MorphPhase): MorphPhase {
  const index = MORPH_PHASE_ORDER.indexOf(current);
  return MORPH_PHASE_ORDER[(index + 1) % MORPH_PHASE_ORDER.length];
}

export function previousPhase(current: MorphPhase): MorphPhase {
  const index = MORPH_PHASE_ORDER.indexOf(current);
  return MORPH_PHASE_ORDER[(index - 1 + MORPH_PHASE_ORDER.length) % MORPH_PHASE_ORDER.length];
}

/** Presets de velocidad del morfing. */
export type MorphSpeed = 'slow' | 'normal' | 'fast';

export const MORPH_SPEED_TIMING: Record<MorphSpeed, { holdMs: number; transitionMs: number }> = {
  slow: { holdMs: 2200, transitionMs: 1200 },
  normal: { holdMs: 1400, transitionMs: 800 },
  fast: { holdMs: 800, transitionMs: 450 },
};

export const MORPH_SPEED_LABEL: Record<MorphSpeed, string> = {
  slow: '🐢 Lenta',
  normal: '🚶 Normal',
  fast: '🐇 Rápida',
};
