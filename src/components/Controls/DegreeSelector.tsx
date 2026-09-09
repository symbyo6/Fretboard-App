// src/components/Controls/DegreeSelector.tsx

import React, { useState } from 'react';
import type { DiatonicChordInfo, DegreeLabelMode } from '../../types';
import { CHORD_QUALITY_SUFFIX } from '../../lib/theory/chords';

interface DegreeSelectorProps {
  chords: DiatonicChordInfo[];
  value: number;
  tonicName: string;
  onChange: (degree: number) => void;
  onChordSelect?: (degree: number) => void;
  playingChordLabel?: string | null;
  playingTabPositions?: { string: number; fret: number }[];
  extendedChords: boolean;
  modeDegree: number;
  onModeDegreeChange: (degree: number) => void;
  modeDescriptions?: Record<number, string>;
  modeFamily: 'major' | 'harmonic-minor' | 'melodic-minor';
  onModeFamilyChange: (family: 'major' | 'harmonic-minor' | 'melodic-minor') => void;
  labelMode?: DegreeLabelMode;
  onLabelModeChange?: (mode: DegreeLabelMode) => void;
  isMuted: boolean;
  onToggleMuted: () => void;
}

/** Fila horizontal de grados diatónicos, desplazable en pantallas pequeñas. */
export function DegreeSelector({
  chords,
  value,
  tonicName,
  onChange,
  onChordSelect,
  playingChordLabel,
  playingTabPositions = [],
  extendedChords,
  modeDegree,
  onModeDegreeChange,
  modeDescriptions = {},
  modeFamily,
  onModeFamilyChange,
  labelMode = 'roman',
  onLabelModeChange,
  isMuted,
  onToggleMuted,
}: DegreeSelectorProps): JSX.Element {
  const [internalLabelMode, setInternalLabelMode] = useState<DegreeLabelMode>(labelMode);
  const activeLabelMode = onLabelModeChange ? labelMode : internalLabelMode;
  const modeDegreeLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  const getDegreeLabel = (degree: number): string => {
    if (activeLabelMode === 'nashville') return String(degree);

    const chord = chords.find((item) => item.degree === degree);
    if (!chord) return String(degree);
    return !chord.isExtended && chord.romanNumeral.endsWith('°')
      ? chord.romanNumeral.replace(/°$/, ' dim')
      : chord.romanNumeral;
  };

  const handleLabelModeToggle = () => {
    const next: DegreeLabelMode = activeLabelMode === 'roman' ? 'nashville' : 'roman';
    if (onLabelModeChange) onLabelModeChange(next);
    else setInternalLabelMode(next);
  };

  return (
    <div className="degree-selector-layout" aria-label="Selector de grado diatónico">
      <div className="degree-selector-legend" style={legendHeaderStyle}>
        <div style={rangeWrapperStyle}>
          <span style={modeLegendStyle}>Escala</span>
          <div style={familyStyle} role="radiogroup" aria-label="Escala fundamental">
            {([
              ['major', 'Mayor'],
              ['harmonic-minor', 'Menor armónica'],
              ['melodic-minor', 'Menor melódica'],
            ] as const).map(([family, label]) => (
              <button
                key={family}
                type="button"
                role="radio"
                aria-checked={modeFamily === family}
                onClick={() => onModeFamilyChange(family)}
                style={getRangeButtonStyle(modeFamily === family, false)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="degree-selector-mode-buttons" style={headerStyle}>
        <div style={rangeWrapperStyle}>
          <span style={modeLegendStyle}>Modo</span>
          <div style={rangeStyle}>
            {chords.map((chord) => (
              <button
                key={`degree-${chord.degree}`}
                type="button"
                aria-label={`Grado ${modeDegreeLabels[chord.degree - 1]}`}
                aria-pressed={chord.degree === modeDegree}
                title={modeDescriptions[chord.degree]}
                onClick={() => onModeDegreeChange(chord.degree)}
                style={getRangeButtonStyle(chord.degree === modeDegree, false)}
              >
                {modeDegreeLabels[chord.degree - 1]}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLabelModeToggle}
              style={toggleStyle}
              aria-label={
                activeLabelMode === 'roman'
                  ? 'Cambiar a números Nashville'
                  : 'Cambiar a numerales romanos'
              }
            >
              {activeLabelMode === 'roman' ? 'Numerales romanos' : 'Números Nashville'}
            </button>
          </div>
        </div>
      </div>

      <div className="degree-selector-red-buttons" style={chordRowStyle}>
        <div style={rangeWrapperStyle}>
          <span style={modeLegendStyle}>Grados Diatónicos</span>
          <div
            role="radiogroup"
            style={groupStyle}
          >
            {chords.map((chord) => {
          const isSelected = chord.degree === value;
          const label = getDegreeLabel(chord.degree);
          const qualityLabel = extendedChords && chord.isExtended
            ? CHORD_QUALITY_SUFFIX[chord.quality]
            : chord.quality === 'major'
              ? 'Mayor'
              : chord.quality === 'minor'
                ? 'm'
                : chord.quality === 'diminished'
                  ? 'dim'
                  : 'aug';

            return (
              <div key={chord.degree} style={chordButtonItemStyle}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => (onChordSelect ?? onChange)(chord.degree)}
                style={{
                  minWidth: 'clamp(120px, 33vw, 168px)',
                  minHeight: 'clamp(120px, 30vw, 156px)',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: '0.6rem',
                  border: isSelected ? '2px solid #be123c' : '1px solid #d6d3d1',
                  background: isSelected ? '#f43f5e' : 'white',
                  color: isSelected ? 'white' : '#292524',
                  fontWeight: 700,
                  fontSize: 'clamp(2.16rem, 8.4vw, 3rem)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.15rem',
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: 'clamp(1.2rem, 4.2vw, 1.8rem)', opacity: 0.75 }}>{qualityLabel}</span>
              </button>
              <span style={chordIntervalsStyle}>
                {chord.chordIntervals.join(', ')}
              </span>
              </div>
            );
          })}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleMuted}
          aria-pressed={!isMuted}
          aria-label={isMuted ? 'Activar sonido' : 'Desactivar sonido'}
          title={isMuted ? 'Sonido desactivado' : 'Sonido activado'}
          className={isMuted ? 'audio-toggle audio-toggle-muted' : 'audio-toggle'}
          style={{
            minWidth: 140,
            minHeight: 56,
            flexShrink: 0,
            alignSelf: 'center',
            marginLeft: '8rem',
            borderRadius: '999px',
            border: 'none',
            background: isMuted ? '#dc2626' : '#16a34a',
            color: 'white',
            fontSize: '1.3rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {isMuted ? '🔇 Audio: Off' : '🔊 Audio: On'}
        </button>
      </div>
      <div className="degree-selector-summary" style={selectionSummaryRowStyle}>
        <div style={selectionSummaryStyle} aria-label="Tonalidad actual">
          <span style={selectionSummaryLabelStyle}>Tonalidad</span>
          <span style={selectionSummaryValueStyle}>{tonicName}</span>
        </div>
      </div>
      <div className="degree-selector-playing" style={playingChordRowStyle} aria-live="polite">
        <div style={playingChordContentStyle}>
          <span style={playingChordLegendStyle}>Acorde sonando</span>
          <span style={playingChordStyle}>{playingChordLabel ?? '—'}</span>
          <div style={liveTabStyle} aria-label="Tablatura del acorde sonando">
            {Array.from({ length: 6 }, (_, index) => {
              const string = index + 1;
              const position = playingTabPositions.find((item) => item.string === string);
              return (
                <span key={string} style={liveTabStringStyle}>
                  <span>{position ? position.fret : 'x'}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.4rem',
};

const legendHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  marginBottom: '0.35rem',
};

const familyStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
};

const rangeWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.3rem',
};

const rangeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  flexWrap: 'wrap',
  fontSize: '0.72rem',
  color: '#78716c',
};

const getRangeButtonStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
  minWidth: 102,
  minHeight: 96,
  padding: '0 0.9rem',
  border: `1px solid ${isSelected ? '#0f766e' : '#d6d3d1'}`,
  borderRadius: '0.35rem',
  background: isSelected ? '#0f766e' : 'white',
  color: isSelected ? 'white' : '#292524',
  fontSize: '2.16rem',
  fontWeight: 700,
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  opacity: isDisabled ? 0.45 : 1,
});

const modeLegendStyle: React.CSSProperties = {
  fontSize: '1.6rem',
  fontWeight: 700,
  color: '#57534e',
  flexShrink: 0,
};

const toggleStyle: React.CSSProperties = {
  minHeight: 96,
  padding: '0 1.8rem',
  borderRadius: '999px',
  border: '1px solid #d6d3d1',
  background: '#f8fafc',
  fontSize: '2.16rem',
  fontWeight: 600,
  color: '#57534e',
  cursor: 'pointer',
};

const playingChordStyle: React.CSSProperties = {
  minHeight: 'clamp(116px, 32vw, 192px)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 clamp(1.1rem, 6vw, 3.3rem)',
  borderRadius: '0.35rem',
  background: '#dcfce7',
  color: '#166534',
  fontSize: 'clamp(2.4rem, 14vw, 4.32rem)',
  fontWeight: 700,
};

const liveTabStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 164,
  padding: '0.5rem 0.9rem',
  border: '1px solid #bbf7d0',
  borderRadius: '0.35rem',
  background: '#f0fdf4',
  color: '#166534',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '1.8rem',
  fontWeight: 700,
  textAlign: 'center',
};

const liveTabStringStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 44,
  borderBottom: '1px solid #86efac',
};

const playingChordRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  marginTop: '0.5rem',
  width: '100%',
};

const playingChordContentStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: '0.25rem',
  maxWidth: '100%',
};

const playingChordLegendStyle: React.CSSProperties = {
  color: '#57534e',
  fontSize: '0.85rem',
  fontWeight: 700,
};


const groupStyle: React.CSSProperties = {
  display: 'flex',
  flex: '0 1 auto',
  width: 'auto',
  maxWidth: '100%',
  minWidth: 0,
  gap: '0.4rem',
  flexWrap: 'wrap',
  overflowX: 'visible',
  paddingBottom: '0.3rem',
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: 'x proximity',
};

const chordRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: '0.75rem',
  minWidth: 0,
};

const selectionSummaryRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  marginTop: '0.5rem',
  width: '100%',
};

const selectionSummaryStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flex: '0 0 clamp(240px, 48vw, 360px)',
  minWidth: 'clamp(240px, 48vw, 360px)',
  minHeight: 'clamp(144px, 32vw, 208px)',
  gap: '0.7rem',
  padding: '1.4rem',
  border: '1px solid #d6d3d1',
  borderRadius: '0.6rem',
  background: '#fff',
  textAlign: 'center',
};

const selectionSummaryLabelStyle: React.CSSProperties = {
  color: '#57534e',
  fontSize: 'clamp(1.44rem, 4.8vw, 2rem)',
  fontWeight: 700,
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
};

const selectionSummaryValueStyle: React.CSSProperties = {
  color: '#292524',
  fontSize: 'clamp(2rem, 9vw, 3.3rem)',
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  letterSpacing: 0,
};

const chordButtonItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.2rem',
  flexShrink: 0,
  maxWidth: '100%',
};

const chordIntervalsStyle: React.CSSProperties = {
  color: '#57534e',
  fontSize: 'clamp(0.54rem, 1.8vw, 0.68rem)',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  textAlign: 'center',
};
