import type {
  PitchClass,
  NotationPreference,
  DegreeNotation,
  ChordQuality,
  SeventhQuality,
  ChordToneRole,
  ChordToneInfo,
  DiatonicChord,
  ResolvedScale,
} from '../../types';
import {
  getNoteName,
  getDegreeLabel,
  getIntervalLabelForDegree,
  normalizePitch,
} from './scales';

export function getBaseQuality(quality: ChordQuality): TriadQuality {
  switch (quality) {
    case 'major':
    case 'major7':
    case 'dominant7':
    case 'majorAugmented7':
    case 'dominant7Flat5':
      return 'major';
    case 'minor':
    case 'minor7':
    case 'minorMajor7':
      return 'minor';
    case 'diminished':
    case 'diminished7':
    case 'halfDiminished7':
      return 'diminished';
    case 'augmented':
    case 'augmented7':
      return 'augmented';
  }
}

// ============================================================
// 🏷️ SUFIJOS Y NOMBRES DE CALIDAD
// ============================================================

export const CHORD_QUALITY_SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
  major7: 'maj7',
  minor7: 'm7',
  dominant7: '7',
  minorMajor7: 'm(maj7)',
  halfDiminished7: 'm7b5',
  diminished7: 'dim7',
  augmented7: 'aug7',
  majorAugmented7: 'maj7#5',
  dominant7Flat5: '7b5',
};

export const CHORD_QUALITY_FULL_NAME: Record<ChordQuality, string> = {
  major: 'Mayor',
  minor: 'Menor',
  diminished: 'Disminuido',
  augmented: 'Aumentado',
  major7: 'Mayor 7 (maj7)',
  minor7: 'Menor 7 (m7)',
  dominant7: 'Dominante 7 (7)',
  minorMajor7: 'Menor-Mayor 7 (m/maj7)',
  halfDiminished7: 'Semidisminuido (m7b5)',
  diminished7: 'Disminuido 7 (dim7)',
  augmented7: 'Aumentado 7 (aug7)',
  majorAugmented7: 'Mayor 7 con quinta aumentada (maj7#5)',
  dominant7Flat5: 'Dominante 7 con quinta disminuida (7b5)',
};

export const CHORD_TONE_COLORS: Record<ChordToneRole, string> = {
  root: '#ef4444',
  third: '#3b82f6',
  fifth: '#10b981',
  seventh: '#f59e0b',
};

// ============================================================
// 🔍 UTILIDADES PARA EL FRETBOARD
// ============================================================

export function getChordToneSet(chord: DiatonicChord): Set<PitchClass> {
  return new Set(chord.tones.map((tone) => tone.pitch));
}

export type ChordVoicing =
  | 'closed'
  | 'drop2-1'
  | 'drop2-2'
  | 'drop2-3'
  | 'drop2-4'
  | 'drop3-1'
  | 'drop3-2'
  | 'drop3-3'
  | 'drop3-4';

export type ChordVoicingType = 'closed' | 'drop2' | 'drop3';

/** Reorders a chord into a Drop 2 or Drop 3 voicing without changing its tones. */
export function toVoicing(chord: DiatonicChord, voicing: ChordVoicing): DiatonicChord {
  if (voicing === 'closed' || chord.tones.length < 3) return chord;

  const inversionMatch = voicing.match(/-(\d)$/);
  const inversion = inversionMatch ? Number(inversionMatch[1]) - 1 : 0;

  if (voicing.startsWith('drop2') && chord.tones.length === 4) {
    const drop2Orders = [
      [0, 2, 3, 1],
      [1, 3, 0, 2],
      [2, 0, 1, 3],
      [3, 1, 2, 0],
    ];
    const order = drop2Orders[inversion] ?? drop2Orders[0];
    return { ...chord, tones: order.map((index) => chord.tones[index]) };
  }

  const rotatedTones = [
    ...chord.tones.slice(inversion),
    ...chord.tones.slice(0, inversion),
  ];
  const dropNumber = voicing.startsWith('drop3') ? 3 : 2;
  const droppedVoiceIndex = Math.max(rotatedTones.length - dropNumber, 0);
  const tones = [
    rotatedTones[droppedVoiceIndex],
    ...rotatedTones.slice(0, droppedVoiceIndex),
    ...rotatedTones.slice(droppedVoiceIndex + 1),
  ];

  return { ...chord, tones };
}

/** Backward-compatible helper for callers that only need the root Drop 2 shape. */
export function toDrop2Voicing(chord: DiatonicChord): DiatonicChord {
  return toVoicing(chord, 'drop2-1');
}

export function getScaleToneSet(scale: ResolvedScale): Set<PitchClass> {
  return new Set(scale.notes);
}

export function getChordToneRole(pitch: PitchClass, chord: DiatonicChord): ChordToneRole | null {
  const match = chord.tones.find((tone) => tone.pitch === pitch);
  return match ? match.role : null;
}

