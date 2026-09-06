// src/lib/theory/scaleEngine.ts

import type { KeyName, PitchClass } from '../../types';
import { KEY_TO_PITCH, resolveScale } from './scales';

function keyForPitchClass(pitchClass: PitchClass): KeyName {
  const key = (Object.keys(KEY_TO_PITCH) as KeyName[]).find(
    (candidate) => KEY_TO_PITCH[candidate] === pitchClass
  );

  if (!key) {
    throw new Error(`Pitch class inválida: ${pitchClass}`);
  }

  return key;
}

/** Devuelve las pitch classes de una escala resuelta desde una raíz numérica. */
export function getScalePitchClasses(
  rootPitch: PitchClass,
  scaleId: string
): PitchClass[] {
  return resolveScale(scaleId, keyForPitchClass(rootPitch)).notes;
}
