import type {
  KeyName,
  PitchClass,
  NotationPreference,
  DegreeNotation,
  ChordQuality,
  ScaleDefinition,
  ResolvedScale,
  ScaleCategory,
} from '../../types';

// ============================================================
// 🔢 MAPEO DE TONALIDADES ↔ PITCH CLASS
// ============================================================

/** Mapa de cada nombre de tonalidad (incluyendo enarmónicos) a su pitch class 0-11 */
export const KEY_TO_PITCH: Record<KeyName, PitchClass> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** Nombres de nota usando sostenidos, indexados por pitch class 0-11 */
const SHARP_NAMES: string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Nombres de nota usando bemoles, indexados por pitch class 0-11 */
const FLAT_NAMES: string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

/**
 * Opciones para el selector de tonalidad en la UI, agrupando enarmónicos
 * en una sola entrada visual (ej. "C# / Db") pero con un valor canónico.
 */
export const KEY_DISPLAY_OPTIONS: { value: KeyName; label: string; pitch: PitchClass }[] = [
  { value: 'C', label: 'C', pitch: 0 },
  { value: 'C#', label: 'C# / Db', pitch: 1 },
  { value: 'D', label: 'D', pitch: 2 },
  { value: 'D#', label: 'D# / Eb', pitch: 3 },
  { value: 'E', label: 'E', pitch: 4 },
  { value: 'F', label: 'F', pitch: 5 },
  { value: 'F#', label: 'F# / Gb', pitch: 6 },
  { value: 'G', label: 'G', pitch: 7 },
  { value: 'G#', label: 'G# / Ab', pitch: 8 },
  { value: 'A', label: 'A', pitch: 9 },
  { value: 'A#', label: 'A# / Bb', pitch: 10 },
  { value: 'B', label: 'B', pitch: 11 },
];

/** Lista simple de todos los KeyName válidos (con duplicados enarmónicos) */
export const ALL_KEYS: KeyName[] = Object.keys(KEY_TO_PITCH) as KeyName[];

// ============================================================
// 🧰 NORMALIZACIÓN Y TRANSPOSICIÓN DE PITCH
// ============================================================

/**
 * Normaliza cualquier número entero a un PitchClass válido (0-11),
 * manejando correctamente números negativos (ej. -1 -> 11).
 */
export function normalizePitch(n: number): PitchClass {
  const mod = ((n % 12) + 12) % 12;
  return mod as PitchClass;
}

/** Transpone un pitch base por un número de semitonos (positivo o negativo) */
export function transposePitch(basePitch: PitchClass, semitones: number): PitchClass {
  return normalizePitch(basePitch + semitones);
}

/** Devuelve la distancia en semitonos ascendentes desde `from` hasta `to` (0-11) */
export function semitoneDistance(from: PitchClass, to: PitchClass): number {
  return normalizePitch(to - from);
}


// ============================================================
// 🏷️ NOMBRADO DE NOTAS
// ============================================================

/**
 * Devuelve el nombre de una nota según la preferencia de notación.
 * - 'sharps' -> siempre sostenidos (C#, D#, ...)
 * - 'flats'  -> siempre bemoles (Db, Eb, ...)
 * - 'both'   -> "C# / Db" para notas alteradas, "C" para naturales
 */
export function getNoteName(pitch: PitchClass, notation: NotationPreference = 'sharps'): string {
  const sharp = SHARP_NAMES[pitch];
  const flat = FLAT_NAMES[pitch];

  if (notation === 'sharps') return sharp;
  if (notation === 'flats') return flat;

  // 'both'
  return sharp === flat ? sharp : `${sharp} / ${flat}`;
}

/**
 * Determina si una nota es "natural" (sin alteración) en pitch class.
 * Útil para decidir si mostrar una sola grafía o ambas.
 */
export function isNaturalPitch(pitch: PitchClass): boolean {
  return SHARP_NAMES[pitch] === FLAT_NAMES[pitch];
}

// ============================================================
// 🔢 NUMERALES: ROMANO / NASHVILLE / ÁRABE
// ============================================================

