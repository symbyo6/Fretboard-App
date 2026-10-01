import React, { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import * as Tone from 'tone';
import { ControlsPanel } from './components/Controls/ControlsPanel';
import { ChordSequencePanel } from './components/Controls/ChordSequencePanel';
import { PlaybackControls, StringGroupSelector } from './components/Controls/PlaybackControls';
import { InversionControls } from './components/Controls/NotationAndChordToggles';
import { Fretboard } from './components/Fretboard/Fretboard';
import { getAllDiatonicChords, getChordToneIntervalLabels, getChordToneSet, getScaleToneSet, toVoicing, type ChordVoicing, type ChordVoicingType } from './lib/theory/chords';
import { useAudioEngine } from './hooks/useAudioEngine';
import { fretToNoteName } from './lib/audio/tuning';
import { getAllPositionsForPitch, getPitchAtPosition, STANDARD_TUNING } from './lib/theory/fretboardPositions';
import { getMajorDegreePentatonic, getScaleById, resolveScale } from './lib/theory/scales';
import { downloadTabJpeg, downloadTabPdf, type FretboardDiagramStep } from './lib/tabPdf';
import { localizeTheoryName, useLanguage } from './i18n';
import { analyzeChordSequence, parseChordToken, transposeChordSequence } from './lib/theory/chordSequence';
import { linkChordSequence } from './lib/theory/voiceLeading';
import type { PlaybackMode, ProgressionStep, SequenceDirection } from './hooks/useProgression';
import type {
  DiatonicChord,
  DegreeLabelMode,
  FretboardPosition,
  KeyName,
  NotationPreference,
  PitchClass,
  StringNumber,
} from './types';

const KEY_OPTIONS: KeyName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEY_TO_PITCH: Record<KeyName, PitchClass> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const ENHARMONIC_KEY_NAMES: Partial<Record<KeyName, KeyName>> = {
  'C#': 'Db', Db: 'C#', 'D#': 'Eb', Eb: 'D#', 'F#': 'Gb', Gb: 'F#',
  'G#': 'Ab', Ab: 'G#', 'A#': 'Bb', Bb: 'A#',
};

function getDisplayedTonicName(key: KeyName, useEnharmonicName: boolean): KeyName {
  return useEnharmonicName ? (ENHARMONIC_KEY_NAMES[key] ?? key) : key;
}

function getDisplayedChordSymbol(chord: DiatonicChord, useEnharmonicName: boolean): string {
  const chordRootName = getDisplayedTonicName(chord.rootName as KeyName, useEnharmonicName);
  return `${chordRootName}${chord.symbol.slice(chord.rootName.length)}`;
}

function getDisplayedNoteName(noteName: string, useEnharmonicName: boolean): string {
  return getDisplayedTonicName(noteName as KeyName, useEnharmonicName);
}

function getModeFamilyLabel(family: ModeFamily): string {
  return family === 'major' ? 'Mayor' : family === 'harmonic-minor' ? 'Menor armónica' : 'Menor melódica';
}

function getNotationLabel(label: 'flats' | 'sharps' | 'none'): string {
  return label === 'flats' ? 'Bemoles' : label === 'sharps' ? 'Sostenidos' : 'Ninguna';
}

function getVoicingLabel(type: ChordVoicingType): string {
  return type === 'closed' ? 'Cerrado' : type === 'drop2' ? 'Drop 2' : 'Drop 3';
}

function getDirectionLabel(direction: SequenceDirection): string {
  return direction === 'ascending' ? 'Ascendente' : 'Descendente';
}

function isExtendedChordQuality(quality: string | null): boolean {
  return quality !== null && [
    'major7', 'minor7', 'dominant7', 'minorMajor7', 'halfDiminished7',
    'diminished7', 'augmented7', 'majorAugmented7', 'dominant7Flat5',
  ].includes(quality);
}

const MAJOR_MODE_IDS = [
  'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian',
] as const;

type ModeFamily = 'major' | 'harmonic-minor' | 'melodic-minor';

const MODE_FAMILY_IDS: Record<ModeFamily, readonly string[]> = {
  major: MAJOR_MODE_IDS,
  'harmonic-minor': [
    'harmonic-minor', 'harmonic-minor-locrian-sharp6', 'harmonic-minor-ionian-sharp5',
    'harmonic-minor-dorian-sharp4', 'harmonic-minor-phrygian-dominant',
    'harmonic-minor-lydian-sharp2', 'harmonic-minor-ultralocrian',
  ],
  'melodic-minor': [
    'melodic-minor', 'melodic-minor-dorian-flat2', 'melodic-minor-lydian-augmented',
    'melodic-minor-lydian-dominant', 'melodic-minor-mixolydian-flat6',
    'melodic-minor-locrian-sharp2', 'melodic-minor-altered',
  ],
};

const MODE_FAMILY_BASE_IDS: Record<ModeFamily, string> = {
  major: 'ionian',
  'harmonic-minor': 'harmonic-minor',
  'melodic-minor': 'melodic-minor',
};

function getPreferredKeyName(pitch: PitchClass, family: ModeFamily): KeyName {
  if (family === 'major') {
    const majorKeyNames: Record<PitchClass, KeyName> = {
      0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
      6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
    };
    return majorKeyNames[pitch];
  }
  return KEY_OPTIONS[pitch];
}

function getDrop3StringSet(group: 0 | 1): number[] {
  return group === 0 ? [6, 4, 3, 2] : [5, 3, 2, 1];
}

function getKeySignatureNotation(key: KeyName, family: ModeFamily): NotationPreference {
  const tonicPitch = KEY_TO_PITCH[key];
  const signaturePitch = family === 'major' ? tonicPitch : ((tonicPitch + 3) % 12) as PitchClass;
  const flatKeys = new Set<PitchClass>([1, 3, 5, 6, 8, 10]);
  const sharpKeys = new Set<PitchClass>([2, 4, 7, 9, 11]);

  if (flatKeys.has(signaturePitch)) return 'flats';
  if (sharpKeys.has(signaturePitch)) return 'sharps';
  return 'sharps';
}

function getKeySignatureLabel(key: KeyName, family: ModeFamily): 'flats' | 'sharps' | 'none' {
  const tonicPitch = KEY_TO_PITCH[key];
  const signaturePitch = family === 'major' ? tonicPitch : ((tonicPitch + 3) % 12) as PitchClass;
  if (signaturePitch === 0) return 'none';
  return [1, 3, 5, 6, 8, 10].includes(signaturePitch) ? 'flats' : 'sharps';
}

const CHORD_INTERVAL_LABELS: Record<number, string> = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
};

const MAX_FRETBOARD_FRET = 24;
// Five visible frets means a maximum distance of four between the extremes.
const MAX_VOICING_FRET_SPAN = 4;
const MAX_LINK_VOICE_JUMP = 8;
const APP_SETTINGS_STORAGE_KEY = 'fretboard-app-settings-v1';

interface PersistedAppSettings {
  key: KeyName;
  useEnharmonicTonicName: boolean;
  modeBaseKey: KeyName;
  scaleId: string;
  degree: number;
  modeDegree: number;
  modeFamily: ModeFamily;
  extendedChords: boolean;
  voicing: ChordVoicing;
  voicingType: ChordVoicingType;
  drop3StringGroup: 0 | 1;
  degreeLabelMode: DegreeLabelMode;
  keepLastPlayed: boolean;
  sequenceDirection: SequenceDirection;
  bpm: number;
  playbackMode: PlaybackMode;
  lowerString: number;
  upperString: number;
  chordSequence: string;
  sequenceMode: 'diatonic' | 'linked';
  linkedSequenceOctaveOffset: number;
}

function loadPersistedAppSettings(): Partial<PersistedAppSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!saved) return {};
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Partial<PersistedAppSettings>;
  } catch {
    return {};
  }
}

const persistedAppSettings = loadPersistedAppSettings();

function getChordIntervalLabels(chord: DiatonicChord | undefined): string[] {
  if (!chord) return [];
  return chord.tones.map((tone) => {
    const interval = ((tone.pitch - chord.rootPitch) % 12 + 12) % 12;
    return CHORD_INTERVAL_LABELS[interval];
  });
}

function getVoicingRootIndex(chord: DiatonicChord, voicing: ChordVoicing): number {
  return toVoicing(chord, voicing).tones.findIndex((tone) => tone.role === 'root');
}

function getVoicingRootMidi(chord: DiatonicChord, voicing: ChordVoicing, noteNames: string[]): number {
  const rootIndex = getVoicingRootIndex(chord, voicing);
  return rootIndex < 0 ? NaN : Tone.Frequency(noteNames[rootIndex]).toMidi();
}

function getVoicingRootPositionKey(chord: DiatonicChord, voicing: ChordVoicing, positions: FretboardPosition[]): string {
  const rootPosition = positions[getVoicingRootIndex(chord, voicing)];
  return rootPosition ? `${rootPosition.string}-${rootPosition.fret}` : '';
}

function getPhysicalInversion(chord: DiatonicChord, positions: FretboardPosition[]): number {
  const lowestPosition = positions[0];
  if (!lowestPosition) return 1;
  const lowestTone = chord.tones.find((tone) => tone.pitch === lowestPosition.pitch);
  if (!lowestTone) return 1;
  return lowestTone.role === 'root'
    ? 1
    : lowestTone.role === 'third'
      ? 2
      : lowestTone.role === 'fifth'
        ? 3
        : 4;
}

function getVoicingForPhysicalInversion(
  chord: DiatonicChord,
  requestedVoicing: ChordVoicing
): ChordVoicing {
  const type: ChordVoicingType = requestedVoicing === 'closed'
    ? 'closed'
    : requestedVoicing.startsWith('drop2') ? 'drop2' : 'drop3';
  const requestedInversion = requestedVoicing === 'closed'
    ? 1
    : Number(requestedVoicing.at(-1));
  const candidateCount = chord.tones.length >= 4 ? 4 : 3;
  const candidates: ChordVoicing[] = type === 'closed'
    ? ['closed', ...Array.from({ length: candidateCount - 1 }, (_, index) => `closed-${index + 2}` as ChordVoicing)]
    : Array.from({ length: candidateCount }, (_, index) => `${type}-${index + 1}` as ChordVoicing);
  const match = candidates.find((candidate) => {
    const firstTone = toVoicing(chord, candidate).tones[0];
    const physicalInversion = firstTone?.role === 'root'
      ? 1
      : firstTone?.role === 'third'
        ? 2
        : firstTone?.role === 'fifth'
          ? 3
          : 4;
    return physicalInversion === requestedInversion;
  });
  return match ?? requestedVoicing;
}

function isClosedPitchRange(noteNames: string[]): boolean {
  const midis = noteNames.map((note) => Tone.Frequency(note).toMidi());
  return midis.length > 0 && Math.max(...midis) - Math.min(...midis) < 12;
}

function isSameOrAdjacentStringGroup(
  lower: number,
  upper: number,
  priorLower: number,
  priorUpper: number
): boolean {
  const lowerDelta = Math.abs(lower - priorLower);
  const upperDelta = Math.abs(upper - priorUpper);
  return lowerDelta === 0 && upperDelta === 0
    || lowerDelta === 1 && upperDelta === 1;
}

