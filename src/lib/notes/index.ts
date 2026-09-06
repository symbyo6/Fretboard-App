import type { NoteName } from '../../types';

export const NOTE_NAMES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Afinación estándar, de cuerda más grave a más aguda. */
export const STANDARD_TUNING: NoteName[] = ['E', 'A', 'D', 'G', 'B', 'E'];

export const DEFAULT_FRET_COUNT = 15;

/** Devuelve el índice cromático de una nota entre 0 y 11. */
export function getNoteIndex(note: NoteName): number {
  return NOTE_NAMES.indexOf(note);
}

/** Transpone una nota el número indicado de semitonos. */
export function transposeNote(note: NoteName, semitones: number): NoteName {
  const index = getNoteIndex(note);
  const newIndex = ((index + semitones) % NOTE_NAMES.length + NOTE_NAMES.length) % NOTE_NAMES.length;
  return NOTE_NAMES[newIndex];
}

/** Devuelve la nota producida en un traste de una cuerda dada. */
export function getNoteAtFret(openStringNote: NoteName, fret: number): NoteName {
  return transposeNote(openStringNote, fret);
}

/** Calcula el intervalo cromático ascendente entre raíz y nota. */
export function getIntervalFromRoot(root: NoteName, note: NoteName): number {
  return (getNoteIndex(note) - getNoteIndex(root) + NOTE_NAMES.length) % NOTE_NAMES.length;
}
