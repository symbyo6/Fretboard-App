// src/components/Controls/DegreeSelector.tsx

import React, { useState } from 'react';
import type { DiatonicChordInfo, DegreeLabelMode } from '../../types';

interface DegreeSelectorProps {
  chords: DiatonicChordInfo[];
  value: number;
  onChange: (degree: number) => void;
  labelMode?: DegreeLabelMode;
  onLabelModeChange?: (mode: DegreeLabelMode) => void;
}

/** Fila horizontal de grados diatónicos, desplazable en pantallas pequeñas. */
export function DegreeSelector({
  chords,
  value,
  onChange,
  labelMode = 'roman',
  onLabelModeChange,
}: DegreeSelectorProps): JSX.Element {
  const [internalLabelMode, setInternalLabelMode] = useState<DegreeLabelMode>(labelMode);
  const activeLabelMode = onLabelModeChange ? labelMode : internalLabelMode;

  const handleLabelModeToggle = () => {
    const next: DegreeLabelMode = activeLabelMode === 'roman' ? 'nashville' : 'roman';
    if (onLabelModeChange) {
      onLabelModeChange(next);
    } else {
      setInternalLabelMode(next);
    }
  };

  return (
    <div aria-label="Selector de grado diatónico">
      <div style={headerStyle}>
        <span style={legendStyle}>Grado / Acorde</span>
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

      <div
        role="radiogroup"
        style={groupStyle}
      >
        {chords.map((chord) => {
          const isSelected = chord.degree === value;
          const label = activeLabelMode === 'roman'
            ? chord.romanNumeral
            : chord.nashvilleNumber;

          return (
            <button
              key={chord.degree}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(chord.degree)}
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
              {chord.isExtended && (
                <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>ext.</span>
              )}
            </button>
          );
        })}
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

const groupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  overflowX: 'auto',
  paddingBottom: '0.3rem',
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: 'x proximity',
};
