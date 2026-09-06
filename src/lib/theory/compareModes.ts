import type { KeyName } from '../../types';
import { MODE_LIBRARY, type ModeId } from './modes';
import { getNoteName, KEY_TO_PITCH, transposePitch } from './scales';

export interface ModeComparisonResult {
  key: KeyName;
  modes: {
    id: ModeId;
    name: string;
    notes: string[];
    characteristicNote: string;
    characteristicLabel: string;
  }[];
  degreeMatrix: { semitone: number; modesWithNote: ModeId[] }[];
}

function transposeNote(key: KeyName, interval: number): string {
  return getNoteName(transposePitch(KEY_TO_PITCH[key], interval));
}

/** Compara las notas y grados característicos de los siete modos mayores en una tonalidad. */
export function compareMajorModes(key: KeyName): ModeComparisonResult {
  const definitions = Object.values(MODE_LIBRARY);
  const modes = definitions.map((definition) => {
    const notes = definition.intervals.map((interval) => transposeNote(key, interval));

    return {
      id: definition.id,
      name: definition.name,
      notes,
      characteristicNote: notes[definition.characteristicDegree - 1],
      characteristicLabel: definition.characteristicLabel,
    };
  });

  const degreeMatrix = Array.from({ length: 12 }, (_, semitone) => ({
    semitone,
    modesWithNote: definitions
      .filter((definition) => definition.intervals.includes(semitone))
      .map((definition) => definition.id),
  }));

  return { key, modes, degreeMatrix };
}

/** Devuelve los grados que difieren entre dos modos en una misma tonalidad. */
export function diffModes(
  key: KeyName,
  firstMode: ModeId,
  secondMode: ModeId
): { degree: number; noteA: string; noteB: string }[] {
  const firstDefinition = MODE_LIBRARY[firstMode];
  const secondDefinition = MODE_LIBRARY[secondMode];

  return firstDefinition.intervals.flatMap((interval, index) => (
    interval === secondDefinition.intervals[index]
      ? []
      : [{
        degree: index + 1,
        noteA: transposeNote(key, interval),
        noteB: transposeNote(key, secondDefinition.intervals[index]),
      }]
  ));
}