function getArpeggioPositions(
  chord: DiatonicChord,
  lowerString: number,
  upperString: number,
  selectedStrings: number[] | undefined = undefined,
  minimumFret = 0,
  previousLowStringMidi = -Infinity,
  preferHighestFinalNote = false,
  requireClosedVoicing = false,
  maxFretSpan?: number,
  ascending = true,
  preferLowestFirstNote = false,
  previousVoiceMidis: number[] = [],
  enforcePreviousLowStringDirection = true,
  allowStringReassignment = false,
  maximumFret = MAX_FRETBOARD_FRET
): {
  positions: FretboardPosition[];
  noteNames: string[];
  lastMidi: number;
  startMidi: number;
  rootMidi: number;
  lowStringMidi: number;
} | null {
  type SearchResult = {
    positions: FretboardPosition[];
    lastMidi: number;
    startMidi: number;
    rootMidi: number;
    lowStringMidi: number;
    score: number;
  };

  const choosePositions = (
    toneIndex: number,
    previousMidi: number,
    positions: FretboardPosition[]
  ): SearchResult | null => {
    if (toneIndex >= chord.tones.length) {
      if (positions.some((position) => position.fret < 0 || position.fret > MAX_FRETBOARD_FRET)) {
        return null;
      }

      const midis = positions.map((position) => (
        Tone.Frequency(fretToNoteName(position.string - 1, position.fret)).toMidi()
      ));
      const isAscending = midis.every((midi, index) => index === 0 || midi > midis[index - 1]);
      const fitsWithinOctave = midis.length === 0 || midis[midis.length - 1] - midis[0] < 12;
      const frets = positions.map((position) => position.fret);
      const fretSpan = frets.length === 0 ? 0 : Math.max(...frets) - Math.min(...frets);

      if (
        (requireClosedVoicing && (!isAscending || !fitsWithinOctave))
        || (maxFretSpan !== undefined && fretSpan > maxFretSpan)
      ) return null;

      return {
        positions,
        lastMidi: previousMidi,
        startMidi: 0,
        rootMidi: 0,
        lowStringMidi: 0,
        score: 0,
      };
    }
    const activeStrings = selectedStrings ?? Array.from(
      { length: lowerString - upperString + 1 },
      (_, index) => lowerString - index
    );
    if (chord.tones.length > activeStrings.length) return null;


    const tone = chord.tones[toneIndex];
    const assignedString = activeStrings[toneIndex];

    const usedStrings = new Set(positions.map((position) => position.string));
    const candidateStrings = allowStringReassignment
      ? activeStrings.filter((string) => !usedStrings.has(string as StringNumber))
      : [assignedString as StringNumber];
    const candidates = getAllPositionsForPitch(tone.pitch, maximumFret)
      .filter((position) => candidateStrings.includes(position.string)
        && position.fret >= minimumFret
        && position.fret <= maximumFret)
      .map((position) => ({
        position,
        midi: Tone.Frequency(fretToNoteName(position.string - 1, position.fret)).toMidi(),
      }))
        .filter((candidate) => {
          if (
            toneIndex !== 0
            || !Number.isFinite(previousLowStringMidi)
            || !enforcePreviousLowStringDirection
          ) return true;
          return ascending
            ? candidate.midi >= previousLowStringMidi
            : candidate.midi <= previousLowStringMidi;
        })
      .sort((a, b) => {
        if (toneIndex === 0 && !ascending) {
          return b.midi - a.midi;
        }
        if (preferHighestFinalNote && toneIndex === chord.tones.length - 1) {
          return b.midi - a.midi;
        }
        return a.midi - b.midi;
      });

    let bestResult: SearchResult | null = null;
    for (const candidate of candidates) {
      const interval = toneIndex === 0
        ? 0
        : Math.abs(candidate.midi - previousMidi);
      const lowStringDistance = toneIndex === 0 && Number.isFinite(previousLowStringMidi)
        ? Math.abs(candidate.midi - previousLowStringMidi)
        : 0;
      const voiceDistance = toneIndex > 0 && Number.isFinite(previousVoiceMidis[toneIndex])
        ? Math.abs(candidate.midi - previousVoiceMidis[toneIndex])
        : 0;
      const result = choosePositions(
        toneIndex + 1,
        candidate.midi,
        [...positions, candidate.position]
      );
      if (result) {
        if (
          toneIndex === 0
          && (preferLowestFirstNote || (!ascending && !Number.isFinite(previousLowStringMidi)))
        ) {
          return result;
        }
        const lowestFirstNoteBias = toneIndex === 0 && preferLowestFirstNote
          ? 0
          : 0;
        const scoredResult = {
          ...result,
          score: result.score + interval + lowStringDistance * 10000
            + voiceDistance * 1000 + lowestFirstNoteBias,
        };
        if (!bestResult || scoredResult.score < bestResult.score) bestResult = scoredResult;
      }
    }

    return bestResult;
  };

  const result = choosePositions(0, -Infinity, []);
  if (!result) return null;

  const noteNames = result.positions.map((position) =>
    fretToNoteName(position.string - 1, position.fret)
  );

  const lastMidi = Tone.Frequency(noteNames[noteNames.length - 1]).toMidi();
  return {
    ...result,
    noteNames,
    lastMidi,
    startMidi: Tone.Frequency(noteNames[0]).toMidi(),
    rootMidi: Tone.Frequency(
      noteNames[chord.tones.findIndex((tone) => tone.role === 'root')]
    ).toMidi(),
    lowStringMidi: Tone.Frequency(noteNames[0]).toMidi(),
  };
}

interface GlobalLinkedCandidate {
  positions: FretboardPosition[];
  noteNames: string[];
  midis: number[];
  rootMidi: number;
  rootPositionKey: string;
  tonePositionKeys: Record<number, string>;
  inversion: number;
  bassToneRole: string;
  lower: number;
  upper: number;
  octaveOffset: number;
  selected: boolean;
}

function getAllPhysicalVoicingPositions(
  chord: DiatonicChord,
  lower: number,
  upper: number,
  selectedStrings: number[] | undefined,
  voicingType: ChordVoicingType,
  enforceFretSpan = true,
  enforceSpread = true,
  requireAscending = true
): FretboardPosition[][] {
  const strings = selectedStrings ?? Array.from(
    { length: lower - upper + 1 },
    (_, index) => lower - index
  );
  const positionsByTone = chord.tones.map((tone, toneIndex) => getAllPositionsForPitch(tone.pitch, MAX_FRETBOARD_FRET)
    .filter((position) => position.string === strings[toneIndex]));
  const results: FretboardPosition[][] = [];
  const visit = (toneIndex: number, positions: FretboardPosition[]) => {
    if (toneIndex === positionsByTone.length) {
      const midis = positions.map((position) => Tone.Frequency(
        fretToNoteName(position.string - 1, position.fret)
      ).toMidi());
      const frets = positions.map((position) => position.fret);
      if (enforceFretSpan && Math.max(...frets) - Math.min(...frets) > MAX_VOICING_FRET_SPAN) return;
      if (requireAscending && !midis.every((midi, index) => index === 0 || midi > midis[index - 1])) return;
      if (enforceSpread && voicingType !== 'closed' && isClosedPitchRange(positions.map((position) => (
        fretToNoteName(position.string - 1, position.fret)
      )))) return;
      results.push(positions);
      return;
    }
    for (const position of positionsByTone[toneIndex]) {
      visit(toneIndex + 1, [...positions, position]);
    }
  };
  visit(0, []);
  return results;
}

