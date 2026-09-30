// src/hooks/useProgression.ts

import { useCallback, useRef, useState } from 'react';
import { audioEngine } from '../lib/audio/audioEngine';

export interface ProgressionStep {
  id: string;
  noteNames: string[];
  label?: string;
  inversion?: number;
  stringGroup?: string;
  positions: { string: number; fret: number }[];
  positionKeys: string[];
  pitches?: number[];
}

export type PlaybackMode = 'chord' | 'arpeggio-up' | 'arpeggio-down';
export type SequenceDirection = 'ascending' | 'descending';

interface UseProgressionOptions {
  bpm?: number;
  mode?: PlaybackMode;
  direction?: SequenceDirection;
  onStepChange?: (index: number | null) => void;
  onNoteChange?: (index: number | null) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onPlaybackError?: (error: unknown) => void;
}

interface UseProgressionResult {
  isPlaying: boolean;
  currentIndex: number | null;
  play: () => Promise<void>;
  stop: () => void;
}

/** Reproduce una secuencia sincronizada con Tone.Transport y Tone.Part. */
export function useProgression(
  steps: ProgressionStep[],
  options: UseProgressionOptions = {}
): UseProgressionResult {
  const {
    bpm = 90,
    mode = 'chord',
    direction = 'ascending',
    onStepChange,
    onNoteChange,
    onPlayingChange,
    onPlaybackError,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const playbackRunRef = useRef(0);

  const stop = useCallback(() => {
    playbackRunRef.current += 1;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    audioEngine.stopAll();

    setIsPlaying(false);
    onPlayingChange?.(false);
    setCurrentIndex(null);
    onStepChange?.(null);
    onNoteChange?.(null);
  }, [onNoteChange, onPlayingChange, onStepChange]);

  const play = useCallback(async () => {
    if (steps.length === 0) return;

    stop();
    try {
      await audioEngine.unlock();
    } catch (error) {
      onPlaybackError?.(error);
      return;
    }
    const baseSecondsPerStep = 60 / bpm;
    const minimumNoteSpacing = 0.14;
    const stepDurations = steps.map((step) => mode === 'chord'
      ? baseSecondsPerStep
      : Math.max(baseSecondsPerStep, step.noteNames.length * minimumNoteSpacing));
    const run = playbackRunRef.current;
    setIsPlaying(true);
    onPlayingChange?.(true);

    const playStep = (index: number) => {
      if (playbackRunRef.current !== run) return;
      if (index >= steps.length) {
        stop();
        return;
      }

      const step = steps[index];
      const durationSeconds = stepDurations[index];
      setCurrentIndex(index);
      onStepChange?.(index);

      if (mode === 'chord') {
        onNoteChange?.(null);
        audioEngine.playSequenceChord(step.noteNames, durationSeconds * 0.82, 0.75);
      } else {
        const orderedNotes = direction === 'descending'
          ? [...step.noteNames].reverse()
          : step.noteNames;
        const spacing = durationSeconds / Math.max(orderedNotes.length, 1);
        onNoteChange?.(direction === 'descending' ? orderedNotes.length - 1 : 0);
        audioEngine.playSequenceArpeggio(orderedNotes, spacing, spacing * 0.9, (noteIndex) => {
          onNoteChange?.(direction === 'descending'
            ? orderedNotes.length - 1 - noteIndex
            : noteIndex);
        });
      }

      timerRef.current = window.setTimeout(() => playStep(index + 1), durationSeconds * 1000);
    };

    playStep(0);
  }, [steps, bpm, mode, direction, onStepChange, onNoteChange, onPlayingChange, onPlaybackError, stop]);

  return { isPlaying, currentIndex, play, stop };
}
