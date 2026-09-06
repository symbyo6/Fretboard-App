// src/lib/theory/notation.ts

import type { NotationPreference, PitchClass } from '../../types';
import { getNoteName } from './scales';

/** Formatea una pitch class usando la preferencia de notación activa. */
export function formatNoteName(
  pitchClass: PitchClass,
  notation: NotationPreference
): string {
  return getNoteName(pitchClass, notation);
}