function findGlobalLinkedPath(
  linkedChordSequence: ReturnType<typeof linkChordSequence>,
  extendedChords: boolean,
  requestedVoicingType: ChordVoicingType,
  initialVoicing: ChordVoicing,
  lowerString: number,
  upperString: number,
  drop3StringGroup: 0 | 1
): ProgressionStep[] | null {
  if (linkedChordSequence.length === 0) return null;
  const voicingType: ChordVoicingType = extendedChords && requestedVoicingType === 'closed'
    ? 'drop2'
    : requestedVoicingType;
  const voiceCount = extendedChords ? 4 : 3;
  const requestedInitialInversion = initialVoicing === 'closed'
    ? 1
    : Math.min(extendedChords ? 4 : 3, Math.max(1, Number(initialVoicing.at(-1))));
  const contexts = voicingType === 'drop3'
    ? [{ lower: 6, upper: 2, selected: drop3StringGroup === 0 }, { lower: 5, upper: 1, selected: drop3StringGroup === 1 }]
    : Array.from({ length: 6 - voiceCount + 1 }, (_, index) => ({
      lower: 6 - index,
      upper: 6 - index - voiceCount + 1,
      selected: 6 - index === lowerString && 6 - index - voiceCount + 1 === upperString,
    }));
  const layers: GlobalLinkedCandidate[][] = [];

  for (const [index, currentLinkedStep] of linkedChordSequence.entries()) {
    if (!currentLinkedStep.chord || currentLinkedStep.targetInversion === null) return null;
    const inversionCount = extendedChords ? 4 : 3;
    const followsChromaticStep = index > 0 && linkedChordSequence[index - 1].linkStatus === 'chromatic';
    const inversions = index === 0
      ? [requestedInitialInversion]
      : currentLinkedStep.linkStatus === 'chromatic' || followsChromaticStep
        ? Array.from({ length: inversionCount }, (_, inversionIndex) => inversionIndex + 1)
        : [currentLinkedStep.targetInversion];
    const candidates: GlobalLinkedCandidate[] = [];
    for (const inversion of inversions) {
      const candidateVoicing: ChordVoicing = voicingType === 'closed'
        ? inversion === 1 ? 'closed' : `closed-${inversion}` as ChordVoicing
        : `${voicingType}-${inversion}` as ChordVoicing;
      for (const context of contexts) {
        const getBases = (enforceFretSpan: boolean, enforceSpread: boolean) => getAllPhysicalVoicingPositions(
          toVoicing(currentLinkedStep.chord, candidateVoicing),
          context.lower,
          context.upper,
          voicingType === 'drop3' ? getDrop3StringSet(context.lower === 6 ? 0 : 1) : undefined,
          voicingType,
          enforceFretSpan,
          enforceSpread,
          false
        ).map((positions) => ({ positions }));
        const bases = getBases(true, true).length > 0
          ? getBases(true, true)
          : getBases(false, false);
        for (const base of bases) {
          for (const octave of [-24, -12, 0, 12, 24]) {
          const positions = base.positions.map((position) => ({ ...position, fret: position.fret + octave }));
          if (positions.some((position) => position.fret < 0 || position.fret > MAX_FRETBOARD_FRET)) continue;
          const noteNames = positions.map((position) => fretToNoteName(position.string - 1, position.fret));
          const tonePositionKeys = Object.fromEntries(
            toVoicing(currentLinkedStep.chord, candidateVoicing).tones.map((tone, toneIndex) => [
              tone.pitch,
              `${positions[toneIndex].string}-${positions[toneIndex].fret}`,
            ])
          );
          if (voicingType !== 'closed' && isClosedPitchRange(noteNames)) continue;
          const midis = noteNames.map((note) => Tone.Frequency(note).toMidi());
          if (Math.max(...midis) - Math.min(...midis) > 24) continue;
          candidates.push({
            positions,
            noteNames,
            midis,
            rootMidi: getVoicingRootMidi(currentLinkedStep.chord, candidateVoicing, noteNames),
            rootPositionKey: getVoicingRootPositionKey(currentLinkedStep.chord, candidateVoicing, positions),
            tonePositionKeys,
            inversion,
            bassToneRole: toVoicing(currentLinkedStep.chord, candidateVoicing).tones[0]?.role ?? '',
            lower: context.lower,
            upper: context.upper,
            octaveOffset: octave,
            selected: context.selected,
          });
        }
      }
    }
    }
    if (candidates.length === 0) return null;
    layers.push(candidates);
  }

  const solveLayers = (allowAlternativeStart: boolean) => {
    const costs = layers.map((layer) => layer.map(() => Infinity));
    const previous = layers.map((layer) => layer.map(() => -1));
    layers[0].forEach((candidate, index) => {
      costs[0][index] = candidate.selected || allowAlternativeStart
        ? 0
        : Infinity;
    });
  for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
    layers[layerIndex].forEach((candidate, candidateIndex) => {
      layers[layerIndex - 1].forEach((prior, priorIndex) => {
        if (candidate.midis.length !== prior.midis.length) return;
        const sameStringGroup = candidate.lower === prior.lower && candidate.upper === prior.upper;
        const isChromaticTransition = linkedChordSequence[layerIndex].linkStatus === 'chromatic'
          || linkedChordSequence[layerIndex - 1].linkStatus === 'chromatic';
        const sameGroupHasLinkedCandidate = layers[layerIndex].some((sameGroupCandidate) => (
          sameGroupCandidate.lower === prior.lower
          && sameGroupCandidate.upper === prior.upper
          && sameGroupCandidate.octaveOffset === prior.octaveOffset
          && Math.abs(
            getPhysicalInversion(linkedChordSequence[layerIndex].chord!, sameGroupCandidate.positions)
              - getPhysicalInversion(linkedChordSequence[layerIndex - 1].chord!, prior.positions)
          ) <= 1
          && sameGroupCandidate.midis.every((midi, voiceIndex) => (
            Math.abs(midi - prior.midis[voiceIndex]) <= MAX_LINK_VOICE_JUMP
          ))
          && sameGroupCandidate.positions.reduce((movement, position, voiceIndex) => (
            movement + Math.abs(position.fret - prior.positions[voiceIndex].fret)
          ), 0) <= MAX_VOICING_FRET_SPAN * 2
        ));
        if (!sameStringGroup && sameGroupHasLinkedCandidate) return;
        if (!sameStringGroup && isChromaticTransition) {
          const candidateInversion = getPhysicalInversion(linkedChordSequence[layerIndex].chord!, candidate.positions);
          const priorInversion = getPhysicalInversion(linkedChordSequence[layerIndex - 1].chord!, prior.positions);
          if (Math.abs(candidateInversion - priorInversion) > 1) return;
        }
        const sharedPitches = Object.keys(candidate.tonePositionKeys)
          .map(Number)
          .filter((pitch) => Object.hasOwn(prior.tonePositionKeys, pitch));
        const voiceMovement = candidate.midis.reduce((sum, midi, voiceIndex) => sum + Math.abs(midi - prior.midis[voiceIndex]), 0);
        const voiceJumpPenalty = candidate.midis.reduce((penalty, midi, voiceIndex) => {
          const excess = Math.abs(midi - prior.midis[voiceIndex]) - MAX_LINK_VOICE_JUMP;
          return penalty + (excess > 0 ? excess * 1000 : 0);
        }, 0);
        const fretMovement = candidate.positions.reduce((movement, position, voiceIndex) => (
          movement + Math.abs(position.fret - prior.positions[voiceIndex].fret)
        ), 0);
        if (!isSameOrAdjacentStringGroup(candidate.lower, candidate.upper, prior.lower, prior.upper)) return;
        const commonTonesRemainStatic = sharedPitches.every((pitch) => {
          const [priorString, priorFret] = prior.tonePositionKeys[pitch].split('-').map(Number);
          const [candidateString, candidateFret] = candidate.tonePositionKeys[pitch].split('-').map(Number);
          return Tone.Frequency(fretToNoteName(priorString - 1, priorFret)).toMidi()
            === Tone.Frequency(fretToNoteName(candidateString - 1, candidateFret)).toMidi();
        });
        if (!commonTonesRemainStatic) return;
        const octaveDelta = candidate.octaveOffset - prior.octaveOffset;
        const octaveChangePenalty = Math.abs(octaveDelta) * 10000;
        const upwardSameGroupPenalty = sameStringGroup && octaveDelta > 0 ? 15000 : 0;
        const cost = costs[layerIndex - 1][priorIndex]
          + voiceMovement
          + octaveChangePenalty
          + voiceJumpPenalty
          + fretMovement * 100
          + upwardSameGroupPenalty;
        if (cost < costs[layerIndex][candidateIndex]) {
          costs[layerIndex][candidateIndex] = cost;
          previous[layerIndex][candidateIndex] = priorIndex;
        }
      });
    });
  }
  const finalCosts = costs.at(-1);
  if (!finalCosts || finalCosts.length === 0 || !finalCosts.some(Number.isFinite)) return null;
  let selectedIndex = finalCosts.reduce((best, cost, index, row) => cost < row[best] ? index : best, 0);
  const selected: GlobalLinkedCandidate[] = [];
  for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const candidate = layers[layerIndex][selectedIndex];
    if (!candidate) return null;
    selected.unshift(candidate);
    if (layerIndex === 0) break;
    selectedIndex = previous[layerIndex][selectedIndex];
    if (selectedIndex < 0) return null;
  }
  return selected;
  };
  const selected = solveLayers(false) ?? solveLayers(true) ?? (
    layers.length === linkedChordSequence.length && layers.every((layer) => layer.length > 0)
      ? layers.reduce<GlobalLinkedCandidate[]>((path, layer, layerIndex) => {
    if (layerIndex === 0) {
      return [layer.find((candidate) => candidate.selected) ?? layer[0]];
    }
    const previous = path[layerIndex - 1];
    const distance = (candidate: GlobalLinkedCandidate) => candidate.midis.reduce(
      (sum, midi, voiceIndex) => sum + Math.abs(midi - previous.midis[voiceIndex]),
      0
    );
    const viableCandidates = layer.filter((candidate) => candidate.midis.every((midi, voiceIndex) => (
      Math.abs(midi - previous.midis[voiceIndex]) <= MAX_LINK_VOICE_JUMP
    )));
    const sameGroupCandidates = viableCandidates.filter((candidate) => (
      candidate.lower === previous.lower && candidate.upper === previous.upper
    ));
    const nearest = (sameGroupCandidates.length > 0 ? sameGroupCandidates : viableCandidates)
      .sort((a, b) => {
        return distance(a) - distance(b);
      })[0];
    const closestCandidate = nearest ?? [...layer].sort((a, b) => distance(a) - distance(b))[0];
    return [...path, closestCandidate];
  }, []) : null);
  if (!selected) {
    const independentFallback = linkedChordSequence.map((linkedStep, index) => {
      if (!linkedStep.chord || linkedStep.targetInversion === null) return null;
      const inversion = index === 0
        ? requestedInitialInversion
        : Math.min(inversionCount, Math.max(1, linkedStep.targetInversion));
      const candidateVoicing: ChordVoicing = voicingType === 'closed'
        ? inversion === 1 ? 'closed' : `closed-${inversion}` as ChordVoicing
        : `${voicingType}-${inversion}` as ChordVoicing;
      for (const context of contexts) {
        const result = getArpeggioPositions(
          toVoicing(linkedStep.chord, candidateVoicing),
          context.lower,
          context.upper,
          voicingType === 'drop3' ? getDrop3StringSet(context.lower === 6 ? 0 : 1) : undefined,
          0,
          -Infinity,
          false,
          false,
          undefined,
          true,
          true,
          [],
          false,
          true,
          MAX_FRETBOARD_FRET
        );
        if (result) {
          return {
            id: `independent-linked-${index}`,
            label: linkedStep.chord.romanLabel ?? linkedStep.token.input,
            inversion,
            noteNames: result.noteNames,
            positionKeys: result.positions.map((position) => `${position.string}-${position.fret}`),
            positions: result.positions,
            stringGroup: `${context.lower}-${context.upper}`,
            pitches: linkedStep.chord.tones.map((tone) => tone.pitch),
          };
        }
      }
      return null;
    }).filter((step): step is ProgressionStep => step !== null);
    if (independentFallback.length === linkedChordSequence.length) return independentFallback;
    return null;
  }
  return selected.map((candidate, index) => {
    const noteNames = candidate.positions.map((position) => fretToNoteName(position.string - 1, position.fret));
    return {
      id: `global-linked-${index}`,
      label: linkedChordSequence[index].chord?.romanLabel ?? linkedChordSequence[index].token.input,
      inversion: candidate.inversion,
      noteNames,
      positionKeys: candidate.positions.map((position) => `${position.string}-${position.fret}`),
      positions: candidate.positions,
      stringGroup: `${candidate.lower}-${candidate.upper}`,
      pitches: linkedChordSequence[index].chord?.tones.map((tone) => tone.pitch) ?? [],
    };
  });
}

