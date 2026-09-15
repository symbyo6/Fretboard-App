// src/hooks/useAudioEngine.ts

import { useCallback, useRef, useState } from 'react';
import { audioEngine } from '../lib/audio/audioEngine';

const AUDIO_SETTINGS_STORAGE_KEY = 'fretboard-audio-settings-v1';

function loadMutedSetting(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY) === 'muted';
  } catch {
    return false;
  }
}

/** Hook ligero para reproducir notas, acordes y arpegios sueltos. */
export function useAudioEngine() {
  const [isUnlocked, setIsUnlocked] = useState(audioEngine.isUnlocked);
  const soundRequestRef = useRef(0);
  const [isMuted, setIsMuted] = useState(() => {
    const muted = loadMutedSetting();
    audioEngine.setMuted(muted);
    return muted;
  });

  /** Debe llamarse desde un handler de click o touch. */
  const unlock = useCallback(async () => {
    await audioEngine.unlock();
    setIsUnlocked(true);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    audioEngine.setMuted(muted);
    setIsMuted(muted);
    try {
      window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, muted ? 'muted' : 'on');
    } catch {
      // Continue normally if browser storage is unavailable.
    }
  }, []);

  const toggleMuted = useCallback(async () => {
    if (isMuted) await audioEngine.unlock();
    setIsUnlocked(true);
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const playNote = useCallback(
    async (noteName: string, durationSeconds?: number) => {
      const request = ++soundRequestRef.current;
      audioEngine.stopAll();
      await audioEngine.unlock();
      if (request !== soundRequestRef.current) return;
      setIsUnlocked(true);
      audioEngine.playNote(noteName, durationSeconds);
    },
    []
  );

  const playChord = useCallback(
    async (noteNames: string[], durationSeconds?: number) => {
      const request = ++soundRequestRef.current;
      audioEngine.stopAll();
      await audioEngine.unlock();
      if (request !== soundRequestRef.current) return;
      setIsUnlocked(true);
      audioEngine.playChord(noteNames, durationSeconds);
    },
    []
  );

  const playPreviewChord = useCallback(
    async (noteNames: string[], durationSeconds?: number) => {
      const request = ++soundRequestRef.current;
      audioEngine.stopAll();
      await audioEngine.unlock();
      if (request !== soundRequestRef.current) return;
      setIsUnlocked(true);
      audioEngine.playPreviewChord(noteNames, durationSeconds);
    },
    []
  );

  const playPreviewMidi = useCallback(
    async (midis: number[], durationSeconds?: number) => {
      const request = ++soundRequestRef.current;
      audioEngine.stopAll();
      await audioEngine.unlock();
      if (request !== soundRequestRef.current) return;
      setIsUnlocked(true);
      audioEngine.playPreviewMidi(midis, durationSeconds);
    },
    []
  );

  const playArpeggio = useCallback(
    async (noteNames: string[], noteSpacingSeconds?: number) => {
      const request = ++soundRequestRef.current;
      audioEngine.stopAll();
      await audioEngine.unlock();
      if (request !== soundRequestRef.current) return;
      setIsUnlocked(true);
      audioEngine.playArpeggio(noteNames, noteSpacingSeconds);
    },
    []
  );

  const stopAll = useCallback(() => {
    soundRequestRef.current += 1;
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
    playPreviewChord,
    playPreviewMidi,
    playArpeggio,
    stopAll,
  };
}
