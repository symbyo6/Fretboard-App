import React, { useMemo, useState, type JSX } from 'react';
import * as Tone from 'tone';
import { ControlsPanel } from './components/Controls/ControlsPanel';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { Fretboard } from './components/Fretboard/Fretboard';
import { getAllDiatonicChords, getChordToneSet, getScaleToneSet, toVoicing, type ChordVoicing, type ChordVoicingType } from './lib/theory/chords';
import { useAudioEngine } from './hooks/useAudioEngine';
import { fretToNoteName } from './lib/audio/tuning';
import { getAllPositionsForPitch } from './lib/theory/fretboardPositions';
import { getMajorDegreePentatonic, getNoteName, getScaleById, resolveScale } from './lib/theory/scales';
import type {
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

const CHORD_INTERVAL_LABELS: Record<number, string> = {
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
  minimumFret = 0,
  previousStartMidi = -Infinity,
  preferHighestFinalNote = false,
  requireClosedVoicing = false,
  maxFretSpan?: number
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
        score: 0,
      };
    }
    const selectedStrings = Array.from(
      { length: lowerString - upperString + 1 },
      (_, index) => lowerString - index
    );
    if (chord.tones.length > selectedStrings.length) return null;


    const tone = chord.tones[toneIndex];
    const assignedString = selectedStrings[toneIndex];

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
  const { playNote, playChord } = useAudioEngine();
  const [key, setKey] = useState<NoteName>('C');
  const [modeBaseKey, setModeBaseKey] = useState<NoteName>('C');
  const [scaleId, setScaleId] = useState('ionian');
  const [degree, setDegree] = useState(1);
  const [modeDegree, setModeDegree] = useState(1);
  const [modeFamily, setModeFamily] = useState<ModeFamily>('major');
  const [notation, setNotation] = useState<NotationPreference>('sharps');
  const [extendedChords, setExtendedChords] = useState(false);
  const [voicing, setVoicing] = useState<ChordVoicing>('closed');
  const [voicingType, setVoicingType] = useState<ChordVoicingType>('closed');
  const [degreeLabelMode, setDegreeLabelMode] = useState<DegreeLabelMode>('roman');
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [lowerString, setLowerString] = useState(6);
  const [upperString, setUpperString] = useState(4);

  const scale = useMemo(() => resolveScale(scaleId, key), [scaleId, key]);
  const modeBaseScale = useMemo(
    () => resolveScale(MODE_FAMILY_BASE_IDS[modeFamily], modeBaseKey),
    [modeBaseKey, modeFamily]
  );
  const modeFamilyIds = MODE_FAMILY_IDS[modeFamily];
  const modeDescriptions = useMemo(() => {
    return Object.fromEntries(
      modeFamilyIds.map((modeId, index) => {
        const modeRoot = modeBaseScale.notes[index];
        const modeName = getScaleById(modeId)?.name ?? modeId;
        return [index + 1, `${KEY_OPTIONS[modeRoot]} ${modeName}`];
      })
    );
  }, [modeBaseScale, modeFamilyIds]);
  const supportsChordFunctions = true;
  const chords = useMemo(
    () => getAllDiatonicChords(
      scale,
      scale.category === 'pentatonic' ? false : extendedChords,
      notation,
      'roman'
    ),
    [scale, extendedChords, notation]
  );
  const selectedChord = chords.find((chord) => chord.degree === degree) ?? chords[0];
  const degreePentatonic = getMajorDegreePentatonic(scale, selectedChord?.degree ?? degree);
  const chordIntervalLabels = getChordIntervalLabels(selectedChord);
  const chordToneSet = useMemo(
    () => selectedChord ? getChordToneSet(selectedChord) : new Set<PitchClass>(),
    [selectedChord]
  );
  const scaleToneSet = useMemo(() => getScaleToneSet(scale), [scale]);
  const selectedVoicingResult = useMemo(
    () => selectedChord
      ? getArpeggioPositions(
        toVoicing(selectedChord, voicing),
        lowerString,
        upperString,
        0,
        -Infinity,
        false,
        voicing === 'closed',
        voicing.startsWith('drop2') ? 5 : undefined
      )
      : null,
    [lowerString, selectedChord, upperString, voicing]
  );
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
        index >= chords.length,
        voicing === 'closed',
        voicing.startsWith('drop2') ? 5 : undefined
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
    if (!activeStep) {
      return new Set(selectedVoicingResult?.positions.map((position) => `${position.string}-${position.fret}`));
    }

    const activePositionKeys = activeNoteIndex === null
      ? activeStep.positionKeys
      : [activeStep.positionKeys[activeNoteIndex]].filter(Boolean);

    return new Set(
      activePositionKeys
    );
  }, [activeNoteIndex, activeStepIndex, progressionSteps, selectedVoicingResult]);

  const handleVoicingChange = (nextVoicing: ChordVoicing) => {
    setVoicing(nextVoicing);
    setActiveStepIndex(null);
    setActiveNoteIndex(null);

    if (selectedChord) {
      const result = getArpeggioPositions(
        toVoicing(selectedChord, nextVoicing),
        lowerString,
        upperString,
        0,
        -Infinity,
        false,
        nextVoicing === 'closed',
        nextVoicing.startsWith('drop2') ? 5 : undefined
      );
      if (result) playChord(result.noteNames);
    }
  };

  const handleExtendedChordsChange = (enabled: boolean) => {
    setExtendedChords(enabled);
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
      setDegree(playbackChords[index].degree);
    }
  };

  const handleDegreeChange = (nextDegree: number) => {
    if (nextDegree < 1 || nextDegree > 7) {
      setDegree(nextDegree);
      return;
    }

    const nextModeIndex = nextDegree - 1;
    const nextRootPitch = modeBaseScale.notes[nextDegree - 1];
    setKey(KEY_OPTIONS[nextRootPitch]);
    setScaleId(modeFamilyIds[nextModeIndex]);
    setModeDegree(nextDegree);
    setDegree(1);
  };

  const handleScaleChange = (nextScaleId: string) => {
    setScaleId(nextScaleId);
    const nextModeIndex = MAJOR_MODE_IDS.indexOf(nextScaleId as typeof MAJOR_MODE_IDS[number]);
    setModeBaseKey(key);
    setModeDegree(nextModeIndex === -1 ? 1 : nextModeIndex + 1);
    setDegree(1);
  };

  const handleModeFamilyChange = (nextFamily: ModeFamily) => {
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
    <main className="app-shell">
      <section className="phase-one">
        <span className="creator-credit">Creado por Juan Anderson</span>
        <p className="eyebrow">Localizador de teoría del diapasón de la guitarra</p>
        <div className="title-row">
          <h1>{key} {getScaleById(scaleId)?.name ?? scale.scaleName}</h1>
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
          onRootPitchChange={(pitch) => {
            const nextKey = KEY_OPTIONS[pitch];
            setKey(nextKey);
            setModeBaseKey(nextKey);
            setScaleId('ionian');
            setModeDegree(1);
            setDegree(1);
          }}
          scaleId={scaleId}
          onScaleIdChange={handleScaleChange}
          degree={degree}
          onDegreeChange={handleDegreeChange}
          modeDegree={modeDegree}
          onModeDegreeChange={handleDegreeChange}
          modeDescriptions={modeDescriptions}
          modeFamily={modeFamily}
          onModeFamilyChange={handleModeFamilyChange}
          showChordFunctions={supportsChordFunctions}
          diatonicChords={chordInfo}
          notation={notation}
          onNotationChange={setNotation}
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
            onStringRangeChange={(nextLowerString, nextUpperString) => {
              setLowerString(Math.max(nextLowerString, nextUpperString));
              setUpperString(Math.min(nextUpperString, nextLowerString));
            }}
          />
        )}
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