function App(): JSX.Element {
  const appShellRef = useRef<HTMLElement>(null);
  const { unlock, playNote, playChord, playPreviewChord, stopAll, isMuted, toggleMuted } = useAudioEngine();
  const { language, t } = useLanguage();
  const initialExtendedChords = persistedAppSettings.extendedChords ?? false;
  const initialSequenceMode = persistedAppSettings.sequenceMode === 'linked'
    && persistedAppSettings.chordSequence?.trim()
    ? 'linked'
    : 'diatonic';
  const startsTetradSequence = initialExtendedChords && persistedAppSettings.voicingType === 'closed';
  const [key, setKey] = useState<KeyName>(persistedAppSettings.key ?? 'C');
  const [useEnharmonicTonicName, setUseEnharmonicTonicName] = useState(persistedAppSettings.useEnharmonicTonicName ?? false);
  const [modeBaseKey, setModeBaseKey] = useState<KeyName>(persistedAppSettings.modeBaseKey ?? 'C');
  const [scaleId, setScaleId] = useState(persistedAppSettings.scaleId ?? 'ionian');
  const [degree, setDegree] = useState(persistedAppSettings.degree ?? 1);
  const [modeDegree, setModeDegree] = useState(persistedAppSettings.modeDegree ?? 1);
  const [modeFamily, setModeFamily] = useState<ModeFamily>(persistedAppSettings.modeFamily ?? 'major');
  const [extendedChords, setExtendedChords] = useState(initialExtendedChords);
  const [voicing, setVoicing] = useState<ChordVoicing>(
    startsTetradSequence
      ? 'drop2-1'
      : persistedAppSettings.voicing ?? 'closed'
  );
  const [voicingType, setVoicingType] = useState<ChordVoicingType>(
    startsTetradSequence
      ? 'drop2'
      : persistedAppSettings.voicingType ?? 'closed'
  );
  const [drop3StringGroup, setDrop3StringGroup] = useState<0 | 1>(persistedAppSettings.drop3StringGroup ?? 0);
  const [degreeLabelMode, setDegreeLabelMode] = useState<DegreeLabelMode>(persistedAppSettings.degreeLabelMode ?? 'roman');
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [linkedStepOverride, setLinkedStepOverride] = useState<{ index: number; step: ProgressionStep } | null>(null);
  const [lastChordLowStringMidi, setLastChordLowStringMidi] = useState<number | null>(null);
  const [lastChordPositionKeys, setLastChordPositionKeys] = useState<string[] | null>(null);
  const [lastChordVoiceMidis, setLastChordVoiceMidis] = useState<number[] | null>(null);
  const lastPlayedProgressionStepRef = useRef<ProgressionStep | null>(null);
  const chordHighlightTimerRef = useRef<number | null>(null);
  const [playingChordLabel, setPlayingChordLabel] = useState<string | null>(null);
  const [keepLastPlayed, setKeepLastPlayed] = useState(persistedAppSettings.keepLastPlayed ?? true);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [linkedSequenceOctaveOffset, setLinkedSequenceOctaveOffset] = useState(
    persistedAppSettings.linkedSequenceOctaveOffset ?? 0
  );
  const [sequenceDirection, setSequenceDirection] = useState<SequenceDirection>(persistedAppSettings.sequenceDirection ?? 'ascending');
  const [bpm, setBpm] = useState(persistedAppSettings.bpm ?? 90);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(persistedAppSettings.playbackMode ?? 'chord');
  const [chordSequence, setChordSequence] = useState(persistedAppSettings.chordSequence ?? '');
  const [sequenceMode, setSequenceMode] = useState<'diatonic' | 'linked'>(initialSequenceMode);

  useEffect(() => {
    const shell = appShellRef.current;
    if (!shell) return;

    let updateScheduled = false;
    let isUpdating = false;
    const fitAppToViewport = () => {
      if (isUpdating) return;
      isUpdating = true;
      shell.style.zoom = '1';
      const naturalWidth = shell.scrollWidth;
      const naturalHeight = shell.scrollHeight;
      const scale = Math.min(
        1,
        (window.innerWidth - 4) / Math.max(naturalWidth, 1),
        (window.innerHeight - 4) / Math.max(naturalHeight, 1)
      );
      shell.style.zoom = String(Math.max(scale, 0.2));
      isUpdating = false;
      updateScheduled = false;
    };
    const scheduleFit = () => {
      if (updateScheduled) return;
      updateScheduled = true;
      window.requestAnimationFrame(fitAppToViewport);
    };

    scheduleFit();
    window.addEventListener('resize', scheduleFit);
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(shell);

    return () => {
      window.removeEventListener('resize', scheduleFit);
      observer.disconnect();
      shell.style.zoom = '1';
    };
  }, []);

  const signatureNotation = getKeySignatureNotation(modeBaseKey, modeFamily);
  const signatureLabel = getKeySignatureLabel(modeBaseKey, modeFamily);
  const effectiveNotation = signatureNotation;
  const [lowerString, setLowerString] = useState(persistedAppSettings.lowerString ?? 6);
  const [upperString, setUpperString] = useState(persistedAppSettings.upperString ?? 4);

  useEffect(() => {
    const settings: PersistedAppSettings = {
      key,
      useEnharmonicTonicName,
      modeBaseKey,
      scaleId,
      degree,
      modeDegree,
      modeFamily,
      extendedChords,
      voicing,
      voicingType,
      drop3StringGroup,
      degreeLabelMode,
      keepLastPlayed,
      sequenceDirection,
      bpm,
      playbackMode,
      lowerString,
      upperString,
      chordSequence,
      sequenceMode,
      linkedSequenceOctaveOffset,
    };
    try {
      window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Continue normally if browser storage is unavailable.
    }
  }, [
    degree, degreeLabelMode, drop3StringGroup, extendedChords, key, keepLastPlayed,
    lowerString, modeBaseKey, modeDegree, modeFamily, scaleId, sequenceDirection,
    upperString, useEnharmonicTonicName, voicing, voicingType, bpm, playbackMode, chordSequence, sequenceMode,
    linkedSequenceOctaveOffset,
  ]);

  const scale = useMemo(() => resolveScale(scaleId, key), [scaleId, key]);
  const modeBaseScale = useMemo(
    () => resolveScale(MODE_FAMILY_BASE_IDS[modeFamily], modeBaseKey),
    [modeBaseKey, modeFamily]
  );
  const tonicName = getDisplayedTonicName(key, useEnharmonicTonicName);
  const modeTitle = `${tonicName} ${localizeTheoryName(getScaleById(scaleId)?.name ?? scale.scaleName, language)}`;
  const modeFamilyIds = MODE_FAMILY_IDS[modeFamily];
  const modeDescriptions = useMemo(() => {
    return Object.fromEntries(
      modeFamilyIds.map((modeId, index) => {
        const modeRoot = modeBaseScale.notes[index];
        const modeName = localizeTheoryName(getScaleById(modeId)?.name ?? modeId, language);
        const modeTonicName = getDisplayedTonicName(getPreferredKeyName(modeRoot, modeFamily), useEnharmonicTonicName);
        return [index + 1, `${modeTonicName} ${modeName}`];
      })
    );
  }, [language, modeBaseScale, modeFamilyIds, modeFamily, useEnharmonicTonicName]);
  const supportsChordFunctions = true;
  const chords = useMemo(
    () => getAllDiatonicChords(
      scale,
      scale.category === 'pentatonic' ? false : extendedChords,
      effectiveNotation,
      'roman'
    ),
    [scale, extendedChords, effectiveNotation]
  );
  const analyzedChordSequence = useMemo(
    () => analyzeChordSequence(chordSequence, chords),
    [chordSequence, chords]
  );
  const hasMixedChordTypes = useMemo(() => {
    const types = new Set(
      analyzedChordSequence
        .filter((token) => token.chordSize)
        .map((token) => token.chordSize)
    );
    return types.has('triad') && types.has('tetrad');
  }, [analyzedChordSequence]);
  const handleChordSequenceChange = useCallback((value: string) => {
    setChordSequence(value);
    setLinkedSequenceOctaveOffset(0);
    const tokens = analyzeChordSequence(value, chords);
    if (!value.trim()) {
      setSequenceMode('diatonic');
      return;
    }
    if (tokens.some((token) => token.status === 'invalid')) return;

    const chordTypes = new Set(
      tokens.filter((token) => token.quality !== null).map((token) => isExtendedChordQuality(token.quality))
    );
    if (chordTypes.size === 1) {
      const nextExtendedChords = chordTypes.has(true);
      if (nextExtendedChords !== extendedChords) {
        setExtendedChords(nextExtendedChords);
        setLastChordLowStringMidi(null);
        setLowerString(6);
        setUpperString(nextExtendedChords ? 3 : 4);
        if (!nextExtendedChords && voicing !== 'closed') {
          setVoicing('closed');
          setVoicingType('closed');
        }
      }
    }

    const candidatePitches = Array.from({ length: 12 }, (_, pitch) => pitch as PitchClass)
      .filter((pitch) => {
        const candidateKey = getPreferredKeyName(pitch, modeFamily);
        const candidateScale = resolveScale(scaleId, candidateKey);
        const candidateChords = getAllDiatonicChords(
          candidateScale,
          candidateScale.category === 'pentatonic' ? false : extendedChords,
          effectiveNotation,
          'roman'
        );
        return tokens.every((token) => parseChordToken(token.input, candidateChords).status === 'diatonic');
      });

    if (candidatePitches.length !== 1 || candidatePitches[0] === KEY_TO_PITCH[key]) return;
    const inferredKey = getPreferredKeyName(candidatePitches[0], modeFamily);
    setKey(inferredKey);
    setModeBaseKey(inferredKey);
    setDegree(1);
    setModeDegree(1);
  }, [chords, effectiveNotation, extendedChords, key, modeFamily, scaleId, voicing]);
  const linkedChordSequence = useMemo(
    () => linkChordSequence(analyzedChordSequence, voicing, extendedChords),
    [analyzedChordSequence, extendedChords, voicing]
  );
  const selectedChord = chords.find((chord) => chord.degree === degree) ?? chords[0];
  const degreePentatonic = getMajorDegreePentatonic(scale, selectedChord?.degree ?? degree);
  const chordToneSet = useMemo(
    () => selectedChord ? getChordToneSet(selectedChord) : new Set<PitchClass>(),
    [selectedChord]
  );
  const scaleToneSet = useMemo(() => getScaleToneSet(scale), [scale]);
  const activeStringSet = voicingType === 'drop3'
    ? getDrop3StringSet(drop3StringGroup)
    : undefined;
  const chordInfo = chords.map((chord) => ({
    degree: chord.degree,
    romanNumeral: chord.romanLabel,
    nashvilleNumber: `${chord.degree}`,
    chordIntervals: getChordIntervalLabels(chord),
    rootPitch: chord.rootPitch,
    quality: chord.quality,
    chordTones: chord.tones.map((tone) => tone.pitch),
    isExtended: chord.isExtended,
  }));
  const progressionSteps = useMemo(() => {
    const steps: ProgressionStep[] = [];
    let previousLowStringMidi = -Infinity;
    let previousVoiceMidis: number[] = [];
    const voicingChords = chords.map((chord) => toVoicing(chord, voicing));
    const orderedChords = sequenceDirection === 'descending' ? [...voicingChords].reverse() : voicingChords;
    const inversionSearchAscending = true;
    const passOrder = [0];

    for (const minimumFret of passOrder) {
      previousLowStringMidi = -Infinity;
      previousVoiceMidis = [];
      for (let chordIndex = 0; chordIndex < orderedChords.length; chordIndex += 1) {
        const chord = orderedChords[chordIndex];
        const result = getArpeggioPositions(
          chord,
          lowerString,
          upperString,
          activeStringSet,
          minimumFret,
          previousLowStringMidi,
          false,
          false,
          voicingType === 'closed' ? MAX_VOICING_FRET_SPAN : undefined,
          inversionSearchAscending,
          chordIndex === 0,
          previousVoiceMidis,
          false,
          false,
          MAX_FRETBOARD_FRET
        );
        if (!result) {
          continue;
        }

        const currentVoiceMidis = result.noteNames.map((note) => Tone.Frequency(note).toMidi());
        const previousStep = steps.at(-1);
        if (previousStep && previousStep.positions.length === result.positions.length) {
          const repairedPreviousPositions = previousStep.positions.map((position, voiceIndex) => {
            const currentMidi = currentVoiceMidis[voiceIndex];
            const previousMidi = previousVoiceMidis[voiceIndex];
            if (!Number.isFinite(currentMidi) || !Number.isFinite(previousMidi)
              || Math.abs(currentMidi - previousMidi) < 10) return position;

            const alternatives = [position.fret - 12, position.fret + 12]
              .filter((fret) => fret >= 0 && fret <= MAX_FRETBOARD_FRET)
              .map((fret) => ({
                string: position.string,
                fret,
                midi: Tone.Frequency(fretToNoteName(position.string - 1, fret)).toMidi(),
              }))
              .filter((alternative) => {
                const frets = previousStep.positions.map((candidate, index) => (
                  index === voiceIndex ? alternative.fret : candidate.fret
                ));
                return Math.max(...frets) - Math.min(...frets) <= MAX_VOICING_FRET_SPAN;
              })
              .sort((a, b) => Math.abs(currentMidi - a.midi) - Math.abs(currentMidi - b.midi));

            return alternatives[0] && Math.abs(currentMidi - alternatives[0].midi) < Math.abs(currentMidi - previousMidi)
              ? { string: position.string, fret: alternatives[0].fret }
              : position;
          });
          previousStep.positions = repairedPreviousPositions;
          previousStep.positionKeys = repairedPreviousPositions.map((position) => `${position.string}-${position.fret}`);
          previousStep.noteNames = repairedPreviousPositions.map((position) => fretToNoteName(position.string - 1, position.fret));
          previousVoiceMidis = repairedPreviousPositions.map((position) => Tone.Frequency(
            fretToNoteName(position.string - 1, position.fret)
          ).toMidi());
        }

        previousLowStringMidi = result.lowStringMidi;
        previousVoiceMidis = currentVoiceMidis;
        steps.push({
          id: `${minimumFret}-${chordIndex}-${chord.degree}-${chord.symbol}`,
          label: chord.romanLabel,
          noteNames: result.noteNames,
          positionKeys: result.positions.map((position) => `${position.string}-${position.fret}`),
          positions: result.positions.map((position) => ({ string: position.string, fret: position.fret })),
          pitches: chord.tones.map((tone) => tone.pitch),
        });
      }
    }

    return steps;
  }, [activeStringSet, chords, lowerString, sequenceDirection, upperString, voicing, voicingType]);
  const globallyLinkedProgressionSteps = useMemo(
    () => findGlobalLinkedPath(
      linkedChordSequence,
      extendedChords,
      voicingType,
      voicing,
      lowerString,
      upperString,
      drop3StringGroup
    ),
    [drop3StringGroup, extendedChords, linkedChordSequence, lowerString, upperString, voicing, voicingType]
  );
  useEffect(() => {
    if (sequenceMode !== 'linked' || isSequencePlaying || !globallyLinkedProgressionSteps?.[0]) return;
    const [firstLower, firstUpper] = globallyLinkedProgressionSteps[0].stringGroup.split('-').map(Number);
    if (!Number.isFinite(firstLower) || !Number.isFinite(firstUpper)) return;

    if (voicingType === 'drop3') {
      const nextGroup = firstLower === 6 && firstUpper === 2 ? 0 : firstLower === 5 && firstUpper === 1 ? 1 : null;
      if (nextGroup !== null && nextGroup !== drop3StringGroup) {
        setDrop3StringGroup(nextGroup);
        setLinkedSequenceOctaveOffset(0);
        setLastChordPositionKeys(null);
        setActiveStepIndex(0);
      }
      return;
    }

    if (firstLower !== lowerString || firstUpper !== upperString) {
      setLowerString(firstLower);
      setUpperString(firstUpper);
      setLinkedSequenceOctaveOffset(0);
      setLastChordPositionKeys(null);
      setActiveStepIndex(0);
    }
  }, [drop3StringGroup, globallyLinkedProgressionSteps, isSequencePlaying, lowerString, sequenceMode, upperString, voicingType]);
  const octavedGlobalLinkedProgressionSteps = useMemo(() => {
    if (!globallyLinkedProgressionSteps) return null;
    const offset = linkedSequenceOctaveOffset * 12;
    const shifted = globallyLinkedProgressionSteps.map((step, stepIndex) => {
      const octaveChord = linkedChordSequence[stepIndex]?.chord;
      const positions = step.positions.map((position) => {
        const shiftedFret = position.fret + offset;
        if (shiftedFret >= 0 && shiftedFret <= MAX_FRETBOARD_FRET) {
          return { ...position, fret: shiftedFret };
        }
        return null;
      });
      if (positions.some((position) => position === null)) {
        return { ...step };
      }
      const resolvedPositions = positions as FretboardPosition[];
      const resolvedMidis = resolvedPositions.map((position) => Tone.Frequency(
        fretToNoteName(position.string - 1, position.fret)
      ).toMidi());
      const distinctStrings = new Set(resolvedPositions.map((position) => position.string)).size
        === resolvedPositions.length;
      const resolvedStringSet = new Set(resolvedPositions.map((position) => position.string));
      const validDrop2Group = voicingType === 'drop2'
        ? [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1]].some((group) => (
          group.length === resolvedStringSet.size && group.every((string) => resolvedStringSet.has(string))
        ))
        : true;
      const ascendingVoices = resolvedMidis.every((midi, index) => index === 0 || midi > resolvedMidis[index - 1]);
      if (!distinctStrings || !validDrop2Group || !ascendingVoices) return { ...step };
      return {
        ...step,
        inversion: getPhysicalInversion(octaveChord, resolvedPositions),
        positions: resolvedPositions,
        noteNames: resolvedPositions.map((position) => fretToNoteName(position.string - 1, position.fret)),
        positionKeys: resolvedPositions.map((position) => `${position.string}-${position.fret}`),
      };
    });
    return shifted.map((step) => ({
      ...step,
      stringGroup: `${Math.max(...step.positions.map((position) => position.string))}-${Math.min(...step.positions.map((position) => position.string))}`,
    }));
  }, [globallyLinkedProgressionSteps, linkedSequenceOctaveOffset]);
  const activeProgressionSteps = useMemo(() => {
    return sequenceMode === 'linked'
      ? octavedGlobalLinkedProgressionSteps ?? globallyLinkedProgressionSteps ?? []
      : progressionSteps;
  }, [globallyLinkedProgressionSteps, octavedGlobalLinkedProgressionSteps, progressionSteps, sequenceMode]);
  const visibleProgressionSteps = useMemo(() => {
    if (!linkedStepOverride || sequenceMode !== 'linked') return activeProgressionSteps;
    return activeProgressionSteps.map((step, index) => (
      index === linkedStepOverride.index ? linkedStepOverride.step : step
    ));
  }, [activeProgressionSteps, linkedStepOverride, sequenceMode]);
  const playbackProgressionSteps = useMemo(() => (
    (isSequencePlaying ? activeProgressionSteps : visibleProgressionSteps).map((step) => ({
      ...step,
      noteNames: step.positions.map((position) => fretToNoteName(position.string - 1, position.fret)),
    }))
  ), [activeProgressionSteps, isSequencePlaying, visibleProgressionSteps]);
  const activePlaybackStep = activeStepIndex === null
    ? sequenceMode === 'linked' ? visibleProgressionSteps[0] ?? null : null
    : visibleProgressionSteps[activeStepIndex] ?? null;
  const activePlaybackStepIndex = activeStepIndex ?? (sequenceMode === 'linked' ? 0 : -1);
  const activeDiatonicChord = useMemo(() => {
    if (sequenceMode !== 'diatonic' || !activePlaybackStep) return selectedChord;
    return chords.find((chord) => chord.romanLabel === activePlaybackStep.label) ?? selectedChord;
  }, [activePlaybackStep, chords, selectedChord, sequenceMode]);
  const displayedDegree = sequenceMode === 'diatonic' && (isSequencePlaying || activeStepIndex !== null) && activeDiatonicChord
    ? activeDiatonicChord.degree
    : degree;
  const isDiatonicPlaybackActive = sequenceMode === 'diatonic' && activePlaybackStep !== null;
  const activePlaybackChordToneSet = useMemo(() => (
    sequenceMode === 'linked' && activePlaybackStep
      ? new Set(activePlaybackStep.positions.map((position) => position.pitch))
      : activeDiatonicChord ? getChordToneSet(activeDiatonicChord) : chordToneSet
  ), [activeDiatonicChord, activePlaybackStep, chordToneSet, sequenceMode]);
  const activePlaybackLinkedChord = sequenceMode === 'linked'
    ? linkedChordSequence[activePlaybackStepIndex]?.chord
    : undefined;
  const activePlaybackChordRootPitch = activePlaybackLinkedChord?.rootPitch;
  const activePlaybackIsNonDiatonic = sequenceMode === 'linked'
    && activePlaybackStepIndex >= 0
    && linkedChordSequence[activePlaybackStepIndex]?.token.status !== 'diatonic';
  const activePlaybackVoicing = activePlaybackStep?.inversion
    ? voicingType === 'closed'
      ? activePlaybackStep.inversion === 1 ? 'closed' : `closed-${activePlaybackStep.inversion}` as ChordVoicing
      : `${voicingType}-${activePlaybackStep.inversion}` as ChordVoicing
    : undefined;
  const canExportSequence = sequenceMode === 'diatonic' || (!hasMixedChordTypes && octavedGlobalLinkedProgressionSteps !== null);
  const linkedSequenceUnavailable = sequenceMode === 'linked'
    && chordSequence.trim().length > 0
    && globallyLinkedProgressionSteps === null;
  const sequenceDiagramSteps = useMemo<FretboardDiagramStep[]>(() => {
    if (activeProgressionSteps.length === 0) return [];
    return activeProgressionSteps.map((step, index) => {
      const linkedChord = sequenceMode === 'linked' ? linkedChordSequence[index]?.chord : null;
      const chord = linkedChord ?? chords.find((candidate) => candidate.romanLabel === step.label);
      const frets = step.positions.map((position) => position.fret);
      const zoneStartFret = Math.min(...frets);
      const zoneEndFret = Math.max(...frets) + 1;
      return {
      label: step.label ?? step.id,
      chordName: chord ? getDisplayedChordSymbol(chord, useEnharmonicTonicName) : undefined,
      inversion: step.inversion,
      delta: linkedChordSequence[index]?.delta ?? null,
      positions: step.positions,
      pitches: step.pitches,
      rootPitch: chord?.rootPitch,
      zoneStartFret,
      zoneEndFret,
      };
    });
  }, [activeProgressionSteps, chords, linkedChordSequence, sequenceMode, useEnharmonicTonicName]);
  const currentVoicingPositionKeys = useMemo(() => {
    if (!selectedChord) return [];
    const result = getArpeggioPositions(
      toVoicing(selectedChord, voicing),
      lowerString,
      upperString,
      voicingType === 'drop3' ? getDrop3StringSet(drop3StringGroup) : undefined,
      0,
      -Infinity,
      false,
      false,
      MAX_VOICING_FRET_SPAN,
      true,
      voicing.startsWith('drop3'),
      []
    );
    return result ? result.positions.map((position) => `${position.string}-${position.fret}`) : [];
  }, [drop3StringGroup, lowerString, selectedChord, upperString, voicing, voicingType]);
  const displayedVoicing = useMemo<ChordVoicing>(() => {
    const displayedChord = sequenceMode === 'linked'
      ? linkedChordSequence[activePlaybackStepIndex]?.chord ?? selectedChord
      : activeDiatonicChord ?? selectedChord;
    const displayedPositionKeys = lastChordPositionKeys
      ?? (activeStepIndex !== null
        ? visibleProgressionSteps[activeStepIndex]?.positionKeys
        : sequenceMode === 'linked'
          ? visibleProgressionSteps[0]?.positionKeys
          : currentVoicingPositionKeys);
    if (!displayedChord || !displayedPositionKeys || displayedPositionKeys.length === 0) return voicing;
    const positions = displayedPositionKeys.map((key) => {
      const [string, fret] = key.split('-').map(Number);
      const stringNumber = string as StringNumber;
      return {
        string: stringNumber,
        fret,
        pitch: getPitchAtPosition(stringNumber, fret, STANDARD_TUNING),
      };
    });
    const physicalInversion = getPhysicalInversion(displayedChord, positions);
    return voicingType === 'closed'
      ? physicalInversion === 1 ? 'closed' : `closed-${physicalInversion}` as ChordVoicing
      : `${voicingType}-${physicalInversion}` as ChordVoicing;
  }, [activeDiatonicChord, activePlaybackStepIndex, activeStepIndex, currentVoicingPositionKeys, lastChordPositionKeys, linkedChordSequence, selectedChord, sequenceMode, visibleProgressionSteps, voicing, voicingType]);
  const highlightedPositions = useMemo(() => {
    if (sequenceMode === 'linked' && activeStepIndex === null && !isSequencePlaying && lastChordPositionKeys) {
      return new Set(lastChordPositionKeys);
    }
    const activeStep = activeStepIndex === null
      ? sequenceMode === 'linked' ? visibleProgressionSteps[0] ?? null : null
      : visibleProgressionSteps[activeStepIndex];
    if (!activeStep) {
      return new Set(lastChordPositionKeys ?? currentVoicingPositionKeys);
    }

    const activePositionKeys = activeNoteIndex === null
      ? activeStep.positionKeys
      : [activeStep.positionKeys[activeNoteIndex]].filter(Boolean);

    return new Set(
      activePositionKeys
    );
  }, [activeNoteIndex, activeStepIndex, currentVoicingPositionKeys, isSequencePlaying, lastChordPositionKeys, sequenceMode, visibleProgressionSteps]);
  const playingTabPositions = useMemo(() => {
    if (lastChordPositionKeys && activeStepIndex === null) {
      return lastChordPositionKeys.map((key) => {
        const [string, fret] = key.split('-').map(Number);
        return { string, fret };
      });
    }

    const activeStep = activeStepIndex === null
      ? sequenceMode === 'linked' ? visibleProgressionSteps[0] ?? null : null
      : visibleProgressionSteps[activeStepIndex];
    if (activeStep) return activeStep.positions;
    if (currentVoicingPositionKeys.length === 0) return [];
    return currentVoicingPositionKeys.map((key) => {
      const [string, fret] = key.split('-').map(Number);
      return { string, fret };
    });
  }, [activeStepIndex, currentVoicingPositionKeys, lastChordPositionKeys, sequenceMode, visibleProgressionSteps]);

  const scheduleChordHighlightClear = useCallback(() => {
    if (chordHighlightTimerRef.current !== null) {
      window.clearTimeout(chordHighlightTimerRef.current);
    }
    chordHighlightTimerRef.current = window.setTimeout(() => {
      if (keepLastPlayed) return;
      setLastChordPositionKeys([]);
      setPlayingChordLabel(null);
      chordHighlightTimerRef.current = null;
    }, 1500);
  }, [keepLastPlayed]);

  const handleVoicingChange = useCallback((
    nextVoicing: ChordVoicing,
    stringSetOverride?: number[],
    playSound = true,
    preserveSequence = false,
    previousLowMidi = -Infinity,
    searchAscending = true,
    previousVoices: number[] = []
  ) => {
    if (isSequencePlaying && !preserveSequence) return;
    const previewChord = sequenceMode === 'linked'
      ? linkedChordSequence[activeStepIndex ?? 0]?.chord ?? selectedChord
      : selectedChord;
    setVoicing(nextVoicing);
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setLastChordVoiceMidis(null);
    setPlayingChordLabel(null);
    if (sequenceMode === 'linked' && !preserveSequence) {
      setActiveStepIndex((currentIndex) => currentIndex ?? 0);
      setActiveNoteIndex(null);
    }
    if (!preserveSequence) {
      if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
        setActiveStepIndex((currentIndex) => currentIndex ?? 0);
        setActiveNoteIndex(null);
      } else {
        setActiveStepIndex(null);
        setActiveNoteIndex(null);
      }
    }

    if (previewChord) {
      const nextStringSet = stringSetOverride
        ?? (nextVoicing.startsWith('drop3') ? getDrop3StringSet(drop3StringGroup) : undefined);
      const result = getArpeggioPositions(
        toVoicing(previewChord, nextVoicing),
        lowerString,
        upperString,
        nextStringSet,
        0,
        previousLowMidi,
        false,
        false,
        MAX_VOICING_FRET_SPAN,
        searchAscending,
        nextVoicing.startsWith('drop3'),
        previousVoices
      );

      if (result) {
        if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
          const selectedIndex = activeStepIndex ?? 0;
          const selectedStep = activeProgressionSteps[selectedIndex];
          if (selectedStep) {
            setLinkedStepOverride({
              index: selectedIndex,
              step: {
                ...selectedStep,
                inversion: nextVoicing === 'closed' ? 1 : Number(nextVoicing.at(-1)),
                positions: result.positions,
                noteNames: result.noteNames,
                positionKeys: result.positions.map((position) => `${position.string}-${position.fret}`),
                stringGroup: `${Math.max(...result.positions.map((position) => position.string))}-${Math.min(...result.positions.map((position) => position.string))}`,
              },
            });
          }
          setLastChordPositionKeys(null);
          setLastChordVoiceMidis(null);
          setLastChordLowStringMidi(null);
        } else {
          setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
          setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
          setPlayingChordLabel(getDisplayedChordSymbol(previewChord, useEnharmonicTonicName));
        }
        if (playSound) playPreviewChord(result.noteNames);
        scheduleChordHighlightClear();
      }
    }
  }, [activeProgressionSteps.length, activeStepIndex, drop3StringGroup, isSequencePlaying, linkedChordSequence, lowerString, playPreviewChord, scheduleChordHighlightClear, selectedChord, sequenceMode, upperString, useEnharmonicTonicName]);

  const handleInversionStep = (direction: 1 | -1) => {
    if (isSequencePlaying) return;
    stopAll();
    const previewChord = sequenceMode === 'linked'
      ? linkedChordSequence[activeStepIndex ?? 0]?.chord ?? selectedChord
      : selectedChord;
    const currentPosition = voicing === 'closed' ? 1 : Number(voicing.at(-1));
    const inversionCount = extendedChords ? 4 : 3;
    const wrapsForward = direction > 0 && currentPosition === inversionCount;
    const wrapsBackward = direction < 0 && currentPosition === 1;
    let nextPosition = currentPosition + direction;
    if (nextPosition > inversionCount) nextPosition = 1;
    if (nextPosition < 1) nextPosition = inversionCount;

    const currentResult = previewChord
      ? getArpeggioPositions(
        toVoicing(previewChord, voicing),
        lowerString,
        upperString,
        activeStringSet,
        0,
        -Infinity,
        false,
        false,
        MAX_VOICING_FRET_SPAN,
        direction > 0,
        voicing.startsWith('drop3')
      )
      : null;
    const previousLowMidi = wrapsForward || wrapsBackward
      ? -Infinity
      : lastChordLowStringMidi ?? currentResult?.lowStringMidi ?? -Infinity;
    const previousVoices = wrapsForward || wrapsBackward
      ? []
      : lastChordVoiceMidis
        ?? currentResult?.noteNames.map((note) => Tone.Frequency(note).toMidi())
        ?? [];
    const useLinkedExplicitVoicingSearch = sequenceMode === 'linked';
    const nextSearchLowMidi = useLinkedExplicitVoicingSearch || wrapsForward || wrapsBackward
      ? -Infinity
      : previousLowMidi;
    const visibleStepForInversion = sequenceMode === 'linked'
      ? visibleProgressionSteps[activeStepIndex ?? 0]
      : null;
    const visibleStepVoices = visibleStepForInversion?.positions.map((position) => Tone.Frequency(
      fretToNoteName(position.string - 1, position.fret)
    ).toMidi()) ?? [];
    const nextSearchVoices = wrapsForward || wrapsBackward
      ? []
      : useLinkedExplicitVoicingSearch
        ? visibleStepVoices
        : previousVoices;

    if (voicingType === 'drop3') {
      handleVoicingChange(
        `${voicingType}-${nextPosition}` as ChordVoicing,
        getDrop3StringSet(drop3StringGroup),
        !isSequencePlaying,
        isSequencePlaying,
        nextSearchLowMidi,
        direction > 0,
        nextSearchVoices
      );
      return;
    }

    const size = extendedChords ? 4 : 3;
    handleVoicingChange(
      `${voicingType}-${nextPosition}` as ChordVoicing,
      Array.from({ length: size }, (_, index) => lowerString - index),
      !isSequencePlaying,
      isSequencePlaying,
      nextSearchLowMidi,
      direction > 0,
      nextSearchVoices
    );
  };

  const handleChordSelect = (nextDegree: number) => {
    const nextChord = chords.find((chord) => chord.degree === nextDegree);
    const ascending = nextDegree >= degree;
    setDegree(nextDegree);
    setActiveStepIndex(null);
    setActiveNoteIndex(null);

    if (nextChord) {
      const previousResult = selectedChord
        ? getArpeggioPositions(
          toVoicing(selectedChord, voicing),
          lowerString,
          upperString,
          activeStringSet,
          0,
          -Infinity,
          false,
          false,
          MAX_VOICING_FRET_SPAN,
          true,
          voicing.startsWith('drop3')
        )
        : null;
      const result = getArpeggioPositions(
        toVoicing(nextChord, voicing),
        lowerString,
        upperString,
        activeStringSet,
        0,
        lastChordLowStringMidi ?? previousResult?.lowStringMidi ?? -Infinity,
        false,
        false,
          MAX_VOICING_FRET_SPAN,
        ascending,
        voicing.startsWith('drop3'),
        lastChordVoiceMidis
          ?? previousResult?.noteNames.map((note) => Tone.Frequency(note).toMidi())
          ?? []
      ) ?? getArpeggioPositions(
        toVoicing(nextChord, voicing),
        lowerString,
        upperString,
        activeStringSet,
        0,
        -Infinity,
        false,
        false,
        MAX_VOICING_FRET_SPAN,
        true,
        voicing.startsWith('drop3'),
        []
      );
      if (result) {
        setLastChordLowStringMidi(result.lowStringMidi);
        setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
        setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
        setPlayingChordLabel(getDisplayedChordSymbol(nextChord, useEnharmonicTonicName));
        playChord(result.noteNames);
        scheduleChordHighlightClear();
      } else {
        setLastChordLowStringMidi(null);
        setLastChordPositionKeys(null);
        setLastChordVoiceMidis(null);
        setPlayingChordLabel(null);
      }
    }
  };

  const handleExtendedChordsChange = (enabled: boolean) => {
    setExtendedChords(enabled);
    setLastChordLowStringMidi(null);
    setLowerString(6);
    setUpperString(enabled ? 3 : 4);
    if (enabled && voicingType === 'closed') {
      setVoicingType('drop2');
      setVoicing('drop2-1');
    }
    if (!enabled && voicing !== 'closed') {
      setVoicing('closed');
      setVoicingType('closed');
    }
  };

  const handleStepChange = useCallback((index: number | null) => {
    setActiveStepIndex(index);
    setLinkedStepOverride(null);
    if (index !== null && activeProgressionSteps[index]) {
      setLastChordPositionKeys(null);
      setLastChordVoiceMidis(null);
      setLastChordLowStringMidi(null);
      const step = activeProgressionSteps[index];
      lastPlayedProgressionStepRef.current = step;
      const linkedChord = sequenceMode === 'linked' ? linkedChordSequence[index]?.chord : null;
      const chord = linkedChord ?? chords.find((candidate) => candidate.romanLabel === step.label);
      if (chord) {
        setPlayingChordLabel(getDisplayedChordSymbol(chord, useEnharmonicTonicName));
      }
    } else {
      const lastPlayedIndex = lastPlayedProgressionStepRef.current
        ? activeProgressionSteps.indexOf(lastPlayedProgressionStepRef.current)
        : -1;
        if (keepLastPlayed && lastPlayedIndex >= 0) {
        setActiveStepIndex(lastPlayedIndex);
          setPlayingChordLabel(lastPlayedProgressionStepRef.current?.label ?? null);
        } else if (!keepLastPlayed) {
          setActiveStepIndex(null);
          setLastChordPositionKeys([]);
          setLastChordVoiceMidis(null);
          setLastChordLowStringMidi(null);
          setPlayingChordLabel(null);
        } else {
          setActiveStepIndex(null);
          setPlayingChordLabel(lastPlayedProgressionStepRef.current?.label ?? null);
      }
    }
    }, [activeProgressionSteps, chords, keepLastPlayed, linkedChordSequence, sequenceMode, useEnharmonicTonicName]);

    const handleSequenceStepPreview = useCallback((index: number) => {
      const step = playbackProgressionSteps[index];
      if (!step || isSequencePlaying) return;
      setActiveNoteIndex(null);
      handleStepChange(index);
      void playPreviewChord(step.noteNames);
    }, [handleStepChange, isSequencePlaying, playbackProgressionSteps, playPreviewChord]);

  const handleSequencePlayingChange = useCallback((isPlaying: boolean) => {
    setIsSequencePlaying(isPlaying);
    if (isPlaying) {
      lastPlayedProgressionStepRef.current = null;
      setLastChordPositionKeys(null);
      setLastChordVoiceMidis(null);
      setPlayingChordLabel(null);
    } else {
      const lastPlayedStep = lastPlayedProgressionStepRef.current
        ?? (activeStepIndex === null ? null : activeProgressionSteps[activeStepIndex]);
        if (lastPlayedStep && keepLastPlayed) {
        setLastChordPositionKeys(lastPlayedStep.positionKeys);
        setLastChordVoiceMidis(lastPlayedStep.noteNames.map((note) => Tone.Frequency(note).toMidi()));
        setLastChordLowStringMidi(lastPlayedStep.noteNames.length > 0
          ? Tone.Frequency(lastPlayedStep.noteNames[0]).toMidi()
          : null);
        setPlayingChordLabel(lastPlayedStep.label ?? null);
        const lastPlayedIndex = activeProgressionSteps.indexOf(lastPlayedStep);
        setActiveStepIndex(lastPlayedIndex >= 0 ? lastPlayedIndex : null);
      } else {
        setActiveStepIndex(null);
          setLastChordPositionKeys([]);
          setLastChordVoiceMidis(null);
          setLastChordLowStringMidi(null);
        setPlayingChordLabel(null);
      }
    }
  }, [activeProgressionSteps, activeStepIndex, keepLastPlayed]);

  const handleDrop3StringGroupChange = useCallback((group: 0 | 1) => {
    setDrop3StringGroup(group);
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setLastChordVoiceMidis(null);
    if (selectedChord) {
      const nextStringSet = getDrop3StringSet(group);
      const result = getArpeggioPositions(
        toVoicing(selectedChord, voicing),
        lowerString,
        upperString,
        nextStringSet,
        0,
        -Infinity,
        false,
        false,
        MAX_VOICING_FRET_SPAN,
        true,
        voicing.startsWith('drop3'),
        []
      );
      if (result) {
        if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
          setLastChordPositionKeys(null);
          setLastChordVoiceMidis(null);
          setActiveNoteIndex(null);
        } else {
          setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
          setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
          setPlayingChordLabel(getDisplayedChordSymbol(selectedChord, useEnharmonicTonicName));
        }
      }
    }
  }, [activeProgressionSteps.length, lowerString, selectedChord, sequenceMode, upperString, useEnharmonicTonicName, voicing]);

  const handleKeepLastPlayedChange = useCallback((keep: boolean) => {
    setKeepLastPlayed(keep);
    if (!keep) {
      setLastChordPositionKeys(null);
      setPlayingChordLabel(null);
    }
  }, []);

  const handleVoicingChangeSilent = useCallback((nextVoicing: ChordVoicing) => {
    stopAll();
    const previewChord = sequenceMode === 'linked'
      ? linkedChordSequence[activeStepIndex ?? 0]?.chord ?? selectedChord
      : selectedChord;
    handleVoicingChange(
      previewChord ? getVoicingForPhysicalInversion(previewChord, nextVoicing) : nextVoicing,
      undefined,
      false,
      false,
      -Infinity,
      true,
      []
    );
  }, [activeStepIndex, handleVoicingChange, isSequencePlaying, linkedChordSequence, selectedChord, sequenceMode, stopAll]);

  const handleNotePlay = useCallback((position: FretboardPosition) => {
    playNote(fretToNoteName(position.string - 1, position.fret));
    setPlayingChordLabel(null);
    setLastChordPositionKeys([`${position.string}-${position.fret}`]);
    scheduleChordHighlightClear();
  }, [playNote, scheduleChordHighlightClear]);

  const handleStringGroupChange = (nextLowerString: number, nextUpperString: number) => {
    if (isSequencePlaying) return;
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setLastChordVoiceMidis(null);
    if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
      setActiveStepIndex(0);
      setActiveNoteIndex(null);
    }
    setLowerString(Math.max(nextLowerString, nextUpperString));
    setUpperString(Math.min(nextUpperString, nextLowerString));

    const previewChord = sequenceMode === 'linked'
      ? linkedChordSequence[activeStepIndex ?? 0]?.chord ?? selectedChord
      : selectedChord;
    if (previewChord) {
      const nextStringSet = voicingType === 'drop3' ? activeStringSet : undefined;
      const result = getArpeggioPositions(
        toVoicing(previewChord, voicing),
        Math.max(nextLowerString, nextUpperString),
        Math.min(nextUpperString, nextLowerString),
        nextStringSet,
        0,
        -Infinity,
        false,
        false,
        MAX_VOICING_FRET_SPAN,
        true,
        voicing.startsWith('drop3'),
        lastChordVoiceMidis ?? []
      );
      if (result) {
        setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
        setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
        setPlayingChordLabel(getDisplayedChordSymbol(previewChord, useEnharmonicTonicName));
        scheduleChordHighlightClear();
      }
    }
  };

  const canShiftOctave = useCallback((direction: 1 | -1) => {
    if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
      const activeStep = activeProgressionSteps[activeStepIndex ?? 0];
      if (!activeStep) return false;
      return activeStep.positions.every((position) => {
        const nextFret = position.fret + direction * 12;
        return nextFret >= 0 && nextFret <= MAX_FRETBOARD_FRET;
      });
    }
    const positionKeys = Array.from(highlightedPositions);
    if (positionKeys.length === 0) return false;
    return positionKeys.every((key) => {
      const [, fretText] = key.split('-');
      const fret = Number(fretText);
      if (!Number.isFinite(fret)) return false;
      const nextFret = fret + direction * 12;
      return nextFret >= 0 && nextFret <= MAX_FRETBOARD_FRET;
    });
  }, [activeProgressionSteps, activeStepIndex, highlightedPositions, sequenceMode]);

  const canOctaveUp = canShiftOctave(1);
  const canOctaveDown = canShiftOctave(-1);

  const canMoveToAdjacentGroup = useCallback((direction: 1 | -1) => {
    if (voicingType === 'drop3') return direction > 0 ? drop3StringGroup === 0 : drop3StringGroup === 1;
    const nextLower = lowerString - direction;
    const nextUpper = upperString - direction;
    return nextLower >= 4 && nextLower <= 6 && nextUpper >= 1 && nextUpper <= 4;
  }, [drop3StringGroup, lowerString, upperString, voicingType]);

  const canUseOctaveControl = (direction: 1 | -1) => (
    canShiftOctave(direction)
  );

  const canStringGroupUp = sequenceMode === 'linked' && activeProgressionSteps.length > 0 && canMoveToAdjacentGroup(1);
  const canStringGroupDown = sequenceMode === 'linked' && activeProgressionSteps.length > 0 && canMoveToAdjacentGroup(-1);

  const handleStringGroupStep = useCallback((direction: 1 | -1) => {
    if (isSequencePlaying) return;
    if (!canMoveToAdjacentGroup(direction)) return;
    if (voicingType === 'drop3') {
      setDrop3StringGroup(direction > 0 ? 1 : 0);
    } else {
      setLowerString((value) => value - direction);
      setUpperString((value) => value - direction);
    }
    setLinkedSequenceOctaveOffset(0);
    setLastChordPositionKeys(null);
    setActiveStepIndex(0);
  }, [activeProgressionSteps, activeStepIndex, canMoveToAdjacentGroup, voicingType]);

  const handleOctaveStep = useCallback((direction: 1 | -1) => {
    if (isSequencePlaying) return;
    if (sequenceMode === 'linked' && activeProgressionSteps.length > 0) {
      const activeStep = activeProgressionSteps[activeStepIndex ?? 0];
      if (activeStep) {
        const shiftedPositions = activeStep.positions.map((position) => ({
          string: position.string,
          fret: position.fret + direction * 12,
        }));
        if (shiftedPositions.some((position) => position.fret < 0 || position.fret > MAX_FRETBOARD_FRET)) {
          return;
        }
      }
      setLastChordPositionKeys(null);
      setLastChordVoiceMidis(null);
      setActiveNoteIndex(null);
      setActiveStepIndex(0);
      setLinkedSequenceOctaveOffset((offset) => offset + direction);
      return;
    }
    const currentPositions = Array.from(highlightedPositions).map((key) => {
      const [string, fret] = key.split('-').map(Number);
      return { string, fret };
    });
    if (currentPositions.length === 0) return;
    const shiftedPositions = currentPositions.map((position) => ({
      string: position.string,
      fret: position.fret + direction * 12,
    }));
    if (shiftedPositions.some((position) => position.fret < 0 || position.fret > MAX_FRETBOARD_FRET)) {
      return;
    }

    const noteNames = shiftedPositions.map((position) => fretToNoteName(position.string - 1, position.fret));
    setLastChordPositionKeys(shiftedPositions.map((position) => `${position.string}-${position.fret}`));
    setLastChordVoiceMidis(noteNames.map((note) => Tone.Frequency(note).toMidi()));
    setLastChordLowStringMidi(Tone.Frequency(noteNames[0]).toMidi());
    scheduleChordHighlightClear();
  }, [activeProgressionSteps, activeStepIndex, canShiftOctave, highlightedPositions, isSequencePlaying, scheduleChordHighlightClear, sequenceMode]);

  const handleDegreeChange = (nextDegree: number) => {
    if (nextDegree < 1 || nextDegree > 7) {
      setDegree(nextDegree);
      return;
    }

    const nextModeIndex = nextDegree - 1;
    const nextRootPitch = modeBaseScale.notes[nextDegree - 1];
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setKey(getPreferredKeyName(nextRootPitch, modeFamily));
    setScaleId(modeFamilyIds[nextModeIndex]);
    setModeDegree(nextDegree);
    setDegree(1);
  };

  const handleScaleChange = (nextScaleId: string) => {
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setScaleId(nextScaleId);
    const nextModeIndex = MAJOR_MODE_IDS.indexOf(nextScaleId as typeof MAJOR_MODE_IDS[number]);
    setModeBaseKey(getPreferredKeyName(KEY_TO_PITCH[key], modeFamily));
    setModeDegree(nextModeIndex === -1 ? 1 : nextModeIndex + 1);
    setDegree(1);
  };

  const handleModeFamilyChange = (nextFamily: ModeFamily) => {
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setModeFamily(nextFamily);
    setKey(modeBaseKey);
    setScaleId(MODE_FAMILY_IDS[nextFamily][0]);
    setModeDegree(1);
    setDegree(1);
  };

  const scaleLegendLabel = scaleId === 'ionian'
    || !MAJOR_MODE_IDS.includes(scaleId as typeof MAJOR_MODE_IDS[number])
    ? 'Escala'
    : 'Modo';

  const pdfDetails = useMemo(() => ({
    ...(sequenceMode === 'linked' ? {} : {
      title: `${modeTitle} - Diapasón`,
      key: tonicName,
      scale: localizeTheoryName(modeBaseScale.scaleName, language),
      mode: localizeTheoryName(getScaleById(scaleId)?.name ?? scale.scaleName, language),
      modeFamily: getModeFamilyLabel(modeFamily),
      modeDegree: String(modeDegree),
    }),
    ...(sequenceMode === 'linked' ? {} : {
      notation: getNotationLabel(signatureLabel),
      enharmonic: useEnharmonicTonicName ? 'Sostenidos' : 'Bemoles',
      degree: String(degree),
      degreeLabelMode: degreeLabelMode === 'roman' ? 'Numerales romanos' : 'Números Nashville',
      chord: selectedChord ? getDisplayedChordSymbol(selectedChord, useEnharmonicTonicName) : undefined,
    }),
    chordType: extendedChords ? 'Tétrada (7)' : 'Tríada',
    inversion: String(voicing === 'closed' ? 1 : voicing.at(-1)),
    voicing: getVoicingLabel(voicingType),
    stringGroup: voicingType === 'drop3'
      ? getDrop3StringSet(drop3StringGroup).join('-')
      : `${lowerString}-${upperString}`,
    fretRange: `0-${MAX_FRETBOARD_FRET}`,
    ...(sequenceMode === 'linked' ? {} : {
      sequenceDirection: getDirectionLabel(sequenceDirection),
    }),
  }), [
    degree, degreeLabelMode, drop3StringGroup, extendedChords, lowerString, modeDegree,
    language, modeBaseScale.scaleName, modeFamily, modeTitle, scale.scaleName, scaleId, selectedChord,
    sequenceDirection, sequenceMode, signatureLabel, tonicName, upperString, useEnharmonicTonicName,
    voicing, voicingType,
  ]);

  const onExportSequence = useMemo(() => {
    if (!supportsChordFunctions) return undefined;
    return (format: 'pdf' | 'jpeg') => {
      const options = {
        subtitle: [
          `Tipo: ${getVoicingLabel(voicingType)}`,
          `Inversión: ${voicing === 'closed' ? 1 : voicing.at(-1)}`,
          `Grupo: ${voicingType === 'drop3' ? getDrop3StringSet(drop3StringGroup).join('-') : `${lowerString}-${upperString}`}`,
          `Trastes: 0-${MAX_FRETBOARD_FRET}`,
          `Acordes: ${extendedChords ? 'tétradas' : 'tríadas'}`,
        ].join(' | '),
        steps: activeProgressionSteps.map((step) => ({
          label: step.label ?? step.id,
          chordName: (() => {
            const chord = chords.find((candidate) => candidate.romanLabel === step.label);
            return chord ? getDisplayedChordSymbol(chord, useEnharmonicTonicName) : undefined;
          })(),
            inversion: step.inversion,
          positions: step.positions,
        })),
      };
      return format === 'pdf' ? downloadTabPdf(options) : downloadTabJpeg(options);
    };
  }, [
    chords, degree, degreeLabelMode, drop3StringGroup, extendedChords, lowerString,
    activeProgressionSteps, modeBaseScale.scaleName, modeFamily, modeDegree, modeTitle,
    language, scale.scaleName, scaleId, signatureLabel, supportsChordFunctions,
    tonicName, upperString, useEnharmonicTonicName, voicing, voicingType,
  ]);

  const chordIntervalLabels = selectedChord
    ? getChordToneIntervalLabels(scale, selectedChord).map(({ label }) => label)
    : [];

  return (
    <main ref={appShellRef} className="app-shell">
      <section className="phase-one">
        <span className="creator-credit">Creado por Juan Anderson</span>
        <p className="eyebrow">{t('theoryLocator')}</p>
        {sequenceMode !== 'linked' && (
          <div className="title-row">
            <h1>{modeTitle}</h1>
            <span className="parent-scale-indicator">
              {t('scaleFundamental')}: {modeFamily === 'major'
                ? getDisplayedTonicName(modeBaseKey, useEnharmonicTonicName)
                  : `${getDisplayedTonicName(modeBaseKey, useEnharmonicTonicName)} ${modeBaseScale.scaleName}`}
            </span>
            <span className="scale-interval-legend">
              {scaleLegendLabel}: {scale.intervalLabels.join(' ')}
            </span>
          </div>
        )}
        <div className={`control-rail${sequenceMode === 'linked' ? ' sequence-linked-mode' : ''}`}>
        <div className="current-state">
          <span>{selectedChord ? getDisplayedChordSymbol(selectedChord, useEnharmonicTonicName) : 'Sin acorde'}</span>
          <span>{selectedChord?.tones.map((tone) => getDisplayedNoteName(tone.noteName, useEnharmonicTonicName)).join(' - ')}</span>
          {extendedChords ? (
            <span>
              {t('tetrad')}: {chordIntervalLabels.length > 3 ? chordIntervalLabels.join(' - ') : t('noChord')}
            </span>
          ) : (
            <span>{t('triad')}: {chordIntervalLabels.slice(0, 3).join(' - ') || t('noChord')}</span>
          )}
          {degreePentatonic && (
            <span>
              Pentatónica: {degreePentatonic.intervalLabels.join(' - ')}
            </span>
          )}
        </div>
        <ControlsPanel
          rootPitch={KEY_TO_PITCH[key]}
          preferredTonicName={getDisplayedTonicName(key, useEnharmonicTonicName)}
          useEnharmonicTonicName={useEnharmonicTonicName}
          onTonicNamePreferenceChange={setUseEnharmonicTonicName}
          onRootPitchChange={(pitch) => {
            const nextKey = getPreferredKeyName(pitch, modeFamily);
            setLastChordLowStringMidi(null);
            setLastChordPositionKeys(null);
            const modeIndex = Math.max(modeFamilyIds.indexOf(scaleId), 0);
            const basePitch = ((pitch - modeBaseScale.notes[modeIndex]
              + KEY_TO_PITCH[modeBaseKey]) % 12 + 12) % 12;
            setKey(nextKey);
            setModeBaseKey(getPreferredKeyName(basePitch as PitchClass, modeFamily));
            setDegree(1);
          }}
          scaleId={scaleId}
          onScaleIdChange={handleScaleChange}
          degree={degree}
          onDegreeChange={handleDegreeChange}
          onChordSelect={handleChordSelect}
          playingChordLabel={playingChordLabel}
          playingTabPositions={playingTabPositions}
          keepLastPlayed={keepLastPlayed}
          onKeepLastPlayedChange={handleKeepLastPlayedChange}
          modeDegree={modeDegree}
          onModeDegreeChange={handleDegreeChange}
          modeDescriptions={modeDescriptions}
          modeFamily={modeFamily}
          onModeFamilyChange={handleModeFamilyChange}
          showChordFunctions={supportsChordFunctions}
          diatonicChords={chordInfo}
          fundamentalChordName={modeTitle}
          notation={effectiveNotation}
          notationLabel={signatureLabel}
          extendedChords={extendedChords}
          degreeLabelMode={degreeLabelMode}
          onDegreeLabelModeChange={setDegreeLabelMode}
          isMuted={isMuted}
          onToggleMuted={() => { void toggleMuted(); }}
          sequenceMode={sequenceMode}
        />
        {supportsChordFunctions && (
          <PlaybackControls
            steps={playbackProgressionSteps}
            label={sequenceMode === 'linked'
              ? (language === 'en' ? 'Linked chords' : 'Acordes enlazados')
              : (language === 'en' ? 'Diatonic chords' : 'Acordes diatónicos')}
            onStepChange={handleStepChange}
            onNoteChange={setActiveNoteIndex}
            lowerString={lowerString}
            upperString={upperString}
            extendedChords={extendedChords}
            voicingType={voicingType}
            drop3StringGroup={drop3StringGroup}
            onDrop3StringGroupChange={handleDrop3StringGroupChange}
            onPlayingChange={handleSequencePlayingChange}
            onUnlockAudio={unlock}
            sequenceDirection={sequenceDirection}
            onSequenceDirectionChange={setSequenceDirection}
            bpm={bpm}
            onBpmChange={setBpm}
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
            displayStringGroup={activePlaybackStep?.stringGroup}
            hideStringGroups
             hideStepButtons={sequenceMode === 'diatonic'}
            onStringRangeChange={handleStringGroupChange}
          />
        )}
        <InversionControls
          voicing={voicing}
          onVoicingChange={(nextVoicing) => handleVoicingChange(
            extendedChords && sequenceMode === 'linked' && nextVoicing === 'closed'
              ? 'drop2-1'
              : nextVoicing
          )}
          onVoicingChangeSilent={handleVoicingChangeSilent}
          onInversionStep={handleInversionStep}
          voicingType={voicingType}
          onVoicingTypeChange={(nextType) => setVoicingType(
            extendedChords && sequenceMode === 'linked' && nextType === 'closed'
              ? 'drop2'
              : nextType
          )}
          extendedChords={extendedChords}
          onExtendedChordsChange={handleExtendedChordsChange}
          onOctaveStep={handleOctaveStep}
          canOctaveUp={canUseOctaveControl(1)}
          canOctaveDown={canUseOctaveControl(-1)}
          linkedSequenceOctaveBlocked={sequenceMode === 'linked' && activeProgressionSteps.length > 0 && !canUseOctaveControl(1) && !canUseOctaveControl(-1)}
          closedDisabled={extendedChords}
          linkedStringGroupNavigation={sequenceMode === 'linked' && activeProgressionSteps.length > 0}
          onStringGroupStep={handleStringGroupStep}
          canStringGroupUp={canStringGroupUp}
          canStringGroupDown={canStringGroupDown}
          isSequencePlaying={isSequencePlaying}
          displayVoicing={isSequencePlaying ? activePlaybackVoicing : displayedVoicing}
        />
        </div>
        <div className="fretboard-column">
        <h2>{t('fretboard')}</h2>
        <ChordSequencePanel
          value={chordSequence}
          onChange={handleChordSequenceChange}
          analysis={analyzedChordSequence}
          linkedSequence={linkedChordSequence}
          hasMixedChordTypes={hasMixedChordTypes}
          onClear={() => {
            setChordSequence('');
            setSequenceMode('diatonic');
          }}
          onTranspose={(semitones) => {
            setChordSequence(transposeChordSequence(chordSequence, semitones, effectiveNotation));
            setLinkedSequenceOctaveOffset(0);
          }}
          linkedSequenceUnavailable={linkedSequenceUnavailable}
          sequenceMode={sequenceMode}
          playbackSteps={playbackProgressionSteps}
          activeStepIndex={activeStepIndex}
          isSequencePlaying={isSequencePlaying}
          onStepPreview={handleSequenceStepPreview}
          onSequenceModeChange={(mode) => {
            setSequenceMode(mode);
            if (mode === 'linked' && extendedChords && voicingType === 'closed') {
              setVoicingType('drop2');
              setVoicing('drop2-1');
            }
            if (mode === 'linked') setLinkedSequenceOctaveOffset(0);
          }}
        />
        <div className="fretboard-stage">
          <Fretboard
            rootPitch={KEY_TO_PITCH[key]}
            rootIsRed={sequenceMode !== 'linked' && modeDegree === 1}
            fundamentalRootPitch={KEY_TO_PITCH[modeBaseKey]}
            chordRootPitch={sequenceMode === 'linked'
              ? activePlaybackChordRootPitch
              : isDiatonicPlaybackActive
                ? activeDiatonicChord?.rootPitch
                : selectedChord?.rootPitch}
            scaleToneSet={scaleToneSet}
            chordToneSet={activePlaybackChordToneSet}
            hideScaleTones={sequenceMode === 'linked'}
            hideFundamentalRootRings={sequenceMode === 'linked'}
            hideFundamentalRootNotes={sequenceMode === 'linked'}
            neutralizeRootStyle={sequenceMode === 'linked'}
            notation={effectiveNotation}
            highlightedPositions={highlightedPositions}
            pdfDetails={pdfDetails}
            onNotePlay={handleNotePlay}
            hasSequenceSteps={activeProgressionSteps.length > 0 && canExportSequence}
            isSequencePlaying={isSequencePlaying}
            onExportSequence={onExportSequence}
            sequenceDiagramSteps={sequenceDiagramSteps}
          />
        </div>
        {supportsChordFunctions && (
          <StringGroupSelector
            lowerString={lowerString}
            upperString={upperString}
            onStringRangeChange={handleStringGroupChange}
            extendedChords={extendedChords}
            voicingType={voicingType}
            drop3StringGroup={drop3StringGroup}
            onDrop3StringGroupChange={handleDrop3StringGroupChange}
            displayStringGroup={activePlaybackStep?.stringGroup}
            isPlaying={isSequencePlaying}
            variant="below-fretboard"
          />
        )}
        </div>
      </section>
    </main>
  );
}

export default App;
