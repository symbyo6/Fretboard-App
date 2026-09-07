// src/components/Controls/DegreeSelector.tsx

import React, { useState } from 'react';
import type { DiatonicChordInfo, DegreeLabelMode } from '../../types';
import { CHORD_QUALITY_SUFFIX } from '../../lib/theory/chords';

interface DegreeSelectorProps {
  chords: DiatonicChordInfo[];
  value: number;
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
}

/** Fila horizontal de grados diatónicos, desplazable en pantallas pequeñas. */
export function DegreeSelector({
  chords,
  value,
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
    <div aria-label="Selector de grado diatónico">
      <div style={legendHeaderStyle}>
        <span style={legendStyle}>
          Grado escala fundamental · Modo mostrado: {modeDegreeLabels[modeDegree - 1]}
        </span>
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
      <div style={headerStyle}>
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
                  minWidth: 56,
                  minHeight: 52,
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: '0.6rem',
                  border: isSelected ? '2px solid #be123c' : '1px solid #d6d3d1',
                  background: isSelected ? '#f43f5e' : 'white',
                  color: isSelected ? 'white' : '#292524',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.15rem',
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>{qualityLabel}</span>
              </button>
              <span style={chordIntervalsStyle}>
                {chord.chordIntervals.join(', ')}
              </span>
            </div>
          );
        })}
      </div>
      <div style={playingChordRowStyle} aria-live="polite">
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

const rangeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  flexWrap: 'wrap',
  fontSize: '0.72rem',
  color: '#78716c',
};

const getRangeButtonStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
  minWidth: 34,
  minHeight: 32,
  padding: '0 0.3rem',
  border: `1px solid ${isSelected ? '#0f766e' : '#d6d3d1'}`,
  borderRadius: '0.35rem',
  background: isSelected ? '#0f766e' : 'white',
  color: isSelected ? 'white' : '#292524',
  fontSize: '0.72rem',
  fontWeight: 700,
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  opacity: isDisabled ? 0.45 : 1,
});

const legendStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#57534e',
};

const toggleStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '0 0.6rem',
  borderRadius: '999px',
  border: '1px solid #d6d3d1',
  background: '#f8fafc',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#57534e',
  cursor: 'pointer',
};

const playingChordStyle: React.CSSProperties = {
  minHeight: 96,
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 1.65rem',
  borderRadius: '0.35rem',
  background: '#dcfce7',
  color: '#166534',
  fontSize: '2.16rem',
  fontWeight: 700,
};

const liveTabStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 82,
  padding: '0.25rem 0.45rem',
  border: '1px solid #bbf7d0',
  borderRadius: '0.35rem',
  background: '#f0fdf4',
  color: '#166534',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.9rem',
  fontWeight: 700,
  textAlign: 'center',
};

const liveTabStringStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 22,
  borderBottom: '1px solid #86efac',
};

const playingChordRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '0.5rem',
  width: '100%',
};

const playingChordContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: '0.25rem',
};

const playingChordLegendStyle: React.CSSProperties = {
  color: '#57534e',
  fontSize: '0.85rem',
  fontWeight: 700,
};


const groupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  overflowX: 'auto',
  paddingBottom: '0.3rem',
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: 'x proximity',
};

const chordButtonItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.2rem',
  flexShrink: 0,
};

const chordIntervalsStyle: React.CSSProperties = {
  color: '#57534e',
  fontSize: '0.68rem',
  whiteSpace: 'nowrap',
};