const ROMAN_BASE: string[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Genera la etiqueta de grado según el sistema de notación elegido.
 * Para numerales romanos, la casing (mayúscula/minúscula) depende de la calidad del acorde:
 * - major/augmented -> mayúscula (I, IV, V)
 * - minor/diminished -> minúscula (ii, vi)
 * - diminished añade °, augmented añade +
 */
export function getDegreeLabel(
  degree: number,
  notation: DegreeNotation,
  quality?: ChordQuality
): string {
  // degree es 1-based (1 a 7, o más para escalas no heptatónicas)
  const index = degree - 1;

  if (notation === 'arabic') {
    return String(degree);
  }

  if (notation === 'nashville') {
    // Nashville usa números arábigos, igual que arabic en nuestra implementación simplificada
    return String(degree);
  }

  // notation === 'roman'
  const base = ROMAN_BASE[index] ?? String(degree);
  const isLowerCase = quality === 'minor' || quality === 'diminished';
  let label = isLowerCase ? base.toLowerCase() : base;

  if (quality === 'diminished') label += '°';
  if (quality === 'augmented') label += '+';

  return label;
}

// ============================================================
// 📚 CATÁLOGO DE ESCALAS: SCALE_LIBRARY
// ============================================================

export const SCALE_LIBRARY: ScaleDefinition[] = [
  // ---------- MODOS DE LA ESCALA MAYOR ----------
  {
    id: 'ionian',
    name: 'Mayor (Jonio)',
    category: 'major-modes',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    intervalLabels: ['1', '2', '3', '4', '5', '6', '7'],
    description: 'La escala mayor natural. Base de la armonía occidental.',
  },
  {
    id: 'harmonic-major',
    name: 'Mayor Armónica',
    category: 'harmonic-major',
    intervals: [0, 2, 4, 5, 7, 8, 11],
    intervalLabels: ['1', '2', '3', '4', '5', 'b6', '7'],
    description: 'Escala mayor con 6ta menor y 7ma mayor. Sonido dramático y exótico.',
  },
  {
    id: 'dorian',
    name: 'Dorio',
    category: 'major-modes',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    intervalLabels: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    parentScaleId: 'ionian',
    description: 'Modo menor con 6ta mayor. Sonido jazzy/folk.',
  },
  {
    id: 'phrygian',
    name: 'Frigio',
    category: 'major-modes',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    intervalLabels: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    parentScaleId: 'ionian',
    description: 'Modo menor con 2da menor. Sonido español/flamenco.',
  },
  {
    id: 'lydian',
    name: 'Lidio',
    category: 'major-modes',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    intervalLabels: ['1', '2', '3', '#4', '5', '6', '7'],
    parentScaleId: 'ionian',
    description: 'Modo mayor con 4ta aumentada. Sonido soñador/cinematic.',
  },
  {
    id: 'mixolydian',
    name: 'Mixolidio',
    category: 'major-modes',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    intervalLabels: ['1', '2', '3', '4', '5', '6', 'b7'],
    parentScaleId: 'ionian',
    description: 'Modo mayor con 7ma menor. Base del blues/rock.',
  },
  {
    id: 'aeolian',
    name: 'Menor Natural (Eoleo)',
    category: 'minor-modes',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    intervalLabels: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    parentScaleId: 'ionian',
    description: 'La escala menor natural. Relativa menor de la mayor.',
  },
  {
    id: 'locrian',
    name: 'Locrio',
    category: 'major-modes',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    intervalLabels: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    parentScaleId: 'ionian',
    description: 'Modo disminuido, inestable. Poco usado como tonalidad central.',
  },

  // ---------- MENOR ARMÓNICA Y MELÓDICA ----------
  {
    id: 'harmonic-minor',
    name: 'Menor Armónica',
    category: 'harmonic-minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    intervalLabels: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    description: 'Menor natural con 7ma mayor. Sonido clásico/neoclásico.',
  },
  {
    id: 'harmonic-minor-locrian-sharp6',
    name: 'Locrio #6 (2º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 1, 3, 5, 6, 9, 10],
    intervalLabels: ['1', 'b2', 'b3', '4', 'b5', '6', 'b7'],
    parentScaleId: 'harmonic-minor',
    description: 'Segundo modo de la menor armónica.',
  },
  {
    id: 'harmonic-minor-ionian-sharp5',
    name: 'Jonio #5 (3º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 2, 4, 5, 8, 9, 11],
    intervalLabels: ['1', '2', '3', '4', '#5', '6', '7'],
    parentScaleId: 'harmonic-minor',
    description: 'Tercer modo de la menor armónica.',
  },
  {
    id: 'harmonic-minor-dorian-sharp4',
    name: 'Dorio #4 (4º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 2, 3, 6, 7, 9, 10],
    intervalLabels: ['1', '2', 'b3', '#4', '5', '6', 'b7'],
    parentScaleId: 'harmonic-minor',
    description: 'Cuarto modo de la menor armónica.',
  },
  {
    id: 'harmonic-minor-phrygian-dominant',
    name: 'Frigio dominante (5º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    intervalLabels: ['1', 'b2', '3', '4', '5', 'b6', 'b7'],
    parentScaleId: 'harmonic-minor',
    description: 'Quinto modo de la menor armónica.',
  },
  {
    id: 'harmonic-minor-lydian-sharp2',
    name: 'Lidio #2 (6º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 3, 4, 6, 7, 8, 11],
    intervalLabels: ['1', 'b3', '3', '#4', '5', 'b6', '7'],
    parentScaleId: 'harmonic-minor',
    description: 'Sexto modo de la menor armónica.',
  },
  {
    id: 'harmonic-minor-ultralocrian',
    name: 'Ultralocrio (7º modo de menor armónica)',
    category: 'harmonic-minor',
    intervals: [0, 1, 3, 4, 6, 8, 9],
    intervalLabels: ['1', 'b2', 'b3', '3', 'b5', 'b6', '6'],
    parentScaleId: 'harmonic-minor',
    description: 'Séptimo modo de la menor armónica.',
  },
  {
    id: 'melodic-minor',
    name: 'Menor Melódica',
    category: 'melodic-minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    intervalLabels: ['1', '2', 'b3', '4', '5', '6', '7'],
    description: 'Menor con 6ta y 7ma mayores. Muy usada en jazz.',
  },
  {
    id: 'melodic-minor-dorian-flat2',
    name: 'Dorio b2 (2º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 1, 3, 5, 7, 9, 10],
    intervalLabels: ['1', 'b2', 'b3', '4', '5', '6', 'b7'],
    parentScaleId: 'melodic-minor',
    description: 'Segundo modo de la menor melódica.',
  },
  {
    id: 'melodic-minor-lydian-augmented',
    name: 'Lidio aumentado (3º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 2, 4, 6, 8, 9, 11],
    intervalLabels: ['1', '2', '3', '#4', '#5', '6', '7'],
    parentScaleId: 'melodic-minor',
    description: 'Tercer modo de la menor melódica.',
  },
  {
    id: 'melodic-minor-lydian-dominant',
    name: 'Lidio dominante (4º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 2, 4, 6, 7, 9, 10],
    intervalLabels: ['1', '2', '3', '#4', '5', '6', 'b7'],
    parentScaleId: 'melodic-minor',
    description: 'Cuarto modo de la menor melódica.',
  },
  {
    id: 'melodic-minor-mixolydian-flat6',
    name: 'Mixolidio b6 (5º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 2, 4, 5, 7, 8, 10],
    intervalLabels: ['1', '2', '3', '4', '5', 'b6', 'b7'],
    parentScaleId: 'melodic-minor',
    description: 'Quinto modo de la menor melódica.',
  },
  {
    id: 'melodic-minor-locrian-sharp2',
    name: 'Locrio #2 (6º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 2, 3, 5, 6, 8, 10],
    intervalLabels: ['1', '2', 'b3', '4', 'b5', 'b6', 'b7'],
    parentScaleId: 'melodic-minor',
    description: 'Sexto modo de la menor melódica.',
  },
  {
    id: 'melodic-minor-altered',
    name: 'Alterada (7º modo de menor melódica)',
    category: 'melodic-minor',
    intervals: [0, 1, 3, 4, 6, 8, 10],
    intervalLabels: ['1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'],
    parentScaleId: 'melodic-minor',
    description: 'Séptimo modo de la menor melódica, también llamada superlocria.',
  },

  // ---------- PENTATÓNICAS ----------
  {
    id: 'major-pentatonic',
    name: 'Pentatónica Mayor',
    category: 'pentatonic',
    intervals: [0, 2, 4, 7, 9],
    intervalLabels: ['1', '2', '3', '5', '6'],
    description: 'Escala mayor sin 4ta ni 7ma. Muy consonante.',
  },
  {
    id: 'minor-pentatonic',
    name: 'Pentatónica Menor',
    category: 'pentatonic',
    intervals: [0, 3, 5, 7, 10],
    intervalLabels: ['1', 'b3', '4', '5', 'b7'],
    description: 'La escala más usada en rock/blues/solos.',
  },

  // ---------- BLUES ----------
  {
    id: 'blues-minor',
    name: 'Blues Menor',
    category: 'blues',
    intervals: [0, 3, 5, 6, 7, 10],
    intervalLabels: ['1', 'b3', '4', 'b5', '5', 'b7'],
    description: 'Pentatónica menor + blue note (b5).',
  },

  // ---------- EXÓTICAS ----------
  {
    id: 'phrygian-dominant',
    name: 'Frigio Dominante',
    category: 'exotic',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    intervalLabels: ['1', 'b2', '3', '4', '5', 'b6', 'b7'],
    description: '5to modo de la menor armónica. Sonido flamenco/klezmer.',
  },
  {
    id: 'hungarian-minor',
    name: 'Menor Húngara',
    category: 'exotic',
    intervals: [0, 2, 3, 6, 7, 8, 11],
    intervalLabels: ['1', '2', 'b3', '#4', '5', 'b6', '7'],
    description: 'Menor armónica con 4ta aumentada. Sonido balcánico/gitano.',
  },
];

// ============================================================
// 🔍 BÚSQUEDA Y FILTRADO DE ESCALAS
// ============================================================

/** Busca una definición de escala por su id. Devuelve undefined si no existe. */
export function getScaleById(scaleId: string): ScaleDefinition | undefined {
  return SCALE_LIBRARY.find((s) => s.id === scaleId);
}

/** Devuelve todas las escalas de una categoría dada, para agrupar en el selector UI */
export function getScalesByCategory(category: ScaleCategory): ScaleDefinition[] {
  return SCALE_LIBRARY.filter((s) => s.category === category);
}

/** Devuelve la pentatónica asociada a cada grado de la escala mayor. */
export function getMajorDegreePentatonic(
  scale: ResolvedScale,
  degree: number
): { notes: PitchClass[]; intervalLabels: string[]; name: string } | null {
  if (scale.scaleId !== 'ionian' || degree < 1 || degree > 7) return null;

  const root = scale.notes[degree - 1];
  const isDiminishedDegree = degree === 7;
  const isMinorDegree = [2, 3, 6].includes(degree) || isDiminishedDegree;
  const intervalLabels = isDiminishedDegree
    ? ['1', 'b3', '4', 'b5', 'b7']
    : isMinorDegree
      ? ['1', 'b3', '4', '5', 'b7']
      : ['1', '2', '3', '5', '6'];
  const semitones = isDiminishedDegree
    ? [0, 3, 5, 6, 10]
    : isMinorDegree
      ? [0, 3, 5, 7, 10]
      : [0, 2, 4, 7, 9];

  return {
    notes: semitones.map((semitone) => normalizePitch(root + semitone)),
    intervalLabels,
    name: isDiminishedDegree || isMinorDegree ? 'Pentatónica menor' : 'Pentatónica mayor',
  };
}

/** Devuelve todas las categorías presentes en la librería, en orden de aparición */
export function getAllCategories(): ScaleCategory[] {
  const seen = new Set<ScaleCategory>();
  const result: ScaleCategory[] = [];
  for (const s of SCALE_LIBRARY) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      result.push(s.category);
    }
  }
  return result;
}

