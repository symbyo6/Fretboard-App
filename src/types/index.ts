// src/types/index.ts

// ============================================================
// 🎵 NOTAS Y TONALIDADES
// ============================================================

/** Clase de altura: 0 = C, 1 = C#/Db, ... 11 = B */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Nombre de tonalidad/nota, incluyendo variantes enarmónicas (sostenidos y bemoles).
 * Se usa tanto para seleccionar la tónica como para mostrar nombres de nota.
 */
export type KeyName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B';

/** Nombre de nota con sostenidos, para estado serializable y visualización simplificada. */
export type NoteName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

/** Preferencia de notación para mostrar nombres de nota */
export type NotationPreference = 'sharps' | 'flats' | 'both';

/** Sistema de numerales para mostrar el grado de la escala/acorde */
export type DegreeNotation = 'roman' | 'nashville' | 'arabic';

export type DegreeLabelMode = 'roman' | 'nashville';

/** IDs de las escalas/modos básicos, incluyendo los alias usados por estado compartible. */
export type ScaleId =
  | 'major'
  | 'naturalMinor'
  | 'harmonicMinor'
  | 'melodicMinor'
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

// ============================================================
// 🎼 ESCALAS
// ============================================================

/** Categoría amplia de la escala, útil para agrupar en el selector UI */
export type ScaleCategory =
  | 'major-modes'
  | 'minor-modes'
  | 'pentatonic'
  | 'harmonic-major'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'exotic'
  | 'blues';

/**
 * Definición "cruda" de una escala: patrón de intervalos en semitonos desde la tónica,
 * sin resolver aún a una tonalidad específica.
 */
export interface ScaleDefinition {
  id: string;
  name: string;
  category: ScaleCategory;
  /** Semitonos desde la tónica (0), en orden ascendente. Ej. Mayor: [0,2,4,5,7,9,11] */
  intervals: number[];
  /** Etiquetas de intervalo por grado, ej. ['1','2','b3','4','5','6','b7'] */
  intervalLabels: string[];
  /** Modos relacionados (para escalas derivadas de mayor/menor melódica, etc.) */
  parentScaleId?: string;
  /** Descripción corta para tooltips/educación */
  description?: string;
}

/** Definición mínima de escala para estado de aplicación o integraciones externas. */
export interface Scale {
  id: ScaleId;
  name: string;
  intervals: number[];
}

/**
 * Escala ya "anclada" a una tónica concreta: cada grado resuelto a un PitchClass real.
 */
export interface ResolvedScale {
  scaleId: string;
  scaleName: string;
  key: KeyName;
  keyPitch: PitchClass;
  /** Pitch classes reales de cada grado, en el mismo orden que ScaleDefinition.intervals */
  notes: PitchClass[];
  intervalLabels: string[];
  category: ScaleCategory;
}

// ============================================================
// 🎹 ACORDES
// ============================================================

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'major7'
  | 'minor7'
  | 'dominant7'
  | 'minorMajor7'
  | 'halfDiminished7'
  | 'diminished7'
  | 'augmented7'
  | 'majorAugmented7'
  | 'dominant7Flat5';

export type SeventhQuality =
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'm7b5'
  | 'dim7'
  | 'minMaj7'
  | 'aug7'
  | 'augMaj7'
  | 'dom7b5';

export type ChordToneRole = 'root' | 'third' | 'fifth' | 'seventh';

export interface DiatonicChordInfo {
  degree: number;
  romanNumeral: string;
  nashvilleNumber: string;
  chordIntervals: string[];
  rootPitch: PitchClass;
  quality: ChordQuality;
  chordTones: PitchClass[];
  isExtended: boolean;
}

export interface ChordToneInfo {
  pitch: PitchClass;
  role: ChordToneRole;
  noteName: string;
}

export interface DiatonicChord {
  degree: number;
  romanLabel: string;
  rootPitch: PitchClass;
  rootName: string;
  quality: ChordQuality;
  symbol: string;
  tones: ChordToneInfo[];
  isExtended: boolean;
}

/** Nota visible del diapasón expresada con un nombre de nota serializable. */
export interface FretboardNote {
  stringIndex: number;
  fret: number;
  note: NoteName;
  intervalFromRoot?: number;
  isRoot?: boolean;
  inChord?: boolean;
  inScale?: boolean;
}

// ============================================================
// 🎸 DIAPASÓN (FRETBOARD)
// ============================================================

/** Número de cuerda: 1 = Mi aguda (más fina), 6 = Mi grave (más gruesa) — convención TAB */
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Índice de cuerda: 0 = la más aguda (high E) hasta 5 = la más grave (low E), o config custom */
export type StringIndex = number;

