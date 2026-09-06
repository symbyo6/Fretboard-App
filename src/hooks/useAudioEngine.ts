// src/hooks/useAudioEngine.ts

import { useCallback, useState } from 'react';
import { audioEngine } from '../lib/audio/audioEngine';

/** Hook ligero para reproducir notas, acordes y arpegios sueltos. */
export function useAudioEngine() {
  const [isUnlocked, setIsUnlocked] = useState(audioEngine.isUnlocked);

  /** Debe llamarse desde un handler de click o touch. */
  const unlock = useCallback(async () => {
    await audioEngine.unlock();
    setIsUnlocked(true);
  }, []);

  const playNote = useCallback(
    async (noteName: string, durationSeconds?: number) => {
      await audioEngine.unlock();
      setIsUnlocked(true);
      audioEngine.playNote(noteName, durationSeconds);
    },
    []
  );

  const playChord = useCallback(
    async (noteNames: string[], durationSeconds?: number) => {
      await audioEngine.unlock();
      setIsUnlocked(true);
      audioEngine.playChord(noteNames, durationSeconds);
    },
    []
  );

  const playArpeggio = useCallback(
    async (noteNames: string[], noteSpacingSeconds?: number) => {
      await audioEngine.unlock();
      setIsUnlocked(true);
      audioEngine.playArpeggio(noteNames, noteSpacingSeconds);
    },
    []
  );

  const stopAll = useCallback(() => {
    audioEngine.stopAll();
  }, []);

  return { isUnlocked, unlock, playNote, playChord, playArpeggio, stopAll };
}
