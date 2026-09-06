import React, { useMemo, useState, type JSX } from 'react';
import * as Tone from 'tone';
import { ControlsPanel } from './components/Controls/ControlsPanel';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { Fretboard } from './components/Fretboard/Fretboard';
import { getAllDiatonicChords, getChordToneSet, getScaleToneSet, toVoicing, type ChordVoicing, type ChordVoicingType } from './lib/theory/chords';
import { useAudioEngine } from './hooks/useAudioEngine';
import { fretToNoteName } from './lib/audio/tuning';
import { getAllPositionsForPitch } from './lib/theory/fretboardPositions';
import { getScaleById, resolveScale } from './lib/theory/scales';
import type {
  DegreeLabelMode,
  DiatonicChord,
  FretboardPosition,
  NotationPreference,
  NoteName,
  PitchClass,
  StringNumber,
} from './types';

const KEY_OPTIONS: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_TO_PITCH: Record<NoteName, PitchClass> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

function getArpeggioPositions(
  chord: DiatonicChord,
  lowerString: number,
  upperString: number,
  minimumFret = 0,
  previousStartMidi = -Infinity,
  preferHighestFinalNote = false
): { positions: FretboardPosition[]; noteNames: string[]; lastMidi: number; startMidi: number } | null {
  type SearchResult = {
    positions: FretboardPosition[];
    lastMidi: number;
    startMidi: number;
    score: number;
  };

  const choosePositions = (
    toneIndex: number,
    previousMidi: number,
    positions: FretboardPosition[]
  ): SearchResult | null => {
    if (toneIndex >= chord.tones.length) {
      return {
        positions,
        lastMidi: previousMidi,
        startMidi: 0,
        score: 0,
      };
    }

    const tone = chord.tones[toneIndex];
    const availableStringCount = lowerString - upperString + 1;
    const assignedString = lowerString - (toneIndex % availableStringCount);

    const activeStrings = [assignedString as StringNumber];
    const candidates = getAllPositionsForPitch(tone.pitch)
      .filter((position) => activeStrings.includes(position.string)
        && position.fret >= (toneIndex === 0 ? minimumFret : 0))
      .map((position) => ({
        position,
        midi: Tone.Frequency(fretToNoteName(position.string - 1, position.fret)).toMidi(),
      }))
      .sort((a, b) => {
        if (preferHighestFinalNote && toneIndex === chord.tones.length - 1) {
          return b.midi - a.midi;
        }
        return a.midi - b.midi;
      });

    let bestResult: SearchResult | null = null;
    for (const candidate of candidates) {
      const interval = toneIndex === 0
        ? (Number.isFinite(previousStartMidi) ? Math.abs(candidate.midi - previousStartMidi) : 0)
        : Math.abs(candidate.midi - previousMidi);
      const octavePenalty = toneIndex > 0 && interval >= 12 ? 1000 : 0;
      const result = choosePositions(
        toneIndex + 1,
        candidate.midi,
        [...positions, candidate.position]
      );
      if (result) {
        const scoredResult = { ...result, score: result.score + interval + octavePenalty };
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
  };
}

function App(): JSX.Element {
  const { playNote } = useAudioEngine();
  const [key, setKey] = useState<NoteName>('C');
  const [scaleId, setScaleId] = useState('ionian');
  const [degree, setDegree] = useState(1);
  const [notation, setNotation] = useState<NotationPreference>('sharps');
  const [extendedChords, setExtendedChords] = useState(false);
  const [voicing, setVoicing] = useState<ChordVoicing>('closed');
  const [voicingType, setVoicingType] = useState<ChordVoicingType>('closed');
  const [degreeLabelMode, setDegreeLabelMode] = useState<DegreeLabelMode>('roman');
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [lowerString, setLowerString] = useState(6);
  const [upperString, setUpperString] = useState(1);

  const scale = useMemo(() => resolveScale(scaleId, key), [scaleId, key]);
  const chords = useMemo(
    () => getAllDiatonicChords(scale, extendedChords, notation, degreeLabelMode === 'roman' ? 'roman' : 'nashville'),
    [scale, extendedChords, notation, degreeLabelMode]
  );
  const selectedChord = chords.find((chord) => chord.degree === degree) ?? chords[0];
  const chordToneSet = useMemo(() => getChordToneSet(selectedChord), [selectedChord]);
  const scaleToneSet = useMemo(() => getScaleToneSet(scale), [scale]);
  const chordInfo = chords.map((chord) => ({
    degree: chord.degree,
    romanNumeral: chord.romanLabel,
    nashvilleNumber: `${chord.degree}`,
    rootPitch: chord.rootPitch,
    quality: chord.quality,
    chordTones: chord.tones.map((tone) => tone.pitch),
    isExtended: chord.isExtended,
  }));
  const playbackChords = useMemo(() => {
    const voicingChords = chords.map((chord) => toVoicing(chord, voicing));
    return [...voicingChords, ...voicingChords];
  }, [chords, voicing]);
  const progressionSteps = useMemo(() => {
    const steps = [];
    let previousStartMidi = -Infinity;

    for (const [index, chord] of playbackChords.entries()) {
      if (index === chords.length) previousStartMidi = -Infinity;
      const result = getArpeggioPositions(
        chord,
        lowerString,
        upperString,
        index >= chords.length ? 12 : 0,
        index >= chords.length ? -Infinity : previousStartMidi,
        index >= chords.length
      );
      if (!result) {
        continue;
      }
      previousStartMidi = result.startMidi;
      steps.push({
        id: `${index}-${chord.degree}-${chord.symbol}`,
        label: chord.romanLabel,
        noteNames: result.noteNames,
        positionKeys: result.positions.map((position) => `${position.string}-${position.fret}`),
        pitches: chord.tones.map((tone) => tone.pitch),
      });
    }

    return steps;
  }, [chords.length, lowerString, playbackChords, upperString]);
  const highlightedPositions = useMemo(() => {
    const activeStep = activeStepIndex === null ? null : progressionSteps[activeStepIndex];
    if (!activeStep) return new Set<string>();

    const activePositionKeys = activeNoteIndex === null
      ? activeStep.positionKeys
      : [activeStep.positionKeys[activeNoteIndex]].filter(Boolean);

    return new Set(
      activePositionKeys
    );
  }, [activeNoteIndex, activeStepIndex, progressionSteps]);

  const handleStepChange = (index: number | null) => {
    setActiveStepIndex(index);
    if (index !== null && playbackChords[index]) {
      setDegree(playbackChords[index].degree);
    }
  };

  return (
    <main className="app-shell">
      <section className="phase-one">
        <p className="eyebrow">Fretboard Theory Explorer</p>
        <h1>{key} {getScaleById(scaleId)?.name ?? scale.scaleName}</h1>
        <div className="current-state">
          <span>{selectedChord?.symbol ?? 'Sin acorde'}</span>
          <span>{selectedChord?.tones.map((tone) => tone.noteName).join(' - ')}</span>
        </div>
        <ControlsPanel
          rootPitch={KEY_TO_PITCH[key]}
          onRootPitchChange={(pitch) => setKey(KEY_OPTIONS[pitch])}
          scaleId={scaleId}
          onScaleIdChange={setScaleId}
          degree={degree}
          onDegreeChange={setDegree}
          diatonicChords={chordInfo}
          notation={notation}
          onNotationChange={setNotation}
          extendedChords={extendedChords}
          onExtendedChordsChange={setExtendedChords}
          voicing={voicing}
          onVoicingChange={setVoicing}
          voicingType={voicingType}
          onVoicingTypeChange={setVoicingType}
          degreeLabelMode={degreeLabelMode}
          onDegreeLabelModeChange={setDegreeLabelMode}
        />
        <PlaybackControls
          steps={progressionSteps}
          label="Acordes diatónicos"
          onStepChange={handleStepChange}
          onNoteChange={setActiveNoteIndex}
          lowerString={lowerString}
          upperString={upperString}
          onStringRangeChange={(nextLowerString, nextUpperString) => {
            setLowerString(Math.max(nextLowerString, nextUpperString));
            setUpperString(Math.min(nextUpperString, nextLowerString));
          }}
        />
        <h2>Diapasón</h2>
        <Fretboard
          rootPitch={KEY_TO_PITCH[key]}
          chordRootPitch={selectedChord?.rootPitch}
          scaleToneSet={scaleToneSet}
          chordToneSet={chordToneSet}
          notation={notation}
          highlightedPositions={highlightedPositions}
          onNotePlay={(position) => playNote(fretToNoteName(position.string - 1, position.fret))}
        />
      </section>
    </main>
  );
}

export default App;
