// src/hooks/useProgression.ts

import { useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../lib/audio/audioEngine';

export interface ProgressionStep {
  id: string;
  noteNames: string[];
  label?: string;
}

export type PlaybackMode = 'chord' | 'arpeggio-up' | 'arpeggio-down';

interface UseProgressionOptions {
  bpm?: number;
  mode?: PlaybackMode;
  onStepChange?: (index: number | null) => void;
  onNoteChange?: (index: number | null) => void;
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
  const { bpm = 90, mode = 'chord', onStepChange, onNoteChange } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

  const stop = useCallback(() => {
    partRef.current?.stop();
    partRef.current?.dispose();
    partRef.current = null;

    Tone.Transport.stop();
    Tone.Transport.cancel();
    audioEngine.stopAll();

    setIsPlaying(false);
    setCurrentIndex(null);
    onStepChange?.(null);
    onNoteChange?.(null);
  }, [onNoteChange, onStepChange]);

  const play = useCallback(async () => {
    if (steps.length === 0) return;

    await audioEngine.unlock();
    stop();

    Tone.Transport.bpm.value = bpm;
    const baseSecondsPerStep = 60 / bpm;
    const minimumNoteSpacing = 0.14;
    const stepDurations = steps.map((step) => mode === 'chord'
      ? baseSecondsPerStep
      : Math.max(baseSecondsPerStep, step.noteNames.length * minimumNoteSpacing));
    let elapsedSeconds = 0;
    const events = steps.map((step, index) => {
      const event = {
        time: elapsedSeconds,
        index,
        noteNames: step.noteNames,
        durationSeconds: stepDurations[index],
      };
      elapsedSeconds += stepDurations[index];
      return event;
    });

    const part = new Tone.Part<{
      time: number;
      index: number;
      noteNames: string[];
      durationSeconds: number;
    }>(
      (_time, event) => {
        setCurrentIndex(event.index);
        onStepChange?.(event.index);

        if (mode === 'chord') {
          onNoteChange?.(null);
          audioEngine.playChord(event.noteNames, event.durationSeconds * 0.9);
          return;
        }

        const orderedNotes = mode === 'arpeggio-down'
          ? [...event.noteNames].reverse()
          : event.noteNames;
        const spacing = event.durationSeconds / Math.max(orderedNotes.length, 1);
        onNoteChange?.(mode === 'arpeggio-down' ? orderedNotes.length - 1 : 0);
        audioEngine.playArpeggio(orderedNotes, spacing, spacing * 0.9, (noteIndex) => {
          onNoteChange?.(mode === 'arpeggio-down'
            ? orderedNotes.length - 1 - noteIndex
            : noteIndex);
        }, _time);
      },
      events
    );

    part.start(0);
    partRef.current = part;
    Tone.Transport.start();
    setIsPlaying(true);

    Tone.Transport.scheduleOnce(() => {
      stop();
    }, elapsedSeconds + 0.05);
  }, [steps, bpm, mode, onStepChange, onNoteChange, stop]);

  return { isPlaying, currentIndex, play, stop };
}
