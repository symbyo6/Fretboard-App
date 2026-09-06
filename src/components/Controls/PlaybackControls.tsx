// src/components/Controls/PlaybackControls.tsx

import React, { useState } from 'react';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import {
  useProgression,
  type ProgressionStep,
  type PlaybackMode,
} from '../../hooks/useProgression';
import { AudioUnlockBanner } from './AudioUnlockBanner';

interface PlaybackControlsProps {
  steps: ProgressionStep[];
  onStepChange?: (index: number | null) => void;
  onNoteChange?: (index: number | null) => void;
  lowerString: number;
  upperString: number;
  onStringRangeChange: (lowerString: number, upperString: number) => void;
  label?: string;
}

const MODE_OPTIONS: { id: PlaybackMode; label: string; symbol: string }[] = [
  { id: 'chord', label: 'Bloque', symbol: '' },
  { id: 'arpeggio-up', label: 'Arpegio arriba', symbol: '↑' },
  { id: 'arpeggio-down', label: 'Arpegio abajo', symbol: '↓' },
];

/** Barra de reproducción para progresiones, escalas y voicings. */
export function PlaybackControls({
  steps,
  onStepChange,
  onNoteChange,
  lowerString,
  upperString,
  onStringRangeChange,
  label = 'Progresión',
}: PlaybackControlsProps): JSX.Element {
  const { isUnlocked, unlock } = useAudioEngine();
  const [bpm, setBpm] = useState(90);
  const [mode, setMode] = useState<PlaybackMode>('arpeggio-up');

  const { isPlaying, currentIndex, play, stop } = useProgression(steps, {
    bpm,
    mode,
    onStepChange,
    onNoteChange,
  });

  const hasSteps = steps.length > 0;

  return (
    <div style={panelStyle}>
      <AudioUnlockBanner isUnlocked={isUnlocked} onUnlock={unlock} />

      <div style={titleStyle}>
        {label} {hasSteps && `(${steps.length} pasos)`}
      </div>

      <div style={rowStyle}>
        <button
          type="button"
          onClick={isPlaying ? stop : play}
          disabled={!hasSteps}
          style={{
            minHeight: 44,
            minWidth: 44,
            padding: '0 1rem',
            borderRadius: '0.6rem',
            border: 'none',
            background: !hasSteps ? '#d6d3d1' : isPlaying ? '#dc2626' : '#16a34a',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: hasSteps ? 'pointer' : 'not-allowed',
          }}
        >
          {isPlaying ? 'Detener' : 'Reproducir'}
        </button>

        <div role="radiogroup" style={modeGroupStyle}>
          {MODE_OPTIONS.map((option) => {
            const isSelected = mode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setMode(option.id)}
                disabled={isPlaying}
                style={{
                  minHeight: 44,
                  padding: '0 0.6rem',
                  borderRadius: '0.5rem',
                  border: isSelected ? '2px solid #6366f1' : '1px solid #d6d3d1',
                  background: isSelected ? '#6366f1' : 'white',
                  color: isSelected ? 'white' : '#292524',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: isPlaying ? 'not-allowed' : 'pointer',
                  opacity: isPlaying ? 0.6 : 1,
                }}
              >
                {option.symbol} {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={tempoRowStyle}>
        <label htmlFor="bpm-slider" style={tempoLabelStyle}>
          Tempo: <strong>{bpm}</strong> BPM
        </label>
        <input
          id="bpm-slider"
          type="range"
          min={40}
          max={200}
          step={2}
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
          disabled={isPlaying}
          style={{ flex: 1, minHeight: 44 }}
        />
      </div>

      <div style={tempoRowStyle}>
        <label htmlFor="lower-string" style={tempoLabelStyle}>
          Inferior
          <select
            id="lower-string"
            value={lowerString}
            onChange={(event) => onStringRangeChange(Number(event.target.value), upperString)}
            disabled={isPlaying}
            style={selectStyle}
          >
            {[6, 5, 4, 3, 2, 1].map((stringNumber) => (
              <option key={stringNumber} value={stringNumber} disabled={stringNumber < upperString}>
                Cuerda {stringNumber}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="upper-string" style={tempoLabelStyle}>
          Superior
          <select
            id="upper-string"
            value={upperString}
            onChange={(event) => onStringRangeChange(lowerString, Number(event.target.value))}
            disabled={isPlaying}
            style={selectStyle}
          >
            {[1, 2, 3, 4, 5, 6].map((stringNumber) => (
              <option key={stringNumber} value={stringNumber} disabled={stringNumber > lowerString}>
                Cuerda {stringNumber}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasSteps && (
        <div style={stepsStyle}>
          {steps.map((step, index) => {
            const isActive = currentIndex === index;

            return (
              <div
                key={step.id}
                style={{
                  minWidth: 36,
                  minHeight: 36,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.4rem',
                  border: isActive ? '2px solid #16a34a' : '1px solid #d6d3d1',
                  background: isActive ? '#dcfce7' : 'white',
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#166534' : '#57534e',
                  transition: 'all 0.15s ease',
                }}
                title={step.label ?? step.noteNames.join(', ')}
              >
                {step.label ?? index + 1}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: '0.7rem',
  border: '1px solid #e7e5e4',
  background: '#fafaf9',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#57534e',
  marginBottom: '0.5rem',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginBottom: '0.6rem',
};

const modeGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.35rem',
};

const tempoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  marginBottom: '0.6rem',
};

const tempoLabelStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: '#78716c',
  flexShrink: 0,
};

const selectStyle: React.CSSProperties = {
  minHeight: 40,
  marginLeft: '0.35rem',
  padding: '0 0.4rem',
  border: '1px solid #d6d3d1',
  borderRadius: '0.4rem',
  background: 'white',
  color: '#292524',
};

const stepsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.3rem',
  overflowX: 'auto',
  paddingBottom: '0.2rem',
};