/** Traste: 0 = al aire, hasta DEFAULT_FRET_COUNT */
export type FretNumber = number;

/** Afinación de las cuerdas, de la más aguda a la más grave o viceversa según convención elegida */
export type Tuning = PitchClass[];

export interface FretboardPosition {
  string: StringNumber;
  fret: FretNumber;
  pitch: PitchClass;
}

/** Posición compatible con APIs de cálculo 0-based del motor de fretboard. */
export interface FretPosition {
  stringIndex: number;
  fret: number;
  pitchClass: PitchClass;
  scaleDegree: number;
}

export interface FretRange {
  minFret: FretNumber;
  maxFret: FretNumber;
}

/** Afinación indexada 0-5: índice 0 = cuerda 1 (Mi aguda) */
export type GuitarTuning = PitchClass[];

export type NoteCategory = 'root' | 'chordTone' | 'scaleTone' | 'outside';

export type LabelMode = 'noteName' | 'scaleDegree' | 'romanNumeral' | 'nashville' | 'none';

export interface FretboardLayoutConfig {
  fretCount: number;
  stringCount: number;
  fretWidth: number;
  stringGap: number;
  marginLeft: number;
  marginTop: number;
  marginBottom: number;
  openStringGap: number;
  noteRadius: number;
}

export interface FretboardLayout extends FretboardLayoutConfig {
  totalWidth: number;
  totalHeight: number;
  nutX: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

/** Una nota específica renderizable en el diapasón */
export interface FretboardNote {
  stringIndex: StringIndex;
  fret: FretNumber;
  pitch: PitchClass;
  noteName: string;
  intervalLabel: string;
  /** Si esta nota pertenece al acorde activo (bold) o solo a la escala (faded) */
  isChordTone: boolean;
  chordRole?: ChordToneRole;
}

// ============================================================
// ✋ SISTEMAS DE SHAPES: CAGED y 3NPS
// ============================================================

export type ShapeSystem = 'caged' | '3nps';

export type PositionSystem = 'none' | 'caged' | '3nps';

export type CagedShapeId = 'C' | 'A' | 'G' | 'E' | 'D';

/**
 * Digitación cruda de una forma, indexada por (string - 1):
 * índice 0 = cuerda 1 (Mi aguda) ... índice 5 = cuerda 6 (Mi grave).
 * null = cuerda muteada en esta forma.
 */
export type CagedShapeGrip = (number | null)[];

export interface CagedShapeInstance {
  shapeId: CagedShapeId;
  rootPitch: PitchClass;
  /** 0 = primera aparición desde el traste 0; 1 = una octava más arriba, etc. */
  cycle: number;
  /** Desplazamiento base (0-11) antes de sumar el ciclo de octava. */
  offsetInCycle: number;
  /** Desplazamiento real aplicado a la digitación original. */
  totalOffset: number;
  /** Posiciones concretas del grip, excluyendo cuerdas muteadas. */
  gripPositions: FretboardPosition[];
  mutedStrings: StringNumber[];
  /** Subconjunto de gripPositions que son la nota raíz. */
  rootPositions: FretboardPosition[];
  /** Ventana de trastes con padding para mostrar contexto alrededor del grip. */
  window: FretRange;
  /** Ventana exacta del grip, sin padding. */
  gripWindow: FretRange;
}

/** Grado 1-7 usado para identificar shapes 3NPS (three-notes-per-string) por modo */
export type NpsDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface NpsShapeInstance {
  degree: NpsDegree;
  rootPitch: PitchClass;
  scaleIntervals: readonly number[];
  /** 0 = primera aparición subiendo desde el traste más bajo posible; 1 = una octava más arriba */
  cycle: number;
  /** Las 18 posiciones (3 por cuerda x 6 cuerdas), ordenadas de cuerda 6 a cuerda 1, traste ascendente */
  positions: FretboardPosition[];
  positionsByString: Map<StringNumber, FretboardPosition[]>;
  /** Ventana exacta que ocupa el shape, sin padding */
  gripWindow: FretRange;
  /** Ventana con padding, para mostrar contexto de escala alrededor */
  window: FretRange;
  /** Subconjunto de positions que son la nota raíz de la escala completa */
  rootPositions: FretboardPosition[];
  /** Nombre pedagógico del modo, si la escala base es reconocida */
  modeName: string;
}

/** Una "ventana" de shape sobre el diapasón, con rango de trastes y notas incluidas */
export interface FretboardShape {
  system: ShapeSystem;
  /** Identificador del shape: letra CAGED o número de grado 3NPS */
  shapeId: CagedShapeId | NpsDegree;
  label: string;
  fretStart: FretNumber;
  fretEnd: FretNumber;
  notes: FretboardNote[];
}

// ============================================================
// 🔄 OVERLAY DE COMPARACIÓN Y MORPHING
// ============================================================

export type OverlapMembership = 'both' | 'caged-only' | 'nps-only' | 'none';

export interface OverlapStats {
  cagedTotal: number;
  npsTotal: number;
  sharedCount: number;
  cagedOnlyCount: number;
  npsOnlyCount: number;
  unionCount: number;
  /** Porcentaje de solapamiento real (sharedCount / unionCount * 100) */
  overlapPercentage: number;
}

export interface ShapeOverlapCandidate {
  cagedShape: CagedShapeInstance;
  npsShape: NpsShapeInstance;
  stats: OverlapStats;
  /** Distancia entre los centros de ambos grips, para desempatar candidatos */
  gripCenterDistance: number;
}

/** Cómo se debe renderizar una nota cuando se comparan dos shapes simultáneamente */
export interface ComparisonNoteStyle {
  inShapeA: boolean;
  inShapeB: boolean;
  /** 'both' = nota compartida (overlap), 'a-only', 'b-only', 'none' */
  membership: 'both' | 'a-only' | 'b-only' | 'none';
}

export interface ShapeOverlapStats {
  sharedNoteCount: number;
  totalUniqueNotes: number;
  overlapPercentage: number;
}

export interface ShapeMorphState {
  isPlaying: boolean;
  /** 0 a 1, progreso de la transición entre shape A y B */
  phase: number;
  fromShape: FretboardShape | null;
  toShape: FretboardShape | null;
}

// ============================================================
// 🎶 VOICE-LEADING Y SECUENCIAS DE ACORDES
// ============================================================

/** Símbolo de acorde parseado, sea letra (Am7) o numeral romano (ii7) */
export interface ParsedChordSymbol {
  raw: string;
  root: PitchClass | null;
  romanDegree?: number;
  quality: ChordQuality;
  seventhQuality?: SeventhQuality;
  /** Bajo diferente a la raíz, ej. C/E */
  bassPitch?: PitchClass;
  isValid: boolean;
  errorMessage?: string;
}

/** Una voz/nota concreta dentro de una voicing candidata */
export interface VoicingNote {
  stringIndex: StringIndex;
  fret: FretNumber;
  pitch: PitchClass;
  role: ChordToneRole;
}

/** Una voicing candidata completa para un acorde en una posición del diapasón */
export interface ChordVoicing {
  chordSymbol: string;
  notes: VoicingNote[];
  /** Traste promedio/centro, usado para calcular distancia entre voicings consecutivas */
  centerFret: number;
  lowestFret: number;
  highestFret: number;
}

/** Un paso en la secuencia de acordes, con su voicing elegida (auto u override manual) */
export interface SequenceStep {
  index: number;
  chordSymbol: string;
  parsed: ParsedChordSymbol;
  candidates: ChordVoicing[];
  selectedVoicingIndex: number;
  isManualOverride: boolean;
}

export interface VoiceLeadingResult {
  steps: SequenceStep[];
  /** Distancia total de movimiento (suma de saltos de traste entre pasos consecutivos) */
  totalMovementCost: number;
}

// ============================================================
// 🔗 ESTADO COMPARTIBLE (URL)
// ============================================================

/** Versión del esquema de estado compartible, para migraciones futuras */
export type ShareableStateVersion = 1;

export interface ShareableState {
  v: ShareableStateVersion;
  key: KeyName;
  scaleId: string;
  degree: number;
  extendedChords: boolean;
  notation: NotationPreference;
  positionSystem: PositionSystem;
  cagedShapeId?: CagedShapeId;
  npsDegree?: NpsDegree;
  morphEmphasis?: number;
  chordSequenceInput?: string;
  /** Overrides de voicing manual por índice de paso, ej. { "2": 1 } */
  chordSequenceOverrides?: Record<number, number>;
  modeId?: string;
}

// ============================================================
// 💾 PRESETS
// ============================================================

export interface PresetMetadata {
  id: string;
  name: string;
  icon: string;
  summary: string;
  isFactory: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Preset extends PresetMetadata {
  state: ShareableState;
}

export interface PresetPackExport {
  schemaVersion: ShareableStateVersion;
  exportedAt: number;
  presets: Preset[];
}

export type PresetSortMode = 'pinned' | 'recent' | 'alphabetic';

// ============================================================
// 🕒 HISTORIAL ("RECENTLY USED")
// ============================================================

export interface HistoryEntry {
  id: string;
  state: ShareableState;
  capturedAt: number;
  promotedPresetId?: string | null;
}

export const MAX_HISTORY = 8;

// ============================================================
// 🧰 UTILIDADES GENERALES
// ============================================================

/** Resultado estándar de validación, usado en import de presets, URL, etc. */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}