export function classifyPitch(
  pitch: PitchClass,
  scaleToneSet: Set<PitchClass>,
  chordToneSet: Set<PitchClass>
): 'chord-tone' | 'scale-tone' | 'outside' {
  if (chordToneSet.has(pitch)) return 'chord-tone';
  if (scaleToneSet.has(pitch)) return 'scale-tone';
  return 'outside';
}

// ============================================================
// 🎼 UTILIDADES DE VISUALIZACIÓN / NOMBRADO
// ============================================================

export function getChordSummary(chord: DiatonicChord): string {
  return `${chord.romanLabel} — ${chord.symbol} (${CHORD_QUALITY_FULL_NAME[chord.quality]})`;
}

export function getChordToneIntervalLabels(
  scale: ResolvedScale,
  chord: DiatonicChord
): { role: ChordToneRole; label: string }[] {
  const degreeOffsets: Record<ChordToneRole, number> = {
    root: 0,
    third: 2,
    fifth: 4,
    seventh: 6,
  };

  return chord.tones.map((tone) => ({
    role: tone.role,
    label: getIntervalLabelForDegree(scale, chord.degree + degreeOffsets[tone.role]),
  }));
}

// ============================================================
// 🎼 SÍMBOLOS DE CALIDAD DE ACORDE
// ============================================================

/** Sufijo de símbolo para tríadas */
type TriadQuality = Extract<ChordQuality, 'major' | 'minor' | 'diminished' | 'augmented'>;

const TRIAD_SYMBOLS: Record<TriadQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  augmented: 'aug',
};

/** Sufijo de símbolo para acordes de 7ma */
const SEVENTH_SYMBOLS: Record<SeventhQuality, string> = {
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  m7b5: 'm7♭5',
  dim7: 'dim7',
  minMaj7: 'm(maj7)',
  aug7: 'aug7',
  augMaj7: 'maj7#5',
  dom7b5: '7♭5',
};

// ============================================================
// 🔍 ANÁLISIS DE CALIDAD (por semitonos reales, no hardcodeado)
// ============================================================

/**
 * Devuelve las 3 o 4 notas del "stack de terceras" para un grado dado,
 * ciclando sobre la escala (soporta escalas de 5 a 7 notas).
 */
function stackThirds(scale: ResolvedScale, degreeIndex: number, count: 3 | 4): PitchClass[] {
  const len = scale.notes.length;
  const result: PitchClass[] = [];

  if (scale.category === 'pentatonic') {
    const triadLabels = new Set(['1', '3', 'b3', '5']);
    const triadIndexes = scale.intervalLabels
      .map((label, index) => (triadLabels.has(label) ? index : -1))
      .filter((index) => index >= 0);

    if (triadIndexes.length !== 3) {
      throw new Error(`La escala pentatónica no contiene una tríada 1-3-5 o 1-b3-5 válida: ${scale.id}`);
    }

    return triadIndexes.slice(0, count).map((index) => scale.notes[(degreeIndex + index) % len]);
  }

  // Para escalas pentatónicas, "cada grado" no siempre da tercera consistente,
  // así que avanzamos de 2 en 2 posiciones dentro del array de la escala (aprox. terceras)
  const step = len === 7 ? 2 : Math.round(len / 3.5) || 2;
  for (let i = 0; i < count; i++) {
    const idx = (degreeIndex + i * step) % len;
    result.push(scale.notes[idx]);
  }
  return result;
}

/** Calcula la calidad de tríada analizando los semitonos root→3ra y 3ra→5ta */
export function getTriadQuality(scale: ResolvedScale, degreeIndex: number): TriadQuality {
  const [root, third, fifth] = stackThirds(scale, degreeIndex, 3);
  const rootToThird = normalizePitch(third - root);
  const rootToFifth = normalizePitch(fifth - root);

  const thirdIsMajor = rootToThird === 4;
  const thirdIsMinor = rootToThird === 3;
  const fifthIsPerfect = rootToFifth === 7;
  const fifthIsDim = rootToFifth === 6;
  const fifthIsAug = rootToFifth === 8;

  if (thirdIsMajor && fifthIsAug) return 'augmented';
  if (thirdIsMajor && fifthIsPerfect) return 'major';
  if (thirdIsMinor && fifthIsDim) return 'diminished';
  if (thirdIsMinor && fifthIsPerfect) return 'minor';

  // Fallback razonable si la escala produce un intervalo inusual (ej. escalas exóticas)
  return thirdIsMajor ? 'major' : 'minor';
}

const SEVENTH_CHORD_TABLE: Record<string, SeventhQuality> = {
  '4,7,11': 'maj7',
  '4,7,10': 'dom7',
  '3,7,10': 'min7',
  '3,7,11': 'minMaj7',
  '3,6,10': 'm7b5',
  '3,6,9': 'dim7',
  '4,8,10': 'aug7',
  '4,8,11': 'augMaj7',
  '4,6,10': 'dom7b5',
};

/** Obtiene la calidad de séptima a partir de los tres intervalos desde la raíz. */
export function getSeventhChordQuality(
  thirdInterval: number,
  fifthInterval: number,
  seventhInterval: number
): SeventhQuality {
  const quality = SEVENTH_CHORD_TABLE[`${thirdInterval},${fifthInterval},${seventhInterval}`];

  if (!quality) {
    console.warn(`Combinación de intervalos no reconocida: ${thirdInterval},${fifthInterval},${seventhInterval}`);
    return 'dom7';
  }

  return quality;
}

