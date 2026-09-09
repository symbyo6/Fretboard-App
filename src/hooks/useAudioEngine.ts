// src/hooks/useAudioEngine.ts

import { useCallback, useState } from 'react';
import { audioEngine } from '../lib/audio/audioEngine';

/** Hook ligero para reproducir notas, acordes y arpegios sueltos. */
export function useAudioEngine() {
  const [isUnlocked, setIsUnlocked] = useState(audioEngine.isUnlocked);
  const [isMuted, setIsMuted] = useState(audioEngine.isMuted);

  /** Debe llamarse desde un handler de click o touch. */
  const unlock = useCallback(async () => {
    await audioEngine.unlock();
    setIsUnlocked(true);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    audioEngine.setMuted(muted);
    setIsMuted(muted);
  }, []);

  const toggleMuted = useCallback(async () => {
    if (isMuted) await audioEngine.unlock();
    setIsUnlocked(true);
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

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

  return {
    isUnlocked,
    unlock,
    isMuted,
    setMuted,
    toggleMuted,
    playNote,
    playChord,
    playArpeggio,
    stopAll,
  };
}
