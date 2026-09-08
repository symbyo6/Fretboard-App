import React, { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import * as Tone from 'tone';
import { ControlsPanel } from './components/Controls/ControlsPanel';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { InversionControls } from './components/Controls/NotationAndChordToggles';
import { Fretboard } from './components/Fretboard/Fretboard';
import { getAllDiatonicChords, getChordToneSet, getScaleToneSet, toVoicing, type ChordVoicing, type ChordVoicingType } from './lib/theory/chords';
import { useAudioEngine } from './hooks/useAudioEngine';
import { fretToNoteName } from './lib/audio/tuning';
import { getAllPositionsForPitch } from './lib/theory/fretboardPositions';
import { getMajorDegreePentatonic, getNoteName, getScaleById, resolveScale } from './lib/theory/scales';
import { downloadTabPdf } from './lib/tabPdf';
import type { ProgressionStep, SequenceDirection } from './hooks/useProgression';
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

const MAJOR_MODE_IDS = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
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
const MAX_VOICING_FRET_SPAN = 5;

function getChordIntervalLabels(chord: DiatonicChord | undefined): string[] {
  if (!chord) return [];
  return chord.tones.map((tone) => {
    const interval = ((tone.pitch - chord.rootPitch) % 12 + 12) % 12;
    return CHORD_INTERVAL_LABELS[interval];
  });
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

function App(): JSX.Element {
  const appShellRef = useRef<HTMLElement>(null);
  const { unlock, playNote, playChord } = useAudioEngine();
  const [key, setKey] = useState<KeyName>('C');
  const [modeBaseKey, setModeBaseKey] = useState<KeyName>('C');
  const [scaleId, setScaleId] = useState('ionian');
  const [degree, setDegree] = useState(1);
  const [modeDegree, setModeDegree] = useState(1);
  const [modeFamily, setModeFamily] = useState<ModeFamily>('major');
  const [extendedChords, setExtendedChords] = useState(false);
  const [voicing, setVoicing] = useState<ChordVoicing>('closed');
  const [voicingType, setVoicingType] = useState<ChordVoicingType>('closed');
  const [drop3StringGroup, setDrop3StringGroup] = useState<0 | 1>(0);
  const [degreeLabelMode, setDegreeLabelMode] = useState<DegreeLabelMode>('roman');
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [lastChordLowStringMidi, setLastChordLowStringMidi] = useState<number | null>(null);
  const [lastChordPositionKeys, setLastChordPositionKeys] = useState<string[] | null>(null);
  const [lastChordVoiceMidis, setLastChordVoiceMidis] = useState<number[] | null>(null);
  const chordHighlightTimerRef = useRef<number | null>(null);
  const [playingChordLabel, setPlayingChordLabel] = useState<string | null>(null);
  const [keepLastPlayed, setKeepLastPlayed] = useState(true);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [sequenceDirection, setSequenceDirection] = useState<SequenceDirection>('ascending');

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
  const [lowerString, setLowerString] = useState(6);
  const [upperString, setUpperString] = useState(4);

  const scale = useMemo(() => resolveScale(scaleId, key), [scaleId, key]);
  const modeBaseScale = useMemo(
    () => resolveScale(MODE_FAMILY_BASE_IDS[modeFamily], modeBaseKey),
    [modeBaseKey, modeFamily]
  );
  const fundamentalChord = useMemo(
    () => getAllDiatonicChords(modeBaseScale, extendedChords, effectiveNotation, 'roman')[0],
    [effectiveNotation, extendedChords, modeBaseScale]
  );
  const modeTitle = `${key} ${getScaleById(scaleId)?.name ?? scale.scaleName}`;
  const modeFamilyIds = MODE_FAMILY_IDS[modeFamily];
  const modeDescriptions = useMemo(() => {
    return Object.fromEntries(
      modeFamilyIds.map((modeId, index) => {
        const modeRoot = modeBaseScale.notes[index];
        const modeName = getScaleById(modeId)?.name ?? modeId;
        return [index + 1, `${getPreferredKeyName(modeRoot, modeFamily)} ${modeName}`];
      })
    );
  }, [modeBaseScale, modeFamilyIds]);
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
  const selectedChord = chords.find((chord) => chord.degree === degree) ?? chords[0];
  const degreePentatonic = getMajorDegreePentatonic(scale, selectedChord?.degree ?? degree);
  const chordIntervalLabels = getChordIntervalLabels(selectedChord);
  const chordToneSet = useMemo(
    () => selectedChord ? getChordToneSet(selectedChord) : new Set<PitchClass>(),
    [selectedChord]
  );
  const scaleToneSet = useMemo(() => getScaleToneSet(scale), [scale]);
  const activeStringSet = voicingType === 'drop3'
    ? getDrop3StringSet(drop3StringGroup)
    : undefined;
  const selectedVoicingResult = useMemo(
    () => selectedChord
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
        sequenceDirection === 'ascending',
        voicing.startsWith('drop3'),
        []
      )
      : null,
    [activeStringSet, lowerString, selectedChord, sequenceDirection, upperString, voicing]
  );
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
  const playbackChords = useMemo(() => {
    const voicingChords = chords.map((chord) => toVoicing(chord, voicing));
    const passCount = Math.floor(MAX_FRETBOARD_FRET / 12) + 1;
    const passes = Array.from({ length: passCount }, (_, pass) => pass);
    const orderedPasses = sequenceDirection === 'descending' ? passes.reverse() : passes;
    const orderedChords = sequenceDirection === 'descending'
      ? [...voicingChords].reverse()
      : voicingChords;
    return orderedPasses.flatMap((pass) => orderedChords.map((chord) => ({ chord, pass })));
  }, [chords, sequenceDirection, voicing]);
  const progressionSteps = useMemo(() => {
    const steps: ProgressionStep[] = [];
    let previousLowStringMidi = -Infinity;
    let previousVoiceMidis: number[] = [];
    const voicingChords = chords.map((chord) => toVoicing(chord, voicing));
    const orderedChords = sequenceDirection === 'descending' ? [...voicingChords].reverse() : voicingChords;
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
          MAX_VOICING_FRET_SPAN,
          sequenceDirection === 'ascending',
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
  }, [activeStringSet, chords, lowerString, sequenceDirection, upperString, voicing]);
  const highlightedPositions = useMemo(() => {
    const activeStep = activeStepIndex === null ? null : progressionSteps[activeStepIndex];
    if (!activeStep) {
      return new Set(lastChordPositionKeys ?? []);
    }

    const activePositionKeys = activeNoteIndex === null
      ? activeStep.positionKeys
      : [activeStep.positionKeys[activeNoteIndex]].filter(Boolean);

    return new Set(
      activePositionKeys
    );
  }, [activeNoteIndex, activeStepIndex, lastChordPositionKeys, progressionSteps]);
  const playingTabPositions = useMemo(() => {
    if (lastChordPositionKeys) {
      return lastChordPositionKeys.map((key) => {
        const [string, fret] = key.split('-').map(Number);
        return { string, fret };
      });
    }

    const activeStep = activeStepIndex === null ? null : progressionSteps[activeStepIndex];
    return activeStep?.positions ?? [];
  }, [activeStepIndex, lastChordPositionKeys, progressionSteps]);

  const scheduleChordHighlightClear = () => {
    if (chordHighlightTimerRef.current !== null) {
      window.clearTimeout(chordHighlightTimerRef.current);
    }
    chordHighlightTimerRef.current = window.setTimeout(() => {
      if (keepLastPlayed) return;
      setLastChordPositionKeys([]);
      setPlayingChordLabel(null);
      chordHighlightTimerRef.current = null;
    }, 1500);
  };

  const handleVoicingChange = (
    nextVoicing: ChordVoicing,
    stringSetOverride?: number[],
    playSound = true,
    preserveSequence = false,
    previousLowMidi = -Infinity,
    searchAscending = true,
    previousVoices: number[] = []
  ) => {
    setVoicing(nextVoicing);
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setLastChordVoiceMidis(null);
    setPlayingChordLabel(null);
    if (!preserveSequence) {
      setActiveStepIndex(null);
      setActiveNoteIndex(null);
    }

    if (selectedChord) {
      const nextStringSet = stringSetOverride
        ?? (nextVoicing.startsWith('drop3') ? getDrop3StringSet(drop3StringGroup) : undefined);
      const result = getArpeggioPositions(
        toVoicing(selectedChord, nextVoicing),
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
        setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
        setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
        setPlayingChordLabel(selectedChord.symbol);
        if (playSound) playChord(result.noteNames);
        scheduleChordHighlightClear();
      }
    }
  };

  const handleInversionStep = (direction: 1 | -1) => {
    const currentPosition = voicing === 'closed' ? 1 : Number(voicing.at(-1));
    const inversionCount = extendedChords ? 4 : 3;
    const wrapsForward = direction > 0 && currentPosition === inversionCount;
    const wrapsBackward = direction < 0 && currentPosition === 1;
    let nextPosition = currentPosition + direction;
    if (nextPosition > inversionCount) nextPosition = 1;
    if (nextPosition < 1) nextPosition = inversionCount;

    const currentResult = selectedChord
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
        direction > 0,
        voicing.startsWith('drop3')
      )
      : null;
    const previousLowMidi = lastChordLowStringMidi ?? currentResult?.lowStringMidi ?? -Infinity;
    const previousVoices = lastChordVoiceMidis
      ?? currentResult?.noteNames.map((note) => Tone.Frequency(note).toMidi())
      ?? [];

    if (voicingType === 'drop3') {
      handleVoicingChange(
        `${voicingType}-${nextPosition}` as ChordVoicing,
        getDrop3StringSet(drop3StringGroup),
        isSequencePlaying,
        isSequencePlaying,
        wrapsForward || wrapsBackward ? -Infinity : previousLowMidi,
        direction > 0,
        wrapsForward || wrapsBackward
          ? []
          : previousVoices
      );
      return;
    }

    const size = extendedChords ? 4 : 3;
    handleVoicingChange(
      `${voicingType}-${nextPosition}` as ChordVoicing,
      Array.from({ length: size }, (_, index) => lowerString - index),
      isSequencePlaying,
      isSequencePlaying,
      wrapsForward || wrapsBackward ? -Infinity : previousLowMidi,
      direction > 0,
      wrapsForward || wrapsBackward
        ? []
        : previousVoices
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
      );
      if (result) {
        setLastChordLowStringMidi(result.lowStringMidi);
        setLastChordPositionKeys(result.positions.map((position) => `${position.string}-${position.fret}`));
        setLastChordVoiceMidis(result.noteNames.map((note) => Tone.Frequency(note).toMidi()));
        setPlayingChordLabel(nextChord.symbol);
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
    if (!enabled && voicing !== 'closed') {
      setVoicing('closed');
      setVoicingType('closed');
    }
  };

  const handleStepChange = (index: number | null) => {
    setActiveStepIndex(index);
    if (index !== null && playbackChords[index]) {
      setDegree(playbackChords[index].chord.degree);
      setPlayingChordLabel(playbackChords[index].chord.symbol);
    } else {
      setPlayingChordLabel(null);
    }
  };

  const handleSequencePlayingChange = (isPlaying: boolean) => {
    setIsSequencePlaying(isPlaying);
    if (isPlaying) {
      setLastChordPositionKeys(null);
      setLastChordVoiceMidis(null);
      setPlayingChordLabel(null);
    } else {
      setActiveStepIndex(null);
      setLastChordVoiceMidis(null);
      if (!keepLastPlayed) {
        setLastChordPositionKeys(null);
        setPlayingChordLabel(null);
      }
    }
  };

  const handleStringGroupChange = (nextLowerString: number, nextUpperString: number) => {
    setLastChordLowStringMidi(null);
    setLastChordPositionKeys(null);
    setLastChordVoiceMidis(null);
    setLowerString(Math.max(nextLowerString, nextUpperString));
    setUpperString(Math.min(nextUpperString, nextLowerString));

    if (selectedChord) {
      const nextStringSet = voicingType === 'drop3' ? activeStringSet : undefined;
      const result = getArpeggioPositions(
        toVoicing(selectedChord, voicing),
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
        setPlayingChordLabel(selectedChord.symbol);
        scheduleChordHighlightClear();
      }
    }
  };

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

  return (
    <main ref={appShellRef} className="app-shell">
      <section className="phase-one">
        <span className="creator-credit">Creado por Juan Anderson</span>
        <p className="eyebrow">Localizador de teoría en el diapasón de la guitarra</p>
        <div className="title-row">
          <h1>{modeTitle}</h1>
          <span className="parent-scale-indicator">
            Escala fundamental: {modeFamily === 'major'
              ? modeBaseKey
              : `${modeBaseKey} ${modeBaseScale.scaleName}`}
          </span>
          <span className="scale-interval-legend">
            {scaleLegendLabel}: {scale.intervalLabels.join(' ')}
          </span>
        </div>
        <div className="current-state">
          <span>{selectedChord?.symbol ?? 'Sin acorde'}</span>
          <span>{selectedChord?.tones.map((tone) => tone.noteName).join(' - ')}</span>
          <span>Tríada: {chordIntervalLabels.slice(0, 3).join(' - ') || 'Sin acorde'}</span>
          <span>
            Tétrada: {extendedChords && chordIntervalLabels.length > 3
              ? chordIntervalLabels.join(' - ')
              : 'desactivada'}
          </span>
          {degreePentatonic && (
            <span>
              Pentatónica: {degreePentatonic.intervalLabels.join(' - ')}
            </span>
          )}
        </div>
        <ControlsPanel
          rootPitch={KEY_TO_PITCH[key]}
          preferredTonicName={modeBaseKey}
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
          modeDegree={modeDegree}
          onModeDegreeChange={handleDegreeChange}
          modeDescriptions={modeDescriptions}
          modeFamily={modeFamily}
          onModeFamilyChange={handleModeFamilyChange}
          showChordFunctions={supportsChordFunctions}
          diatonicChords={chordInfo}
          fundamentalChordName={fundamentalChord?.symbol ?? modeBaseKey}
          notation={effectiveNotation}
          notationLabel={signatureLabel}
          extendedChords={extendedChords}
          onExtendedChordsChange={handleExtendedChordsChange}
          voicing={voicing}
          onVoicingChange={handleVoicingChange}
          voicingType={voicingType}
          onVoicingTypeChange={setVoicingType}
          degreeLabelMode={degreeLabelMode}
          onDegreeLabelModeChange={setDegreeLabelMode}
        />
        {supportsChordFunctions && (
          <PlaybackControls
            steps={progressionSteps}
            label="Acordes diatónicos"
            onStepChange={handleStepChange}
            onNoteChange={setActiveNoteIndex}
            lowerString={lowerString}
            upperString={upperString}
            extendedChords={extendedChords}
            voicingType={voicingType}
            drop3StringGroup={drop3StringGroup}
            onDrop3StringGroupChange={(group) => {
              setDrop3StringGroup(group);
              setLastChordLowStringMidi(null);
              setLastChordPositionKeys(null);
            }}
            onPlayingChange={handleSequencePlayingChange}
            onUnlockAudio={unlock}
            keepLastPlayed={keepLastPlayed}
            onKeepLastPlayedChange={(keep) => {
              setKeepLastPlayed(keep);
              if (!keep) {
                setLastChordPositionKeys(null);
                setPlayingChordLabel(null);
              }
            }}
            sequenceDirection={sequenceDirection}
            onSequenceDirectionChange={setSequenceDirection}
            onExportPdf={() => downloadTabPdf({
              title: modeTitle,
              subtitle: [
                `Tipo: ${voicingType === 'closed' ? 'Cerrado' : voicingType === 'drop2' ? 'Drop 2' : 'Drop 3'}`,
                `Inversión: ${voicing === 'closed' ? 1 : voicing.at(-1)}`,
                `Grupo: ${voicingType === 'drop3' ? getDrop3StringSet(drop3StringGroup).join('-') : `${lowerString}-${upperString}`}`,
                `Trastes: 0-24`,
                `Acordes: ${extendedChords ? 'tétradas' : 'tríadas'}`,
              ].join(' | '),
              steps: progressionSteps.map((step) => ({
                label: step.label ?? step.id,
                chordName: chords.find((chord) => chord.romanLabel === step.label)?.symbol,
                positions: step.positions,
              })),
            })}
            onStringRangeChange={handleStringGroupChange}
          />
        )}
        <InversionControls
          voicing={voicing}
          onVoicingChange={handleVoicingChange}
          onVoicingChangeSilent={(nextVoicing) => handleVoicingChange(
            nextVoicing,
            undefined,
            isSequencePlaying,
            isSequencePlaying
          )}
          onInversionStep={handleInversionStep}
          voicingType={voicingType}
          onVoicingTypeChange={setVoicingType}
          extendedChords={extendedChords}
          onExtendedChordsChange={handleExtendedChordsChange}
        />
        <h2>Diapasón</h2>
        <Fretboard
          rootPitch={KEY_TO_PITCH[key]}
          rootIsRed={modeDegree === 1}
          fundamentalRootPitch={KEY_TO_PITCH[modeBaseKey]}
          chordRootPitch={selectedChord?.rootPitch}
          scaleToneSet={scaleToneSet}
          chordToneSet={chordToneSet}
          notation={effectiveNotation}
          highlightedPositions={highlightedPositions}
          pdfDetails={{
            title: `${modeTitle} - Diapasón`,
            key: modeBaseKey,
            scale: modeBaseScale.scaleName,
            mode: getScaleById(scaleId)?.name ?? scale.scaleName,
            chord: selectedChord?.symbol,
            chordType: extendedChords ? 'Tétrada (7)' : 'Tríada',
            inversion: String(voicing === 'closed' ? 1 : voicing.at(-1)),
            voicing: voicing === 'closed' ? 'Cerrado' : voicing,
            stringGroup: voicingType === 'drop3'
              ? getDrop3StringSet(drop3StringGroup).join('-')
              : `${lowerString}-${upperString}`,
          }}
          onNotePlay={(position) => playNote(fretToNoteName(position.string - 1, position.fret))}
        />
      </section>
    </main>
  );
}

export default App;