// ============================================================
// 🔧 RESOLUCIÓN DE ESCALA: ANCLAR A UNA TONALIDAD REAL
// ============================================================

/**
 * Ancla una ScaleDefinition abstracta a una tonalidad concreta,
 * generando los pitch classes reales de cada grado.
 *
 * @param scaleId  id de la escala en SCALE_LIBRARY
 * @param key      tonalidad elegida por el usuario
 * @throws Error si el scaleId no existe (fail-fast, se espera validar antes en la UI)
 */
export function resolveScale(scaleId: string, key: KeyName): ResolvedScale {
  const definition = getScaleById(scaleId);

  if (!definition) {
    throw new Error(`[scales.ts] Escala desconocida: "${scaleId}"`);
  }

  const keyPitch = KEY_TO_PITCH[key];
  const notes = definition.intervals.map((interval) => transposePitch(keyPitch, interval));

  return {
    scaleId: definition.id,
    scaleName: definition.name,
    key,
    keyPitch,
    notes,
    intervalLabels: definition.intervalLabels,
    category: definition.category,
  };
}

// ============================================================
// 🎯 UTILIDADES ADICIONALES
// ============================================================

/**
 * Dado un ResolvedScale y un grado (1-based), devuelve el pitch class de ese grado.
 * Envuelve el índice si el grado excede el tamaño de la escala (útil para pentatónicas, etc.)
 */
