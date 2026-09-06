// src/components/Controls/PlaybackControls.tsx

import React, { useState } from 'react';
import {
  useProgression,
  type ProgressionStep,
  type PlaybackMode,
} from '../../hooks/useProgression';

interface PlaybackControlsProps {
  steps: ProgressionStep[];
  onStepChange?: (index: number | null) => void;
  onNoteChange?: (index: number | null) => void;
  lowerString: number;
  upperString: number;
  onStringRangeChange: (lowerString: number, upperString: number) => void;
  extendedChords: boolean;
  label?: string;
}

/** Barra de reproducción para progresiones, escalas y voicings. */
export function PlaybackControls({
  steps,
  onStepChange,
  onNoteChange,
  lowerString,
  upperString,
  onStringRangeChange,
  extendedChords,
  label = 'Progresión',
}: PlaybackControlsProps): JSX.Element {
  const [bpm, setBpm] = useState(90);
  const [mode, setMode] = useState<PlaybackMode>('arpeggio-up');

  const { isPlaying, currentIndex, play, stop } = useProgression(steps, {
    bpm,
    mode,
    onStepChange,
    onNoteChange,
  });

  const hasSteps = steps.length > 0;
  const stringGroupSize = extendedChords ? 4 : 3;
  const stringGroups = Array.from(
    { length: 6 - stringGroupSize + 1 },
    (_, index) => ({
      lower: 6 - index,
      upper: 6 - index - stringGroupSize + 1,
    })
  );

  return (
    <div style={panelStyle}>
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

        <div role="group" aria-label="Modo y dirección de reproducción" style={modeGroupStyle}>
          <button
            type="button"
            onClick={() => setMode('chord')}
            disabled={isPlaying}
            style={getModeButtonStyle(mode === 'chord', isPlaying)}
          >
            Bloque
          </button>
          <button
            type="button"
            onClick={() => setMode((currentMode) => (
              currentMode === 'arpeggio-up' ? 'arpeggio-down' : 'arpeggio-up'
            ))}
            disabled={isPlaying}
            aria-label={mode === 'arpeggio-up'
              ? 'Cambiar a arpegio descendente'
              : 'Cambiar a arpegio ascendente'}
            title={mode === 'arpeggio-up'
              ? 'Cambiar a arpegio descendente'
              : 'Cambiar a arpegio ascendente'}
            style={getModeButtonStyle(mode !== 'chord', isPlaying)}
          >
            {mode === 'arpeggio-up' ? '↑ Ascendente' : '↓ Descendente'}
          </button>
        </div>
      </div>

      <div style={tempoRowStyle}>
        <label htmlFor="bpm-slider" style={tempoLabelStyle}>
          Tempo: <strong>{bpm}</strong> BPM
        </label>
        <input
          id="bpm-slider"
          type="range"
          min={10}
          max={200}
          step={2}
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
          disabled={isPlaying}
          style={{ flex: 1, minHeight: 44 }}
        />
      </div>

      <div style={stringGroupsRowStyle} aria-label={`Grupos de ${stringGroupSize} cuerdas`}>
        <span style={tempoLabelStyle}>Grupos</span>
        {stringGroups.map((group) => {
          const isSelected = lowerString === group.lower && upperString === group.upper;

          return (
            <button
              key={`${group.lower}-${group.upper}`}
              type="button"
              onClick={() => onStringRangeChange(group.lower, group.upper)}
              disabled={isPlaying}
              aria-pressed={isSelected}
              title={`${stringGroupSize} cuerdas: ${group.lower} a ${group.upper}`}
              style={{
                ...stringGroupButtonStyle,
                background: isSelected ? '#0f766e' : 'white',
                color: isSelected ? 'white' : '#292524',
                borderColor: isSelected ? '#0f766e' : '#d6d3d1',
                opacity: isPlaying ? 0.6 : 1,
              }}
            >
              {group.lower}-{group.upper}
            </button>
          );
        })}
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

const getModeButtonStyle = (isSelected: boolean, isPlaying: boolean): React.CSSProperties => ({
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
});

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

const stepsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.3rem',
  overflowX: 'auto',
  paddingBottom: '0.2rem',
};

const stringGroupsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.35rem',
  marginBottom: '0.6rem',
};

const stringGroupButtonStyle: React.CSSProperties = {
  minWidth: 42,
  minHeight: 38,
  padding: '0 0.45rem',
  border: '1px solid',
  borderRadius: '0.4rem',
  fontSize: '0.78rem',
  fontWeight: 700,
  cursor: 'pointer',
};
