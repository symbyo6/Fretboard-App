// src/hooks/useMorphAnimation.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type MorphPhase,
  type MorphSpeed,
  MORPH_SPEED_TIMING,
  nextPhase as computeNextPhase,
  previousPhase as computePreviousPhase,
} from '../lib/shapes/morphPhases';

interface UseMorphAnimationOptions {
  initialPhase?: MorphPhase;
  initialSpeed?: MorphSpeed;
  onSettle?: (phase: MorphPhase) => void;
}

export interface MorphAnimationState {
  fromPhase: MorphPhase;
  toPhase: MorphPhase;
  transitionProgress: number;
  isPlaying: boolean;
  speed: MorphSpeed;
}

export interface UseMorphAnimationResult extends MorphAnimationState {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPhase: (phase: MorphPhase) => void;
  setSpeed: (speed: MorphSpeed) => void;
}

/** Motor de animación de morfing basado en requestAnimationFrame. */
export function useMorphAnimation({
  initialPhase = 'both',
  initialSpeed = 'normal',
  onSettle,
}: UseMorphAnimationOptions = {}): UseMorphAnimationResult {
  const [fromPhase, setFromPhase] = useState<MorphPhase>(initialPhase);
  const [toPhase, setToPhase] = useState<MorphPhase>(initialPhase);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<MorphSpeed>(initialSpeed);

  const rafRef = useRef<number | null>(null);
  const segmentStartRef = useRef<number>(0);
  const speedRef = useRef<MorphSpeed>(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const clearRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const settleAt = useCallback(
    (phase: MorphPhase) => {
      setFromPhase(phase);
      setToPhase(phase);
      setTransitionProgress(0);
      onSettle?.(phase);
    },
    [onSettle]
  );

  const tick = useCallback(function tickFrame(now: number) {
    const { holdMs, transitionMs } = MORPH_SPEED_TIMING[speedRef.current];
    const elapsed = now - segmentStartRef.current;

    if (elapsed < holdMs) {
      setTransitionProgress(0);
    } else if (elapsed < holdMs + transitionMs) {
      setTransitionProgress((elapsed - holdMs) / transitionMs);
    } else {
      setFromPhase((current) => {
        const arrived = computeNextPhase(current);
        setToPhase(computeNextPhase(arrived));
        return arrived;
      });
      setTransitionProgress(0);
      segmentStartRef.current = now;
    }

    rafRef.current = requestAnimationFrame(tickFrame);
  }, []);

  const play = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    setToPhase(computeNextPhase(fromPhase));
    segmentStartRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, fromPhase, tick]);

  const pause = useCallback(() => {
    clearRaf();
    setIsPlaying(false);
    settleAt(fromPhase);
  }, [clearRaf, fromPhase, settleAt]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const stepForward = useCallback(() => {
    clearRaf();
    setIsPlaying(false);
    settleAt(computeNextPhase(fromPhase));
  }, [clearRaf, fromPhase, settleAt]);

  const stepBackward = useCallback(() => {
    clearRaf();
    setIsPlaying(false);
    settleAt(computePreviousPhase(fromPhase));
  }, [clearRaf, fromPhase, settleAt]);

  const setPhase = useCallback(
    (phase: MorphPhase) => {
      clearRaf();
      setIsPlaying(false);
      settleAt(phase);
    },
    [clearRaf, settleAt]
  );

  const setSpeedSafe = useCallback((nextSpeed: MorphSpeed) => {
    setSpeed(nextSpeed);
    segmentStartRef.current = performance.now();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) pause();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, pause]);

  useEffect(() => clearRaf, [clearRaf]);

  return {
    fromPhase,
    toPhase,
    transitionProgress,
    isPlaying,
    speed,
    play,
    pause,
    toggle,
    stepForward,
    stepBackward,
    setPhase,
    setSpeed: setSpeedSafe,
  };
}