export function getPitchForDegree(scale: ResolvedScale, degree: number): PitchClass {
  const index = (degree - 1) % scale.notes.length;
  return scale.notes[index];
}

/**
 * Devuelve la etiqueta de intervalo (ej. 'b3', '#4') correspondiente a un grado 1-based.
 * Envuelve el índice igual que getPitchForDegree.
 */
export function getIntervalLabelForDegree(scale: ResolvedScale, degree: number): string {
  const index = (degree - 1) % scale.intervalLabels.length;
  return scale.intervalLabels[index];
}

/**
 * Verifica si una escala tiene exactamente 7 grados (heptatónica).
 * Usado por chords.ts para decidir si puede derivar acordes diatónicos estándar (I-VII).
 */
export function isHeptatonic(scale: ResolvedScale): boolean {
  return scale.notes.length === 7;
}

/**
 * Devuelve la etiqueta de intervalo (ej. 'b3', '#4') relativa al pitch class de la tónica.
 * Útil para etiquetar notas en acordes/diapasón.
 */
export function getIntervalLabel(scale: ResolvedScale, pitch: PitchClass): string {
  const INTERVAL_LABELS: Record<number, string> = {
    0: '1',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: 'b5',
    7: '5',
    8: 'b6',
    9: '6',
    10: 'b7',
    11: '7',
  };
  const semitonesFromRoot = normalizePitch(pitch - scale.keyPitch);
  return INTERVAL_LABELS[semitonesFromRoot] ?? '?';
}
