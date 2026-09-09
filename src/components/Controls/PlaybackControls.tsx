// src/components/Controls/PlaybackControls.tsx

import React, { useState } from 'react';
import {
  useProgression,
  type ProgressionStep,
  type PlaybackMode,
  type SequenceDirection,
} from '../../hooks/useProgression';

interface PlaybackControlsProps {
  steps: ProgressionStep[];
  onStepChange?: (index: number | null) => void;
  onNoteChange?: (index: number | null) => void;
  lowerString: number;
  upperString: number;
  onStringRangeChange: (lowerString: number, upperString: number) => void;
  extendedChords: boolean;
  voicingType: 'closed' | 'drop2' | 'drop3';
  drop3StringGroup: 0 | 1;
  onDrop3StringGroupChange: (group: 0 | 1) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onUnlockAudio: () => Promise<void>;
  keepLastPlayed: boolean;
  onKeepLastPlayedChange: (keep: boolean) => void;
  sequenceDirection: SequenceDirection;
  onSequenceDirectionChange: (direction: SequenceDirection) => void;
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
  voicingType,
  drop3StringGroup,
  onDrop3StringGroupChange,
  onPlayingChange,
  onUnlockAudio,
  keepLastPlayed,
  onKeepLastPlayedChange,
  sequenceDirection,
  onSequenceDirectionChange,
  label = 'Progresión',
}: PlaybackControlsProps): JSX.Element {
  const [bpm, setBpm] = useState(90);
  const [mode, setMode] = useState<PlaybackMode>('chord');
  const [audioError, setAudioError] = useState(false);
  const direction = sequenceDirection;

  const { isPlaying, currentIndex, play, stop } = useProgression(steps, {
    bpm,
    mode,
    direction,
    onStepChange,
    onNoteChange,
    onPlayingChange,
    onPlaybackError: () => setAudioError(true),
  });

  const hasSteps = steps.length > 0;
  const handleUnlockAudio = async () => {
    setAudioError(false);
    try {
      await onUnlockAudio();
    } catch {
      setAudioError(true);
    }
  };
  const stringGroups = voicingType === 'drop3'
    ? [
      { id: 0 as const, label: '6-4-3-2', lower: 6, upper: 2 },
      { id: 1 as const, label: '5-3-2-1', lower: 5, upper: 1 },
    ]
    : Array.from(
      { length: 6 - (extendedChords ? 4 : 3) + 1 },
      (_, index) => ({
        id: index as 0 | 1,
        label: `${6 - index}-${6 - index - (extendedChords ? 4 : 3) + 1}`,
        lower: 6 - index,
        upper: 6 - index - (extendedChords ? 4 : 3) + 1,
      })
    );

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>
        {label} {hasSteps && `(${steps.length} pasos)`}
      </div>

      <div style={rowStyle}>
        {audioError && (
          <button
            type="button"
            onClick={() => { void handleUnlockAudio(); }}
            aria-label="Error de audio"
            style={{ ...audioButtonStyle, ...audioErrorButtonStyle }}
          >
            Reintentar sonido
          </button>
        )}
        <button
          type="button"
          onClick={isPlaying ? stop : play}
          disabled={!hasSteps}
          style={{
            minHeight: 'clamp(56px, 12vw, 68px)',
            minWidth: 'clamp(56px, 12vw, 68px)',
            padding: '0 clamp(0.9rem, 3.4vw, 1.6rem)',
            borderRadius: '0.7rem',
            border: 'none',
            background: !hasSteps ? '#d6d3d1' : isPlaying ? '#dc2626' : '#16a34a',
            color: 'white',
            fontWeight: 700,
            fontSize: 'clamp(1.3rem, 4.4vw, 1.6rem)',
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
            onClick={() => {
              const nextDirection = direction === 'ascending' ? 'descending' : 'ascending';
              onSequenceDirectionChange(nextDirection);
              if (mode !== 'chord') {
                setMode(nextDirection === 'ascending' ? 'arpeggio-up' : 'arpeggio-down');
              }
            }}
            disabled={isPlaying}
            aria-label={direction === 'ascending'
              ? 'Cambiar a arpegio descendente'
              : 'Cambiar a arpegio ascendente'}
            title={direction === 'ascending'
              ? 'Cambiar a arpegio descendente'
              : 'Cambiar a arpegio ascendente'}
            style={getModeButtonStyle(mode !== 'chord', isPlaying)}
          >
            {direction === 'ascending' ? '↑ Ascendente' : '↓ Descendente'}
          </button>
        </div>
        <label style={keepLastPlayedStyle}>
          <input
            type="checkbox"
            checked={keepLastPlayed}
            onChange={(event) => onKeepLastPlayedChange(event.target.checked)}
          />
          Mantener último tab
        </label>
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
          style={{ flex: 1, minHeight: 56 }}
        />
      </div>

      <div style={stringGroupsRowStyle} aria-label="Grupos de cuerdas">
        <span style={tempoLabelStyle}>Grupos</span>
        {stringGroups.map((group) => {
          const isSelected = voicingType === 'drop3'
            ? drop3StringGroup === group.id
            : lowerString === group.lower && upperString === group.upper;

          return (
            <button
              key={`${group.lower}-${group.upper}`}
              type="button"
              onClick={() => {
                if (voicingType === 'drop3') onDrop3StringGroupChange(group.id);
                else onStringRangeChange(group.lower, group.upper);
              }}
              disabled={isPlaying}
              aria-pressed={isSelected}
              title={`Cuerdas ${group.label}`}
              style={{
                ...stringGroupButtonStyle,
                background: isSelected ? '#0f766e' : 'white',
                color: isSelected ? 'white' : '#292524',
                borderColor: isSelected ? '#0f766e' : '#d6d3d1',
                opacity: isPlaying ? 0.6 : 1,
              }}
            >
              {group.label}
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
                  minWidth: 56,
                  minHeight: 56,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.4rem',
                  border: isActive ? '2px solid #16a34a' : '1px solid #d6d3d1',
                  background: isActive ? '#dcfce7' : 'white',
                  fontSize: '1.25rem',
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
  fontSize: '1.3rem',
  fontWeight: 700,
  color: '#57534e',
  marginBottom: '0.5rem',
};

const audioButtonStyle: React.CSSProperties = {
  minHeight: 'clamp(52px, 11vw, 62px)',
  padding: '0 clamp(0.8rem, 2.8vw, 1.4rem)',
  borderRadius: '0.6rem',
  border: '1px solid #b45309',
  background: '#fef3c7',
  color: '#92400e',
  fontWeight: 700,
  fontSize: 'clamp(1.15rem, 3.6vw, 1.4rem)',
  cursor: 'pointer',
};

const audioErrorButtonStyle: React.CSSProperties = {
  borderColor: '#b91c1c',
  background: '#fee2e2',
  color: '#991b1b',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.6rem',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: '0.7rem',
};

const modeGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
};

const keepLastPlayedStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  minHeight: 'clamp(48px, 10vw, 58px)',
  color: '#57534e',
  fontSize: 'clamp(1.1rem, 3.8vw, 1.35rem)',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const getModeButtonStyle = (isSelected: boolean, isPlaying: boolean): React.CSSProperties => ({
  minHeight: 'clamp(52px, 11vw, 62px)',
  padding: '0 clamp(0.7rem, 2.6vw, 1.2rem)',
  borderRadius: '0.5rem',
  border: isSelected ? '2px solid #6366f1' : '1px solid #d6d3d1',
  background: isSelected ? '#6366f1' : 'white',
  color: isSelected ? 'white' : '#292524',
  fontWeight: isSelected ? 700 : 500,
  fontSize: 'clamp(1.1rem, 3.8vw, 1.35rem)',
  cursor: isPlaying ? 'not-allowed' : 'pointer',
  opacity: isPlaying ? 0.6 : 1,
});

const tempoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.7rem',
  marginBottom: '0.7rem',
};

const tempoLabelStyle: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 700,
  color: '#57534e',
  flexShrink: 0,
};

const stepsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.35rem',
  overflowX: 'auto',
  paddingBottom: '0.2rem',
};

const stringGroupsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.4rem',
  marginBottom: '0.7rem',
};

const stringGroupButtonStyle: React.CSSProperties = {
  minWidth: 'clamp(54px, 10vw, 66px)',
  minHeight: 'clamp(50px, 10vw, 60px)',
  padding: '0 clamp(0.45rem, 1.6vw, 0.75rem)',
  border: '1px solid',
  borderRadius: '0.4rem',
  fontSize: 'clamp(1.1rem, 3.8vw, 1.35rem)',
  fontWeight: 700,
  cursor: 'pointer',
};
