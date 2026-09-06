// src/lib/audio/tuning.ts

import * as Tone from 'tone';

/**
 * Afinación estándar de guitarra en notación Tone.js.
 * Índice 0 = cuerda Mi aguda; índice 5 = cuerda Mi grave.
 */
export const STANDARD_TUNING_NOTES = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'] as const;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface StringFret {
  stringIndex: number;
  fret: number;
}

/** Convierte una posición cuerda + traste a un nombre de nota Tone.js. */
export function fretToNoteName(stringIndex: number, fret: number): string {
  const openNote = STANDARD_TUNING_NOTES[stringIndex];
  if (!openNote) {
    throw new Error(`stringIndex fuera de rango: ${stringIndex}`);
  }

  const openMidi = Tone.Frequency(openNote).toMidi();
  return Tone.Frequency(openMidi + fret, 'midi').toNote();
}

/** Convierte posiciones del mástil a nombres de nota en el mismo orden. */
export function stringFretsToNoteNames(positions: StringFret[]): string[] {
  return positions.map((position) => fretToNoteName(position.stringIndex, position.fret));
}

/** Convierte una clase de altura a un nombre de nota en una octava preferida. */
export function pitchClassToNoteName(pitchClass: number, preferredOctave = 4): string {
  const normalizedPc = ((pitchClass % 12) + 12) % 12;
  return `${NOTE_NAMES[normalizedPc]}${preferredOctave}`;
}

/** Distribuye clases de altura en octavas ascendentes sin volver a un registro bajo. */
export function spreadPitchClassesAcrossOctaves(
  pitchClasses: number[],
  baseOctave = 4
): string[] {
  let currentOctave = baseOctave;
  let previousMidi = -1;

  return pitchClasses.map((pitchClass) => {
    const normalizedPc = ((pitchClass % 12) + 12) % 12;
    let note = `${NOTE_NAMES[normalizedPc]}${currentOctave}`;
    let midi = Tone.Frequency(note).toMidi();

    while (midi <= previousMidi) {
      currentOctave += 1;
      note = `${NOTE_NAMES[normalizedPc]}${currentOctave}`;
      midi = Tone.Frequency(note).toMidi();
    }

    previousMidi = midi;
    return note;
  });
}