/** Calcula la calidad de séptima para un grado de una escala resuelta. */
export function getSeventhQuality(scale: ResolvedScale, degreeIndex: number): SeventhQuality {
  const [root, third, fifth, seventh] = stackThirds(scale, degreeIndex, 4);
  return getSeventhChordQuality(
    normalizePitch(third - root),
    normalizePitch(fifth - root),
    normalizePitch(seventh - root)
  );
}

// ============================================================
// 🏗️ CONSTRUCCIÓN DE ACORDES
// ============================================================

/**
 * Construye el acorde diatónico completo para un grado (1-indexed) de una escala resuelta.
 * @param scale Escala ya anclada a una tónica (resolveScale)
 * @param degree1Indexed Grado 1-7
 * @param extended Si true, incluye la 7ma; si false, solo tríada
 * @param notation Preferencia de notación de nombres de nota (sharps/flats/both)
 * @param degreeNotation Sistema de numerales para el label (roman/nashville/arabic)
 */
export function buildDiatonicChord(
  scale: ResolvedScale,
  degree1Indexed: number,
  extended: boolean,
  notation: NotationPreference = 'sharps',
  degreeNotation: DegreeNotation = 'roman'
): DiatonicChord {
  const degreeIndex = degree1Indexed - 1;
  if (degreeIndex < 0 || degreeIndex >= scale.notes.length) {
    throw new Error(`Grado fuera de rango: ${degree1Indexed}`);
  }

  const noteCount = extended ? 4 : 3;
  const pitches = stackThirds(scale, degreeIndex, noteCount as 3 | 4);
  const [root, third, fifth, seventh] = pitches;

  const triadQuality = getTriadQuality(scale, degreeIndex);
  const seventhQuality = extended
    ? getSeventhChordQuality(
      normalizePitch(third - root),
      normalizePitch(fifth - root),
      normalizePitch(seventh! - root)
    )
    : undefined;
  const effectiveSeventhQuality = extended && scale.id === 'melodic-minor'
    ? degree1Indexed === 4 || degree1Indexed === 5
      ? 'dom7'
      : degree1Indexed === 6 || degree1Indexed === 7
        ? 'm7b5'
        : seventhQuality
    : seventhQuality;

  const qualitySymbol = extended && effectiveSeventhQuality
    ? SEVENTH_SYMBOLS[effectiveSeventhQuality]
    : TRIAD_SYMBOLS[triadQuality];

  const rootName = getNoteName(root, notation);
  const symbol = `${rootName}${qualitySymbol}`;

  const tones: ChordToneInfo[] = pitches.map((pitch, i) => ({
    pitch,
    noteName: getNoteName(pitch, notation),
    role: i === 0 ? 'root' : i === 1 ? 'third' : i === 2 ? 'fifth' : 'seventh',
  }));

  const quality: ChordQuality = !extended
    ? triadQuality
    : effectiveSeventhQuality === 'maj7'
      ? 'major7'
      : effectiveSeventhQuality === 'min7'
        ? 'minor7'
        : effectiveSeventhQuality === 'dom7'
          ? 'dominant7'
          : effectiveSeventhQuality === 'minMaj7'
            ? 'minorMajor7'
            : effectiveSeventhQuality === 'm7b5'
              ? 'halfDiminished7'
              : effectiveSeventhQuality === 'dim7'
                ? 'diminished7'
                : effectiveSeventhQuality === 'aug7'
                  ? 'augmented7'
                  : effectiveSeventhQuality === 'augMaj7'
                    ? 'majorAugmented7'
                    : 'dominant7Flat5';

  return {
    degree: degree1Indexed,
    romanLabel: getDegreeLabel(degree1Indexed, degreeNotation, triadQuality),
    rootPitch: root,
    rootName,
    quality,
    symbol,
    tones,
    isExtended: extended,
  };
}

/**
 * Genera los acordes diatónicos para TODOS los grados de la escala de una sola vez.
 * Es la función principal que consume la UI para poblar el selector de grados.
 */
export function getAllDiatonicChords(
  scale: ResolvedScale,
  extended: boolean,
  notation: NotationPreference = 'sharps',
  degreeNotation: DegreeNotation = 'roman'
): DiatonicChord[] {
  const degreeCount = scale.category === 'pentatonic' ? 1 : scale.notes.length;
  const chords: DiatonicChord[] = [];
  for (let degree = 1; degree <= degreeCount; degree++) {
    chords.push(buildDiatonicChord(scale, degree, extended, notation, degreeNotation));
  }
  return chords;
}

/**
 * Utilidad de conveniencia: dado un acorde ya construido, devuelve solo
 * las pitch classes (para comparar contra shapes CAGED/3NPS, voice-leading, etc.)
 */
export function getChordPitches(chord: DiatonicChord): PitchClass[] {
  return chord.tones.map((t) => t.pitch);
}
